// Run with NODE_PATH pointing to the installed Playwright package directory.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createServer}=require('../tools/daily-preview-server.cjs');
const fs=require('node:fs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 fs.mkdirSync('tmp/ui-checks',{recursive:true});
 try{
 for(const width of [319,390])for(const size of ['default','large','xlarge']){
  const context=await browser.newContext({viewport:{width,height:844}});
  await context.addInitScript(({size})=>{
   if(!localStorage.getItem('ui-test-seeded')){localStorage.setItem('malsseum-annae.display-name.v1','검수');localStorage.setItem('malsseum-annae.text-size.v1',size);localStorage.setItem('ui-test-seeded','yes');}
  },{size});
  const page=await context.newPage();await page.goto(url);await page.waitForSelector('.daily-bookmark');await page.evaluate(()=>document.fonts.ready);
  const geometry=async()=>page.evaluate(()=>{
   const main=document.querySelector('#main-content');
   return {horizontal:main.scrollWidth-main.clientWidth,body:document.documentElement.scrollWidth-innerWidth};
  });
  const check=async()=>{const g=await geometry();assert.ok(g.horizontal<=1&&g.body<=1,JSON.stringify({width,size,g}));};
  await check();
  const save=page.locator('.meditation-actions [data-daily-save]');
  assert.equal(await save.locator('svg').getAttribute('fill'),'none');
  await save.click();assert.equal(await save.locator('svg').getAttribute('fill'),'currentColor');
  const saved=await page.evaluate(()=>localStorage.getItem('malsseum-annae.saved-verse-ids.v1'));
  await page.reload();await page.waitForSelector('.daily-bookmark');
  assert.equal(await save.locator('svg').getAttribute('fill'),'currentColor');
  assert.equal(await page.locator('.daily-bookmark svg').getAttribute('fill'),'currentColor');
  await page.locator('.meditation-primary').click();
  assert.equal(await page.locator('#meditation-detail .save-action svg').getAttribute('fill'),'currentColor');
  assert.equal(await page.locator('.meditation-back-label:visible').evaluate(e=>getComputedStyle(e).textDecorationThickness),'1px');
  await page.locator('#meditation-journal-input').fill('기존 데이터와 분리된 테스트 기록');
  await page.locator('.meditation-journal-save').click();
  assert.equal(await page.locator('.meditation-journal-status').textContent(),'묵상을 저장했어요.');
  assert.equal(await page.locator('.meditation-journal-status').evaluate(e=>getComputedStyle(e).textAlign),'center');
  const records=await page.evaluate(()=>localStorage.getItem('malsseum-annae.personal-reflections.v1'));
  assert.ok(JSON.parse(records).some(record=>record.content==='기존 데이터와 분리된 테스트 기록'));
  await page.screenshot({path:`tmp/ui-checks/${width}-${size}-journal.png`});
  await check();
  const buttonBox=await page.locator('.meditation-journal-save').boundingBox();
  const nav=await page.locator('#bottom-nav').boundingBox();assert.ok(buttonBox.y+buttonBox.height<=nav.y+1,'journal button hidden');
  await page.reload();await page.waitForSelector('.daily-bookmark');
  assert.equal(await page.evaluate(()=>localStorage.getItem('malsseum-annae.saved-verse-ids.v1')),saved);
  assert.equal(await page.evaluate(()=>localStorage.getItem('malsseum-annae.personal-reflections.v1')),records);
  await page.locator('.meditation-view-all').click();
  const continueWriting=page.getByRole('button',{name:'오늘 묵상 이어쓰기',exact:true});
  assert.equal(await continueWriting.evaluate(e=>getComputedStyle(e).textDecorationLine),'none');
  assert.equal(await page.locator('.meditation-back-label:visible').evaluate(e=>getComputedStyle(e).textDecorationLine),'underline');
  await check();
  await page.locator('#bottom-nav [data-screen="profile"]').click();await check();
  for(const editing of [false,true]){
   if(editing)await page.locator('.edit-saved').click();
   await check();
   const box=await page.locator('.my-heading').boundingBox(),card=await page.locator('.saved-verse-card').first().boundingBox();
   assert.ok(box.y+box.height<=card.y,'actions overlap card');
   assert.equal(await page.locator('.my-heading').evaluate(e=>getComputedStyle(e).top),'7px');
   await page.screenshot({path:`tmp/ui-checks/${width}-${size}-my-${editing}.png`});
   const buttons=await page.locator('.my-heading button:visible').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
   for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){const a=buttons[i],b=buttons[j];assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,'button overlap');}
  }
  await page.locator('.edit-saved').click();await page.locator('.saved-verse-card').first().click();await check();
  assert.equal(await page.locator('#result .save-action svg').last().getAttribute('fill'),'currentColor');
  assert.equal(await page.locator('#result .meditation-back-label').textContent(),'고민 입력하기');
  await page.screenshot({path:`tmp/ui-checks/${width}-${size}-result.png`});
  await page.locator('#bottom-nav [data-screen="reflection"]').click();await save.click();
  assert.equal(await save.locator('svg').getAttribute('fill'),'none');
  await page.reload();await page.waitForSelector('.daily-bookmark');assert.equal(await save.locator('svg').getAttribute('fill'),'none');
  for(const mode of ['native','fallback','failure','cancel']){
   await page.evaluate(mode=>{window.shareCalls=[];window.copyCalls=[];Object.defineProperty(navigator,'share',{configurable:true,value:mode==='fallback'?undefined:async data=>{window.shareCalls.push(data);if(mode==='failure'||mode==='cancel')throw Object.assign(new Error(),{name:mode==='cancel'?'AbortError':'NotAllowedError'});}});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.copyCalls.push(text)}});},mode);
   await page.getByRole('button',{name:'공유하기',exact:true}).click();
   const state=await page.evaluate(()=>({share:window.shareCalls,copy:window.copyCalls,status:document.querySelector('.meditation-share-status').textContent}));
   assert.equal(state.copy.length,['fallback','failure'].includes(mode)?1:0);
   assert.equal(state.status,['fallback','failure'].includes(mode)?'말씀을 복사했어요.':'');
  }
  fs.mkdirSync('tmp/ui-checks',{recursive:true});await page.screenshot({path:`tmp/ui-checks/${width}-${size}.png`});
  await context.close();console.log(`PASS ${width}px ${size}: layout, bookmarks, reload, journal, share paths`);
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
