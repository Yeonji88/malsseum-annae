(function () {
// 고민 원문 없이 구절 ID만 현재 페이지 메모리에 보관합니다. 새로고침하면 초기화됩니다.
function createHistory(limit = 10) {
 const ids = [];
 return Object.freeze({
  snapshot: () => ids.slice(),
  record(id) { if(typeof id !== 'string' || !id) throw new Error('Invalid verse ID'); ids.push(id); if(ids.length > limit) ids.shift(); }
 });
}
window.Malsseum.services.createRecommendationHistory = createHistory;
window.Malsseum.services.recommendationHistory = createHistory();
})();
