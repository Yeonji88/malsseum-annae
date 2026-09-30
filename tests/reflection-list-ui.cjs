const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createServer}=require('../tools/daily-preview-server.cjs');
const key='malsseum-annae.personal-reflections.v1';
const record=(id,createdAt,updatedAt=createdAt)=>({id,verseId:'psalm-56-3',content:id,createdAt,updatedAt});
// Local midnight in Seoul is on the previous UTC date. Old records edited today remain old.
const past=[record('older-edited-today','2026-09-25T01:00:00Z','2026-09-28T02:59:00Z'),record('past-early','2026-09-27T01:00:00Z'),record('past-latest','2026-09-27T02:00:00Z','2026-09-27T03:00:00Z')];
const today=[record('today-midnight','2026-09-27T15:30:00Z'),record('today-latest','2026-09-28T01:00:00Z','2026-09-28T02:00:00Z')];
const cases=[{name:'empty',records:[],expected:[],prompt:true},{name:'past',records:past,expected:['past-latest','past-early','older-edited-today'],prompt:true},{name:'today',records:[...past,...today],expected:['today-latest','today-midnight','past-latest','past-early','older-edited-today'],prompt:false}];
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});fs.mkdirSync('tmp/ui-checks',{recursive:true});
 try{for(const width of [319,390])for(const size of ['default','large','xlarge'])for(const scenario of cases){
  const context=await browser.newContext({viewport:{width,height:844},timezoneId:'Asia/Seoul'});
  await context.addInitScript(({key,size,records})=>{if(!localStorage.getItem('list-test')){localStorage.setItem('malsseum-annae.display-name.v1','검수');localStorage.setItem('malsseum-annae.text-size.v1',size);localStorage.setItem(key,JSON.stringify(records));localStorage.setItem('list-test','yes');}},{key,size,records:scenario.records});
  const page=await context.newPage();await page.clock.install({time:new Date('2026-09-28T03:00:00Z')});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('.meditation-view-all').click();await page.evaluate(()=>document.fonts.ready);
  const list=page.locator('#meditation-list-screen');
  assert.equal(await list.locator('h1').count(),0);
  assert.equal(await list.getByText('오늘 묵상 이어쓰기',{exact:true}).count(),0);
  assert.equal(await list.locator('.meditation-list-empty').count(),scenario.prompt?1:0);
  if(scenario.prompt){assert.deepEqual(await list.locator('.meditation-list-empty p').allTextContents(),['아직 작성한 묵상이 없어요.','오늘의 말씀을 다시 읽으며 마음을 남겨보세요.']);assert.equal(await list.locator('.meditation-back').evaluate(e=>e.nextElementSibling.classList.contains('meditation-list-empty')),true);}
  assert.deepEqual(await list.locator('.meditation-record-excerpt').allTextContents(),scenario.expected);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),JSON.stringify(scenario.records),'render must not rewrite data');
  const layout=await list.evaluate(e=>{const main=document.querySelector('#main-content'),cards=[...e.querySelectorAll('.meditation-list-empty,.meditation-record-card')].map(e=>e.getBoundingClientRect());return {overflow:main.scrollWidth-main.clientWidth,overlap:cards.some((r,i)=>i&&cards[i-1].bottom>r.top)};});assert.ok(layout.overflow<=1&&!layout.overlap);
  await page.screenshot({path:`tmp/ui-checks/list-${scenario.name}-${width}-${size}.png`});
  if(scenario.records.length){
   await list.getByRole('button',{name:'상세보기',exact:true}).first().click();
   assert.ok(await page.locator('.meditation-record-view').textContent().then(t=>t.includes(scenario.expected[0])));
   await page.locator('#meditation-record-screen').getByRole('button',{name:'수정',exact:true}).click();
   await page.locator('#meditation-journal-input').fill('수정 검증');await page.locator('.meditation-journal-save').click();
   const edited=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(edited.find(e=>e.id===scenario.expected[0]).content,'수정 검증');assert.equal(edited.length,scenario.records.length);
   await page.locator('#meditation-detail .meditation-back').click();
   page.once('dialog',d=>d.accept());await list.getByRole('button',{name:'삭제',exact:true}).first().click();
   const deleted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(deleted.length,scenario.records.length-1);
  }else{
   await list.getByRole('button',{name:'오늘의 말씀 묵상하기',exact:true}).click();assert.equal(await page.locator('#meditation-journal-input').isVisible(),true);
  }
  await context.close();console.log(`PASS list ${scenario.name} ${width}px ${size}`);
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
