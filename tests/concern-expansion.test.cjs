const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const path=require('node:path');
const approved=require('./fixtures/new-concern-approved.json');
const baseline=require('./fixtures/approved-100-baseline.json');
const drafts=require('../tools/concern-guidance-drafts.json');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function app(extra={}){
 const context=vm.createContext({window:{},...extra});
 for(const f of ['data/topics','data/verses','data/reflections','data/analysisContract','services/classifyConcern','services/resolveConcernRoles','services/recommendationPolicy','services/findCandidates','services/selectVerse'])vm.runInContext(read('dist/'+f+'.js'),context);
 const {data,services:s}=context.window.Malsseum;
 const choose=message=>{const a=s.resolveConcernRoles(message,s.classifyConcern(message));return s.selectVerse(a,s.findCandidates(a));};
 return {context,data,s,choose};
}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
test('approved first 100 entries and Daily file remain byte/content-identical',()=>{
 const {data}=app();assert.equal(data.verses.length,110);
 assert.equal(hash(JSON.stringify(data.verses.slice(0,100))),baseline.verses);
 const old=Object.fromEntries(Object.entries(data.reflections).slice(0,100));
 assert.equal(hash(JSON.stringify(old)),baseline.reflections);
 assert.equal(hash(read('dist/data/daily-reflections.js')),baseline.daily);
 assert.equal(new Set(data.verses.map(v=>v.id)).size,110);
 assert.equal(new Set(Object.values(data.reflections).map(v=>v.reflection)).size,110);
});
test('new text and reflection exactly match user final source; optional drafts stay out of Production',()=>{
 const {data}=app();assert.deepEqual(Array.from(data.verses.slice(100),v=>v.id),approved.map(v=>v.id));
 for(const expected of approved){
  const v=data.verses.find(v=>v.id===expected.id),r=data.reflections[v.id];
  for(const key of ['id','book','chapter','verseStart','verseEnd','text'])assert.equal(v[key],expected[key]);
  assert.equal(v.reference,`${v.book} ${v.chapter}:${v.verseStart}${v.verseStart===v.verseEnd?'':'–'+v.verseEnd}`);
  assert.equal(v.text.split('\n').length,v.verseEnd-v.verseStart+1);
  assert.doesNotMatch(v.text,/\[(?:\d+|[ㄱ-ㅎ])\)\]/);
  assert.equal(v.translation,'개역개정');assert.equal(v.textVerificationSource,'user_supplied');
  assert.equal(r.reflection,expected.reflection);assert.equal(r.question,expected.question||'');assert.equal(r.prayer,expected.prayer||'');
  assert.equal(v.guidanceStatus,expected.question?'ready':'pending');const guidance=expected.question?r:drafts[v.id];assert.equal(guidance.question.split('\n').length,3);assert.ok(guidance.prayer);
 }
 assert.match(data.verses.find(v=>v.id==='1-thessalonians-4-3-5').contextNote,/3–5절 범위를 유지/);
 assert.doesNotMatch(read('dist/index.html'),/concern-guidance-drafts|concern-preview|__concern/);
});
for(const [index,message] of [
 [0,'배우자와 성관계 빈도가 달라 서로의 필요를 이야기하고 합의하고 싶어요'],
 [1,'배우자와 서로 원해서 애정을 표현하고 친밀함을 나누고 싶어요'],
 [2,'남편으로서 아내를 대하는 내 태도와 돌봄을 돌아보고 싶어요'],
 [3,'배우자 몰래 다른 사람과 성적인 연락을 하고 있는데 멈추고 싶어요'],
 [4,'믿었던 친구가 내 비밀을 퍼뜨려 배신당했어요'],
 [5,'복음을 전하는 사명에 어떻게 참여할지 생각하고 싶어요'],
 [6,'전도할 때 상대의 질문에 어떻게 답하고 경청할지 고민이에요'],
 [7,'가족에게 내가 받은 하나님의 은혜를 나누고 싶어요'],
 [8,'아이에게 화내는 내 양육 태도를 돌아보고 싶어요'],
 [9,'생활비가 부족한 이웃에게 말뿐인 위로보다 실제 도움을 주고 싶어요']
])test('specific concern selects '+approved[index].reference+' '+approved[index].id,()=>{
 const {choose,s}=app();const result=choose(message);assert.equal(result.verse?.id,approved[index].id,JSON.stringify(result));
 const follow=s.classifyConcern('고마워요');const continued=s.selectVerse(follow,s.findCandidates(follow),{previousId:result.verse.id,previousAnalysis:result.analysis,continueConversation:true});
 assert.equal(continued.verse?.id,result.verse.id);assert.equal(continued.continued,true);
});
const excludedCases=[
 [0,'남편과 섹스리스로 살아도 괜찮을까요?'],
 [0,'남편과 성관계 빈도가 달라 합의하고 싶지만 통증이 있어요'],
 [0,'아내와 성관계 빈도가 달라 합의하려는데 출산 후 회복 중이에요'],
 [0,'싫다고 했는데 남편이 성관계를 강요해요'],
 [1,'아내가 원하지 않는 친밀함을 나누도록 설득하고 싶어요'],
 [1,'남편은 욕구가 적어요. 애정을 나누지 않으면 비정상인가요'],
 [2,'아내인 제가 남편에게 더 잘해야 할까요'],
 [2,'남편이 나를 통제해요. 아내를 돌보는 거라고 해요'],
 [3,'아내와 성적 친밀함을 나누고 싶은 제 욕구가 죄인가요'],
 [3,'다른 사람과 성관계하는 원치 않는 생각이 불쑥 떠올라 멈추고 싶어요'],
 [3,'남편이 외도해요. 남편의 성적인 연락을 멈추고 싶어요'],
 [4,'내가 외도해서 아내가 화났는데 내가 배신당한 것 같아요'],
 [4,'친구가 배신했을까 의심돼요'],
 [5,'전도로 상대를 반드시 믿게 만들 사명을 완수하고 싶어요'],
 [6,'복음을 강요해서라도 질문에 답하고 싶어요'],
 [7,'가족에게 은혜를 지어내서 신앙을 전하고 싶어요'],
 [8,'부모가 학대하는데 공경을 어떻게 해야 하나요'],
 [9,'생활비가 없어요'],[9,'빚 때문에 힘들어요'],
 [9,'제 생활비가 없어요. 친구에게 도움을 받고 싶어요']
];
for(const [index,message] of excludedCases)test('exclude: '+message,()=>{
 const {s,choose}=app(),a=s.classifyConcern(message);
 assert.ok(!s.findCandidates(a).some(c=>c.verse.id===approved[index].id));
 assert.notEqual(choose(message).verse?.id,approved[index].id);
});
for(const word of ['성폭행','성폭력','성적 피해','강간','성추행','성적 트라우마'])for(const spouse of ['남편','아내'])test('victim context overrides intimacy: '+word+'/'+spouse,()=>{
 const {s,choose}=app(),message=`${word} 당한 기억 때문에 ${spouse}와 성관계가 힘들어요. 서로의 필요를 이야기하고 합의하고 싶어요`;
 const a=s.classifyConcern(message);assert.equal(a.sexualVictimContext,true);
 for(const i of [0,1,3]){assert.ok(!s.findCandidates(a).some(c=>c.verse.id===approved[i].id));assert.ok(!a.situations.includes(app().data.verses[100+i].situations[0]));}
 const r=choose(message);assert.ok(r.status==='safety_first'||r.verse.id==='psalm-147-3',r.verse?.id);
});
test('sexual trauma with no immediate safety keyword uses existing wounded-heart passage, independent of gender',()=>{
 for(const message of ['저는 남성이고 성적 피해 기억 때문에 아내와 친밀함이 힘들어요','저는 여성이고 성적 트라우마 때문에 남편과 친밀함이 힘들어요'])assert.equal(app().choose(message).verse?.id,'psalm-147-3');
});
test('self-harm and current danger remain ahead of specific new passages',()=>{
 for(const message of ['가족에게 내가 받은 하나님의 은혜를 나누고 싶지만 죽고 싶어요','아이에게 화내는 내 양육 태도를 돌아보고 싶은데 지금 폭력이 있어요']){
  const r=app().choose(message);assert.equal(r.status,'safety_first');assert.equal(r.verse,null);
 }
 assert.match(read('dist/app.js'),/href='tel:109'/);
});
test('unheard-prayer issue is deliberately left unchanged',()=>assert.equal(app().choose('하나님이 내 기도를 들어주시지 않는 것 같아서 마음이 힘들어요.').verse?.id,'matthew-11-28'));
test('broad topics never admit new passages; direct review also fails closed',()=>{
 const {data,s}=app(),a=s.classifyConcern('관계 때문에 힘들어요');
 assert.ok(!s.findCandidates(a).some(c=>c.verse.requiresSpecificSituation));
 for(const v of data.verses.slice(100))assert.equal(s.recommendationPolicy.review(v,a).excluded,true);
});
module.exports={app};

