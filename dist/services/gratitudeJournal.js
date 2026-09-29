(function(){
 const key='malsseum-annae.gratitude.v1';
 const fields=['today','self','grace'];
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 function list(){const raw=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(raw))throw new Error('감사 기록을 읽지 못했어요.');return raw.filter(r=>r&&validDate(r.date)&&fields.every(f=>typeof r[f]==='string')&&fields.some(f=>r[f].trim()));}
 function save(date,values){if(!validDate(date))throw new Error('날짜를 확인해주세요.');const content=Object.fromEntries(fields.map(f=>[f,String(values[f]||'').trim()]));if(!fields.some(f=>content[f]))throw new Error('감사를 하나 이상 남겨주세요.');const entries=list(),old=entries.find(r=>r.date===date),now=new Date().toISOString();const record={date,...content,createdAt:old?.createdAt||now,updatedAt:now};localStorage.setItem(key,JSON.stringify([...entries.filter(r=>r.date!==date),record]));return record;}
 window.Malsseum.services.gratitudeJournal={key,list,save};
})();
