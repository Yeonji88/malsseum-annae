const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createServer,ids}=require('../tools/concern-preview-server.cjs');
const approved=require('./fixtures/new-concern-approved.json');
const drafts=require('../tools/concern-guidance-drafts.json');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 fs.mkdirSync('tmp/concern-review',{recursive:true});let count=0;
 try{
 for(const width of [319,390])for(const size of ['default','large','xlarge']){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().startsWith('http')&&!r.url().startsWith(origin))remote.push(r.url())});
  // Seed real origin storage before entering Preview. The adapter must never read or overwrite it.
  await page.goto(origin+'/');await page.evaluate(()=>{localStorage.clear();localStorage.setItem('review-storage-sentinel','real user data');});
  for(const id of ids){
   await page.goto(origin+`/concern-preview?verse=${id}&size=${size}`);
   await page.locator('#result:not([hidden]) .scripture').waitFor();await page.evaluate(()=>document.fonts.ready);
   const expected=approved.find(v=>v.id===id);
   assert.equal(await page.locator('#result .scripture blockquote').textContent(),expected.text);
   assert.equal(await page.locator('#result .reflection-action .guidance-copy').textContent(),expected.reflection);
   assert.equal(await page.locator('#result .prayer-action .guidance-copy').textContent(),(drafts[id]||expected).prayer);
   assert.equal(await page.locator('.app').getAttribute('data-text-size'),size);
   const geometry=await page.evaluate(()=>{
    const main=document.querySelector('#main-content'),scripture=document.querySelector('#result .scripture'),quote=scripture.querySelector('blockquote'),caption=scripture.querySelector('figcaption'),copy=document.querySelector('#result .reflection-action .guidance-copy'),questions=document.querySelector('#result .conversation-questions');
    const q=quote.getBoundingClientRect(),c=caption.getBoundingClientRect(),r=copy.getBoundingClientRect(),qs=questions.getBoundingClientRect();
    return {overflow:Math.max(main.scrollWidth-main.clientWidth,document.documentElement.scrollWidth-innerWidth),quoteClipped:quote.scrollHeight>quote.clientHeight+1,copyClipped:copy.scrollHeight>copy.clientHeight+1,quoteOverlap:q.bottom>c.top+1,reflectionOverlap:r.bottom>qs.top+1,cardContains:scripture.getBoundingClientRect().bottom>=c.bottom};
   });
   assert.ok(geometry.overflow<=1&&!geometry.quoteClipped&&!geometry.copyClipped&&!geometry.quoteOverlap&&!geometry.reflectionOverlap&&geometry.cardContains,JSON.stringify({width,size,id,geometry}));
   await page.locator('#result .prayer-action .guidance-copy').scrollIntoViewIfNeeded();
   const reachable=await page.locator('#result .prayer-action .guidance-copy').evaluate(e=>{const r=e.getBoundingClientRect(),main=document.querySelector('#main-content').getBoundingClientRect();return r.bottom<=main.bottom+1&&r.top>=main.top-1});assert.ok(reachable,'prayer reachable by scrolling');
   if(id===ids[0]||id===ids[6]){await page.evaluate(()=>document.querySelector('#main-content').scrollTop=0);await page.screenshot({path:`tmp/concern-review/${id}-${width}-${size}.png`});}
   assert.equal(await page.evaluate(()=>localStorage.getItem('review-storage-sentinel')),null);
   const save=page.locator('#result .save-action');await save.click();
   assert.equal(await save.locator('svg').getAttribute('fill'),'currentColor');
   assert.ok(await page.evaluate(id=>JSON.parse(localStorage.getItem('malsseum-annae.saved-verse-ids.v1')).includes(id),id));
   await save.click();assert.equal(await save.locator('svg').getAttribute('fill'),'none');
   count++;
  }
  await page.evaluate(async()=>{await showVerse('죽고 싶어요');displayScreen('result')});
  assert.equal(await page.locator('#result .self-harm-call').getAttribute('href'),'tel:109');
  assert.equal(await page.locator('#result .scripture').count(),0);
  await page.locator('#result .self-harm-call').scrollIntoViewIfNeeded();
  assert.ok(await page.locator('#result .self-harm-call').isVisible());
  assert.ok(await page.evaluate(()=>document.querySelector('#main-content').scrollWidth<=document.querySelector('#main-content').clientWidth+1));
  await page.goto(origin+'/');assert.equal(await page.evaluate(()=>localStorage.getItem('review-storage-sentinel')),'real user data');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);await context.close();
 }
 console.log(`PASS ${count} long-passage layouts (10 passages × 2 widths × 3 sizes); no clipping, overlap, horizontal overflow, remote request or real storage modification`);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
