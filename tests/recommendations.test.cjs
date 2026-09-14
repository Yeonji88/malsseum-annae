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
test('catalogue has ten topics, 59 unique verses, all texts ready and optional guidance pending',()=>{
 const {data,s}=app(); assert.equal(data.topics.length,10);assert.equal(data.verses.length,59);
 assert.equal(new Set(data.verses.map(v=>v.id)).size,59);
 assert.equal(new Set(data.verses.map(v=>v.reference)).size,59);
 assert.equal(data.verses.filter(s.recommendationPolicy.isActive).length,59);
 assert.equal(data.verses.filter(v=>v.textStatus==='pending_verification').length,0);
 assert.equal(data.verses.slice(0,49).reduce((n,v)=>n+v.topics.length,0),52);
 for(const verse of data.verses){
  for(const key of ['id','reference','book','recommendationNote','contextNote'])assert.ok(typeof verse[key]==='string'&&verse[key].length);
  for(const key of ['chapter','verseStart','verseEnd'])assert.ok(Number.isInteger(verse[key]));
  for(const key of ['topics','situations','expressions','cautionTags'])assert.ok(Array.isArray(verse[key]));
  for(const id of verse.topics)assert.ok(data.topics.some(t=>t.id===id));
  assert.ok(verse.verseEnd>=verse.verseStart);
  assert.equal(new Set(verse.topics).size,verse.topics.length);
  assert.equal(verse.textStatus,'verified');assert.ok(verse.text.trim());assert.equal(verse.translation,'개역개정');
  assert.equal(verse.textVerificationSource,'user_supplied');assert.equal(verse.recommendationEnabled,true);
  if(data.reflections[verse.id]){
   for(const key of ['reflection','question','prayer'])assert.ok(data.reflections[verse.id][key]);
   assert.equal(verse.guidanceStatus,['matthew-11-28','psalm-56-3','psalm-34-18'].includes(verse.id)?'ready':'pending');
  }else{
   assert.equal(verse.guidanceStatus,'pending');assert.equal(verse.metadataStatus,'draft');
   for(const key of ['reflection','question','prayer'])assert.equal(verse[key],undefined);
  }
 }
});
for(const [message,id] of [['너무 지쳤어요','matthew-11-28'],['불안하고 두려워요','isaiah-41-10'],['외로워요','psalm-34-18'],['어제 엄마가 돌아가셨어요','john-11-35'],['친구에게 상처받았어요','psalm-34-18']]){
 test('appropriate selection: '+message,()=>assert.equal(app().choose(message).verse.id,id));
}
test('multiple topics and loss timing are explicit',()=>{
 const {s}=app();const a=s.classifyConcern('어제 이별해서 슬프고 외로워요. 앞날이 두려워요');
 assert.ok(a.primaryTopic); assert.ok(a.secondaryTopics.length>=2);assert.ok(a.situations.includes('recent_loss'));
 assert.ok(Array.isArray(a.riskSignals)&&Array.isArray(a.uncertainties));
 assert.ok(s.classifyConcern('슬퍼요').uncertainties.includes('상실의 시점을 알 수 없음'));
});
for(const message of ['오늘 날씨 이야기','12345','어떻게 말해야 할지 모르겠어요']){
 test('no forced default: '+message,()=>{const r=app().choose(message);assert.equal(r.verse,null);assert.ok(['needs_clarification','no_suitable_candidate'].includes(r.status));});
}
test('negated emotion does not produce a recommendation',()=>assert.equal(app().choose('불안하지 않아요').verse,null));
for(const message of ['화가 나','화가나요','화났어요','화가 났어요','짜증나요','분노','분노가 생겨요','열받아요','너무 열받아요']){
 test('short anger expression: '+message,()=>{
  const {s,choose}=app(),analysis=s.classifyConcern(message);
  assert.equal(analysis.primaryTopic,'relationship');
  assert.ok(analysis.situations.includes('anger_processing'));
  assert.ok(s.findCandidates(analysis).some(candidate=>candidate.verse.id==='ephesians-4-26-27'));
  assert.equal(choose(message).status,'selected');
 });
}
test('a single 화 still asks for clarification',()=>{
 const {s,choose}=app(),analysis=s.classifyConcern('화');
 assert.equal(analysis.primaryTopic,null);assert.equal(analysis.situations.length,0);
 assert.equal(s.findCandidates(analysis).length,0);assert.equal(choose('화').status,'needs_clarification');
});
test('violence takes priority over an anger match',()=>{
 const {s,choose}=app(),message='남편이 나를 때려서 너무 화가 나요',analysis=s.classifyConcern(message);
 assert.ok(analysis.situations.includes('anger_processing'));
 assert.ok(analysis.riskSignals.includes('violence'));
 const result=choose(message);assert.equal(result.status,'safety_first');assert.equal(result.verse,null);
});
for(const [message,topic,situations] of [
 ['우울해요','grief',[]],['우울해','grief',[]],['울적해요','grief',[]],
 ['기분이 가라앉아요','grief',[]],['마음이 무거워요','grief',[]],
 ['무기력해요','rest',[]],['아무것도 하기 싫어요','rest',[]],
 ['슬퍼요','grief',[]],['외로워요','loneliness',['isolation']],
 ['불안해요','fear',[]],['무서워요','fear',[]],['지쳤어요','rest',[]],
 ['힘들어요','rest',[]],['화가나요','relationship',['anger_processing']],
 ['짜증나요','relationship',['anger_processing']]
]){
 test('short feeling has broad candidates: '+message,()=>{
  const {s,choose}=app(),analysis=s.classifyConcern(message);
  assert.equal(analysis.primaryTopic,topic);
  assert.equal(analysis.situations.join('|'),situations.join('|'));
  assert.ok(s.findCandidates(analysis).length>0);
  assert.equal(choose(message).status,'selected');
 });
}
for(const [message,risk] of [['우울해요. 죽고 싶어요','self_harm'],['남편이 때려서 우울해요','violence']]){
 test('safety precedes a short low-mood match: '+message,()=>{
  const {s,choose}=app(),analysis=s.classifyConcern(message);
  assert.ok(analysis.riskSignals.includes(risk));
  const result=choose(message);assert.equal(result.status,'safety_first');assert.equal(result.verse,null);
 });
}
for(const [message,situations] of [
 ['고민이 돼요',[]],['고민돼요',[]],['고민이에요',[]],
 ['어떻게 해야 할지 모르겠어요',[]],
 ['결정을 못 하겠어요',['uncertain_future','decision_uncertainty']],
 ['뭘 선택해야 할지 모르겠어요',['decision_uncertainty']],
 ['어느 쪽이 맞는지 모르겠어요',['decision_uncertainty']],
 ['방향을 모르겠어요',['seeking_guidance']]
]){
 test('short decision concern: '+message,()=>{
  const {s,choose}=app(),analysis=s.classifyConcern(message),candidates=s.findCandidates(analysis);
  assert.equal(analysis.primaryTopic,'future');
  assert.equal(analysis.situations.join('|'),situations.join('|'));
  for(const id of ['proverbs-3-5-6','james-1-5','proverbs-16-9','psalm-32-8'])assert.ok(candidates.some(candidate=>candidate.verse.id===id));
  assert.equal(choose(message).status,'selected');
 });
}
test('safety still precedes a short decision concern',()=>{
 const {choose}=app();const result=choose('남편이 때려서 고민이 돼요');
 assert.equal(result.status,'safety_first');assert.equal(result.verse,null);
});
for(const [message,id] of [
 ['화가나요','ephesians-4-26-27'],['짜증나요','ephesians-4-26-27'],['분노해요','ephesians-4-26-27'],
 ['무서워요','psalm-56-3'],['두려워요','psalm-56-3'],
 ['불안해요','philippians-4-6-7'],['걱정돼요','philippians-4-6-7'],
 ['우울해요','psalm-34-18'],['울적해요','psalm-34-18'],
 ['마음이 가라앉아요','psalm-34-18'],['마음이 무거워요','psalm-34-18']
]){
 test('short expression favors its fitting passage: '+message,()=>assert.equal(app().choose(message).verse.id,id));
}
test('mourning, unsupported fear, and healthy boundaries keep their context',()=>{
 const {choose}=app();
 assert.equal(choose('어제 엄마가 돌아가셨어요').verse.id,'john-11-35');
 assert.equal(choose('혼자 감당해야 할까 봐 두려워요').verse.id,'isaiah-41-10');
 assert.equal(choose('관계에서 내 마음을 지킬 경계가 필요해요').verse.id,'proverbs-4-23');
});
test('danger still takes priority over expression preferences',()=>{
 const {choose}=app();
 for(const message of ['남편이 나를 때려서 너무 화가 나요','누가 때려서 무서워요','죽고 싶을 만큼 우울해요']){
  const result=choose(message);assert.equal(result.status,'safety_first');assert.equal(result.verse,null);
 }
});
for(const message of ['남편이 때려서 무서워요','학대를 당해요','휴대폰을 검사하고 못 나가게 해요','죽고 싶어요']){
 test('safety before scripture: '+message,()=>{const r=app().choose(message);assert.equal(r.status,'safety_first');assert.equal(r.verse,null);});
}
test('continuity is preserved for acknowledgements and same concern',()=>{
 const {choose}=app();const first=choose('지쳤어요');const options={continueConversation:true,previousId:first.verse.id,previousAnalysis:first.analysis};
 for(const message of ['고마워요','계속 읽고 싶어요','여전히 지쳐요']){const r=choose(message,options);assert.equal(r.verse.id,first.verse.id);assert.equal(r.continued,true);}
});
test('new concern replaces old verse; an acknowledgement prefix does not hide it',()=>{
 const {choose}=app();const first=choose('지쳤어요');const options={continueConversation:true,previousId:first.verse.id,previousAnalysis:first.analysis};
 assert.equal(choose('고마워요. 어제 가족이 돌아가셨어요',options).verse.id,'john-11-35');
 assert.notEqual(choose('이제 실패한 일이 후회돼요',options).verse.id,first.verse.id);
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
 assert.equal(choose('지쳤어요',{verses:[original],history:Array(10).fill(original.id)}).verse.id,original.id);
 assert.notEqual(choose('지쳤어요',{history:Array(10).fill(original.id)}).verse.id,original.id);
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
 for(const [topic,count] of Object.entries(expected))assert.equal(data.verses.slice(0,49).filter(v=>v.topics.includes(topic)).length,count,topic);
});
test('a pending copy of any newly activated passage stays outside every selection path',()=>{
 const {s,data}=app();
 for(const record of data.verses.filter(v=>v.guidanceStatus==='pending')){
  const verse={...record,textStatus:'pending_verification'};
  const analysis={primaryTopic:verse.topics[0],secondaryTopics:verse.topics.slice(1),situations:verse.situations,riskSignals:[],uncertainties:[],matched:true,mixed:false};
  assert.ok(!s.findCandidates(analysis,[verse]).some(c=>c.verse.id===verse.id),verse.id);
  const direct=s.selectVerse(analysis,[{verse,score:100,matchedTopics:verse.topics,matchedSituations:verse.situations}],{verses:[verse]});
  assert.equal(direct.verse,null,'direct injection '+verse.id);
  const followup=s.selectVerse(analysis,[],{verses:[verse],continueConversation:true,previousId:verse.id,previousAnalysis:analysis});
  assert.equal(followup.verse,null,'continuation '+verse.id);
 }
});
test('every readiness gate fails closed even when other flags say active',()=>{
 const {data,s,choose}=app(),original=data.verses[0];
 for(const change of [{text:''},{text:'  '},{textStatus:'pending_verification'},{textStatus:null},{recommendationEnabled:false},{translation:null}]){
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
 const result=choose('기도가 어렵고 믿음이 흔들려요');assert.ok(result.verse.topics.includes('faith'));assert.ok(result.avoidApplications.includes('faith_shaming'));
 const noCandidates=choose('기도가 어렵고 믿음이 흔들려요',{verses:[]});assert.ok(noCandidates.message.includes('단정하지 않을게요'));
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
  if(verse.guidanceStatus==='pending')for(const field of ['reflection','prayer','question'])assert.equal(verse[field],undefined);
 }
});


