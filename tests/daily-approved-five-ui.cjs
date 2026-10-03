const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {createServer}=require('../tools/daily-preview-server.cjs'),expected=require('./fixtures/daily-approved-five.json');
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
  // Exercise storage compatibility in a disposable browser context, using the
  // real app route (Preview storage is otherwise deliberately memory-only).
  const real=await browser.newPage();
  const oldRecord={id:'legacy',verseId:'john-11-35',content:'기존 묵상 그대로',createdAt:'2026-09-29T00:00:00Z',updatedAt:'2026-09-29T00:00:00Z',verseSnapshot:{reference:'요한복음 11:35',text:'예수께서 눈물을 흘리시더라'}};
  const history=[{date:'2026-09-28',verseId:'john-11-35'},{date:'2026-09-29',verseId:'psalm-139-13-14'}];
  await real.addInitScript(({oldRecord,history})=>{
   localStorage.setItem('malsseum-annae.display-name.v1','검수');
   localStorage.setItem('malsseum-annae.saved-verse-ids.v1',JSON.stringify(['john-11-35','psalm-139-13-14','psalm-143-8','psalm-139-14']));
   localStorage.setItem('malsseum-annae.personal-reflections.v1',JSON.stringify([oldRecord]));
   localStorage.setItem('malsseum-annae.daily-verse-history.v1',JSON.stringify(history));
  },{oldRecord,history});await real.goto(base);await real.locator('#meditation-screen').waitFor({state:'visible'});
  assert.deepEqual(await real.evaluate(()=>SavedVerses.list().sort()),['john-11-35','psalm-139-13-14','psalm-143-8','psalm-139-14'].sort());
  assert.deepEqual(await real.evaluate(()=>PersonalReflections.list()),[oldRecord]);
  assert.deepEqual(await real.evaluate(()=>JSON.parse(localStorage.getItem('malsseum-annae.daily-verse-history.v1')).slice(0,2)),history);
  await real.evaluate(()=>openDailyMeditation(readableVerses().find(v=>v.id==='john-11-35'),PersonalReflections.list()[0]));
  await real.locator('#meditation-journal-input').fill('기존 기록 수정 확인');await real.locator('.meditation-journal-save').click();
  const edited=await real.evaluate(()=>PersonalReflections.list()[0]);assert.equal(edited.id,oldRecord.id);assert.equal(edited.verseId,oldRecord.verseId);assert.deepEqual(edited.verseSnapshot,oldRecord.verseSnapshot);
  for(const id of ['psalm-143-8','psalm-139-14']){
   await real.evaluate(id=>openDailyMeditation(readableVerses().find(v=>v.id===id)),id);
   await real.locator('#meditation-journal-input').fill('새 Daily 기록 '+id);await real.locator('.meditation-journal-save').click();
   const record=await real.evaluate(id=>PersonalReflections.list().find(r=>r.verseId===id),id);assert.equal(record.verseSnapshot.reference,id==='psalm-143-8'?'시편 143:8':'시편 139:14');
  }
  assert.deepEqual(errors,[]);console.log('PASS legacy saved / records / history / edit snapshot / new Daily snapshot');await real.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
