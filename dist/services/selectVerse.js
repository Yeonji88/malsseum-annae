(function () {
// 같은 대화에서는 말씀을 유지합니다. 추후 AI 선택기도 이 입력/출력 경계를 사용할 수 있습니다.
window.Malsseum.services.selectVerse = function(classification, candidates, options = {}) {
 const {previousId = null, continueConversation = false, history = [], verses = window.Malsseum.data.verses} = options;
 const previous = continueConversation && verses.find(verse => verse.id === previousId);
 let verse = previous;
 if(!verse) {
  const bestScore = Math.max(...candidates.map(candidate => candidate.score));
  // 적합도가 비슷한 후보에만 반복 감점을 적용합니다. 무관한 말씀을 다양성 때문에 선택하지 않습니다.
  const eligible = candidates.filter(candidate => candidate.score >= bestScore * .8);
  const ranked = eligible.map(candidate => {
   const repetitions = history.slice(-5).filter(id => id === candidate.verse.id).length;
   return {...candidate, adjustedScore:candidate.score * Math.pow(.75, repetitions)};
  }).sort((a,b)=>b.adjustedScore-a.adjustedScore||b.score-a.score||b.last-a.last);
  verse = ranked[0]?.verse;
 }
 if(!verse) throw new Error('추천할 말씀 데이터가 없습니다.');
 return {verse,matched:classification.matched,continued:Boolean(previous)&&!classification.matched,mixed:classification.mixed};
};
})();
