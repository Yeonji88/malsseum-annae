const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {createServer}=require('../tools/daily-preview-server.cjs'),expected=require('./fixtures/daily-approved-twenty-six-thirty.json');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true}),base='http://127.0.0.1:'+server.address().port;
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [319,390])for(const size of ['default','large','xlarge'])for(const [id,copy] of Object.entries(expected)){
   await page.setViewportSize({width,height:844});await page.goto(base+'/daily-preview?verse='+id);
   await page.locator('#meditation-journal-input').waitFor({state:'visible'});await page.evaluate(size=>document.documentElement.dataset.textSize=size,size);
   assert.equal(await page.locator('.meditation-reading>p').first().textContent(),copy.reflection);
   assert.deepEqual(await page.locator('.meditation-questions li').allTextContents(),copy.questions);
   const lines=await page.locator('.meditation-questions li').evaluateAll(items=>items.map(e=>{
    const text=[...e.childNodes].find(n=>n.nodeType===Node.TEXT_NODE),positions=[];
    for(let i=0;i<text.length;i++){if(!text.textContent[i].trim())continue;const r=document.createRange();r.setStart(text,i);r.setEnd(text,i+1);const b=r.getBoundingClientRect();if(!positions.some(v=>Math.abs(v.y-b.top)<1))positions.push({x:b.left,y:b.top});}
    return {prefix:getComputedStyle(e,'::before').content,positions};
   }));
   for(const item of lines){assert.equal(item.prefix,'"✓\u00a0"');assert(item.positions.every(v=>Math.abs(v.x-item.positions[0].x)<1));}
   const journal=await page.locator('.meditation-journal').evaluate(e=>{const s=getComputedStyle(e);return {border:s.borderTopWidth,color:s.borderTopColor,margin:parseFloat(s.marginTop),padding:parseFloat(s.paddingTop),gap:parseFloat(s.getPropertyValue('--meditation-section-gap'))};});
   assert.equal(journal.border,'1px');assert.notEqual(journal.color,'rgba(0, 0, 0, 0)');assert.equal(journal.margin,journal.gap/2+8);assert.equal(journal.padding,journal.gap/2-1+8);
   assert(await page.locator('#main-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   assert.equal(await page.locator('.meditation-reading h2').allTextContents().then(t=>t.includes('기도문')),false);
   const actual=await page.evaluate(id=>readableVerses().find(v=>v.id===id),id);assert.equal(actual.verseStart,actual.verseEnd);
   assert.equal(await page.locator('.detail-verse .daily-verse-text').textContent(),actual.text);
   assert.equal(await page.locator('.detail-verse .daily-verse-reference').textContent(),actual.reference);
   if(width===390&&size==='default')await page.screenshot({path:'tmp/daily-approved-'+id+'.png'});
   console.log('PASS',id,width,size);
  }
  await page.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