for(const message of ['마음이 너무 아파요','이별하고 마음이 무너진 것 같아요','믿었던 사람에게 상처받아서 너무 힘들어요','요즘 마음이 너무 지치고 아파요','아무에게도 말하지 못한 상처가 있어요'])test('Psalm 34:18 review candidate: '+message,()=>{
 const {s}=app(),a=s.resolveConcernRoles(message,s.classifyConcern(message));
 assert.ok(s.findCandidates(a).some(c=>c.verse.id==='psalm-34-18'));
});
for(const [message,expectedIds] of [
 ['친구에게 배신당해서 너무 힘들어요',['psalm-55-12-14']],
 ['기도해도 하나님이 듣지 않으시는 것 같아 마음이 아파요',['habakkuk-1-2','psalm-10-1','psalm-13-1-2']],
 ['제가 잘못한 일이 너무 후회되고 하나님께 용서를 구하고 싶어요',['1-john-1-9','psalm-51-10','isaiah-1-18','romans-8-1']]
])test('Psalm 34:18 review specific context takes priority: '+message,()=>{
 const r=app().choose(message);assert.ok(expectedIds.includes(r.verse?.id),JSON.stringify({status:r.status,reference:r.verse?.reference}));
});
test('Psalm 34:18 review current violence uses safety flow',()=>{
 const r=app().choose('남편이 때려서 마음이 너무 힘들어요');assert.equal(r.status,'safety_first');assert.equal(r.verse,null);
});

