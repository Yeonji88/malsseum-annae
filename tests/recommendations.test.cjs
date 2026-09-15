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
test('catalogue has ten topics, 100 unique verses, all texts ready and optional guidance pending',()=>{
 const {data,s}=app(); assert.equal(data.topics.length,10);assert.equal(data.verses.length,100);
 assert.equal(new Set(data.verses.map(v=>v.id)).size,100);
 assert.equal(new Set(data.verses.map(v=>v.reference)).size,100);
 assert.equal(data.verses.filter(s.recommendationPolicy.isActive).length,100);
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
test('self-harm phrases keep safety first and the dedicated safety UI is present',()=>{
 const {s,choose}=app();
 for(const message of ['죽고 싶어요','자살하고 싶어요','제 몸을 해치고 싶은 생각이 들어요']){
  const analysis=s.classifyConcern(message);
  assert.ok(analysis.riskSignals.includes('self_harm'),message);
  const result=choose(message);assert.equal(result.status,'safety_first');assert.equal(result.verse,null);
 }
 const source=fs.readFileSync(path.join(root,'dist','app.js'),'utf8');
 assert.match(source,/selection\.status==='safety_first'/);
 assert.match(source,/href='tel:109'/);
 assert.match(source,/📞 109 전화하기/);
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
const passages60to69=[
 ['psalm-42-5','시편 42:5','내 영혼아 네가 어찌하여 낙심하며 어찌하여 내 속에서 불안해 하는가 너는 하나님께 소망을 두라 그가 나타나 도우심으로 말미암아 내가 여전히 찬송하리로다','왜 그런지 모르겠는데 자꾸 우울해요'],
 ['psalm-30-5','시편 30:5','그의 노염은 잠깐이요 그의 은총은 평생이로다 저녁에는 울음이 깃들일지라도 아침에는 기쁨이 오리로다','이 힘든 시간이 언제 끝날까요'],
 ['2-corinthians-4-8-9','고린도후서 4:8-9','우리가 사방으로 욱여쌈을 당하여도 싸이지 아니하며 답답한 일을 당하여도 낙심하지 아니하며\n박해를 받아도 버린 바 되지 아니하며 거꾸러뜨림을 당하여도 망하지 아니하고','문제가 너무 많이 겹쳤어요'],
 ['psalm-40-1-2','시편 40:1-2','내가 여호와를 기다리고 기다렸더니 귀를 기울이사 나의 부르짖음을 들으셨도다\n나를 기가 막힐 웅덩이와 수렁에서 끌어올리시고 내 발을 반석 위에 두사 내 걸음을 견고하게 하셨도다','몇 달째 상황이 그대로예요'],
 ['isaiah-49-15-16','이사야 49:15-16','여인이 어찌 그 젖 먹는 자식을 잊겠으며 자기 태에서 난 아들을 긍휼히 여기지 않겠느냐 그들은 혹시 잊을지라도 나는 너를 잊지 아니할 것이라\n내가 너를 내 손바닥에 새겼고 너의 성벽이 항상 내 앞에 있나니','하나님이 저를 잊으신 것 같아요'],
 ['psalm-73-26','시편 73:26','내 육체와 마음은 쇠약하나 하나님은 내 마음의 반석이시요 영원한 분깃이시라','몸도 마음도 너무 지쳤어요'],
 ['psalm-9-9-10','시편 9:9-10','여호와는 압제를 당하는 자의 요새이시요 환난 때의 요새이시로다\n여호와여 주의 이름을 아는 자는 주를 의지하오리니 이는 주를 찾는 자들을 버리지 아니하심이니이다','너무 힘든데 기댈 곳이 필요해요'],
 ['psalm-10-1','시편 10:1','여호와여 어찌하여 멀리 서시며 어찌하여 환난 때에 숨으시나이까','힘든데 하나님은 어디 계세요'],
 ['romans-8-38-39','로마서 8:38-39','내가 확신하노니 사망이나 생명이나 천사들이나 권세자들이나 현재 일이나 장래 일이나 능력이나\n높음이나 깊음이나 다른 어떤 피조물이라도 우리를 우리 주 그리스도 예수 안에 있는 하나님의 사랑에서 끊을 수 없으리라','하나님이 아직도 저를 사랑하세요?'],
 ['zephaniah-3-17','스바냐 3:17','너의 하나님 여호와가 너의 가운데에 계시니 그는 구원을 베푸실 전능자이시라 그가 너로 말미암아 기쁨을 이기지 못하시며 너를 잠잠히 사랑하시며 너로 말미암아 즐거이 부르며 기뻐하시리라 하리라','하나님도 나 같은 사람을 기뻐하실까요']
];
const passages70to79=[
 ['isaiah-40-11','이사야 40:11','그는 목자 같이 양 떼를 먹이시며 어린 양을 그 팔로 모아 품에 안으시며 젖먹이는 암컷들을 온순히 인도하시리로다','그냥 누가 나를 안아줬으면 좋겠어요'],
 ['matthew-10-29-31','마태복음 10:29-31','참새 두 마리가 한 앗사리온에 팔리지 않느냐 그러나 너희 아버지께서 허락하지 아니하시면 그 하나도 땅에 떨어지지 아니하리라\n너희에게는 머리털까지 다 세신 바 되었나니\n두려워하지 말라 너희는 많은 참새보다 귀하니라','나는 별로 소중하지 않은 사람 같아요'],
 ['psalm-139-13-14','시편 139:13-14','주께서 내 내장을 지으시며 나의 모태에서 나를 만드셨나이다\n내가 주께 감사하옴은 나를 지으심이 심히 기묘하심이라 주께서 하시는 일이 기이함을 내 영혼이 잘 아나이다','내가 너무 싫어요'],
 ['ephesians-2-10','에베소서 2:10','우리는 그가 만드신 바라 그리스도 예수 안에서 선한 일을 위하여 지으심을 받은 자니 이 일은 하나님이 전에 예비하사 우리로 그 가운데서 행하게 하려 하심이니라','나는 아무 쓸모가 없는 것 같아요'],
 ['galatians-1-10','갈라디아서 1:10','이제 내가 사람들에게 좋게 하랴 하나님께 좋게 하랴 사람들에게 기쁨을 구하랴 내가 지금까지 사람들의 기쁨을 구하였다면 그리스도의 종이 아니니라','남들이 나를 어떻게 볼지 너무 신경 쓰여요'],
 ['2-corinthians-10-12','고린도후서 10:12','우리는 자기를 칭찬하는 어떤 자와 더불어 감히 짝하며 비교할 수 없노라 그러나 그들이 자기로써 자기를 헤아리고 자기로써 자기를 비교하니 지혜가 없도다','남들과 비교하면 내가 너무 초라해요'],
 ['1-samuel-16-7','사무엘상 16:7','여호와께서 사무엘에게 이르시되 그의 용모와 키를 보지 말라 내가 이미 그를 버렸노라 내가 보는 것은 사람과 같지 아니하니 사람은 외모를 보거니와 나 여호와는 중심을 보느니라 하시더라','예쁘지 않아서 자신감이 없어요'],
 ['psalm-37-7','시편 37:7','여호와 앞에 잠잠하고 참고 기다리라 자기 길이 형통하며 악한 꾀를 이루는 자 때문에 불평하지 말지어다','다른 사람들은 다 잘되는데 나만 뒤처지는 것 같아요'],
 ['ecclesiastes-3-11','전도서 3:11','하나님이 모든 것을 지으시되 때를 따라 아름답게 하셨고 또 사람들에게는 영원을 사모하는 마음을 주셨느니라 그러나 하나님이 하시는 일의 시종을 사람으로 측량할 수 없게 하셨도다','내 나이에 시작하기엔 너무 늦은 것 같아요'],
 ['psalm-138-8','시편 138:8','여호와께서 나를 위하여 보상해 주시리이다 여호와여 주의 인자하심이 영원하오니 주의 손으로 지으신 것을 버리지 마옵소서','내 인생이 앞으로 어떻게 될지 모르겠어요']
];
const passages80to89=[
 ['romans-12-12','로마서 12:12','소망 중에 즐거워하며 환난 중에 참으며 기도에 항상 힘쓰며','오랫동안 기도했는데 너무 지쳤어요'],
 ['isaiah-55-8-9','이사야 55:8-9','이는 내 생각이 너희의 생각과 다르며 내 길은 너희의 길과 다름이니라 여호와의 말씀이니라\n\n이는 하늘이 땅보다 높음 같이 내 길은 너희의 길보다 높으며 내 생각은 너희의 생각보다 높음이니라','왜 이런 일이 생긴 건지 이해가 안 돼요'],
 ['romans-8-28','로마서 8:28','우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라','지나고 보니 그 힘든 시간에도 의미가 있었을까요'],
 ['genesis-50-20','창세기 50:20','당신들은 나를 해하려 하였으나 하나님은 그것을 선으로 바꾸사 오늘과 같이 많은 백성의 생명을 구원하게 하시려 하셨나니','상처받은 일이 내 삶의 전부가 되지 않았으면 좋겠어요'],
 ['psalm-37-5-6','시편 37:5-6','네 길을 여호와께 맡기라 그를 의지하면 그가 이루시고\n\n네 의를 빛 같이 나타내시며 네 공의를 정오의 빛 같이 하시리로다','하지도 않은 일로 오해받았어요'],
 ['romans-12-19','로마서 12:19','내 사랑하는 자들아 너희가 친히 원수를 갚지 말고 하나님의 진노하심에 맡기라 기록되었으되 원수 갚는 것이 내게 있으니 내가 갚으리라고 주께서 말씀하시니라','나도 똑같이 갚아주고 싶어요'],
 ['proverbs-15-1','잠언 15:1','유순한 대답은 분노를 쉬게 하여도 과격한 말은 노를 격동하느니라','화나서 지금 장문의 문자를 보내려고 해요'],
 ['james-1-19-20','야고보서 1:19-20','내 사랑하는 형제들아 너희가 알지니 사람마다 듣기는 속히 하고 말하기는 더디 하며 성내기도 더디 하라\n\n사람이 성내는 것이 하나님의 의를 이루지 못함이라','그 사람이랑 얘기만 하면 화부터 나요'],
 ['ephesians-4-32','에베소서 4:32','서로 친절하게 하며 불쌍히 여기며 서로 용서하기를 하나님이 그리스도 안에서 너희를 용서하심과 같이 하라','상처는 조금 괜찮아졌는데 용서에 대해 생각하고 있어요'],
 ['romans-12-15','로마서 12:15','즐거워하는 자들과 함께 즐거워하고 우는 자들과 함께 울라','힘들어하는 친구한테 뭐라고 말해야 할지 모르겠어요']
];
const passages90to100=[
 ['ecclesiastes-4-9-10','전도서 4:9-10','두 사람이 한 사람보다 나음은 그들이 수고함으로 좋은 상을 얻을 것임이라\n혹시 그들이 넘어지면 하나가 그 동무를 붙들어 일으키려니와 홀로 있어 넘어지고 붙들어 일으킬 자가 없는 자에게는 화가 있으리라','모든 걸 혼자 감당하고 있는 것 같아요'],
 ['galatians-6-2','갈라디아서 6:2','너희가 짐을 서로 지라 그리하여 그리스도의 법을 성취하라','힘들다고 말하면 다른 사람한테 짐이 될까 봐 못 말하겠어요'],
 ['psalm-127-2','시편 127:2','너희가 일찍이 일어나고 늦게 누우며 수고의 떡을 먹음이 헛되도다 그러므로 여호와께서 그의 사랑하시는 자에게는 잠을 주시는도다','쉬고 있으면 죄책감이 들어요'],
 ['mark-6-31','마가복음 6:31','이르시되 너희는 따로 한적한 곳에 가서 잠깐 쉬어라 하시니 이는 오고 가는 사람이 많아 음식 먹을 겨를도 없음이라','너무 바빠서 밥 먹을 시간도 없어요'],
 ['luke-12-22-24','누가복음 12:22-24','또 제자들에게 이르시되 그러므로 내가 너희에게 이르노니 너희 목숨을 위하여 무엇을 먹을까 몸을 위하여 무엇을 입을까 염려하지 말라\n목숨이 음식보다 중하고 몸이 의복보다 중하니라\n까마귀를 생각하라 심지도 아니하고 거두지도 아니하며 골방도 없고 창고도 없으되 하나님이 기르시나니 너희는 새보다 얼마나 더 귀하냐','생활비가 부족할까 봐 걱정돼요'],
 ['hebrews-13-5-6','히브리서 13:5-6','돈을 사랑하지 말고 있는 바를 족한 줄로 알라 그가 친히 말씀하시기를 내가 결코 너희를 버리지 아니하고 너희를 떠나지 아니하리라 하셨느니라\n그러므로 우리가 담대히 말하되 주는 나를 돕는 이시니 내가 무서워하지 아니하겠노라 사람이 내게 어찌하리요 하노라','돈이 부족해질까 봐 너무 무서워요'],
 ['psalm-73-21-23','시편 73:21-23','내 마음이 산란하며 내 양심이 찔렸나이다\n내가 이같이 우매 무지함으로 주 앞에 짐승이오나\n내가 항상 주와 함께 하니 주께서 내 오른손을 붙드셨나이다','하나님한테 화가 나는데 이래도 되는지 모르겠어요'],
 ['habakkuk-1-2','하박국 1:2','여호와여 내가 부르짖어도 주께서 듣지 아니하시니 어느 때까지리이까 내가 강포로 말미암아 외쳐도 주께서 구원하지 아니하시나이다','하나님이 제 기도를 안 듣는 것 같아요'],
 ['luke-18-1','누가복음 18:1','예수께서 그들에게 항상 기도하고 낙심하지 말아야 할 것을 비유로 말씀하여','이제 기도도 그만하고 싶어요'],
 ['lamentations-3-22-23','예레미야애가 3:22-23','여호와의 인자와 긍휼이 무궁하시므로 우리가 진멸되지 아니함이니이다\n이것들이 아침마다 새로우니 주의 성실하심이 크시도소이다','어제 너무 망쳤는데 오늘 다시 시작하고 싶어요'],
 ['joshua-1-9','여호수아 1:9','내가 네게 명령한 것이 아니냐 강하고 담대하라 두려워하지 말며 놀라지 말라 네가 어디로 가든지 네 하나님 여호와가 너와 함께 하느니라 하시니라','새로운 일을 시작하려니까 무서워요']
];
test('new ten passages retain the exact supplied text and only requested guidance is added',()=>{
 const {data,s}=app();assert.equal(data.verses.length,100);
 assert.equal(newPassages.length,10);
 for(const [id,reference,text] of newPassages){
  const verse=data.verses.find(item=>item.id===id);assert.ok(verse,id);
  assert.equal(verse.reference,reference);assert.equal(verse.text,text);assert.equal(verse.translation,'개역개정');
  assert.equal(verse.guidanceStatus,'pending');
  const guidance=data.reflections[id];assert.ok(guidance,id);
  assert.ok(guidance.reflection.length>50,id);
  assert.equal(guidance.question.split('\n').length,3,id);
  assert.ok(guidance.prayer.endsWith('아멘.'),id);
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
test('passages 60 to 69 preserve supplied text and include requested guidance',()=>{
 const {data,s}=app();assert.equal(passages60to69.length,10);
 for(const [id,reference,text] of passages60to69){
  const verse=data.verses.find(item=>item.id===id);assert.ok(verse,id);
  assert.equal(verse.reference,reference);assert.equal(verse.text,text);assert.equal(verse.translation,'개역개정');
  assert.equal(verse.textVerificationSource,'user_supplied');assert.equal(verse.guidanceStatus,'pending');
  const guidance=data.reflections[id];assert.ok(guidance,id);
  assert.ok(guidance.reflection.length>50,id);
  assert.equal(guidance.question.split('\n').length,3,id);
  assert.ok(guidance.prayer.endsWith('아멘.'),id);
  assert.equal(s.recommendationPolicy.isActive(verse),true);
 }
});
for(const [id,reference,,message] of passages60to69){
 test('60-69 context selects '+reference,()=>{
  const {s,choose,data}=app(),analysis=s.classifyConcern(message),candidates=s.findCandidates(analysis);
  assert.ok(candidates.some(candidate=>candidate.verse.id===id),id);
  const result=choose(message);assert.equal(result.status,'selected');assert.equal(result.verse.id,id);
  for(const expression of data.verses.find(verse=>verse.id===id).expressions)assert.equal(choose(expression).verse?.id,id,expression);
 });
}
test('60-69 distinctions, medical restraint, and safety priority are preserved',()=>{
 const {choose}=app();
 for(const [message,id] of [
  ['하나님이 저를 잊으신 것 같아요','isaiah-49-15-16'],
  ['힘든데 하나님은 어디 계세요','psalm-10-1'],
  ['하나님이 아직도 저를 사랑하세요?','romans-8-38-39'],
  ['하나님도 나 같은 사람을 기뻐하실까요','zephaniah-3-17'],
  ['왜 그런지 모르겠는데 자꾸 우울해요','psalm-42-5'],
  ['문제가 너무 많이 겹쳤어요','2-corinthians-4-8-9'],
  ['몇 달째 상황이 그대로예요','psalm-40-1-2'],
  ['몸도 마음도 너무 지쳤어요','psalm-73-26']
 ])assert.equal(choose(message).verse?.id,id,message);
 const medical=choose('생리통이 너무 심해서 잠이 안 와요');
 assert.equal(medical.status,'no_suitable_candidate');assert.equal(medical.verse,null);
 for(const message of ['남편이 때려서 여러 일이 동시에 터졌어요','폭력 때문에 어디라도 숨고 싶어요']){
  const result=choose(message);assert.equal(result.status,'safety_first');assert.equal(result.verse,null);
 }
});
test('passages 70 to 79 preserve supplied text and include requested guidance',()=>{
 const {data,s}=app();assert.equal(passages70to79.length,10);
 for(const [id,reference,text] of passages70to79){
  const verse=data.verses.find(item=>item.id===id);assert.ok(verse,id);
  assert.equal(verse.reference,reference);assert.equal(verse.text,text);assert.equal(verse.translation,'개역개정');
  assert.equal(verse.textVerificationSource,'user_supplied');assert.equal(verse.guidanceStatus,'pending');
  const guidance=data.reflections[id];assert.ok(guidance,id);
  assert.ok(guidance.reflection.length>50,id);
  assert.equal(guidance.question.split('\n').length,3,id);
  assert.ok(guidance.prayer.endsWith('아멘.'),id);
  assert.equal(s.recommendationPolicy.isActive(verse),true);
 }
});
for(const [id,reference,,message] of passages70to79){
 test('70-79 context selects '+reference,()=>{
  const {s,choose,data}=app(),analysis=s.classifyConcern(message),candidates=s.findCandidates(analysis);
  assert.ok(candidates.some(candidate=>candidate.verse.id===id),id);
  assert.equal(choose(message).verse?.id,id,message);
  for(const expression of data.verses.find(verse=>verse.id===id).expressions)assert.equal(choose(expression).verse?.id,id,expression);
 });
}
test('70-79 distinctions and safety priority are preserved',()=>{
 const {choose}=app();
 for(const [message,id] of [
  ['나는 별로 소중하지 않은 사람 같아요','matthew-10-29-31'],
  ['내가 너무 싫어요','psalm-139-13-14'],
  ['나는 아무 쓸모가 없는 것 같아요','ephesians-2-10'],
  ['남들이 나를 어떻게 볼지 너무 신경 쓰여요','galatians-1-10'],
  ['남들과 비교하면 내가 너무 초라해요','2-corinthians-10-12'],
  ['예쁘지 않아서 자신감이 없어요','1-samuel-16-7'],
  ['다른 사람들은 다 잘되는데 나만 뒤처지는 것 같아요','psalm-37-7'],
  ['내 나이에 시작하기엔 너무 늦은 것 같아요','ecclesiastes-3-11'],
  ['내 인생이 앞으로 어떻게 될지 모르겠어요','psalm-138-8'],
  ['그냥 누가 나를 안아줬으면 좋겠어요','isaiah-40-11']
 ])assert.equal(choose(message).verse?.id,id,message);
 const danger=choose('남편이 때려서 위로받고 싶어요');
 assert.equal(danger.status,'safety_first');assert.equal(danger.verse,null);
});
test('passages 80 to 89 preserve supplied text and include requested guidance',()=>{
 const {data,s}=app();assert.equal(passages80to89.length,10);
 for(const [id,reference,text] of passages80to89){
  const verse=data.verses.find(item=>item.id===id);assert.ok(verse,id);
  assert.equal(verse.reference,reference);assert.equal(verse.text,text);assert.equal(verse.translation,'개역개정');
  assert.equal(verse.textVerificationSource,'user_supplied');assert.equal(verse.guidanceStatus,'pending');
  const guidance=data.reflections[id];assert.ok(guidance,id);
  assert.ok(guidance.reflection.length>50,id);
  assert.equal(guidance.question.split('\n').length,3,id);
  assert.ok(guidance.prayer.endsWith('아멘.'),id);
  assert.equal(s.recommendationPolicy.isActive(verse),true);
 }
});
for(const [id,reference,,message] of passages80to89){
 test('80-89 context selects '+reference,()=>{
  const {s,choose,data}=app(),analysis=s.classifyConcern(message),candidates=s.findCandidates(analysis);
  assert.ok(candidates.some(candidate=>candidate.verse.id===id),id);
  assert.equal(choose(message).verse?.id,id,message);
  for(const expression of data.verses.find(verse=>verse.id===id).expressions)assert.equal(choose(expression).verse?.id,id,expression);
 });
}
test('80-89 distinctions, acute grief restraint, and safety priority are preserved',()=>{
 const {choose}=app();
 for(const [message,id] of [
  ['오랫동안 기도했는데 너무 지쳤어요','romans-12-12'],
  ['왜 이런 일이 생긴 건지 이해가 안 돼요','isaiah-55-8-9'],
  ['지나고 보니 그 힘든 시간에도 의미가 있었을까요','romans-8-28'],
  ['상처받은 일이 내 삶의 전부가 되지 않았으면 좋겠어요','genesis-50-20'],
  ['하지도 않은 일로 오해받았어요','psalm-37-5-6'],
  ['나도 똑같이 갚아주고 싶어요','romans-12-19'],
  ['화나서 지금 장문의 문자를 보내려고 해요','proverbs-15-1'],
  ['그 사람이랑 얘기만 하면 화부터 나요','james-1-19-20'],
  ['상처는 조금 괜찮아졌는데 용서에 대해 생각하고 있어요','ephesians-4-32'],
  ['힘들어하는 친구한테 뭐라고 말해야 할지 모르겠어요','romans-12-15']
 ])assert.equal(choose(message).verse?.id,id,message);
 for(const message of ['누군가가 저를 때려서 무서워요','남편이 때리는데 제가 용서해야 하나요']){
  const result=choose(message);assert.equal(result.status,'safety_first');assert.equal(result.verse,null);
 }
 for(const message of ['어제 엄마가 돌아가셨어요','어제 가족을 잃어서 너무 힘들어요']){
  const result=choose(message);assert.notEqual(result.verse?.id,'romans-8-28',message);
 }
});
test('passages 90 to 100 preserve supplied text and include requested guidance',()=>{
 const {data,s}=app();assert.equal(passages90to100.length,11);
 for(const [id,reference,text] of passages90to100){
  const verse=data.verses.find(item=>item.id===id);assert.ok(verse,id);
  assert.equal(verse.reference,reference);assert.equal(verse.text,text);assert.equal(verse.translation,'개역개정');
  assert.equal(verse.textVerificationSource,'user_supplied');assert.equal(verse.guidanceStatus,'pending');
  const guidance=data.reflections[id];assert.ok(guidance,id);
  assert.ok(guidance.reflection.length>50,id);
  assert.equal(guidance.question.split('\n').length,3,id);
  assert.ok(guidance.prayer.endsWith('아멘.'),id);
  assert.equal(s.recommendationPolicy.isActive(verse),true);
 }
});
for(const [id,reference,,message] of passages90to100){
 test('90-100 context selects '+reference,()=>{
  const {s,choose,data}=app(),analysis=s.classifyConcern(message),candidates=s.findCandidates(analysis);
  assert.ok(candidates.some(candidate=>candidate.verse.id===id),id);
  assert.equal(choose(message).verse?.id,id,message);
  for(const expression of data.verses.find(verse=>verse.id===id).expressions)assert.equal(choose(expression).verse?.id,id,expression);
 });
}
test('90-100 distinctions and safety priority are preserved',()=>{
 const {choose}=app();
 for(const [message,id] of [
  ['모든 걸 혼자 감당하고 있는 것 같아요','ecclesiastes-4-9-10'],
  ['힘들다고 말하면 다른 사람한테 짐이 될까 봐 못 말하겠어요','galatians-6-2'],
  ['쉬고 있으면 죄책감이 들어요','psalm-127-2'],
  ['너무 바빠서 밥 먹을 시간도 없어요','mark-6-31'],
  ['생활비가 부족할까 봐 걱정돼요','luke-12-22-24'],
  ['돈 걱정 때문에 잠이 안 와요','luke-12-22-24'],
  ['돈이 부족해질까 봐 너무 무서워요','hebrews-13-5-6'],
  ['하나님한테 화가 나는데 이래도 되는지 모르겠어요','psalm-73-21-23'],
  ['오랫동안 기도했는데 너무 지쳤어요','romans-12-12'],
  ['하나님이 제 기도를 안 듣는 것 같아요','habakkuk-1-2'],
  ['이제 기도도 그만하고 싶어요','luke-18-1'],
  ['어제 너무 망쳤는데 오늘 다시 시작하고 싶어요','lamentations-3-22-23'],
  ['새로운 일을 시작하려니까 무서워요','joshua-1-9']
 ])assert.equal(choose(message).verse?.id,id,message);
 for(const message of ['누군가가 저를 때려서 무서워요','남편이 때리는데 제가 어떻게 해야 할까요']){
  const result=choose(message);assert.equal(result.status,'safety_first');assert.equal(result.verse,null);
 }
});
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
test('all 100 verses have reflection guidance, three questions, and a prayer without changing other passage metadata',()=>{
 const {data}=app();assert.equal(Object.keys(data.reflections).length,100);
 for(const verse of data.verses.slice(0,100)){
  const guidance=data.reflections[verse.id];assert.ok(guidance,verse.id);
  assert.ok(guidance.reflection.length>50,verse.id);
  assert.equal(guidance.question.split('\n').length,3,verse.id);
  assert.ok(guidance.prayer.endsWith('아멘.'),verse.id);
 }
});
test('unrelated stylesheet and HTML markup remain unchanged',()=>{
 const styles=fs.readFileSync(path.join(root,'dist/styles.css'),'utf8').split('\n/* 홈 고민 입력을 지우는 작은 보조 액션 */')[0];
 assert.equal(hash(styles),preserved.stylesHash);
 const html=normalized(fs.readFileSync(path.join(root,'dist/index.html'),'utf8'))
  .replace('<script defer src="ai-config.js"></script><script defer src="services/analyzeConcernWithAI.js"></script>','')
  .replace('<button id="reset-heart" type="button" hidden aria-label="고민 입력 내용 전체 초기화" title="입력 내용 전체 초기화"><span aria-hidden="true">↻</span></button>','')
  .replace('<section id="ai-privacy-note" class="ai-privacy-note" aria-labelledby="ai-privacy-title"><h3 id="ai-privacy-title">AI 분석 안내</h3><p>입력한 이야기는 마음을 이해하기 위한 분석 과정에서 OpenAI의 AI 서비스를 이용해 처리돼요.<br>AI는 고민을 이해하는 데 도움을 주며, 성경 말씀을 새로 만들어내지 않아요.</p></section>','')
  .replace('<form id="settings-form" class="profile-form"><p class="settings-intro">어떤 이름으로 불러드릴까요?</p>','<p class="settings-intro">어떤 이름으로 불러드릴까요?</p><form id="settings-form" class="profile-form">')
  .replace('<label class="sr-only" for="settings-name">이름 입력</label>','<label for="settings-name">이름 또는 별명</label>')
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
