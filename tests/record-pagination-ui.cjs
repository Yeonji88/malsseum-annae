const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {createServer}=require('../tools/records-preview-server.cjs');
async function seed(page,count){return page.evaluate(count=>{
 const verses=readableVerses().slice(0,count),times={},records=[];
 verses.forEach((v,i)=>{const time=new Date(Date.UTC(2026,7,1,i)).toISOString();times[v.id]=time;records.push({id:'record-'+i,verseId:v.id,content:'기록 '+i,createdAt:time,updatedAt:time});});
 localStorage.setItem(SavedVerses.key,JSON.stringify(verses.map(v=>v.id)));localStorage.setItem(SavedVerses.savedAtKey,JSON.stringify(times));localStorage.setItem(PersonalReflections.key,JSON.stringify(records));
 recordPages.saved=recordPages.reflections=1;return {saved:SavedVerses.list(),reflections:records.map(v=>v.id).reverse()};
},count);}
const snapshot=page=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))));
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});
 try{for(const width of [319,390])for(const size of ['default','large','xlarge']){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,reducedMotion:'reduce'});await context.addInitScript(size=>{localStorage.setItem('malsseum-annae.display-name.v1','검증');localStorage.setItem('malsseum-annae.text-size.v1',size);},size);
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>typeof PersonalReflections!=='undefined');await p.waitForFunction(()=>!document.getElementById('brand-splash'));
  for(const count of [0,1,10,11,20,21])for(const kind of ['saved','reflections']){
   const order=await seed(p,count);await p.evaluate(kind=>kind==='saved'?displayScreen('profile'):openReflectionList(),kind);const before=await snapshot(p);
   const cards=p.locator(kind==='saved'?'.saved-verse-card':'.meditation-record-card'),nav=p.locator('[data-record-pages="'+kind+'"]');assert.equal(await cards.count(),Math.min(10,count));assert.equal(await nav.count(),count>10?1:0);
   if(count>10){assert(await nav.getByRole('button',{name:'이전',exact:true}).isDisabled());
    for(let page=1;page<=Math.ceil(count/10);page++){
     assert.equal(await cards.count(),Math.min(10,count-(page-1)*10));assert.equal(await nav.locator('[aria-current="page"]').textContent(),String(page));
     const actual=kind==='saved'?await cards.evaluateAll(items=>items.map(e=>e.dataset.savedVerseId)):await cards.locator('.meditation-record-excerpt').allTextContents();
     assert.deepEqual(actual,order[kind].slice((page-1)*10,page*10).map(id=>kind==='saved'?id:'기록 '+id.replace('record-','')));
     await nav.scrollIntoViewIfNeeded();const geometry=await nav.evaluate(e=>{const r=e.getBoundingClientRect(),buttons=[...e.children].map(b=>b.getBoundingClientRect());return {fits:e.scrollWidth<=e.clientWidth+1&&r.left>=0&&r.right<=innerWidth+1,overlap:buttons.some((a,i)=>buttons.slice(i+1).some(b=>Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)))}});assert(geometry.fits);assert(!geometry.overlap);
     if(page<Math.ceil(count/10)){await nav.getByRole('button',{name:'다음',exact:true}).click();assert.equal(await p.evaluate(()=>mainContent.scrollTop),0);}else assert(await nav.getByRole('button',{name:'다음',exact:true}).isDisabled());
    }
    await nav.getByRole('button',{name:'이전',exact:true}).click();assert.equal(await p.evaluate(()=>mainContent.scrollTop),0);
   }
   assert.equal(await snapshot(p),before);
  }
  await seed(p,21);await p.evaluate(()=>openReflectionList('record-0'));assert.equal(await p.locator('[data-record-pages="reflections"] [aria-current]').textContent(),'3');
  await p.locator('.meditation-record-card').getByRole('button',{name:'상세보기',exact:true}).click();await p.evaluate(()=>window.Malsseum.androidBack.back());assert.equal(await p.locator('[data-record-pages="reflections"] [aria-current]').textContent(),'3');
  await p.locator('.meditation-record-card').getByRole('button',{name:'수정',exact:true}).click();await p.locator('#meditation-journal-input').fill('수정한 기록');await p.locator('.meditation-journal-save').click();await p.locator('#meditation-detail .meditation-back').click();assert.equal(await p.locator('[data-record-pages="reflections"] [aria-current]').textContent(),'3');assert.equal(await p.evaluate(()=>PersonalReflections.list().find(r=>r.id==='record-0').content),'수정한 기록');
  p.once('dialog',d=>d.accept());await p.locator('.meditation-record-card').getByRole('button',{name:'삭제',exact:true}).click();assert.equal(await p.locator('[data-record-pages="reflections"] [aria-current]').textContent(),'2');assert.equal(await p.locator('.meditation-record-card').count(),10);
  await seed(p,21);await p.evaluate(()=>openReflectionList('record-0'));await p.locator('.meditation-record-card').getByRole('button',{name:'상세보기',exact:true}).click();p.once('dialog',d=>d.accept());await p.locator('#meditation-record-screen').getByRole('button',{name:'삭제',exact:true}).click();assert.equal(await p.locator('[data-record-pages="reflections"] [aria-current]').textContent(),'2');assert.equal(await p.evaluate(()=>PersonalReflections.list().some(r=>r.id==='record-0')),false);
  await seed(p,21);await p.evaluate(()=>displayScreen('profile'));const beforeClick=await snapshot(p);await p.locator('.saved-verse-card').first().click();assert.equal(await snapshot(p),beforeClick);assert(await p.locator('#my-screen').isVisible());
  await p.locator('.edit-saved').click();await p.locator('.select-all').click();assert.equal(await p.evaluate(()=>selectedSaved.size),21);await p.locator('[data-record-pages="saved"]').getByRole('button',{name:'다음',exact:true}).click();assert.equal(await p.locator('.saved-verse-card[aria-pressed="true"]').count(),10);await p.locator('.select-all').click();assert.equal(await p.evaluate(()=>selectedSaved.size),0);
  await p.locator('.saved-verse-card').first().click();await p.locator('[data-record-pages="saved"]').getByRole('button',{name:'이전',exact:true}).click();await p.locator('.saved-verse-card').first().click();assert.equal(await p.evaluate(()=>selectedSaved.size),2);await p.locator('.saved-verse-card').first().click();assert.equal(await p.evaluate(()=>selectedSaved.size),1);await p.locator('.edit-saved').click();assert.equal(await p.evaluate(()=>selectedSaved.size),0);
  await p.locator('.edit-saved').click();await p.locator('[data-record-pages="saved"]').getByRole('button',{name:'3페이지',exact:true}).click();await p.locator('.saved-verse-card').click();await p.locator('.bulk-remove').click();assert.equal(await p.locator('[data-record-pages="saved"] [aria-current]').textContent(),'2');assert.equal(await p.evaluate(()=>SavedVerses.list().length),20);await p.locator('.select-all').click();await p.locator('.bulk-remove').click();assert.equal(await p.locator('.saved-verse-card').count(),0);assert.equal(await p.locator('[data-record-pages="saved"]').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS counts/order/storage/navigation/detail/edit/delete/selection/back/mobile',width,size);await context.close();
 }
 // Preview samples must never read or write the origin's real storage.
 const c=await browser.newContext(),p=await c.newPage();await p.goto('http://127.0.0.1:'+server.address().port);await p.evaluate(()=>localStorage.setItem('preview-preservation-marker','keep'));await p.goto('http://127.0.0.1:'+server.address().port+'/records-preview?list=saved&count=21');await p.locator('.saved-verse-card').first().waitFor();assert.equal(await p.locator('.saved-verse-card').count(),10);await p.goto('http://127.0.0.1:'+server.address().port);assert.equal(await p.evaluate(()=>localStorage.getItem('preview-preservation-marker')),'keep');assert.equal(await p.evaluate(()=>localStorage.getItem('malsseum-annae.saved-verse-ids.v1')),null);await c.close();console.log('PASS isolated Preview');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
