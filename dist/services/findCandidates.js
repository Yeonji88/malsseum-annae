(function () {
// Collect candidates only; policy and suitability are checked downstream.
window.Malsseum.services.findCandidates=function(analysis,verses=window.Malsseum.data.verses){
 const topics=[analysis.primaryTopic,...analysis.secondaryTopics].filter(Boolean);
 return verses.filter(verse=>window.Malsseum.services.recommendationPolicy.isActive(verse)).flatMap(verse=>{
  const matchedTopics=verse.topics.filter(id=>topics.includes(id));
  const matchedSituations=verse.situations.filter(id=>analysis.situations.includes(id));
  if(!matchedTopics.length&&!matchedSituations.length)return [];
  const score=(matchedTopics.includes(analysis.primaryTopic)?3:0)+matchedTopics.filter(id=>id!==analysis.primaryTopic).length;
  return [{verse,score,matchedTopics,matchedSituations}];
 });
};
})();
