// One reviewed pool and schedule shared by web and Capacitor assets.
(function(){
 'use strict';
 const pool=Object.freeze([
  "psalm-143-8",
  "psalm-139-14",
  "matthew-11-28",
  "romans-8-28",
  "joshua-1-9",
  "psalm-23-2",
  "psalm-130-5",
  "psalm-118-24",
  "mark-6-31",
  "john-14-27",
  "luke-18-1",
  "1-john-1-9",
  "psalm-19-14",
  "philippians-1-6",
  "1-samuel-16-7",
  "genesis-50-20",
  "proverbs-4-23",
  "ecclesiastes-3-11",
  "isaiah-40-11",
  "habakkuk-1-2",
  "psalm-103-2",
  "psalm-131-2",
  "psalm-51-10",
  "proverbs-15-1",
  "ecclesiastes-4-10",
  "matthew-6-34",
  "luke-12-22",
  "mark-9-24",
  "romans-12-15",
  "ephesians-2-10",
  "hebrews-4-16",
  "james-1-5",
  "isaiah-49-15",
  "lamentations-3-22",
  "exodus-14-14",
  "psalm-56-3",
  "psalm-121-1-2",
  "psalm-127-2",
  "proverbs-3-5",
  "proverbs-16-9",
  "1-corinthians-6-19",
  "jeremiah-29-11",
  "zephaniah-3-17",
  "matthew-5-4",
  "matthew-10-30-31",
  "romans-8-26",
  "romans-12-18",
  "ephesians-4-32",
  "james-1-17",
  "revelation-21-4"
]);
 const seed='malsseum-daily-reviewed-1-50-v1';
 const epoch=Date.UTC(2026,0,1),dayMs=86400000;
 function dateKey(now=new Date()){return new Date(now.getTime()+9*3600000).toISOString().slice(0,10);}
 function hash(value){let state=2166136261;for(const char of value){state^=char.codePointAt(0);state=Math.imul(state,16777619);}return state>>>0;}
 function rawOrder(cycle){
  // Preserve the established schedule; only the former Daily 41 slot changes.
  const scheduleIds=pool.map(id=>id==='1-corinthians-6-19'?'isaiah-55-9':id);
  let state=hash(seed+':'+cycle+':'+scheduleIds.join('|'));
  const random=()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const order=[...pool];for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}return order;
 }
 function cycleOrder(cycle){
  const order=rawOrder(cycle),previous=rawOrder(cycle-1);
  // Only swap positions before the last; the prior cycle's last stays stable.
  if(order[0]===previous[previous.length-1])[order[0],order[1]]=[order[1],order[0]];
  // Alternate permutation parity guarantees adjacent cycles differ, even if
  // the PRNG happens to generate the same permutation. Keep both endpoints.
  let parity=0;const positions=order.map(id=>pool.indexOf(id));
  for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)if(positions[i]>positions[j])parity^=1;
  if(parity!==((cycle%2)+2)%2)[order[1],order[2]]=[order[2],order[1]];
  return order;
 }
 function select(now=new Date()){
  const date=dateKey(now),dayNumber=(Date.parse(date+'T00:00:00Z')-epoch)/dayMs;
  const cycle=Math.floor(dayNumber/pool.length),index=((dayNumber%pool.length)+pool.length)%pool.length;
  return {date,dayNumber,cycle,index,verseId:cycleOrder(cycle)[index]};
 }
 function remember(storage,selection){
  const currentKey='malsseum-annae.daily-verse.v1',historyKey='malsseum-annae.daily-verse-history.v1';
  const current={date:selection.date,verseId:selection.verseId};
  try{let old;try{old=JSON.parse(storage.getItem(currentKey)||'null');}catch{}if(!old||old.date!==current.date||old.verseId!==current.verseId)storage.setItem(currentKey,JSON.stringify(current));}catch{}
  try{const raw=storage.getItem(historyKey);let history;try{history=raw===null?[]:JSON.parse(raw);}catch{return;}if(!Array.isArray(history))return;
   const today=history.filter(item=>item&&item.date===current.date);
   if(today.length===1&&today[0].verseId===current.verseId)return;
   const next=history.filter(item=>!item||item.date!==current.date);next.push(current);storage.setItem(historyKey,JSON.stringify(next));
  }catch{}
 }
 window.Malsseum=window.Malsseum||{};window.Malsseum.services=window.Malsseum.services||{};
 window.Malsseum.services.dailySelection=Object.freeze({pool,seed,dateKey,cycleOrder,select,remember});
})();