for(const message of ['앞으로 어떻게 될지 걱정돼요','앞날이 두려워요','시험 결과가 안 좋을까 봐 두려워요','결과를 기다리고 있는데 너무 불안해요','앞으로 일어날 일을 생각하면 겁이 나요'])test('Psalm 56:3 review candidate: '+message,()=>{
 const {s}=app(),a=s.resolveConcernRoles(message,s.classifyConcern(message));
 assert.ok(s.findCandidates(a).some(c=>c.verse.id==='psalm-56-3'));
});
for(const [message,expectedIds] of [
 ['걱정 때문에 잠을 못 자요',['psalm-4-8']],
 ['친구에게 배신당해서 사람을 믿기가 두려워요',['psalm-55-12-14','psalm-34-18','psalm-147-3']],
 ['기도해도 하나님이 듣지 않으시는 것 같아서 불안해요',['habakkuk-1-2','psalm-10-1','psalm-13-1-2']]
])test('Psalm 56:3 review specific context takes priority: '+message,()=>{
 const r=app().choose(message);assert.ok(expectedIds.includes(r.verse?.id),JSON.stringify({status:r.status,reference:r.verse?.reference}));
});
test('Psalm 56:3 review current violence precedes fear recommendations',()=>{
 const r=app().choose('남편이 또 때릴까 봐 무서워요');assert.equal(r.status,'safety_first');assert.equal(r.verse,null);
});

for(const message of ['요즘 너무 지쳤어요','할 일이 너무 많아서 버거워요','모든 걸 혼자 감당하려니 힘들어요','잠깐이라도 쉬고 싶어요'])test('Matthew 11:28 review candidate: '+message,()=>{
 const {s}=app(),a=s.resolveConcernRoles(message,s.classifyConcern(message));
 assert.ok(s.findCandidates(a).some(c=>c.verse.id==='matthew-11-28'));
});
for(const message of ['걱정 때문에 잠을 못 자요','하나님이 제 기도를 안 들어주시는 것 같아요','친구에게 배신당해서 힘들어요'])test('Matthew 11:28 must not outrank the specific concern: '+message,()=>{
 const {choose}=app();assert.notEqual(choose(message).verse?.id,'matthew-11-28');
});

