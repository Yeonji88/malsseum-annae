(function () {
const safetyMessage='말씀을 고르기보다 지금의 안전을 먼저 살피고 싶어요. 폭력이나 위협, 심한 통제가 있다면 화해하거나 더 참아야 한다고 권하지 않을게요. 안전한 곳과 믿을 만한 사람의 도움을 먼저 생각해주세요. 지금 안전하게 이야기할 수 있는 상황인가요?';
// These identify forbidden APPLICATIONS, not forbidden passages. Shared with future AI output checks.
const forbiddenApplications=Object.freeze(['faith_shaming','emotion_suppression','endurance_pressure','immediate_forgiveness','premature_hope','reconciliation_pressure','endurance_in_danger','guaranteed_outcome','context_distortion','coercive_application','victim_blame','accountability_erasure','forced_gratitude']);
const cautionRules=Object.freeze({
 endurance_pressure:{topics:['rest'],excludeSituations:['severe_exhaustion','need_rest'],readySituations:['prolonged_effort','discouraged_service']},
 immediate_forgiveness:{topics:['relationship'],excludeSituations:['fresh_relationship_wound'],readySituations:['forgiveness_when_ready']},
 premature_hope:{topics:['grief'],excludeSituations:['recent_loss'],readySituations:['hope_when_ready']},
 reconciliation_pressure:{risks:['violence','abuse','coercive_control']},
 endurance_in_danger:{risks:['violence','abuse','coercive_control']},
 forced_gratitude:{topics:['grief','relationship','rest'],excludeSituations:['recent_loss']},
 faith_shaming:{},emotion_suppression:{},guaranteed_outcome:{},context_distortion:{},
 coercive_application:{},victim_blame:{},accountability_erasure:{}
});
function isActive(verse){
 // Scripture readiness is independent of optional reflection/prayer readiness.
 // Metadata annotations retain their original state; per-candidate policy review still runs.
 return verse?.textStatus==='verified'&&typeof verse.text==='string'&&Boolean(verse.text.trim())&&typeof verse.translation==='string'&&Boolean(verse.translation.trim())&&verse.recommendationEnabled===true;
}
function review(verse,analysis,{applicationTags=[]}={}){
 const reasons=[],topics=[analysis.primaryTopic,...analysis.secondaryTopics];
 let excluded=false,priority=1;
 const avoidApplications=[...new Set([...forbiddenApplications,...(verse.applicationGuidance?.avoidApplications||[]),...(verse.cautionTags||[])])];
 if(!isActive(verse)){excluded=true;reasons.push('not_ready_for_recommendation');}
 if(typeof verse.contextNote!=='string'||!verse.contextNote.trim()||typeof verse.recommendationNote!=='string'||!verse.recommendationNote.trim()){
  excluded=true;reasons.push('missing_context_review');
 }
 // Receiving a caution tag is not permission to produce that application.
 if(applicationTags.some(tag=>avoidApplications.includes(tag))){excluded=true;reasons.push('prohibited_application');}
 for(const tag of new Set([...(verse.cautionTags||[]),...(verse.applicationGuidance?.avoidApplications||[])])){
  const rule=cautionRules[tag];
  if(!rule){excluded=true;reasons.push('unknown_caution:'+tag);continue;}
  if(rule.risks?.some(id=>analysis.riskSignals.includes(id))||rule.excludeSituations?.some(id=>analysis.situations.includes(id))){
   excluded=true;reasons.push('unsuitable_situation:'+tag);continue;
  }
  const ready=rule.readySituations?.some(id=>analysis.situations.includes(id));
  if(!ready&&rule.topics?.some(id=>topics.includes(id))){priority=Math.min(priority,.4);reasons.push('prefer_gentler_application:'+tag);}
 }
 return {excluded,priority,reasons,avoidApplications,suitableSituations:(verse.applicationGuidance?.suitableSituations||verse.situations||[]).filter(id=>analysis.situations.includes(id))};
}
window.Malsseum.services.recommendationPolicy=Object.freeze({cautionRules,review,isActive,safetyMessage,forbiddenApplications});
})();
