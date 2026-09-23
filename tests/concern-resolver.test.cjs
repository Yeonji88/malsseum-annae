const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function services(){const c=vm.createContext({window:{}});for(const file of ['data/topics','data/verses','data/analysisContract','services/classifyConcern','services/resolveConcernRoles','services/findCandidates','services/recommendationPolicy','services/selectVerse'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file+'.js'),'utf8'),c,{filename:file});return c.window.Malsseum.services;}
const semantic=(local,o)=>({...local,cause:{category:'other',situationIds:[],evidence:'',explicit:false},effects:[],emotions:[],explicitFacts:[],primaryConcern:{kind:'unknown',id:''},secondaryConcerns:[],...o,situations:[...new Set([...local.situations,...(o.situations||[])])],riskSignals:[...new Set([...local.riskSignals,...(o.riskSignals||[])])]});
function choose(message,semanticFields){const s=services(),local=s.classifyConcern(message),resolved=s.resolveConcernRoles(message,semantic(local,semanticFields));return{analysis:resolved,result:s.selectVerse(resolved,s.findCandidates(resolved))};}
test('explicit financial cause outranks insomnia effect',()=>{const {analysis,result}=choose('돈 걱정 때문에 잠이 안 와요',{cause:{category:'financial',situationIds:['practical_financial_worry'],evidence:'돈 걱정',explicit:true},effects:[{type:'insomnia',situationIds:['sleep_worry'],evidence:'잠이 안 와요'}],situations:['practical_financial_worry','sleep_worry'],primaryConcern:{kind:'cause',id:'financial'},secondaryConcerns:[{kind:'effect',id:'insomnia'}]});assert.equal(analysis.concernResolution.primaryConcern.id,'financial');assert.equal(result.verse.id,'luke-12-22-24');});
test('new beginning cause outranks insomnia effect',()=>{const {result}=choose('새 프로젝트를 시작해야 하는데 실패할까 봐 잠이 안 와요',{secondaryTopics:['failure'],cause:{category:'new_beginning',situationIds:['fear_of_new_beginning'],evidence:'새 프로젝트를 시작',explicit:true},effects:[{type:'insomnia',situationIds:['sleep_worry'],evidence:'잠이 안 와요'}],situations:['fear_of_new_beginning','sleep_worry'],primaryConcern:{kind:'cause',id:'new_beginning'},secondaryConcerns:[{kind:'effect',id:'insomnia'}]});assert.equal(result.verse.id,'joshua-1-9');});
test('appearance concerns keep self-acceptance, comparison, and external-condition roles distinct',()=>{
 const samples=[
  ['나는 너무 못생겼어','judged_by_external_conditions','1-samuel-16-7'],
  ['나 못생겼어','judged_by_external_conditions','1-samuel-16-7'],
  ['나는 못생긴 것 같아','judged_by_external_conditions','1-samuel-16-7'],
  ['제가 너무 못생긴 것 같아요','judged_by_external_conditions','1-samuel-16-7'],
  ['내 얼굴이 싫어','difficulty_accepting_self','psalm-139-13-14'],
  ['내 얼굴이 너무 싫어요','difficulty_accepting_self','psalm-139-13-14'],
  ['내 모습이 마음에 안 들어','difficulty_accepting_self','psalm-139-13-14'],
  ['거울 속 내 모습이 싫어','difficulty_accepting_self','psalm-139-13-14'],
  ['예쁜 사람 보면 내가 초라해','comparison_inferiority','2-corinthians-10-12'],
  ['친구랑 외모를 비교하게 돼','comparison_inferiority','2-corinthians-10-12'],
  ['살쪄서 자신감이 없어','judged_by_external_conditions','1-samuel-16-7'],
  ['외모 때문에 자존감이 낮아졌어','judged_by_external_conditions','1-samuel-16-7'],
  ['너무 못생겨서 자신이 없어요','judged_by_external_conditions','1-samuel-16-7'],
  ['외모 때문에 자신감이 없어요','judged_by_external_conditions','1-samuel-16-7'],
  ['못생긴 것 같아서 자존감이 떨어져요','judged_by_external_conditions','1-samuel-16-7'],
  ['살이 쪄서 내가 너무 못나 보여요','judged_by_external_conditions','1-samuel-16-7'],
  ['외모가 별로라 사람들 앞에 나가기 싫어요','judged_by_external_conditions','1-samuel-16-7'],
  ['내 얼굴이 싫어서 자신감이 없어','difficulty_accepting_self','psalm-139-13-14'],
  ['제 외모가 너무 싫어요','difficulty_accepting_self','psalm-139-13-14'],
  ['거울 볼 때마다 제 모습이 마음에 안 들어요','difficulty_accepting_self','psalm-139-13-14'],
  ['예쁜 사람을 보면 제가 초라하게 느껴져요','comparison_inferiority','2-corinthians-10-12'],
  ['다른 사람과 외모를 자꾸 비교하게 돼요','comparison_inferiority','2-corinthians-10-12'],
  ['살이 쪄서 자신감이 없어졌어요','judged_by_external_conditions','1-samuel-16-7'],
  ['외모 때문에 자존감이 너무 낮아졌어요','judged_by_external_conditions','1-samuel-16-7']
 ];
 const s=services();
 for(const [message,situation,verseId] of samples){
  const local=s.classifyConcern(message),result=s.selectVerse(local,s.findCandidates(local));
  assert.ok(local.situations.includes(situation),message);assert.equal(result.verse?.id,verseId,message);
 }
 const rejection=s.classifyConcern('외모 때문에 사람들이 저를 싫어할 것 같아요');
 assert.ok(rejection.situations.includes('judged_by_external_conditions'));
 assert.equal(s.selectVerse(rejection,s.findCandidates(rejection)).verse?.id,'1-samuel-16-7');
 for(const message of ['못생겼어','그 친구 못생겼어']){
  const unrelated=s.classifyConcern(message);
  assert.ok(!unrelated.situations.includes('judged_by_external_conditions'),message);
 }
 const safety=s.classifyConcern('너무 못생겨서 죽고 싶어요');
 assert.equal(s.selectVerse(safety,s.findCandidates(safety)).status,'safety_first');
});
test('verified medication decision returns no suitable candidate',()=>{const {analysis,result}=choose('복용 중인 약을 끊어도 되는지 고민이에요',{primaryTopic:'future',cause:{category:'medical_decision',situationIds:[],evidence:'약을 끊어도 되는지',explicit:true},explicitFacts:[{type:'medication_decision',value:'복용 중인 약 중단',evidence:'약을 끊어도 되는지'}],primaryConcern:{kind:'fact',id:'medication_decision'}});assert.equal(analysis.requiresProfessionalJudgment,true);assert.equal(result.status,'no_suitable_candidate');assert.equal(result.verse,null);});
test('emotional burden during treatment is not blocked as a medical decision',()=>{const {analysis,result}=choose('치료가 길어져서 마음이 너무 지쳐요',{primaryTopic:'rest',cause:{category:'health',situationIds:['prolonged_effort'],evidence:'치료가 길어져서',explicit:true},effects:[{type:'fatigue',situationIds:['severe_exhaustion'],evidence:'마음이 너무 지쳐요'}],situations:['prolonged_effort','severe_exhaustion'],primaryConcern:{kind:'cause',id:'health'}});assert.equal(analysis.requiresProfessionalJudgment,false);assert.equal(result.status,'selected');});
test('prayer lament situation becomes primary',()=>{const {analysis,result}=choose('기도할수록 하나님이 침묵하시는 것 같아 답답해요',{primaryTopic:'faith',cause:{category:'faith_prayer',situationIds:['prayer_feels_unheard'],evidence:'기도할수록 하나님이 침묵',explicit:true},situations:['prayer_feels_unheard'],explicitFacts:[{type:'prayer_lament',value:'기도 중 침묵',evidence:'하나님이 침묵하시는 것 같아'}],primaryConcern:{kind:'situation',id:'prayer_feels_unheard'}});assert.equal(analysis.concernResolution.primaryConcern.id,'prayer_feels_unheard');assert.ok(analysis.concernResolution.causeSituationIds.includes('prayer_feels_unheard'));assert.equal(result.verse.id,'habakkuk-1-2');});
test('AI cannot promote an invented cause whose evidence is absent',()=>{const {analysis}=choose('불안해요',{cause:{category:'financial',situationIds:['practical_financial_worry'],evidence:'돈 걱정',explicit:true},situations:['practical_financial_worry'],primaryConcern:{kind:'cause',id:'financial'}});assert.deepEqual(Array.from(analysis.concernResolution.causeSituationIds),[]);assert.notEqual(analysis.concernResolution.primaryConcern.id,'financial');});
test('risk signals remain ahead of resolver scoring and professional guard',()=>{for(const [message,risk] of [['남편이 때려서 약을 끊을지 고민이에요','violence'],['죽고 싶고 약도 끊고 싶어요','self_harm']]){const {result}=choose(message,{cause:{category:'medical_decision',situationIds:[],evidence:'약을 끊',explicit:true},explicitFacts:[{type:'medication_decision',value:'약 중단',evidence:'약을 끊'}],primaryConcern:{kind:'fact',id:'medication_decision'}});assert.equal(result.status,'safety_first');assert.ok(result.analysis.riskSignals.includes(risk));}});
test('natural self-harm wording stays safety-first without treating every harm phrase as self-harm',()=>{
 const s=services();
 for(const message of ['오늘 제 몸을 해칠까 봐 무서워요','내 자신을 해치고 싶은 생각이 들어요','스스로를 해칠 것 같아요']){
  const analysis=s.classifyConcern(message),result=s.selectVerse(analysis,s.findCandidates(analysis));
  assert.ok(analysis.riskSignals.includes('self_harm'),message);assert.equal(result.status,'safety_first',message);
 }
 for(const message of ['그 사람이 저를 해칠까 봐 무서워요','말로 서로 해치지 않았으면 좋겠어요','내 몸을 해치면 안 된다고 생각해요']){
  assert.ok(!s.classifyConcern(message).riskSignals.includes('self_harm'),message);
 }
});
test('explicit intent to harm another person is safety-first while anger and revenge feelings keep their boundary',()=>{
 const s=services();
 for(const message of ['복수하려고 그 사람을 해치고 싶어요','상대를 때리고 싶어요','그를 죽이고 싶은 생각이 들어요']){
  const analysis=s.classifyConcern(message),result=s.selectVerse(analysis,s.findCandidates(analysis));
  assert.ok(analysis.riskSignals.includes('violence'),message);assert.equal(result.status,'safety_first',message);
 }
 for(const message of ['그 사람 때문에 화가 나요','복수하고 싶은 마음이 들어요','걔도 똑같이 당했으면 좋겠어요']){
  const analysis=s.classifyConcern(message);
  assert.equal(analysis.riskSignals.length,0,message);assert.notEqual(s.selectVerse(analysis,s.findCandidates(analysis)).status,'safety_first',message);
 }
});
test('local fallback guards professional medical decisions before general decision verses',()=>{
 const s=services();
 const decisions=['약을 줄여도 되는지 고민이에요','복용 중인 약을 끊을지 고민이에요','약을 바꿔도 될까요','치료를 시작할지 고민이에요','치료를 중단해도 되는지 궁금해요','치료 방법을 바꿔야 할지 모르겠어요','수술을 받을지 고민이에요','난임 시술을 계속할지 결정하기 어려워요','아이 예방접종을 맞혀도 될지 고민이에요','임신 초기인데 출혈이 있어서 불안해요'];
 for(const message of decisions){const analysis=s.classifyConcern(message),result=s.selectVerse(analysis,s.findCandidates(analysis));assert.equal(analysis.requiresProfessionalJudgment,true,message);assert.equal(result.status,'no_suitable_candidate',message);assert.equal(result.verse,null,message);}
});
test('health-related emotional concerns remain eligible for pastoral support',()=>{
 const s=services();
 for(const message of ['치료 때문에 지쳐요','검사 결과가 무서워요','난임 치료가 길어져서 마음이 너무 지쳤어요','치료가 길어져서 일을 그만두고 싶을 만큼 지쳤어요','수술을 앞두고 무서워서 어떻게 해야 할지 모르겠어요','약을 먹고 있는데 직장을 바꿔야 할지 고민이에요']){
  const analysis=s.classifyConcern(message),result=s.selectVerse(analysis,s.findCandidates(analysis));
  assert.equal(analysis.requiresProfessionalJudgment,false,message);assert.notEqual(result.status,'no_suitable_candidate',message);assert.notEqual(result.status,'safety_first',message);
 }
});
test('high-stakes physical uncertainty is not covered by a generic fear verse',()=>{const s=services();for(const message of ['다음 주 수술인데 마취에서 깨어나지 못할까 무서워요','임신 초기인데 아기에게 문제가 생길까 불안해요']){const analysis=s.classifyConcern(message),result=s.selectVerse(analysis,s.findCandidates(analysis));assert.equal(result.status,'no_suitable_candidate',message);assert.equal(result.verse,null,message);}});
