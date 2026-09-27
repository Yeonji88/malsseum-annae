(function () {
 const oldId='psalm-46-1-2',newId='psalm-46-1-3';
 const rename=id=>id===oldId?newId:id;
 // Run before catalogue consumers. Each key is independent and safely retryable.
 // Never rewrite malformed data, journal text, record IDs, or unrelated keys.
 window.Malsseum.services.migrateVerseIds=function(storage){
  const failed=[];
  function update(key,transform){
   try{
    const raw=storage.getItem(key);if(raw===null)return;
    const value=JSON.parse(raw),next=transform(value);
    if(JSON.stringify(next)!==JSON.stringify(value))storage.setItem(key,JSON.stringify(next));
   }catch{failed.push(key);}
  }
  update('malsseum-annae.saved-verse-ids.v1',value=>Array.isArray(value)&&value.includes(oldId)?[...new Set(value.map(rename))]:value);
  update('malsseum-annae.saved-verse-times.v1',value=>{
   if(!value||Array.isArray(value)||typeof value!=='object'||!Object.hasOwn(value,oldId))return value;
   const next={...value};
   // If both IDs were saved, retain the earliest valid save date.
   const dates=[value[newId],value[oldId]].filter(x=>typeof x==='string'&&Number.isFinite(Date.parse(x)));
   next[newId]=dates.length?dates.sort((a,b)=>Date.parse(a)-Date.parse(b))[0]:(value[newId]??value[oldId]);
   delete next[oldId];return next;
  });
  const entry=value=>value&&typeof value==='object'&&!Array.isArray(value)&&value.verseId===oldId?{...value,verseId:newId}:value;
  update('malsseum-annae.personal-reflections.v1',value=>Array.isArray(value)?value.map(entry):value);
  update('malsseum-annae.daily-verse.v1',entry);
  update('malsseum-annae.daily-verse-history.v1',value=>{
   if(!Array.isArray(value)||!value.some(x=>x?.verseId===oldId))return value;
   const seen=new Set();return value.map(entry).filter(x=>{
    if(x?.verseId!==newId||typeof x.date!=='string')return true;
    if(seen.has(x.date))return false;seen.add(x.date);return true;
   });
  });
  return {failed};
 };
})();
