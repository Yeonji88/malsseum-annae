(function () {
function classifyConcern(message) {
 if(typeof message !== 'string' || !message.trim() || message.length > 1000) throw new Error('마음을 1~1,000자로 적어주세요.');
 const clauses = message.normalize('NFKC').trim().toLowerCase().split(/[.!?。\n,]+|하지만|그런데|그래도|지만|보다는|보다/).filter(Boolean);
 const ranking = window.Malsseum.data.topics.map(topic => {
  const signals = new Map(); let last = -1;
  clauses.forEach((clause,index) => topic.rules.forEach(([weight,pattern],key) => {
   for(const match of clause.matchAll(new RegExp(pattern.source,'g'))) {
    const before = clause.slice(Math.max(0,match.index-4),match.index);
    const after = clause.slice(match.index+match[0].length);
    // 명시적인 짧은 부정 표현만 제외합니다. 한국어 전체를 이해하는 분석은 아닙니다.
    if(/안\s*$/.test(before) || /^[가-힣]{0,4}\s*(?:하지\s*않|않|없|아니)/.test(after)) continue;
    signals.set(key, Math.max(signals.get(key)||0,weight*(index===clauses.length-1?1.15:1)));
    last=index;
   }
  }));
  return {id:topic.id,score:[...signals.values()].reduce((a,b)=>a+b,0),last};
 }).sort((a,b)=>b.score-a.score || b.last-a.last);
 const matched=ranking[0].score>0;
 return {method:"rules",topics:ranking,matched,mixed:matched&&ranking[1].score>=ranking[0].score*.8};
}
window.Malsseum.services.classifyConcern = classifyConcern;
})();
