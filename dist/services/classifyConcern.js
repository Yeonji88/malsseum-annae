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
 const loss=topics.some(topic=>topic.id==='grief')||situations.some(id=>['bereavement','separation'].includes(id));
 const recent=clauses.some(clause=>/오늘|어제|방금|며칠\s*전|얼마\s*전|최근/.test(clause)&&/상실|이별|헤어|사별|돌아가|장례|세상을\s*떠/.test(clause));
 if(recent)situations.push('recent_loss');
 // Risk keywords are signals, not proof. Scope/negation/current safety require clarification.
 const riskSignals=data.riskRules.filter(rule=>rule.pattern.test(text)).map(rule=>rule.id);
 const uncertainties=[];
 if(!topics.length)uncertainties.push('마음 주제를 입력만으로 파악하기 어려움');
 if(!situations.length)uncertainties.push('구체적인 상황을 알 수 없음');
 if(loss&&!recent)uncertainties.push('상실의 시점을 알 수 없음');
 if(riskSignals.length)uncertainties.push('위험의 현재성·대상·정도를 확인해야 함');
 return {method:'rules',primaryTopic:topics[0]?.id||null,secondaryTopics:topics.slice(1).map(topic=>topic.id),situations,riskSignals,uncertainties,topics,matched:topics.length>0,mixed:topics.length>1,
  canContinue:/^(?:고마워요?|감사해요|네|응|조금\s*더\s*(?:이야기하고\s*싶어요|읽고\s*싶어요|생각해볼게요)|계속\s*읽고\s*싶어요|이\s*말씀으로\s*더\s*이야기하고\s*싶어요)[.!?\s]*$/.test(text)};
}
window.Malsseum.services.classifyConcern=classifyConcern;
})();
