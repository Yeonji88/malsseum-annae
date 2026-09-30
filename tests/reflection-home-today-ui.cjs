const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createServer}=require('../tools/daily-preview-server.cjs');
const key='malsseum-annae.personal-reflections.v1';
const record=(id,createdAt,updatedAt=createdAt)=>({id,verseId:'psalm-56-3',content:id,createdAt,updatedAt});
const past=[record('past-edited-today','2026-09-27T01:00:00Z','2026-09-28T02:00:00Z')];
const today=[record('today-local-midnight','2026-09-27T15:00:00Z'),record('today-second','2026-09-28T01:00:00Z'),record('today-third','2026-09-28T02:00:00Z')];
const scenarios=[{name:'empty',records:[]},{name:'past',records:past},{name:'today',records:today},{name:'mixed',records:[...past,...today]}];
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});fs.mkdirSync('tmp/ui-checks',{recursive:true});
 try{for(const width of [319,390])for(const size of ['default','large','xlarge'])for(const scenario of scenarios){
  const context=await browser.newContext({viewport:{width,height:844},timezoneId:'Asia/Seoul'});
  await context.addInitScript(({records,size,key})=>{localStorage.setItem('malsseum-annae.display-name.v1','검수');localStorage.setItem('malsseum-annae.text-size.v1',size);localStorage.setItem(key,JSON.stringify(records));},{records:scenario.records,size,key});
  const page=await context.newPage();await page.clock.install({time:new Date('2026-09-28T03:00:00Z')});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.evaluate(()=>document.fonts.ready);
  const card=page.locator('.meditation-mine');
  const expected=scenario.records.filter(r=>r.id.startsWith('today')).reverse().map(r=>r.content);
  assert.deepEqual(await card.locator('.meditation-preview-item p').allTextContents(),expected);
  if(!expected.length){assert.deepEqual(await card.locator('.meditation-empty p').allTextContents(),['오늘 작성한 묵상이 없어요.','오늘의 말씀을 조용히 묵상하고 마음을 남겨보세요.']);assert.equal(await card.locator('.meditation-mine-head').evaluate(e=>getComputedStyle(e).justifyContent),'center');}
  // Today's saved reflection opens editing; empty/past-only states start writing.
  assert.equal(await card.getByRole('button',{name:'묵상 기록하기',exact:true}).count(),expected.length?0:1);
  assert.equal(await card.getByRole('button',{name:'묵상 수정하기',exact:true}).count(),expected.length?1:0);
  assert.equal(await card.locator('.meditation-view-all').evaluate(e=>getComputedStyle(e).textDecorationLine),'underline');
  await card.scrollIntoViewIfNeeded();
  assert.ok(await page.locator('#main-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  assert.ok(await card.evaluate(e=>[...e.querySelectorAll('button,p,h2')].every(x=>x.getBoundingClientRect().right<=e.getBoundingClientRect().right+1)));
  await page.screenshot({path:`tmp/ui-checks/home-${scenario.name}-${width}-${size}.png`});
  await card.locator('.meditation-view-all').click();
  assert.equal(await page.locator('.meditation-record-card').count(),scenario.records.length);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),JSON.stringify(scenario.records));
  await page.evaluate(()=>displayScreen('reflection'));
  // Seoul midnight is 15:00 UTC: yesterday's records disappear without navigation.
  await page.clock.fastForward(12*60*60*1000+100);
  assert.equal(await card.locator('.meditation-preview-item').count(),0);
  assert.equal(await card.getByRole('button',{name:'묵상 기록하기',exact:true}).count(),1);
  assert.equal(await card.getByRole('button',{name:'묵상 수정하기',exact:true}).count(),0);
  await card.locator('.meditation-view-all').click();assert.equal(await page.locator('.meditation-record-card').count(),scenario.records.length);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),JSON.stringify(scenario.records));
  await page.evaluate(()=>displayScreen('reflection'));
  await page.locator('.meditation-primary').click();await page.locator('#meditation-journal-input').fill('새 날짜의 묵상');await page.locator('.meditation-journal-save').click();await page.locator('.meditation-journal-back').click();
  assert.deepEqual(await card.locator('.meditation-preview-item p').allTextContents(),['새 날짜의 묵상']);
  console.log(`PASS home ${scenario.name} ${width}px ${size}, midnight, new-day save, history preserved`);await context.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
