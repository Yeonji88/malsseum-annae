(function () {
function positiveMatches(clause, pattern) {
 return [...clause.matchAll(new RegExp(pattern.source,'g'))].filter(match => {
  const before=clause.slice(Math.max(0,match.index-4),match.index);
  const after=clause.slice(match.index+match[0].length);
  return !/안\s*$/.test(before) && !/^[가-힣]{0,4}\s*(?:하지\s*않|않|없|아니|할\s*수\s*없)/.test(after);
 });
}
function classifyConcern(message) {
 if(typeof message!=='string'||!message.trim()||message.length>1000)throw new Error('마음을 1~1,000자로 적어주세요.');
 const text=message.normalize('NFKC').trim().toLowerCase();
 const shortFeeling=/^(?:화가\s*나(?:요)?|화났어요|화가\s*났어요|짜증나(?:요)?|분노해요|무서워요|두려워요|불안해요|걱정돼요|우울해요|울적해요|(?:기분|마음)이\s*가라앉아요|마음이\s*무거워요)[.!?\s]*$/.test(text);
 const mourningContext=/상실|죽음|사별|떠나보|돌아가셨|세상을\s*떠|장례|잃었|잃어서|이별|헤어졌|헤어진|헤어져/.test(text);
 const clauses=text.split(/[.!?。\n,]+|하지만|그런데|그래도|지만|보다는/).filter(Boolean);
 const data=window.Malsseum.data;
 const topics=data.topicRules.map(({id,pattern})=>{
  let score=0,last=-1;
  clauses.forEach((clause,index)=>{if(positiveMatches(clause,pattern).length){score+=index===clauses.length-1?1.15:1;last=index;}});
  return {id,score,last};
 }).filter(topic=>topic.score>0).sort((a,b)=>b.score-a.score||b.last-a.last);
 const situations=data.situationRules.filter(rule=>clauses.some(clause=>positiveMatches(clause,rule.pattern).length)).map(rule=>rule.id);
 // Exact authored examples are optional situation hints, including for pending metadata.
 // Their use never activates an unverified passage or synthesises scripture text.
 for(const verse of data.verses){
  if(verse.expressions.some(expression=>text===expression.normalize('NFKC').trim().toLowerCase())){
   for(const id of verse.situations)if(!situations.includes(id))situations.push(id);
  }
 }
 // Some faith concerns span contrastive clauses (for example, fatigue followed by a wish to continue).
 // Preserve only the existing authored role; do not infer a causal relationship between separate concerns.
 const wholeTextFaithRules=[
  {id:'persistent_prayer_fatigue',pattern:/기도[^.!?\n]{0,50}(?:지쳐|지쳤)[^.!?\n]{0,35}(?:그래도\s*)?계속(?:\s*기도)?\s*(?:하고|해보고)?\s*싶/},
  {id:'doubting_gods_love',pattern:/하나님[^.!?\n]{0,30}(?:사랑하지\s*않는\s*것\s*같|사랑하실까|사랑하시는지\s*모르)|이런\s*나도\s*사랑하실까|(?:아직도\s*)?(?:날|나를|저를)\s*사랑하실까/}
 ];
 for(const rule of wholeTextFaithRules)if(rule.pattern.test(text)&&!situations.includes(rule.id))situations.push(rule.id);
 const wholeTextColloquialRules=[
  {id:'new_day_after_failure',pattern:/어제[^.!?\n]{0,30}(?:망쳤|실수|엉망)[^.!?\n]{0,30}오늘[^.!?\n]{0,18}(?:다시|새롭게)\s*(?:시작|해보|해\s*보)|실패했지만\s*다시\s*(?:시작|한\s*번\s*해보|해\s*보)/}
 ];
 for(const rule of wholeTextColloquialRules)if(rule.pattern.test(text)&&!situations.includes(rule.id))situations.push(rule.id);
 const explicitCauseRules=[
  {category:'financial',situationId:'practical_financial_worry',pattern:/(?:월세|생활비|식비|카드값|공과금|빚|대출금|돈)[^.!?\n]{0,30}(?:밀릴까\s*(?:봐|걱정)|부족(?:할까|해서|하기\s*때문)|감당(?:할\s*수\s*있을지|하기\s*어려)|걱정(?:돼서|이라|이에요|돼요)|낼\s*수\s*있을지|못\s*낼까|생각하면|때문에)/},
  {category:'new_beginning',situationId:'fear_of_new_beginning',pattern:/(?:새|새로운|처음)\s*(?:팀|직장|회사|사업|프로젝트|일|환경|학교|지역)[^.!?\n]{0,35}(?:들어가|시작|적응|첫날|맡|해야|하려|앞두)/},
  {category:'work',situationId:'overload',pattern:/(?:회사\s*)?(?:일|업무|할\s*일)(?:이|가|을|를|도)?\s*(?:너무\s*)?(?:쌓|몰려|많|과도|벅차|감당)/},
  {category:'self_image',situationId:'comparison_inferiority',pattern:/(?:다른\s*사람|친구들?|남들)(?:의)?\s*(?:성과|성취|외모|조건|스펙|삶|모습)(?:을|를|이|가)?\s*(?:보다\s*보니|볼수록|보고|보면|비교)|(?:다른\s*사람|친구들?|남들)(?:하고|과|와|이랑|랑)?\s*(?:나를|저를|내|제)?\s*비교(?:하다\s*보니|할수록|해서|하게)/}
 ];
 let localCause=null;
 for(const rule of explicitCauseRules){const match=text.match(rule.pattern);if(match){localCause={category:rule.category,situationIds:[rule.situationId],evidence:match[0],explicit:true};if(!situations.includes(rule.situationId))situations.push(rule.situationId);break;}}
 const localEffects=[];
 if(localCause){
  const effectRules=[
   {type:'insomnia',situationIds:['sleep_worry'],pattern:/밤마다\s*잠이\s*안\s*와|잠이\s*안\s*와|잠을\s*못\s*자|못\s*자겠|뒤척여/},
   {type:'fatigue',situationIds:[],pattern:/지치|지쳐|지쳤|피곤|소진|번아웃/},
   {type:'anxiety',situationIds:[],pattern:/불안|걱정|긴장|두렵|무서|겁이\s*나|실패할까\s*봐/},
   {type:'emotional_distress',situationIds:[],pattern:/쓸모없|초라|보잘것없|자신감.*없|자존감.*(?:낮|떨어)/}
  ];
  for(const rule of effectRules){const match=text.match(rule.pattern);if(match)localEffects.push({type:rule.type,situationIds:rule.situationIds.filter(id=>situations.includes(id)),evidence:match[0]});}
 }
 const localEmotions=localCause?[['anxiety',/불안|걱정|긴장/],['fear',/두렵|무서|겁이\s*나|실패할까\s*봐/],['shame',/쓸모없|초라|보잘것없/],['overwhelm',/쌓|몰려|감당하기\s*어려/]].filter(([,pattern])=>pattern.test(text)).map(([id])=>id):[];
 const situationTopicHints={
  longing_for_gentle_care:'loneliness',feeling_useless:'failure',falling_behind_others:'future',
  carrying_everything_alone:'rest',afraid_to_burden_others:'relationship',guilt_about_rest:'rest',concrete_overload_without_breaks:'rest',
  practical_financial_worry:'fear',financial_fear_of_abandonment:'fear',guilt_after_anger_at_god:'faith',prayer_feels_unheard:'faith',
  wanting_to_give_up_prayer:'faith',persistent_prayer_fatigue:'faith',wordless_prayer:'faith',prolonged_waiting:'faith',
  god_feels_distant_in_suffering:'faith',feeling_forgotten_by_god:'faith',doubting_gods_love:'faith',longing_to_feel_cherished:'faith',unexplained_suffering:'faith',
  new_day_after_failure:'guilt',fear_of_new_beginning:'fear',
  difficulty_accepting_self:'failure',comparison_inferiority:'failure',judged_by_external_conditions:'failure'
 };
 for(const situation of situations){
  const id=situationTopicHints[situation];
  if(id&&!topics.some(topic=>topic.id===id))topics.push({id,score:1.2,last:clauses.length-1});
 }
 topics.sort((a,b)=>b.score-a.score||b.last-a.last);
 const loss=topics.some(topic=>topic.id==='grief')||situations.some(id=>['bereavement','separation'].includes(id));
 const recent=clauses.some(clause=>/오늘|어제|방금|며칠\s*전|얼마\s*전|최근/.test(clause)&&/상실|이별|헤어|사별|돌아가|장례|세상을\s*떠|잃었|잃어서/.test(clause));
 if(recent)situations.push('recent_loss');
 // Risk keywords are signals, not proof. Scope/negation/current safety require clarification.
 const riskSignals=data.riskRules.filter(rule=>rule.pattern.test(text)).map(rule=>rule.id);
 const medicalAction=[
  /(?:복용\s*중인\s*)?(?:약|약물)(?:을|를|은|는|도)?\s*(?:줄이|줄여|감량|끊|중단|바꾸|바꿔|변경|늘리|증량|계속\s*(?:먹|복용)|안\s*(?:먹|복용))/,/(?:약|약물)\s*(?:용량|복용량)(?:을|를)?\s*(?:줄이|줄여|감량|바꾸|바꿔|변경|늘리|증량)/,
  /치료(?:를|는|도)?\s*(?:시작|중단|그만두|멈추|계속|바꾸|바꿔|변경)/,/치료\s*(?:방법|방식|계획)(?:을|를)?\s*(?:바꾸|바꿔|변경)/,
  /수술(?:을|를)?\s*(?:받|하|안\s*하|미루|취소)|수술\s*(?:여부|날짜)(?:를|을)?\s*(?:정하|잡|결정)/,
  /(?:난임\s*)?시술(?:을|를)?\s*(?:시작|중단|그만두|멈추|계속|받|바꾸|바꿔|변경)/,/(?:예방\s*접종|백신)(?:을|를)?\s*(?:맞|안\s*맞|미루|취소)/
 ].some(pattern=>pattern.test(text));
 const asksForMedicalDecision=medicalAction&&/(?:할지|해야|되는지|괜찮|좋을지|말아야|여부|도\s*(?:돼|될)|고\s*싶|려고|결정|고민)/.test(text);
 const urgentPregnancySymptom=/(?:임신|임신부|임산부).*?(?:출혈|피가\s*나|심한\s*복통)|(?:출혈|피가\s*나|심한\s*복통).*?(?:임신|임신부|임산부)/.test(text);
 const requiresProfessionalJudgment=asksForMedicalDecision||urgentPregnancySymptom;
 const healthContext=/(?:약|약물|병원|검사|수술|치료|시술|예방\s*접종|백신|임신|난임|생리통|통증|질병|진단)/.test(text);
 const highStakesHealthContext=/수술.*(?:마취|깨어나지|위험)|임신.*(?:출혈|피가\s*나|복통|아기.*(?:문제|건강))/.test(text);
 const emotionalConcernInHealthContext=!requiresProfessionalJudgment&&!highStakesHealthContext&&healthContext&&/(?:지치|지쳐|지쳤|힘들|무서|두렵|불안|걱정|슬프|외롭|낙심|답답)/.test(text);
 const uncertainties=[];
 if(!topics.length)uncertainties.push('마음 주제를 입력만으로 파악하기 어려움');
 if(!situations.length)uncertainties.push('구체적인 상황을 알 수 없음');
 if(loss&&!recent)uncertainties.push('상실의 시점을 알 수 없음');
 if(riskSignals.length)uncertainties.push('위험의 현재성·대상·정도를 확인해야 함');
 return {method:'rules',primaryTopic:topics[0]?.id||null,secondaryTopics:topics.slice(1).map(topic=>topic.id),situations,riskSignals,uncertainties,topics,matched:topics.length>0,mixed:topics.length>1,shortFeeling:shortFeeling?text.replace(/[.!?\s]+$/,''):null,mourningContext,requiresProfessionalJudgment,emotionalConcernInHealthContext,
  ...(localCause?{cause:localCause,effects:localEffects,emotions:localEmotions,explicitFacts:[],primaryConcern:{kind:'cause',id:localCause.category},secondaryConcerns:localEffects.map(effect=>({kind:'effect',id:effect.type}))}:{}),
  canContinue:/^(?:고마워요?|감사해요|네|응|조금\s*더\s*(?:이야기하고\s*싶어요|읽고\s*싶어요|생각해볼게요)|계속\s*읽고\s*싶어요|이\s*말씀으로\s*더\s*이야기하고\s*싶어요)[.!?\s]*$/.test(text)};
}
window.Malsseum.services.classifyConcern=classifyConcern;
})();
