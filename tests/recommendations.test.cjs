const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function app() {
 const context = vm.createContext({window:{}});
 for (const file of ['data/topics','data/verses','data/reflections','services/classifyConcern','services/findCandidates','services/recommendationPolicy','services/selectVerse','services/recommendationHistory']) {
  vm.runInContext(fs.readFileSync(path.join(root,'dist',file+'.js'),'utf8'),context);
 }
 const {data,services:s}=context.window.Malsseum;
 const choose=(message,options={})=>{const analysis=s.classifyConcern(message);return s.selectVerse(analysis,s.findCandidates(analysis,options.verses),options);};
 return {data,s,choose};
}
test('catalogue has ten topics, 49 unique verses, 3 ready and 46 pending',()=>{
 const {data,s}=app(); assert.equal(data.topics.length,10);assert.equal(data.verses.length,49);
 assert.equal(new Set(data.verses.map(v=>v.id)).size,49);
 assert.equal(new Set(data.verses.map(v=>v.reference)).size,49);
 assert.equal(data.verses.filter(s.recommendationPolicy.isActive).length,3);
 assert.equal(data.verses.filter(v=>v.textStatus==='pending_verification').length,46);
 assert.equal(data.verses.reduce((n,v)=>n+v.topics.length,0),52);
 for(const verse of data.verses){
  for(const key of ['id','reference','book','recommendationNote','contextNote'])assert.ok(typeof verse[key]==='string'&&verse[key].length);
  for(const key of ['chapter','verseStart','verseEnd'])assert.ok(Number.isInteger(verse[key]));
  for(const key of ['topics','situations','expressions','cautionTags'])assert.ok(Array.isArray(verse[key]));
  for(const id of verse.topics)assert.ok(data.topics.some(t=>t.id===id));
  assert.ok(verse.verseEnd>=verse.verseStart);
  assert.equal(new Set(verse.topics).size,verse.topics.length);
  if(verse.textStatus==='verified'){
   assert.ok(verse.text.trim());assert.equal(verse.translation,'개역한글');
   for(const key of ['reflection','question','prayer'])assert.ok(data.reflections[verse.id][key]);
  }else{
   assert.equal(verse.text,'');assert.equal(verse.translation,null);assert.equal(verse.targetTranslation,'개역개정');
   assert.equal(verse.textStatusLabel,'본문 검증 대기');assert.equal(verse.recommendationEnabled,false);
   assert.equal(verse.guidanceStatus,'pending');assert.equal(verse.metadataStatus,'draft');
   assert.equal(data.reflections[verse.id],undefined);
  }
 }
});
for(const [message,id] of [['너무 지쳤어요','matthew-11-28'],['불안하고 두려워요','psalm-56-3'],['외로워요','psalm-34-18'],['어제 엄마가 돌아가셨어요','psalm-34-18'],['친구에게 상처받았어요','psalm-34-18']]){
 test('appropriate selection: '+message,()=>assert.equal(app().choose(message).verse.id,id));
}
test('multiple topics and loss timing are explicit',()=>{
 const {s}=app();const a=s.classifyConcern('어제 이별해서 슬프고 외로워요. 앞날이 두려워요');
 assert.ok(a.primaryTopic); assert.ok(a.secondaryTopics.length>=2);assert.ok(a.situations.includes('recent_loss'));
 assert.ok(Array.isArray(a.riskSignals)&&Array.isArray(a.uncertainties));
 assert.ok(s.classifyConcern('슬퍼요').uncertainties.includes('상실의 시점을 알 수 없음'));
});
for(const message of ['오늘 날씨 이야기','감사하고 기뻐요','진로를 선택하고 싶어요','실패해서 좌절했어요','잘못한 일이 후회돼요','기도가 어렵고 믿음이 흔들려요']){
 test('no forced default: '+message,()=>{const r=app().choose(message);assert.equal(r.verse,null);assert.ok(['needs_clarification','no_suitable_candidate'].includes(r.status));});
}
test('negated emotion does not produce a recommendation',()=>assert.equal(app().choose('불안하지 않아요').verse,null));
for(const message of ['남편이 때려서 무서워요','학대를 당해요','휴대폰을 검사하고 못 나가게 해요','죽고 싶어요']){
 test('safety before scripture: '+message,()=>{const r=app().choose(message);assert.equal(r.status,'safety_first');assert.equal(r.verse,null);});
}
test('continuity is preserved for acknowledgements and same concern',()=>{
 const {choose}=app();const first=choose('지쳤어요');const options={continueConversation:true,previousId:first.verse.id,previousAnalysis:first.analysis};
 for(const message of ['고마워요','계속 읽고 싶어요','여전히 지쳐요']){const r=choose(message,options);assert.equal(r.verse.id,first.verse.id);assert.equal(r.continued,true);}
});
test('new concern replaces old verse; an acknowledgement prefix does not hide it',()=>{
 const {choose}=app();const first=choose('지쳤어요');const options={continueConversation:true,previousId:first.verse.id,previousAnalysis:first.analysis};
 assert.equal(choose('고마워요. 어제 가족이 돌아가셨어요',options).verse.id,'psalm-34-18');
 assert.equal(choose('이제 실패한 일이 후회돼요',options).verse,null);
 assert.equal(choose('배우자가 때려요',options).status,'safety_first');
});
test('unresolved risk is not silently forgotten on next turn',()=>{
 const {choose}=app();const first=choose('폭행을 당했어요');
 const next=choose('지쳤어요',{continueConversation:true,previousAnalysis:first.analysis});
 assert.equal(next.status,'safety_first');assert.equal(next.verse,null);
 assert.ok(next.analysis.riskSignals.includes('violence'));
});
for(const [tag,message] of [['endurance_pressure','번아웃으로 지쳤어요'],['immediate_forgiveness','어제 관계에서 상처받았어요'],['premature_hope','어제 가족이 돌아가셨어요'],['unreviewed_tag','지쳤어요']]){
 test('policy prevents unsuitable application: '+tag+' / '+message,()=>{
  const {choose,data}=app();const original=choose(message).verse;
  const risky={...original,cautionTags:[tag]};
  const r=choose(message,{verses:[risky]});assert.equal(r.verse,null);assert.ok(r.reviews[0].reasons.length);
  const safe={...original,id:'test-safe-alternative'};
  assert.equal(choose(message,{verses:[risky,safe]}).verse.id,safe.id);
 });
}
test('context note is mandatory and unsafe relationship applications are excluded',()=>{
 const {choose,data,s}=app();const v=data.verses[0];
 assert.equal(choose('지쳤어요',{verses:[{...v,contextNote:''}]}).verse,null);
 const analysis=s.classifyConcern('폭력이 있어요');
 for(const tag of ['reconciliation_pressure','endurance_in_danger'])assert.equal(s.recommendationPolicy.review({...v,cautionTags:[tag]},analysis).excluded,true);
});
test('prior verse is reviewed again after new loss information',()=>{
 const {choose,data}=app();const v={...data.verses[2],cautionTags:['premature_hope']};
 const initial=choose('외로워요',{verses:[v]});assert.ok(initial.verse);
 const next=choose('어제 가족이 돌아가셨어요',{verses:[v],continueConversation:true,previousId:v.id,previousAnalysis:initial.analysis});
 assert.equal(next.verse,null);
});
test('recent loss context survives followups before applying cautions',()=>{
 const {choose,data}=app();const initial=choose('어제 엄마가 돌아가셨어요');
 const rest={...data.verses[0],cautionTags:['premature_hope']};
 const next=choose('지쳤어요',{verses:[rest],continueConversation:true,previousId:initial.verse.id,previousAnalysis:initial.analysis});
 assert.equal(next.verse,null);assert.ok(next.analysis.situations.includes('recent_loss'));
});
test('repetition is considered only among comparable suitable candidates',()=>{
 const {choose,data}=app();const original=data.verses[0], second={...original,id:'test-rest-2'};
 assert.equal(choose('지쳤어요',{verses:[original,second],history:[original.id]}).verse.id,second.id);
 assert.equal(choose('지쳤어요',{history:Array(10).fill(original.id)}).verse.id,original.id);
});
test('invalid input is rejected and history contains IDs only',()=>{
 const {s}=app();for(const value of ['',null,' '.repeat(10),'가'.repeat(1001)])assert.throws(()=>s.classifyConcern(value));
 const h=s.createRecommendationHistory(2);h.record('a');h.record('b');h.record('c');assert.equal(h.snapshot().join(','),'b,c');
});
test('HTML keeps all assets reachable and loads policy before selection',()=>{
 const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(!/^(?:https?:|data:)/.test(match[1]))assert.ok(fs.existsSync(path.join(root,'dist',match[1])),match[1]);
 }
 assert.ok(html.indexOf('recommendationPolicy.js')<html.indexOf('selectVerse.js'));
});
test('duplicate psalm is merged and prior topic links are preserved',()=>{
 const {data}=app();
 assert.equal(data.verses.find(v=>v.reference==='시편 147:3').topics.slice().sort().join(','),'grief,relationship');
 assert.equal(data.verses.find(v=>v.reference==='시편 34:18').topics.slice().sort().join(','),'grief,loneliness,relationship');
 const expected={rest:5,fear:5,loneliness:5,grief:6,relationship:6,future:5,failure:5,guilt:5,faith:5,gratitude:5};
 for(const [topic,count] of Object.entries(expected))assert.equal(data.verses.filter(v=>v.topics.includes(topic)).length,count,topic);
});
test('all 46 pending passages stay outside actual candidate collection',()=>{
 const {s,data}=app();
 for(const verse of data.verses.filter(v=>v.textStatus==='pending_verification')){
  const analysis={primaryTopic:verse.topics[0],secondaryTopics:verse.topics.slice(1),situations:verse.situations,riskSignals:[],uncertainties:[],matched:true,mixed:false};
  assert.ok(!s.findCandidates(analysis).some(c=>c.verse.id===verse.id),verse.id);
  const direct=s.selectVerse(analysis,[{verse,score:100,matchedTopics:verse.topics,matchedSituations:verse.situations}],{verses:[verse]});
  assert.equal(direct.verse,null,'direct injection '+verse.id);
  const followup=s.selectVerse(analysis,[],{verses:[verse],continueConversation:true,previousId:verse.id,previousAnalysis:analysis});
  assert.equal(followup.verse,null,'continuation '+verse.id);
 }
});
test('every readiness gate fails closed even when other flags say active',()=>{
 const {data,s,choose}=app(),original=data.verses[0];
 for(const change of [{text:''},{text:'  '},{textStatus:'pending_verification'},{textStatus:null},{recommendationEnabled:false},{translation:null},{metadataStatus:'draft'},{guidanceStatus:'pending'}]){
  const verse={...original,...change};assert.equal(s.recommendationPolicy.isActive(verse),false);assert.equal(choose('지쳤어요',{verses:[verse]}).verse,null);
 }
});
test('tagged passage is usable for sustained effort but not severe exhaustion',()=>{
 const {data,choose,s}=app();
 // Test-only activation reuses an existing verified quotation. No new biblical text is written.
 const galatians={...data.verses.find(v=>v.reference==='갈라디아서 6:9'),text:data.verses[0].text,translation:data.verses[0].translation,textStatus:'verified',recommendationEnabled:true,guidanceStatus:'ready',metadataStatus:'reviewed'};
 const ready='오래 좋은 일을 했는데 보람이 없어 낙심해요';
 assert.ok(s.classifyConcern(ready).situations.includes('prolonged_effort'));
 assert.equal(choose(ready,{verses:[galatians,data.verses[0]]}).verse.id,galatians.id);
 const exhausted='오래 노력했지만 번아웃이고 쉬어야 해서 지쳤어요';
 assert.equal(choose(exhausted,{verses:[galatians]}).verse,null);
 assert.equal(choose(exhausted,{verses:[galatians,data.verses[0]]}).verse.id,data.verses[0].id);
});
test('mild caution lowers priority without universally banning a passage',()=>{
 const {data,choose}=app();const tagged={...data.verses[0],id:'test-caution',cautionTags:['endurance_pressure']};
 const alone=choose('지쳤어요',{verses:[tagged]});assert.equal(alone.verse.id,tagged.id);assert.ok(alone.avoidApplications.includes('endurance_pressure'));
 assert.equal(choose('지쳤어요',{verses:[tagged,data.verses[0]]}).verse.id,data.verses[0].id);
});
test('positive readiness allows forgiveness and hope without overriding acute harm',()=>{
 const {data,s}=app();
 for(const [tag,topic,ready,acute] of [['immediate_forgiveness','relationship','forgiveness_when_ready','fresh_relationship_wound'],['premature_hope','grief','hope_when_ready','recent_loss']]){
  const verse={...data.verses[2],cautionTags:[tag]};
  const a={primaryTopic:topic,secondaryTopics:[],situations:[ready],riskSignals:[]};
  assert.equal(s.recommendationPolicy.review(verse,a).priority,1);
  assert.equal(s.recommendationPolicy.review(verse,a).excluded,false);
  assert.equal(s.recommendationPolicy.review(verse,{...a,situations:[ready,acute]}).excluded,true);
 }
});
test('warnings against distortion and guaranteed outcomes are application constraints',()=>{
 const {data,choose}=app();
 for(const tag of ['guaranteed_outcome','context_distortion']){
  const verse={...data.verses[0],cautionTags:[tag]};
  const result=choose('지쳤어요',{verses:[verse]});assert.equal(result.verse.id,verse.id);assert.ok(result.avoidApplications.includes(tag));
  assert.equal(choose('지쳤어요',{verses:[verse],applicationTags:[tag]}).verse,null);
 }
});
test('faith questions are not judged as deficient faith',()=>{
 const {s,data,choose}=app();
 const result=choose('기도가 어렵고 믿음이 흔들려요');assert.equal(result.verse,null);assert.ok(result.message.includes('단정하지 않을게요'));
 const review=s.recommendationPolicy.review(data.verses[0],s.classifyConcern('지쳤어요'));
 assert.ok(review.avoidApplications.includes('faith_shaming'));
 assert.equal(choose('지쳤어요',{applicationTags:['faith_shaming']}).verse,null);
});
test('metadata cautions all have defined policies and guidance is never synthesized',()=>{
 const {data,s}=app();
 for(const verse of data.verses){
  assert.ok(Array.isArray(verse.applicationGuidance.suitableSituations));
  assert.ok(Array.isArray(verse.applicationGuidance.avoidApplications));
  for(const tag of [...verse.cautionTags,...verse.applicationGuidance.avoidApplications])assert.ok(s.recommendationPolicy.cautionRules[tag],verse.id+': '+tag);
  for(const id of verse.applicationGuidance.suitableSituations)assert.ok(verse.situations.includes(id));
  if(verse.textStatus==='pending_verification')for(const field of ['reflection','prayer','question'])assert.equal(verse[field],undefined);
 }
});