for(const message of [
 '성적인 충동 때문에 잘못된 행동을 할까 걱정돼요',
 '욕망에 끌려 관계에서 지켜야 할 것을 넘을까 고민돼요',
 '성적인 유혹 앞에서 행동을 멈추고 싶어요',
 '내 욕망만 앞세우지 않고 서로를 존중하고 싶어요',
 '저는 미혼 여성이고 성적인 충동 때문에 잘못된 행동을 할까 걱정돼요',
 '저는 미혼 남성이고 성적인 유혹 앞에서 행동을 멈추고 싶어요'
])test('Thessalonians: voluntary restraint of harmful behavior '+message,()=>assert.equal(app().choose(message).verse?.id,'1-thessalonians-4-3-5'));
for(const message of [
 '성욕이 있어서 고민이에요',
 '배우자와 성적 친밀감을 나누고 싶어요',
 '연인과 자연스럽게 애정을 나누고 싶어요',
 '원하지 않는 성적인 생각이 떠올라 괴로워요',
 '과거 성폭행 기억 때문에 아내와 성관계가 힘들어요',
 '성적 학대의 기억 때문에 남편과 잠자리가 힘들어요',
 '성추행을 당한 트라우마 때문에 괴로워요',
 '성폭력 피해자인데 제 욕망을 절제하지 못한 잘못된 행동일까 걱정돼요',
 '강간 피해 경험 때문에 성적인 생각을 멈추고 싶어요',
 '싫다고 했는데 아내가 억지로 성관계를 해요'
])test('Thessalonians: desire or victimization is not wrongdoing '+message,()=>{
 const {s}=app(),a=s.resolveConcernRoles(message,s.classifyConcern(message));
 assert.ok(!s.findCandidates(a).some(c=>c.verse.id==='1-thessalonians-4-3-5'));
});

for(const [message,expected] of [
 ['아내에게 더 잘해주고 싶어요',true],
 ['요즘 아내에게 너무 무심했던 것 같아요',true],
 ['아내를 사랑하지만 표현을 잘 못하는 것 같아요',true],
 ['남편이 저한테 잘해주지 않아서 힘들어요',false],
 ['남편 때문에 상처받았어요',false]
 ,['아내한테 요즘 너무 소홀했던 것 같아요',true]
 ,['아내에게 사랑 표현을 더 하고 싶어요',true]
 ,['아내를 잘 챙기지 못한 것 같아서 미안해요',true]
 ,['남편이 저한테 너무 무심해서 서운해요',false]
 ,['아내인 제가 남편에게 사랑 표현을 더 하고 싶어요',false]
 ,['남편에게 더 잘해주고 싶어요',false]
 ,['남편이 아내에게 더 잘해주고 싶다고 했어요',false]
 ,['친구가 아내에게 너무 소홀했던 것 같다고 해요',false]
])test('Ephesians 5:28 author-perspective candidate: '+message,()=>{
 const {s}=app();
 const analysis=s.resolveConcernRoles(message,s.classifyConcern(message));
 const included=s.findCandidates(analysis).some(candidate=>candidate.verse.id==='ephesians-5-28');
 assert.equal(included,expected,expected?'아내를 대하는 자신의 태도를 돌아보는 고민은 후보에 포함해야 함':'남편에게 받은 상처를 아내의 의무로 뒤집어 적용하지 않아야 함');
});

test('Ephesians actor/recipient distinction survives actual AI merge, including a reversed AI label',async()=>{
 for(const [message,expected] of [
  ['아내에게 더 잘해주고 싶어요',true],
  ['요즘 아내에게 너무 무심했던 것 같아요',true],
  ['아내를 사랑하지만 표현을 잘 못하는 것 같아요',true],
  ['남편이 저한테 잘해주지 않아서 힘들어요',false],
  ['남편 때문에 상처받았어요',false],
  ['아내인 제가 남편에게 사랑 표현을 더 하고 싶어요',false]
 ]){
  const {context,s}=app({AbortSignal});context.window.MalsseumAIEndpoint='mock';
  const ai={primaryTopic:'relationship',secondaryTopics:[],cause:{category:'none',situationIds:[],evidence:'',explicit:false},effects:[],emotions:[],situations:['husband_self_care_review'],explicitFacts:[],uncertainties:[],primaryConcern:{kind:'situation',id:'husband_self_care_review'},secondaryConcerns:[],riskSignals:[]};
  context.payload=JSON.stringify(ai);context.fetch=async()=>({ok:true,json:async()=>vm.runInContext('JSON.parse(payload)',context)});
  vm.runInContext(read('dist/services/analyzeConcernWithAI.js'),context);
  const merged=await s.analyzeConcernWithAI(message,s.classifyConcern(message));assert.equal(merged.method,'ai+rules');
  const resolved=s.resolveConcernRoles(message,merged);
  assert.equal(s.findCandidates(resolved).some(c=>c.verse.id==='ephesians-5-28'),expected,message);
 }
});