const crypto=require('node:crypto');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const normalized=text=>text.replace(/\r\n/g,'\n');
const preserved=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/preserved-metadata-hashes.json'),'utf8'));
const scenarios=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/activation-scenarios.json'),'utf8'));
const newPassages=[
 ['psalm-4-8','시편 4:8','내가 평안히 눕고 자기도 하리니 나를 안전히 살게 하시는 이는 오직 여호와이시니이다','걱정돼서 잠이 안 와요'],
 ['psalm-46-1-2','시편 46:1-2','하나님은 우리의 피난처시요 힘이시니 환난 중에 만날 큰 도움이시라 그러므로 땅이 변하든지 산이 흔들려 바다 가운데에 빠지든지','갑자기 큰일이 생겨서 모든 게 무너지는 것 같아요'],
 ['psalm-62-5-6','시편 62:5-6','나의 영혼아 잠잠히 하나님만 바라라 무릇 나의 소망이 그로부터 나오는도다 오직 그만이 나의 반석이시요 나의 구원이시요 나의 요새이시니 내가 흔들리지 아니하리로다','결과를 기다리는데 너무 조급해요'],
 ['psalm-121-1-2','시편 121:1-2','내가 산을 향하여 눈을 들리라 나의 도움이 어디서 올까 나의 도움은 천지를 지으신 여호와에게서로다','어디서 도움을 받아야 할지 모르겠어요'],
 ['psalm-130-5','시편 130:5','나 곧 내 영혼은 여호와를 기다리며 나는 주의 말씀을 바라는도다','기다림이 너무 길어요'],
 ['isaiah-30-15','이사야 30:15','주 여호와 이스라엘의 거룩하신 이가 이같이 말씀하시되 너희가 돌이켜 조용히 있어야 구원을 얻을 것이요 잠잠하고 신뢰하여야 힘을 얻을 것이거늘 너희가 원하지 아니하고','가만히 있으면 불안하고 뭐라도 해야 할 것 같아요'],
 ['exodus-14-14','출애굽기 14:14','여호와께서 너희를 위하여 싸우시리니 너희는 가만히 있을지니라','내 힘으로는 어떻게 할 수가 없어서 지쳤어요'],
 ['psalm-131-1-2','시편 131:1-2','여호와여 내 마음이 교만하지 아니하고 내 눈이 오만하지 아니하오며 내가 큰 일과 감당하지 못할 놀라운 일을 하려고 힘쓰지 아니하나이다 실로 내가 내 영혼으로 고요하고 평온하게 하기를 젖 뗀 아이가 그의 어머니 품에 있음 같게 하였나니 내 영혼이 젖 뗀 아이와 같도다','마음을 좀 고요하게 가라앉히고 싶어요'],
 ['1-peter-5-7','베드로전서 5:7','너희 염려를 다 주께 맡기라 이는 그가 너희를 돌보심이라','걱정을 혼자 붙들고 있어서 내려놓고 싶어요'],
 ['psalm-94-19','시편 94:19','내 속에 근심이 많을 때에 주의 위안이 내 영혼을 즐겁게 하시나이다','걱정거리도 많고 생각도 너무 많아요']
];
test('new ten passages retain the exact supplied text and only optional guidance is pending',()=>{
 const {data,s}=app();assert.equal(data.verses.length,59);
 assert.equal(newPassages.length,10);
 for(const [id,reference,text] of newPassages){
  const verse=data.verses.find(item=>item.id===id);assert.ok(verse,id);
  assert.equal(verse.reference,reference);assert.equal(verse.text,text);assert.equal(verse.translation,'개역개정');
  assert.equal(verse.guidanceStatus,'pending');assert.equal(data.reflections[id],undefined);
  assert.equal(s.recommendationPolicy.isActive(verse),true);
 }
});
for(const [id,reference,,message] of newPassages){
 test('new context selects '+reference,()=>{
  const {s,choose}=app(),analysis=s.classifyConcern(message);
  assert.ok(analysis.primaryTopic);assert.ok(s.findCandidates(analysis).some(candidate=>candidate.verse.id===id));
  const selected=choose(message);assert.equal(selected.status,'selected');assert.equal(selected.verse.id,id);
 });
}
for(const [message,id] of [
 ['불안해요','philippians-4-6-7'],['힘들어요','matthew-11-28'],['무서워요','psalm-56-3'],
 ['화가나요','ephesians-4-26-27'],['우울해요','psalm-34-18'],['고민이 돼요','james-1-5']
])test('existing short input remains '+message,()=>assert.equal(app().choose(message).verse.id,id));
test('new context passages never bypass the safety gate or application cautions',()=>{
 const {choose}=app();
 for(const message of ['남편이 때려서 잠이 안 와요','폭력 때문에 갑자기 모든 게 무너지는 것 같아요','죽고 싶을 만큼 마음이 복잡해요']){
  const result=choose(message);assert.equal(result.status,'safety_first');assert.equal(result.verse,null);
 }
 assert.equal(choose('걱정돼서 잠이 안 와요',{applicationTags:['endurance_in_danger']}).verse?.id=== 'psalm-4-8',false);
});
for(const {topic,message,reference} of scenarios){
 test('activated catalogue scenario: '+message,()=>{
  const {choose}=app(),r=choose(message);assert.equal(r.status,'selected');assert.equal(r.verse.reference,reference);assert.ok(r.verse.topics.includes(topic));
 });
}
test('original 49 exact text hashes match the user-supplied reference mapping',()=>{
 const {data}=app(),expected=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/supplied-text-hashes.json'),'utf8'));
 assert.equal(Object.keys(expected).length,49);
 assert.deepEqual(data.verses.slice(0,49).map(v=>v.reference).sort().join('|'),Object.keys(expected).sort().join('|'));
 for(const verse of data.verses.slice(0,49)){assert.equal(hash(verse.text),expected[verse.reference],verse.reference);assert.equal(verse.translation,'개역개정');}
});
test('IDs and every preserved metadata field are unchanged',()=>{
 const {data}=app();assert.equal(Object.keys(preserved.hashes).length,49);
 for(const verse of data.verses.slice(0,49)){
  const projection=Object.fromEntries(preserved.fields.map(key=>[key,verse[key]]));
  assert.equal(hash(JSON.stringify(projection)),preserved.hashes[verse.id],verse.id);
 }
});
test('original 49 verses have reflection guidance, three questions, and a prayer without changing other passage metadata',()=>{
 const {data}=app();assert.equal(Object.keys(data.reflections).length,49);
 for(const verse of data.verses.slice(0,49)){
  const guidance=data.reflections[verse.id];assert.ok(guidance,verse.id);
  assert.ok(guidance.reflection.length>50,verse.id);
  assert.equal(guidance.question.split('\n').length,3,verse.id);
  assert.ok(guidance.prayer.endsWith('아멘.'),verse.id);
 }
});
test('stylesheet and unrelated HTML markup remain unchanged',()=>{
 assert.equal(hash(fs.readFileSync(path.join(root,'dist/styles.css'),'utf8')),preserved.stylesHash);
 const html=normalized(fs.readFileSync(path.join(root,'dist/index.html'),'utf8'))
  .replace('<script defer src="ai-config.js"></script><script defer src="services/analyzeConcernWithAI.js"></script>','')
  .replace('현재 입력한 이야기는 기기 안에서만 분석해요. AI 연결 전에는 외부로 전송하지 않아요.','입력한 이야기는 저장되거나 외부로 전송되지 않아요.');
 assert.equal(hash(html),preserved.htmlHash);
});
test('original 49 are candidates with complete guidance',()=>{
 const {data,s}=app();
 for(const verse of data.verses.slice(0,49)){
  const analysis={primaryTopic:verse.topics[0],secondaryTopics:verse.topics.slice(1),situations:verse.situations,riskSignals:[],uncertainties:[]};
  assert.ok(s.findCandidates(analysis).some(c=>c.verse.id===verse.id),verse.id);
  assert.ok(data.reflections[verse.id],verse.id);
 }
});
test('scenario set spans all ten topics and includes newly activated passages',()=>{
 assert.equal(new Set(scenarios.map(x=>x.topic)).size,10);
 for(const topic of new Set(scenarios.map(x=>x.topic)))assert.equal(scenarios.filter(x=>x.topic===topic).length,2);
 const old=new Set(['마태복음 11:28','시편 56:3','시편 34:18']);
 assert.equal(new Set(scenarios.map(x=>x.reference)).size,20);
 assert.equal(new Set(scenarios.filter(x=>!old.has(x.reference)).map(x=>x.reference)).size,18);
});
test('Jeremiah selection retains no-guarantee and no-distortion application constraints',()=>{
 const {data,s}=app();const verse=data.verses.find(v=>v.reference==='예레미야 29:11');
 const analysis={primaryTopic:'future',secondaryTopics:[],situations:['long_wait_disrupted_plans'],riskSignals:[],uncertainties:[],matched:true,mixed:false};
 const candidates=s.findCandidates(analysis);
 const result=s.selectVerse(analysis,candidates);assert.equal(result.verse.id,verse.id);assert.ok(result.avoidApplications.includes('guaranteed_outcome'));
 for(const tag of ['guaranteed_outcome','context_distortion'])assert.equal(s.selectVerse(analysis,candidates,{applicationTags:[tag]}).verse,null);
});
for(const message of ['계획대로 되지 않아 방향을 다시 찾고 있어요','성장이 느려서 자신이 없어요','잘못을 돌아봤는데도 나를 계속 정죄해요','기다림이 길고 계획이 무너진 것 같아요','기도할 말이 떠오르지 않아요']){
 test('documented existing analyser limitation asks rather than forcing: '+message,()=>{
  const r=app().choose(message);assert.equal(r.status,'needs_clarification');assert.equal(r.verse,null);
 });
}
