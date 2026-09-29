const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createServer}=require('../tools/daily-preview-server.cjs');
const prayerKey='malsseum-annae.personal-prayers.v1';
const styleProps=['backgroundColor','border','color','borderRadius','minHeight','fontSize','fontWeight'];
const styles=locator=>locator.evaluate((e,props)=>Object.fromEntries(props.map(k=>[k,getComputedStyle(e)[k]])),styleProps);
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true});fs.mkdirSync('tmp/journal-ui',{recursive:true});
 try{for(const width of [319,390])for(const size of ['default','large','xlarge']){
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(size=>{localStorage.setItem('malsseum-annae.display-name.v1','검수');localStorage.setItem('malsseum-annae.text-size.v1',size)},size);
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>typeof displayScreen==='function');
  const dates=await page.evaluate(()=>[localToday(),localDateKey(new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()-3))]);
  for(const count of [1,3]){
   await page.evaluate(count=>{const j=window.Malsseum.services.gratitudeJournal;j.save(localToday(),{today:'오늘의 감사 내용',self:count===3?'나에게 감사 내용':'',grace:count===3?'하나님께 감사 내용':''});displayScreen('gratitude')},count);
   assert.equal(await page.locator('.gratitude-entry').count(),count);
   const gaps=await page.locator('.gratitude-entry').evaluateAll(es=>es.map(e=>{const h=e.querySelector('h3'),p=e.querySelector('p');const gap=p.getBoundingClientRect().top-h.getBoundingClientRect().bottom;return {gap,padding:getComputedStyle(e).padding,border:getComputedStyle(e).borderBottomWidth}}));
   for(const g of gaps){assert(g.gap>=5&&g.gap<15,JSON.stringify(g));assert.equal(g.padding,'8px 0px');assert.equal(g.border,'1px')}
   await page.locator('.gratitude-entry').first().scrollIntoViewIfNeeded();await page.screenshot({path:`tmp/journal-ui/gratitude-${count}-${width}-${size}.png`});
  }
  await page.locator('.gratitude-edit').click();const pill=await styles(page.locator('.gratitude-field-save').first());
  await page.locator('.gratitude-field-delete').first().click();const modalStyle=await page.locator('dialog[open]').evaluate(e=>{const s=getComputedStyle(e);return [s.width,s.padding,s.borderRadius,s.border,s.textAlign,getComputedStyle(e,'::backdrop').backgroundColor,getComputedStyle(e,'::backdrop').backdropFilter]});await page.getByRole('button',{name:'취소',exact:true}).click();
  for(const date of dates){
   await page.evaluate(date=>{const createdAt=date+'T12:00:00+09:00';localStorage.setItem('malsseum-annae.personal-prayers.v1',JSON.stringify([{id:'target',content:'검수 기도',createdAt,answer:{date,content:'검수 응답'}},{id:'other',content:'다른 기도 보존',createdAt,answer:{date,content:'다른 응답 보존'}}]));selectedPrayerDate=date;prayerCalendarMonth=dateFromKey(date);displayScreen('prayer');renderPrayerView()},date);
   const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),prayerKey);
   const untouched=(await read()).find(x=>x.id==='other');const card=page.locator('.prayer-entry').filter({has:page.locator('.prayer-content',{hasText:'검수 기도'})});
   for(const name of ['수정','삭제','응답 수정','응답 삭제'])assert.deepEqual(await styles(card.getByRole('button',{name,exact:true})),pill);
   await card.getByRole('button',{name:'수정',exact:true}).click();await page.locator('#personal-prayer').fill('검수 기도 수정');await page.locator('.prayer-save').click();assert.equal((await read()).find(x=>x.id==='target').content,'검수 기도 수정');
   await card.getByRole('button',{name:'응답 수정',exact:true}).click();await card.locator('.answer-form textarea').fill('검수 응답 수정');await card.getByRole('button',{name:'응답 기록하기',exact:true}).click();assert.equal((await read()).find(x=>x.id==='target').answer.content,'검수 응답 수정');
   for(const [name,title,description] of [['응답 삭제','이 응답을 삭제할까요?','삭제한 응답은 되돌릴 수 없어요.'],['삭제','이 기도를 삭제할까요?','삭제한 기도는 되돌릴 수 없어요.']]){
    const before=await read();await card.getByRole('button',{name,exact:true}).click();const modal=page.locator('dialog[open]');assert.equal(await modal.locator('p').first().textContent(),title);assert.equal(await modal.locator('.gratitude-delete-description').textContent(),description);
    assert.deepEqual(await modal.evaluate(e=>{const s=getComputedStyle(e);return [s.width,s.padding,s.borderRadius,s.border,s.textAlign,getComputedStyle(e,'::backdrop').backgroundColor,getComputedStyle(e,'::backdrop').backdropFilter]}),modalStyle);
    assert.deepEqual(await styles(modal.getByRole('button',{name:'삭제',exact:true})),pill);
    assert(await modal.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1}));
    const rects=await modal.locator('button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right}}));assert(rects[0].right<=rects[1].left);
    await page.screenshot({path:`tmp/journal-ui/modal-${name}-${width}-${size}.png`});await page.mouse.click(2,2);assert.deepEqual(await read(),before);await modal.getByRole('button',{name:'취소',exact:true}).click();assert.deepEqual(await read(),before);
    await card.getByRole('button',{name,exact:true}).click();await page.locator('dialog[open]').getByRole('button',{name:'삭제',exact:true}).click();const after=await read();assert.deepEqual(after.find(x=>x.id==='other'),untouched);
    if(name==='응답 삭제'){const expected=structuredClone(before);delete expected.find(x=>x.id==='target').answer;assert.deepEqual(after,expected)}else assert.deepEqual(after,before.filter(x=>x.id!=='target'));
   }
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${width}/${size}: gratitude 1/3 entries, matched pills/modal, prayer/answer edit and cancel/delete, today/past, unrelated records preserved`);await page.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
