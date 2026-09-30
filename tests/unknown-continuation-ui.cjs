const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createServer}=require('../tools/daily-preview-server.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const width of [319,390])for(const size of ['default','large','xlarge']){
  const context=await browser.newContext({viewport:{width,height:844}});
  await context.route('https://**/*',r=>r.abort());
  await context.addInitScript(size=>{localStorage.setItem('malsseum-annae.display-name.v1','검수');localStorage.setItem('malsseum-annae.text-size.v1',size);},size);
  const page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(()=>{
   window.animationCount=0;
   new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.matches('.verse-transition'))window.animationCount++;}).observe(document.body,{childList:true});
  });
  const run=async(message,continuing,animations,kind)=>{
   const before=await page.evaluate(()=>({count:window.animationCount,history:JSON.stringify(recommendationHistory.snapshot())}));
   await page.evaluate(async({message,continuing})=>{await showVerse(message,continuing,true);displayScreen('result');},{message,continuing});
   assert.equal(await page.evaluate(()=>window.animationCount),before.count+animations);
   assert.equal(await page.locator('.verse-transition').count(),0);
   assert.equal(await page.locator('#conversation > article').count(),1);
   assert.equal(await page.locator('.unknown-concern-turn').count(),kind==='unknown'?1:0);
   if(kind==='unknown'){
    assert.equal(await page.locator('#conversation .scripture').count(),1);
    assert.equal(await page.locator('#conversation figcaption').textContent(),'시편 139:23');
    assert.equal(await page.locator('.unknown-concern-turn .user-message p').textContent(),message);
    assert.equal(await page.locator('#reply-form').count(),1);
   }else if(kind==='safety'){
    assert.equal(await page.locator('#conversation .scripture').count(),0);
    assert.equal(await page.locator('.self-harm-call').getAttribute('href'),'tel:109');
   }else assert.equal(await page.locator('#conversation .verse-result-turn').count(),1);
   if(kind!=='normal')assert.equal(await page.evaluate(()=>JSON.stringify(recommendationHistory.snapshot())),before.history);
   assert.ok(await page.locator('#main-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  };
  await run('너무 무섭고 두려워요',false,1,'normal');
  await run('ㄱ',false,0,'unknown');await run('ㄴ',true,0,'unknown');await run('ㄷ',true,0,'unknown');
  await run('너무 무섭고 두려워요',true,1,'normal');
  await run('ㄱ',false,0,'unknown');await run('너무 무섭고 두려워요',true,1,'normal');
  await run('ㄱ',false,0,'unknown');await run('죽고 싶어요',true,0,'safety');
  console.log(`PASS unknown continuation, latest input, single fallback, normal animation and safety ${width}px ${size}`);
  await context.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
