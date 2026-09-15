(function () {
const contextOnlyVerses=new Set(['psalm-4-8','psalm-46-1-2','psalm-62-5-6','psalm-121-1-2','psalm-130-5','isaiah-30-15','exodus-14-14','psalm-131-1-2','1-peter-5-7','psalm-94-19','psalm-42-5','psalm-30-5','2-corinthians-4-8-9','psalm-40-1-2','isaiah-49-15-16','psalm-73-26','psalm-9-9-10','psalm-10-1','romans-8-38-39','zephaniah-3-17','isaiah-40-11','matthew-10-29-31','psalm-139-13-14','ephesians-2-10','galatians-1-10','2-corinthians-10-12','1-samuel-16-7','psalm-37-7','ecclesiastes-3-11','psalm-138-8']);
window.Malsseum.services.selectVerse=function(analysis,candidates,options={}){
 const {previousId=null,previousAnalysis=null,continueConversation=false,history=[],verses=window.Malsseum.data.verses}=options;
 const policy=window.Malsseum.services.recommendationPolicy;
 const result={status:'needs_clarification',verse:null,matched:analysis.matched,mixed:analysis.mixed,continued:false,analysis,reviews:[]};
 // Every turn passes the safety gate before continuity or ranking.
 if(analysis.riskSignals.length)return {...result,status:'safety_first',message:analysis.riskSignals.includes('self_harm')?'지금은 말씀 추천보다 안전을 먼저 살피고 싶어요. 혼자 견디기보다 믿을 만한 사람이나 긴급 도움을 받을 수 있는 곳에 연결해 주세요. 지금 안전한 곳에 있나요?':policy.safetyMessage};
 if(continueConversation&&previousAnalysis?.riskSignals.length)return {...result,status:'safety_first',analysis:{...analysis,riskSignals:[...new Set([...analysis.riskSignals,...previousAnalysis.riskSignals])]},message:'앞서 나눈 위험 상황이 해결됐는지 이 입력만으로는 확인할 수 없어요. 말씀을 권하기 전에 현재 안전과 도움을 받을 수 있는 사람을 먼저 확인하고 싶어요.'};
 if(analysis.situations.includes('physical_health_concern'))return {...result,status:'no_suitable_candidate',message:'말씀으로 신체의 아픔이나 진료가 필요한 상황을 대신 설명하지 않을게요. 지금 겪는 증상과 필요한 도움을 조금 더 살펴주세요.'};
 const oldTopics=[previousAnalysis?.primaryTopic,...(previousAnalysis?.secondaryTopics||[])];
 const importantChange=(analysis.primaryTopic&&!oldTopics.includes(analysis.primaryTopic))||analysis.secondaryTopics.some(id=>!oldTopics.includes(id))||analysis.situations.some(id=>!(previousAnalysis?.situations||[]).includes(id));
 const previous=continueConversation&&verses.find(verse=>verse.id===previousId);
 const acknowledgement=analysis.canContinue&&analysis.situations.length===0;
 const contextualContinuation=previous&&previousAnalysis&&(!importantChange||acknowledgement)&&(acknowledgement||previous.topics.includes(analysis.primaryTopic));
 // Preserve the accumulated context for continuations; unknown information is never invented.
 const effectiveAnalysis={...analysis,primaryTopic:contextualContinuation&&acknowledgement?previousAnalysis.primaryTopic:analysis.primaryTopic,secondaryTopics:contextualContinuation&&acknowledgement?previousAnalysis.secondaryTopics:analysis.secondaryTopics,situations:[...new Set([...(continueConversation?previousAnalysis?.situations||[]:[]),...analysis.situations])]};
 result.analysis=effectiveAnalysis;
 const short=effectiveAnalysis.shortFeeling;
 const shortPreference=short&&(
  /^(?:화가\s*나|화났|짜증나|분노해)/.test(short)?'ephesians-4-26-27':
  /^(?:무서워|두려워)/.test(short)?'psalm-56-3':
  /^(?:불안해|걱정돼)/.test(short)?'philippians-4-6-7':
  /^(?:우울해|울적해|(?:기분|마음)이\s*가라앉|마음이\s*무거워)/.test(short)?'psalm-34-18':null
 );
 const reviewed=candidates.map(candidate=>{
  const review=policy.review(candidate.verse,effectiveAnalysis,{applicationTags:options.applicationTags||[]});
  let suitability=(candidate.score+candidate.matchedSituations.length*2)*review.priority;
  // The new passages describe particular contexts; a broad topic alone is not enough to outrank an existing general passage.
  if(contextOnlyVerses.has(candidate.verse.id)&&!candidate.matchedSituations.length)suitability*=.7;
  if(candidate.verse.id==='psalm-62-5-6'&&effectiveAnalysis.situations.includes('anxious_waiting'))suitability+=.4;
  if(candidate.verse.id===shortPreference)suitability+=shortPreference==='ephesians-4-26-27'?1.2:.45;
  if(candidate.verse.id==='john-11-35'&&effectiveAnalysis.primaryTopic==='grief'&&!effectiveAnalysis.mourningContext)suitability*=.75;
  return {...candidate,review,suitability};
 });
 result.reviews=reviewed.map(({verse,review})=>({id:verse.id,...review}));
 // Gentle, suitable alternatives rank above caution-penalised passages; severe contraindications remain excluded.
 const eligible=reviewed.filter(candidate=>!candidate.review.excluded&&candidate.score>0);
 if(contextualContinuation){
  const review=policy.review(previous,effectiveAnalysis,{applicationTags:options.applicationTags||[]});
  if(!review.excluded&&review.priority===1)return {...result,status:'selected',verse:previous,continued:true,analysis:effectiveAnalysis,reason:'기존 말씀의 적합성과 주의사항을 다시 확인해 유지함',avoidApplications:review.avoidApplications};
 }
 if(!analysis.primaryTopic)return {...result,message:'이야기를 들려주셔서 고마워요. 지금 가장 크게 느껴지는 마음이나 어떤 일이 있었는지 조금 더 들려주실래요?'};
 if(!eligible.length)return {...result,status:'no_suitable_candidate',message:analysis.primaryTopic==='faith'||analysis.secondaryTopics.includes('faith')?'기도가 어렵거나 의문이 드는 마음을 믿음이 부족하다는 뜻으로 단정하지 않을게요. 지금 어떤 점이 가장 어렵게 느껴지는지 더 들려주실래요?':'지금 나눈 마음에 조심스럽게 연결할 말씀을 현재 준비된 말씀에서 찾지 못했어요. 억지로 고르지 않고, 지금 어떤 위로나 도움이 필요한지 조금 더 듣고 싶어요.'};
 const bestScore=Math.max(...eligible.map(candidate=>candidate.suitability));
 const comparable=eligible.filter(candidate=>candidate.suitability>=bestScore*.8);
 const ranked=comparable.map(candidate=>({...candidate,adjustedScore:candidate.suitability*Math.pow(.75,history.slice(-5).filter(id=>id===candidate.verse.id).length)})).sort((a,b)=>b.adjustedScore-a.adjustedScore||b.suitability-a.suitability||a.verse.id.localeCompare(b.verse.id));
 const selected=ranked[0];
 return {...result,status:'selected',verse:selected.verse,reason:selected.verse.recommendationNote,matchedTopics:selected.matchedTopics,matchedSituations:selected.matchedSituations,avoidApplications:selected.review.avoidApplications};
};
})();