for(const message of [
 '짝사랑하는 사람이 있는데 고백하고 싶어요',
 '좋아하는 사람에게 제 마음을 표현하고 싶어요',
 '계속 마음을 숨기고 있는데 솔직하게 말해보고 싶어요',
 '좋아하는 사람에게 어떻게 마음을 표현해야 할지 모르겠어요'
])test('Song: reflect on affection and confession '+message,()=>assert.equal(app().choose(message).verse?.id,'song-of-songs-7-10-12'));
for(const message of [
 '짝사랑 상대가 명확하게 거절했는데 계속 고백하고 싶어요',
 '좋아하는 사람이 연락하지 말아 달라고 했는데 제 마음을 표현하고 싶어요',
 '짝사랑 상대가 연락 말아 달라고 했는데 계속 고백하고 싶어요',
 '좋아하는 사람에게 집착하고 따라다니면서 마음을 표현하고 싶어요',
 '짝사랑 상대를 감시하면서 고백할 기회를 찾고 싶어요',
 '좋아하는 사람의 마음을 얻기 위한 방법으로 고백하고 싶어요',
 '좋아하는 사람을 조종해서 제 마음을 표현하고 싶어요',
 '짝사랑 상대가 반드시 나를 사랑하게 될 것이라는 확신을 얻고 싶어요',
 '짝사랑 상대에게 고백하는 것이 하나님의 답인지 알고 싶어요'
])test('Song: confession must not justify boundary violations or guarantees '+message,()=>{
 const {s}=app(),a=s.resolveConcernRoles(message,s.classifyConcern(message));
 assert.ok(!s.findCandidates(a).some(c=>c.verse.id==='song-of-songs-7-10-12'));
});

for(const message of [
 '남자친구와 정서적으로 가까워지고 싶어요',
 '여자친구와 더 다정해지고 싶어요',
 '연인에게 사랑이나 애정을 표현하기 어려워요',
 '사랑하는 사람과 예전보다 마음이 멀어진 것 같아요',
 '연인과 서로 애정을 표현하는 방식이나 속도가 달라 고민이에요',
 '사랑하는 사람에게 내 마음을 솔직하게 표현하고 싶어요'
])test('Song: affection without assuming marriage '+message,()=>assert.equal(app().choose(message).verse?.id,'song-of-songs-7-10-12'));
for(const message of [
 '남자친구가 있어요','여자친구가 있어요','연인 때문에 고민이에요','배우자 때문에 힘들어요',
 '연인과 혼전 성관계를 해도 될지 고민이에요',
 '여자친구와 잠자리에서 더 친밀해지고 싶어요',
 '남자친구와 성욕 차이가 나서 애정 표현이 어려워요',
 '연인과 성적 친밀함을 나누고 싶어요',
 '외도한 연인과 정서적으로 가까워지고 싶어요',
 '사랑하는 사람에게 성적 피해를 입어 애정 표현이 무서워요',
 '여자친구가 동의하지 않는데 애정 표현을 강제로 하고 싶어요',
 '연인이 폭력으로 위협하는데 더 다정해지고 싶어요',
 '사랑하는 사람에게 협박받는데 내 마음을 표현하기 어려워요'
])test('Song: relationship labels do not override exclusions '+message,()=>{
 const {s}=app(),a=s.resolveConcernRoles(message,s.classifyConcern(message));
 assert.ok(!s.findCandidates(a).some(c=>c.verse.id==='song-of-songs-7-10-12'));
});

for(const message of [
 '배우자와 더 다정해지고 싶어요',
 '부부 사이의 애정 표현이 줄어 고민이에요',
 '배우자에게 사랑하는 마음을 표현하기 어려워요',
 '아내와 정서적으로 다시 가까워지고 싶어요',
 '남편과 서로 다른 애정 표현 방식 때문에 고민이에요'
])test('Song: emotional affection '+message,()=>assert.equal(app().choose(message).verse?.id,'song-of-songs-7-10-12'));
for(const message of [
 '배우자와 섹스리스로 살아도 괜찮을까요',
 '배우자와 성관계를 더 나누고 싶어요',
 '남편과 잠자리에서 친밀해지고 싶어요',
 '아내와 성관계 횟수와 성욕 차이 때문에 애정 표현이 어려워요',
 '배우자에게 성적 의무를 다하기 어려워요',
 '배우자와 애정 표현을 하고 싶지만 성적 유혹과 음란을 절제하기 어려워요',
 '성적 피해 기억 때문에 배우자와 정서적으로 가까워지고 싶어도 어려워요',
 '싫다고 했는데 남편이 억지로 성관계를 해요. 애정 표현이 무서워요'
])test('Song: exclude sexual role '+message,()=>{
 const {s}=app(),a=s.resolveConcernRoles(message,s.classifyConcern(message));
 assert.ok(!s.findCandidates(a).some(c=>c.verse.id==='song-of-songs-7-10-12'));
});

