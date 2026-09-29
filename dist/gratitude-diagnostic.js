// Opt-in, local display only. Never writes storage or transmits journal contents.
(function(){
 if(new URLSearchParams(location.search).get('gratitude-debug')!=='1')return;
 window.Malsseum.renderGratitudeDiagnostic=function({root,selected,mode,entries,record,fields}){
  const panel=document.createElement('details');panel.id='gratitude-diagnostic';
  const title=document.createElement('summary');title.textContent='감사 데이터 진단 (이 기기에서만 표시)';
  const note=document.createElement('p');note.textContent='선택 날짜의 저장값과 실제 화면을 비교합니다. 내용을 변경하거나 전송하지 않습니다. 원문을 공유하지 않아도 됩니다.';
  const refresh=document.createElement('button');refresh.type='button';refresh.textContent='진단 다시 읽기';
  const output=document.createElement('pre');output.style.whiteSpace='pre-wrap';output.style.overflowWrap='anywhere';
  const rawDetails=document.createElement('details'),rawTitle=document.createElement('summary'),rawOutput=document.createElement('pre');rawTitle.textContent='선택 날짜 원본·읽기 결과 보기 (개인 내용 포함)';rawOutput.style.whiteSpace='pre-wrap';rawOutput.style.overflowWrap='anywhere';rawDetails.append(rawTitle,rawOutput);
  function update(){
   const journal=window.Malsseum.services.gratitudeJournal;let raw,parsed,error=null,latest;
   try{raw=localStorage.getItem(journal.key);parsed=JSON.parse(raw||'[]');latest=journal.list()}catch(e){error=e.message}
   const rawRows=Array.isArray(parsed)?parsed.map((value,index)=>({index,value})).filter(r=>r.value?.date===selected):[];
   const current=latest?.find(r=>r.date===selected);
   const values=fields.map((key,index)=>{const value=record?.[key],input=root.querySelector('#gratitude-'+key);return {index,key,raw:rawRows.map(r=>({recordIndex:r.index,present:Object.hasOwn(r.value,key),type:typeof r.value[key],length:typeof r.value[key]==='string'?r.value[key].length:null,trimmedLength:typeof r.value[key]==='string'?r.value[key].trim().length:null})),renderValueType:typeof value,renderTrimmedLength:typeof value==='string'?value.trim().length:null,renderEligible:typeof value==='string'&&!!value.trim(),currentSavedLength:typeof current?.[key]==='string'?current[key].trim().length:null,editor:input?{length:input.value.length,matchesSaved:input.value===(current?.[key]||''),readOnly:input.readOnly,button:input.closest('.gratitude-input-card').querySelector('.gratitude-field-save')?.textContent}:null}});
   const dom=[...root.querySelectorAll('.prayer-day>.gratitude-entry')].map(e=>({title:e.querySelector('h3').textContent,length:e.querySelector('p').textContent.length}));
   const report={version:1,date:selected,mode,storageKey:journal.key,error,rawRecordsForDate:rawRows.length,rawKeys:rawRows.map(r=>Object.keys(r.value)),parsedRecordsForDate:entries?.filter(r=>r.date===selected).length,renderItemCount:values.filter(v=>v.renderEligible).length,domItemCount:dom.length,fields:values,dom,domOrder:[...root.querySelectorAll('.prayer-day>.gratitude-entry,.prayer-day>.gratitude-edit')].map(e=>e.querySelector('h3')?.textContent||e.textContent)};
   output.textContent=JSON.stringify(report,null,2);rawOutput.textContent=JSON.stringify({rawRecords:rawRows,parsedRecordUsedByScreen:record??null,currentParsedRecord:current??null},null,2);
  }
  refresh.addEventListener('click',update);panel.append(title,note,refresh,output,rawDetails);root.append(panel);update();
 };
})();
