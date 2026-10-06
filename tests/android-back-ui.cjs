const {chromium}=require('playwright'),assert=require('node:assert/strict'),{createServer}=require('../tools/daily-preview-server.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const width of [319,390])for(const size of ['default','large','xlarge']){
  const p=await browser.newPage({viewport:{width,height:844},timezoneId:'Asia/Seoul',reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://**/*',r=>r.abort());
  // Exercise the actual registration/integration with a native event fixture, no APK.
  await p.route('**/native-app.js',r=>r.fulfill({contentType:'application/javascript',body:"window.backListeners={};window.exitCalls=0;window.malsseumAndroidApp={addListener:async(n,fn)=>{backListeners[n]=fn;return {remove(){}}},exitApp:async()=>{exitCalls++}};"}));
  await p.addInitScript(size=>{localStorage.setItem('malsseum-annae.display-name.v1','검수');localStorage.setItem('malsseum-annae.text-size.v1',size);},size);
  await p.goto(`http://127.0.0.1:${server.address().port}/`);await p.waitForFunction(()=>window.backListeners?.backButton&&!document.body.classList.contains('splash-loading'));
  const back=()=>p.evaluate(()=>backListeners.backButton());
  const bottomLayout=async(selector,last)=>{
   assert.equal(await p.locator('.meditation-journal-back').count(),0);
   await p.evaluate(async()=>{
    await document.fonts.ready;
    // Let the entry callback finish before issuing a competing scroll.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const scroller=document.querySelector('#main-content');
    scroller.scrollTo({top:scroller.scrollHeight,behavior:'instant'});
   });
   await p.waitForFunction(()=>{
    const scroller=document.querySelector('#main-content');
    return Math.abs(scroller.scrollTop-(scroller.scrollHeight-scroller.clientHeight))<=1;
   },null,{polling:'raf'});
   assert(await p.locator(selector).evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   const end=await p.locator(last).boundingBox(),nav=await p.locator('#bottom-nav').boundingBox();
   assert(end&&nav&&end.y+end.height<=nav.y+1,JSON.stringify({selector,end,nav}));
  };
  const visible=selector=>p.locator(selector).isVisible();
  await p.evaluate(async()=>{await showVerse('너무 두려워요');displayScreen('result');});await back();assert(await visible('#home-screen'));
  await p.evaluate(()=>{displayScreen('reflection');openDailyMeditation(DailyVerse.get());});await bottomLayout('#meditation-detail','.meditation-journal-save');await p.locator('#meditation-journal-input').fill('미저장');await back();assert(await visible('#meditation-screen'));assert.equal(await p.evaluate(()=>PersonalReflections.list().length),0);
  await p.evaluate(()=>{const e=PersonalReflections.save(DailyVerse.get().id,'기존 기록');openReflectionRecord(e);});await back();assert(await visible('#meditation-list-screen'));
  await p.evaluate(()=>openReflectionRecord(PersonalReflections.list()[0]));await p.getByRole('button',{name:'수정',exact:true}).click();await p.locator('#meditation-journal-input').fill('저장하지 않는 수정');await back();assert(await visible('#meditation-record-screen'));assert.equal(await p.evaluate(()=>PersonalReflections.list()[0].content),'기존 기록');
  await p.evaluate(()=>openReflectionVerse(PersonalReflections.list()[0]));await back();assert(await visible('#meditation-record-screen'));
  for(const date of ['2026-10-01',await p.evaluate(()=>localToday())]){
   await p.evaluate(date=>{displayScreen('prayer');selectedPrayerDate=date;renderPrayerView();openPrayerEditor();},date);await p.locator('#personal-prayer').fill('미저장 기도');await back();assert.equal(await p.evaluate(()=>prayerEditorOpen),false);assert.equal(await p.evaluate(()=>selectedPrayerDate),date);
   await p.evaluate(date=>{PrayerJournal.save('기존 기도',null,date);openPrayerEditor(PrayerJournal.list().find(e=>localDateKey(e.createdAt)===date));},date);await p.locator('#personal-prayer').fill('미저장 수정');await back();assert.equal(await p.evaluate(()=>prayerEditorOpen),false);assert.equal(await p.evaluate(()=>selectedPrayerDate),date);assert(await p.evaluate(()=>PrayerJournal.list().every(e=>e.content==='기존 기도')));
  }
  await p.locator('.answer-begin').first().click();await back();assert.equal(await p.evaluate(()=>activeAnswerId),null);
  await p.locator('#open-settings').click();await back();assert.equal(await p.locator('#settings-dialog').getAttribute('open'),null);assert(await visible('#prayer-screen'));
  await p.evaluate(()=>displayScreen('gratitude'));const date=await p.locator('#gratitude-screen .calendar-day[data-date]').first().getAttribute('data-date');await p.locator(`#gratitude-screen [data-date="${date}"]`).click();await p.getByRole('button',{name:'감사 기록하기',exact:true}).click();await bottomLayout('#gratitude-screen','.gratitude-input-card:last-child .gratitude-field-buttons');await p.locator('#gratitude-today').fill('미저장 감사');await back();assert.equal(await p.locator('#gratitude-screen .is-selected').getAttribute('data-date'),date);assert.equal(await p.locator('#gratitude-screen .gratitude-form').count(),0);
  await p.evaluate(date=>window.Malsseum.services.gratitudeJournal.saveField(date,'today','기존 감사'),date);await p.locator(`#gratitude-screen [data-date="${date}"]`).click();await p.getByRole('button',{name:'수정하기',exact:true}).click();await p.locator('.gratitude-field-delete').first().click();await back();assert.equal(await p.locator('dialog[open]').count(),0);assert(await visible('.gratitude-form'));await p.locator('.gratitude-field-save').first().click();await p.locator('#gratitude-today').fill('미저장 수정');await back();assert.equal(await p.locator('#gratitude-screen .is-selected').getAttribute('data-date'),date);assert.equal(await p.evaluate(date=>window.Malsseum.services.gratitudeJournal.list().find(e=>e.date===date).today,date),'기존 감사');
  await p.evaluate(()=>{displayScreen('profile');if(!SavedVerses.has('psalm-56-3'))SavedVerses.toggle('psalm-56-3');openSavedVerse('psalm-56-3');});await back();assert(await visible('#profile-screen, #my-screen'));
  await p.evaluate(()=>{const v=Object.values(window.Malsseum.data.dailyVerseOverrides)[0];if(!SavedVerses.has(v.id))SavedVerses.toggle(v.id);openSavedVerse(v.id);});await back();assert.equal(await p.evaluate(()=>currentAppScreen),'profile');
  const historyBefore=await p.evaluate(()=>history.length);
  for(const tab of ['reflection','home','gratitude','prayer','profile']){
   await p.evaluate(tab=>displayScreen(tab),tab);await back();assert.equal(await p.evaluate(()=>currentAppScreen),tab);assert(await visible('.android-back-notice'));assert.equal(await p.evaluate(()=>exitCalls),0);assert(await p.locator('.android-back-notice').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  }
  assert.equal(await p.evaluate(()=>history.length),historyBefore);
  await p.evaluate(()=>backListeners.appStateChange({isActive:false}));assert(!(await visible('.android-back-notice')));await back();assert.equal(await p.evaluate(()=>exitCalls),0);await back();assert.equal(await p.evaluate(()=>exitCalls),1);
  assert.deepEqual(errors,[]);console.log('PASS Android back routes, preserved records/dates, overlays, root exit, no tab history',width,size);await p.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