for(const wording of ['성적 학대 기억','싫다고 했는데 억지로 당한 일','동의하지 않았는데 벌어진 일','강제로 성관계를 한 기억','원하지 않는 성관계를 당함'])for(const spouse of ['남편','아내'])test('non-consent natural language: '+wording+'/'+spouse,()=>{
 const {s,choose}=app(),message=`${wording} 때문에 ${spouse}와 성관계 빈도를 합의하거나 자발적인 친밀함을 나누기가 힘들어요`;
 const a=s.classifyConcern(message);assert.equal(a.sexualVictimContext,true);
 for(const i of [0,1,3])assert.ok(!s.findCandidates(a).some(c=>c.verse.id===approved[i].id));
 const result=choose(message);assert.ok(['safety_first','needs_clarification'].includes(result.status)||result.verse?.id==='psalm-147-3');
});

test('AI semantic victimization with quoted evidence overrides sexual-duty/temptation roles through the real merge',async()=>{
 const message='그날 나는 잠자리를 거절했지만 상대는 내 말을 무시하고 끝까지 했어요. 지금도 그 기억이 힘들어요.';
 const {context,s}=app({AbortSignal});assert.equal(s.classifyConcern(message).sexualVictimContext,false,'exercise a meaning that is not caught by local patterns');
 context.window.MalsseumAIEndpoint='mock';
 const ai={primaryTopic:'guilt',secondaryTopics:[],cause:{category:'relationship',situationIds:[],evidence:'그날 나는 잠자리를 거절했지만 상대는 내 말을 무시하고 끝까지 했어요',explicit:true},effects:[],emotions:[],situations:['marital_mutual_needs','sexual_boundary_restraint'],explicitFacts:[{type:'sexual_victimization',value:'원치 않은 성적 접촉 경험',evidence:'나는 잠자리를 거절했지만 상대는 내 말을 무시하고 끝까지 했어요'}],uncertainties:[],primaryConcern:{kind:'fact',id:'sexual_victimization'},secondaryConcerns:[],riskSignals:[]};
 context.payload=JSON.stringify(ai);context.fetch=async()=>({ok:true,json:async()=>vm.runInContext('JSON.parse(payload)',context)});
 vm.runInContext(read('dist/services/analyzeConcernWithAI.js'),context);
 const merged=await s.analyzeConcernWithAI(message,s.classifyConcern(message));assert.equal(merged.method,'ai+rules');
 const resolved=s.resolveConcernRoles(message,merged);assert.equal(resolved.sexualVictimContext,true);assert.equal(resolved.primaryTopic,'relationship');
 const candidates=s.findCandidates(resolved);for(const i of [0,1,3])assert.ok(!candidates.some(c=>c.verse.id===approved[i].id));
 assert.equal(s.selectVerse(resolved,candidates).verse.id,'psalm-147-3');
 ai.explicitFacts[0].evidence='사용자가 말하지 않은 성적 피해';context.payload=JSON.stringify(ai);
 const invalid=await s.analyzeConcernWithAI(message,s.classifyConcern(message));assert.equal(invalid.method,'rules','unquoted AI facts must be rejected');
});

test('AI situation labels alone do not bypass local specific-context gates',async()=>{
 const {context,s}=app({AbortSignal}),message='관계가 힘들어요';context.window.MalsseumAIEndpoint='mock';
 const ai={primaryTopic:'relationship',secondaryTopics:[],cause:{category:'none',situationIds:[],evidence:'',explicit:false},effects:[],emotions:[],situations:['marital_mutual_needs'],explicitFacts:[],uncertainties:[],primaryConcern:{kind:'situation',id:'marital_mutual_needs'},secondaryConcerns:[],riskSignals:[]};
 context.payload=JSON.stringify(ai);context.fetch=async()=>({ok:true,json:async()=>vm.runInContext('JSON.parse(payload)',context)});vm.runInContext(read('dist/services/analyzeConcernWithAI.js'),context);
 const a=await s.analyzeConcernWithAI(message,s.classifyConcern(message));assert.equal(a.method,'ai+rules');assert.ok(!s.findCandidates(a).some(c=>c.verse.requiresSpecificSituation));
});

