(function () {
// 여러 주제에 일치해도 같은 구절은 후보에 한 번만 포함합니다.
window.Malsseum.services.findCandidates = function(classification, verses = window.Malsseum.data.verses) {
 const topics = classification.matched ? classification.topics.filter(topic => topic.score > 0) : [{id:window.Malsseum.data.defaultTopic,score:1,last:-1}];
 return verses.flatMap(verse => {
  const matches = topics.filter(topic => verse.topicTags.includes(topic.id)).sort((a,b)=>b.score-a.score||b.last-a.last);
  return matches.length ? [{verse,score:matches[0].score,last:matches[0].last}] : [];
 });
};
})();
