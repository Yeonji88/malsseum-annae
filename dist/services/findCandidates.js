(function () {
// Collect candidates only; policy and suitability are checked downstream.
window.Malsseum.services.findCandidates=function(analysis,verses=window.Malsseum.data.verses){
 const topics=[analysis.primaryTopic,...analysis.secondaryTopics].filter(Boolean);
 const roles=analysis.concernResolution;
 const roleSets=roles?{
  cause:new Set(roles.causeSituationIds),primary:new Set(roles.primarySituationIds),secondary:new Set(roles.secondarySituationIds),effect:new Set(roles.effectSituationIds)
 }:null;
 return verses.filter(verse=>window.Malsseum.services.recommendationPolicy.isActive(verse)).flatMap(verse=>{
  const matchedTopics=verse.topics.filter(id=>topics.includes(id));
  const matchedSituations=verse.situations.filter(id=>analysis.situations.includes(id));
  if(!matchedTopics.length&&!matchedSituations.length)return [];
  const topicScore=(matchedTopics.includes(analysis.primaryTopic)?3:0)+matchedTopics.filter(id=>id!==analysis.primaryTopic).length;
  const roleScore=!roleSets?0:Math.max(0,...matchedSituations.map(id=>roleSets.cause.has(id)?7:roleSets.primary.has(id)?6:roleSets.secondary.has(id)?3:roleSets.effect.has(id)?1:4));
  const score=topicScore+roleScore;
  return [{verse,score,topicScore,roleScore,matchedTopics,matchedSituations}];
 });
};
})();