test('new victimization evidence interrupts continuity with an intimacy passage',()=>{
 const {data,s,choose}=app();
 for(const index of [0,1,3]){
  const previous=choose(data.verses[100+index].expressions[0]);assert.equal(previous.verse.id,approved[index].id);
  const a=s.resolveConcernRoles('성적 피해 기억 때문에 힘들어요',s.classifyConcern('성적 피해 기억 때문에 힘들어요'));
  const next=s.selectVerse(a,s.findCandidates(a),{previousId:previous.verse.id,previousAnalysis:previous.analysis,continueConversation:true});
  assert.equal(next.verse?.id,'psalm-147-3');assert.equal(next.continued,false);
 }
});

test('admitting perpetration is not relabelled as being the victim',()=>{
 for(const message of ['내가 성폭행을 했어요','제가 성추행을 저질렀어요']){
  const {s,choose}=app();assert.equal(s.classifyConcern(message).sexualVictimContext,false);
  assert.equal(choose(message).status,'safety_first');
 }
});

const temporalCases=[
 ['성폭행의 기억때문에 남편과의 잠자리가 힘들어요','selected','psalm-147-3'],
 ['예전에 성폭행당한 기억 때문에 남편과 성관계가 힘들어요','selected','psalm-147-3'],
 ['과거 성적 피해 때문에 아내와 가까워지는 게 무서워요','selected','psalm-147-3'],
 ['어릴 때 당한 성추행 기억 때문에 지금도 잠자리가 힘들어요','selected','psalm-147-3'],
 ['싫다고 했는데 남편이 억지로 성관계를 해요','safety_first',null],
 ['아내가 원하지 않는데 강제로 관계해요','safety_first',null],
 ['거부하면 때리겠다고 해요','safety_first',null],
 ['지금도 배우자에게 성폭행을 당하고 있어요','safety_first',null],
 ['과거 성폭행 기억이 있는데 지금도 남편이 성관계를 강요해요','safety_first',null],
 ['과거 성적 피해 기억 때문에 힘든데 거부하면 때리겠다고 해요','safety_first',null],
 ['성폭행 기억 때문에 죽고 싶어요','safety_first',null],
 ['성폭행을 당했어요','needs_clarification',null],
 ['동의하지 않았는데 성관계를 했어요','needs_clarification',null]
];
for(const [message,status,id] of temporalCases)test('sexual harm temporal scope: '+message,()=>{
 const {choose,s}=app(),result=choose(message);assert.equal(result.status,status);assert.equal(result.verse?.id||null,id);
 const a=s.classifyConcern(message);for(const i of [0,1,3])assert.ok(!s.findCandidates(a).some(c=>c.verse.id===approved[i].id));
 if(status==='needs_clarification'){assert.match(result.message,/과거에 겪은 일/);assert.match(result.message,/이어지고 있나요/);}
});
test('AI union cannot turn a clearly historical sexual-harm memory into current danger by labels alone',()=>{
 const {s}=app(),message=temporalCases[0][0],a=s.classifyConcern(message);
 const merged={...a,method:'ai+rules',riskSignals:['violence','abuse']};
 const resolved=s.resolveConcernRoles(message,merged);assert.deepEqual(Array.from(resolved.riskSignals),[]);
 assert.equal(s.selectVerse(resolved,s.findCandidates(resolved)).verse?.id,'psalm-147-3');
});
test('independent quoted AI danger survives alongside past trauma',()=>{
 const {s}=app(),message='과거 성폭행 기억이 있어요. 남편이 목을 졸라요';
 const a={...s.classifyConcern(message),riskSignals:['violence'],explicitFacts:[{type:'violence',evidence:'남편이 목을 졸라요'}]};
 const r=s.resolveConcernRoles(message,a);assert.ok(r.riskSignals.includes('violence'));assert.equal(s.selectVerse(r,s.findCandidates(r)).status,'safety_first');
});
