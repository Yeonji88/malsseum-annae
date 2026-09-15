/* 추천 데이터와 단계는 data/ 및 services/에서 불러옵니다. */
const {classifyConcern,analyzeConcernWithAI,findCandidates,selectVerse,recommendationHistory}=window.Malsseum.services;
const aiEnabled=Boolean(window.MalsseumAIEndpoint);
document.querySelector('#privacy span').innerHTML=aiEnabled
 ? '입력한 이야기는 마음을 이해하기 위한 AI 분석에만 사용돼요.<br>당신의 마음에 어울리는 말씀을 성경 안에서 찾아드려요.'
 : '현재 입력한 이야기는 기기 안에서만 분석해요. AI 연결 전에는 외부로 전송하지 않아요.';
document.querySelector('.conversation-note').innerHTML='성경 본문과 앱의 묵상 안내를 구분해 보여드려요.<br>'+(aiEnabled?'AI는 고민 분석만 도우며 말씀은 기존 데이터에서 선택해요.':'현재는 준비된 분석 규칙과 말씀으로 대화를 이어갑니다.');
const OPENINGS=window.Malsseum.data.openings, FOLLOWUPS=window.Malsseum.data.followups;
// 사용자 입력은 textContent로 표시하고 대화는 페이지 메모리에만 유지합니다.
const input=document.getElementById('heart'), error=document.getElementById('error');
const reply=document.getElementById('reply'), replyError=document.getElementById('reply-error');
const conversation=document.getElementById('conversation');
let previousId=null, previousAnalysis=null, turnCount=0;
// Only verse IDs are persisted. Display content always comes from the catalogue.
const SavedVerses=(()=>{
 const key='malsseum-annae.saved-verse-ids.v1';
 const known=new Set(window.Malsseum.data.verses.map(verse=>verse.id));
 function list(){
  try{
   const stored=JSON.parse(localStorage.getItem(key)||'[]');
   return Array.isArray(stored)?[...new Set(stored.filter(id=>typeof id==='string'&&known.has(id)))]:[];
  }catch{return [];}
 }
 return {
  list,
  has(id){return list().includes(id);},
  toggle(id){
   if(!known.has(id))return false;
   const ids=list(), saved=!ids.includes(id);
   const next=saved?[...ids,id]:ids.filter(item=>item!==id);
   localStorage.setItem(key,JSON.stringify(next));
   return saved;
  },
  removeMany(ids){
   const removing=new Set(ids);
   const next=list().filter(id=>!removing.has(id));
   localStorage.setItem(key,JSON.stringify(next));
  }
 };
})();
function refreshSaveButtons(){
 conversation.querySelectorAll('.save-action[data-verse-id]').forEach(button=>{
  const saved=SavedVerses.has(button.dataset.verseId);
  button.setAttribute('aria-pressed',String(saved));
  button.querySelector('.save-label').textContent=saved?'저장됨':'저장하기';
 });
}
function element(tag,className,text) {
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=text;
 return node;
}
function renderTurn(message,selection) {
 const {verse,matched,continued,mixed}=selection, sameVerse=Boolean(verse)&&previousId===verse.id;
 const turn=element('article','conversation-turn'); turn.setAttribute('aria-label',(turnCount+1)+'번째 대화');
 const user=element('div','user-message');
 user.append(element('span','speaker','나의 이야기'),element('p','',message.trim()));
 const response=element('div','assistant-message');
 const empathy=element('div','empathy-bubble');
 const identity=element('span','speaker app-identity','말씀 안에');identity.prepend(sproutIcon());empathy.append(identity);
 if(selection.status==='safety_first'&&selection.analysis?.riskSignals?.includes('self_harm')){
  turn.classList.add('self-harm-safety-turn');
  const safety=element('section','self-harm-safety');safety.setAttribute('aria-labelledby','self-harm-safety-title-'+turnCount);
  const symbol=sproutIcon();symbol.classList.add('self-harm-safety-symbol');
  const title=element('h3','self-harm-safety-title','지금은 당신의 안전이 먼저예요.');title.id='self-harm-safety-title-'+turnCount;
  const opening=element('div','self-harm-safety-copy');
  opening.append(
   element('p','','지금 많이 힘드셨군요.\n여기까지 마음을 적어주셔서 고마워요.\n지금 느끼는 고통을 혼자 견디지 않았으면 좋겠어요.'),
   element('p','','지금은 말씀을 찾는 것보다 당신의 안전이 먼저예요.\n혼자 버티려고 하지 말고, 지금 곁에 있을 수 있는 사람이나 도움을 줄 수 있는 곳에 마음을 알려주세요.'),
   element('p','','지금 누군가와 이야기하고 싶다면\n자살예방상담전화 109에서 도움을 받을 수 있어요.')
  );
  const call=element('a','self-harm-call','📞 109 전화하기');call.href='tel:109';
  const urgent=element('div','self-harm-safety-followup');
  urgent.append(
   element('p','','지금 당장 자신을 해칠 것 같거나 위험한 상황이라면\n119 또는 112에 바로 도움을 요청해주세요.'),
   element('p','','여기에서도 이야기를 계속해도 괜찮아요.\n지금 가장 힘든 마음부터 천천히 들려주세요.')
  );
  safety.append(symbol,title,opening,call,urgent);response.append(safety);turn.append(user,response);return turn;
 }
 if(!verse){
  empathy.append(element('p','conversation-text',UserProfile.address(selection.message,turnCount)));
  response.append(empathy);turn.append(user,response);return turn;
 }
 const responseTopic=verse.topics.includes(selection.analysis.primaryTopic)?selection.analysis.primaryTopic:verse.topics[0];
 const hasGuidance=Boolean(verse.reflection&&verse.question&&verse.prayer);
 let opening=(hasGuidance&&OPENINGS[responseTopic])||'나눠주신 마음을 이 말씀과 함께 조심스럽게 살펴볼게요.';
 if(continued)opening='이야기를 더 들려주셨네요. 이 말만으로 마음을 단정하기는 어려워, 앞서 읽은 말씀 곁에서 조금 더 생각해보려 해요.';
 else if(!matched)opening='이 말씀 곁에서 마음을 조금 더 살펴볼게요.';
 else if(sameVerse)opening='나눠주신 마음을 이번에도 같은 말씀과 함께 살펴보면 좋겠어요. 마음을 서둘러 정리하지 않고 조금 더 머물러볼까요?';
 else if(turnCount&&previousId)opening='이번에 나눠주신 마음에는 다른 말씀을 함께 읽어보면 좋겠어요. '+opening;
 if(mixed)opening='여러 마음이 함께 담겨 있는 것 같아요. 그중 한 마음에 먼저 기대어볼게요. '+opening;
 opening=UserProfile.address(opening,turnCount);
 empathy.append(element('p','conversation-text',opening));
 turn.classList.add('verse-result-turn');
 user.querySelector('.speaker').textContent='현재 마음';
 const scripture=element('figure','scripture');
 const quoteMark=element('span','result-quote','“');quoteMark.setAttribute('aria-hidden','true');scripture.append(quoteMark);
 scripture.append(element('blockquote','',verse.text));
 const caption=element('figcaption','',verse.reference);
 // Do not link a different translation. Only use a supplied source for this record.
 if(typeof verse.sourceUrl==='string'&&verse.sourceUrl.startsWith('https://')){
  const link=element('a','','성경 본문 읽기 ↗');link.href=verse.sourceUrl;
  link.target='_blank';link.rel='noopener noreferrer';caption.append(link);
 }
 scripture.append(caption,element('span','translation','성경 본문 · '+verse.translation));response.append(scripture,user);
 const prepared=[verse.reflection||'묵상 안내 준비 중',verse.question||'묵상 질문 준비 중'];
 const followup=hasGuidance&&sameVerse&&turnCount%2===1?(FOLLOWUPS[responseTopic]||prepared):prepared;
 const explanation=element('div','explanation-card');
 explanation.append(element('span','speaker explanation-label','이 말씀이 지금 마음에 닿는 이유'),empathy,element('p','conversation-text',followup[0]));
 response.append(explanation);
 const actions=element('div','verse-actions');
 const question=element('details','reflection-action');
 const questionBody=verse.question?element('ol','conversation-questions'):element('p','conversation-question',followup[1]);
 if(verse.question)for(const text of followup[1].split(/\r?\n/).filter(Boolean))questionBody.append(element('li','',text));
 question.append(element('summary','','묵상해보기'),questionBody);
 const prayer=element('details','prayer-action');
 prayer.append(element('summary','','기도문 보기'),element('p','',verse.prayer||'기도문 준비 중'),element('small','',verse.prayer?'앱이 준비한 기도 예시예요. 마음에 맞는 말로 바꾸어도 좋아요.':'이 말씀의 기도문은 아직 등록되지 않았어요.'));
 const save=element('button','save-action');save.type='button';save.dataset.verseId=verse.id;
 save.append(element('span','save-label','저장하기'));
 save.addEventListener('click',()=>{
  try{SavedVerses.toggle(verse.id);refreshSaveButtons();renderSavedList();}
  catch{document.getElementById('profile-status').textContent='이 브라우저에 말씀을 저장하지 못했어요. 저장 허용 설정을 확인해주세요.';}
 });
 question.querySelector('summary').append(element('small','','함께 생각해요'));
 prayer.querySelector('summary').append(element('small','','이 말씀으로 기도해요'));
 const actionIcons={save:'<path d="M6 3h12v18l-6-4-6 4V3Z"/>',reflection:'<path d="M12 5v16M12 5C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 1Z"/>',prayer:'<path d="m5 21-3-4 5-6 2-7c.5-2 3-1 3 1v8l-4 6m11 2 3-4-5-6-2-7c-.5-2-3-1-3 1v8l4 6"/>'};
 for(const [target,kind] of [[save,'save'],[question.querySelector('summary'),'reflection'],[prayer.querySelector('summary'),'prayer']]){
  const icon=element('span','result-action-icon');icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">'+actionIcons[kind]+'</svg>';target.prepend(icon);
 }
 actions.append(save,question,prayer);response.append(actions);turn.append(response);return turn;
}
const resultStyles=document.createElement('link');resultStyles.rel='stylesheet';resultStyles.href='result-screen.css';document.head.append(resultStyles);
const resetHeart=document.getElementById('reset-heart');
function updateCount(){
 document.getElementById('count').textContent=input.value.length.toLocaleString()+' / 1,000';
 resetHeart.hidden=!input.value.length;
}
resetHeart.addEventListener('click',()=>{
 input.value='';updateCount();error.textContent='';input.removeAttribute('aria-invalid');input.focus();
});
updateCount();
// Isolated presentation layer: no passage text, randomness, or recommendation state.
const transitionStylesReady=new Promise(resolve=>{
 const link=document.createElement('link');link.rel='stylesheet';link.href='verse-transition.css';
 link.onload=()=>resolve(true);link.onerror=()=>resolve(false);document.head.append(link);
 setTimeout(()=>resolve(false),2000);
});
async function playVerseTransition(){
 if(!await transitionStylesReady)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const panel=element('dialog','verse-transition');panel.setAttribute('aria-label','말씀을 펼치는 중');
 const stage=element('div','verse-transition-stage');
 const cards=element('div','verse-transition-cards');cards.setAttribute('aria-hidden','true');
 for(let i=0;i<5;i++){
  const card=element('div','verse-transition-card');card.style.setProperty('--position',i-2);
  if(i===2)card.classList.add('verse-transition-chosen');
  card.append(sproutIcon());cards.append(card);
 }
 const status=element('p','verse-transition-status','말씀을 천천히 펼쳐볼게요.');status.setAttribute('role','status');
 stage.append(cards,status);panel.append(stage);document.body.append(panel);
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 let skip;const skipped=new Promise(resolve=>{skip=resolve;});
 panel.addEventListener('cancel',event=>{event.preventDefault();skip();});
 try{
  panel.showModal();
  await Promise.race([(async()=>{
   await pause(reduced?0:1850);panel.classList.add('is-selected');
   await pause(reduced?0:850);
   const name=UserProfile.getName();status.textContent='오늘 '+(name?name+'님':'당신')+'에게 닿은 말씀이에요.';
   panel.classList.add('is-revealed');await pause(reduced?650:1800);
  })(),skipped]);
 }finally{panel.close();panel.remove();}
}
async function showVerse(message,continueConversation=false,animate=false) {
 const localAnalysis=classifyConcern(message);
 const classification=await analyzeConcernWithAI(message,localAnalysis);
 const candidates=findCandidates(classification);
 const selected=selectVerse(classification,candidates,{previousId,previousAnalysis,continueConversation,history:recommendationHistory.snapshot()});
 const selection={...selected,verse:selected.verse?{...selected.verse,...(window.Malsseum.data.reflections[selected.verse.id]||{})}:null};
 // The recommendation is already fixed; these decorative cards never select a verse.
 if(animate&&!continueConversation&&selection.verse)await playVerseTransition();
 if(!continueConversation){previousId=null;turnCount=0;conversation.replaceChildren();}
 const turn=renderTurn(message,selection);conversation.append(turn);
 refreshSaveButtons();
 if(selection.verse&&(!continueConversation||previousId!==selection.verse.id))recommendationHistory.record(selection.verse.id);
 previousId=selection.verse?.id||null;previousAnalysis=selection.analysis;turnCount++;
 document.getElementById('result').hidden=false;
 error.textContent='';replyError.textContent='';input.removeAttribute('aria-invalid');reply.removeAttribute('aria-invalid');
 if(!continueConversation){input.value=message;updateCount();}
 reply.value='';turn.tabIndex=-1;turn.focus({preventScroll:true});
 turn.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 return {status:selection.status,reference:selection.verse?.reference||null,text:selection.verse?.text||null,message:selection.message||null,matched:selection.matched,continued:selection.continued};
}
input.addEventListener('input',()=>{updateCount();error.textContent='';input.removeAttribute('aria-invalid');});
reply.addEventListener('input',()=>{replyError.textContent='';reply.removeAttribute('aria-invalid');});
let submitting=false;
async function submit(event,field,feedback,continuing){
 event.preventDefault();if(submitting)return;
 submitting=true;const button=event.currentTarget.querySelector('button[type="submit"],button.primary');
 if(button)button.disabled=true;
 try{await showVerse(field.value,continuing,true);}catch(e){feedback.textContent=e.message;field.setAttribute('aria-invalid','true');field.focus();}
 finally{submitting=false;if(button)button.disabled=false;}
}
 document.getElementById('heart-form').addEventListener('submit',event=>submit(event,input,error,false));
 document.getElementById('reply-form').addEventListener('submit',event=>submit(event,reply,replyError,true));
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 try{Promise.resolve(document.modelContext.registerTool({name:'show_scripture_for_feeling',title:'마음에 따라 말씀 펼치기',description:'현재 대화를 새로 시작하고 입력한 마음에 따라 준비된 성경 말씀과 묵상 안내를 표시합니다. AI 연결 시 입력 문장은 분석을 위해 외부로 전송될 수 있습니다.',inputSchema:{type:'object',properties:{message:{type:'string',minLength:1,maxLength:1000}},required:['message'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(data){if(!data||typeof data.message!=='string')throw new Error('마음을 문자열로 입력해주세요.');return showVerse(data.message);}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

// 입력을 돕는 UI만 추가합니다. 말씀 선택과 대화 상태는 기존 함수를 그대로 사용합니다.
function sproutIcon(){const icon=element('span','sprout-icon');icon.setAttribute('aria-hidden','true');icon.innerHTML="<svg viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"M12 21V12M12 16C5 16 3 11 3 5c6 0 9 4 9 9M12 12c0-6 4-9 9-9 0 6-3 10-9 10\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";return icon;}
document.querySelectorAll('[data-emotion]').forEach(button=>button.addEventListener('click',()=>{
 const emotion=button.dataset.emotion;
 const next=input.value.trim() ? input.value.trim()+' '+emotion : emotion;
 if(next.length>1000){error.textContent='1,000자 이내로 마음을 나눠주세요.';input.focus();return;}
 input.value=next;updateCount();error.textContent='';input.removeAttribute('aria-invalid');input.focus();
}));

// 이름 저장과 호칭을 분리합니다. 말씀 선택에는 프로필을 전달하지 않습니다.
const UserProfile = (() => {
 const key='malsseum-annae.display-name.v1';
 let name='';
 function validate(value){
  if(typeof value!=='string')throw new Error('이름 또는 별명을 입력해주세요.');
  const cleaned=value.trim();
  if(!cleaned || cleaned.length>20 || /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/.test(cleaned))throw new Error('이름 또는 별명을 1~20자로 입력해주세요.');
  return cleaned;
 }
 return {
  validate,
  load(){try{name=validate(localStorage.getItem(key));}catch{name='';}return name;},
  save(value){const next=validate(value);try{localStorage.setItem(key,next);}catch{throw new Error('이 브라우저에서 이름을 저장하지 못했어요. 브라우저의 저장 허용 설정을 확인한 뒤 다시 시도해주세요.');}name=next;return name;},
  reset(){try{localStorage.removeItem(key);}catch{throw new Error('이름을 삭제하지 못했어요. 브라우저의 저장 허용 설정을 확인한 뒤 다시 시도해주세요.');}name='';},
  getName(){return name;},
  // 매 대화의 첫 응답에만 호칭을 사용합니다. 성경 본문에는 절대 삽입하지 않습니다.
  address(text,index){return name && index===0 ? name+'님, '+text : text;}
 };
})();
const onboarding=document.getElementById('onboarding');
const mainContent=document.getElementById('main-content');
const settingsButton=document.getElementById('open-settings');
const settingsDialog=document.getElementById('settings-dialog');
settingsDialog.querySelector('#settings-form button[type="submit"]').remove();
const closeSettingsButton=document.getElementById('close-settings');
const settingsHeaderActions=element('div','settings-header-actions');
closeSettingsButton.replaceWith(settingsHeaderActions);
const saveSettingsButton=element('button','settings-save','저장');saveSettingsButton.type='button';
settingsHeaderActions.append(closeSettingsButton,saveSettingsButton);
const appShell=document.querySelector('.app');
const textSizeKey='malsseum-annae.text-size.v1';
const textSizeChoices=[['default','기본'],['large','크게'],['xlarge','아주 크게']];
function setTextSize(value){
 const next=textSizeChoices.some(([id])=>id===value)?value:'default';
 appShell.dataset.textSize=next;
 settingsDialog.querySelectorAll('input[name="text-size"]').forEach(radio=>{radio.checked=radio.value===next;});
}
try{setTextSize(localStorage.getItem(textSizeKey));}catch{setTextSize('default');}
const textSizeField=element('fieldset','text-size-field');
textSizeField.append(element('legend','','글자 크기'));
const textSizeOptions=element('div','text-size-options');
for(const [value,label] of textSizeChoices){
 const option=element('label','text-size-option');
 const radio=element('input','');radio.type='radio';radio.name='text-size';radio.value=value;
 radio.checked=appShell.dataset.textSize===value;
 option.append(radio,element('span','',label));textSizeOptions.append(option);
}
textSizeField.append(textSizeOptions);
settingsDialog.querySelector('#settings-form').before(textSizeField);
window.addEventListener('storage',event=>{if(event.key===textSizeKey)setTextSize(event.newValue);});
function refreshProfile(){
 const name=UserProfile.getName();
 const greeting=document.getElementById('personal-greeting');
 greeting.replaceChildren();
 if(name){const named=document.createElement('span');named.className='greeting-name';named.textContent=name+'님';greeting.append(document.createTextNode('안녕하세요, '),named,document.createTextNode('.'));}
 onboarding.hidden=Boolean(name);mainContent.hidden=!name;settingsButton.hidden=!name;
}
function saveProfile(event,fieldId,errorId,isOnboarding){
 event.preventDefault();
 const field=document.getElementById(fieldId),feedback=document.getElementById(errorId);
 try{
  UserProfile.save(field.value);field.value=UserProfile.getName();feedback.textContent='';field.removeAttribute('aria-invalid');refreshProfile();
  if(isOnboarding)document.getElementById('welcome-title').focus();else settingsDialog.close();
  document.getElementById('profile-status').textContent='이름을 저장했어요.';
 }catch(e){feedback.textContent=e.message;field.setAttribute('aria-invalid','true');field.focus();}
}
document.getElementById('onboarding-form').addEventListener('submit',event=>saveProfile(event,'onboarding-name','onboarding-error',true));
function resetSettingsDraft(){
 const field=document.getElementById('settings-name');field.value=UserProfile.getName();field.removeAttribute('aria-invalid');
 document.getElementById('settings-error').textContent='';
 settingsDialog.querySelectorAll('input[name="text-size"]').forEach(radio=>{radio.checked=radio.value===appShell.dataset.textSize;});
}
function saveSettings(event){
 event.preventDefault();
 const field=document.getElementById('settings-name'),feedback=document.getElementById('settings-error');
 try{
  const name=UserProfile.validate(field.value);
  const size=settingsDialog.querySelector('input[name="text-size"]:checked').value;
  const previousSize=localStorage.getItem(textSizeKey);
  localStorage.setItem(textSizeKey,size);
  try{UserProfile.save(name);}catch(error){
   if(previousSize===null)localStorage.removeItem(textSizeKey);else localStorage.setItem(textSizeKey,previousSize);
   throw error;
  }
  setTextSize(size);refreshProfile();feedback.textContent='';field.removeAttribute('aria-invalid');
  settingsDialog.close();document.getElementById('profile-status').textContent='설정을 저장했어요.';
 }catch(error){
  feedback.textContent=error.message||'설정을 저장하지 못했어요. 브라우저 저장 설정을 확인해주세요.';
  if(!field.value.trim()||field.value.trim().length>20){field.setAttribute('aria-invalid','true');field.focus();}
 }
}
document.getElementById('settings-form').addEventListener('submit',event=>event.preventDefault());
saveSettingsButton.addEventListener('click',saveSettings);
settingsButton.addEventListener('click',()=>{
 resetSettingsDraft();settingsDialog.showModal();closeSettingsButton.focus({preventScroll:true});
});
closeSettingsButton.addEventListener('click',()=>settingsDialog.close());
settingsDialog.addEventListener('close',resetSettingsDraft);
for(const [fieldId,errorId] of [['onboarding-name','onboarding-error'],['settings-name','settings-error']]){
 document.getElementById(fieldId).addEventListener('input',()=>{document.getElementById(errorId).textContent='';document.getElementById(fieldId).removeAttribute('aria-invalid');});
}
UserProfile.load();refreshProfile();

// 화면 이동 전용 계층: 기존 말씀 선택, 대화, 이름 저장 코드는 변경하지 않습니다.
const homeScreen=document.getElementById('home-screen');
const resultScreen=document.getElementById('result');
const emptyScreen=document.getElementById('empty-screen');
const bottomNav=document.getElementById('bottom-nav');
const myScreen=element('section','my-screen');myScreen.id='my-screen';myScreen.hidden=true;
myScreen.setAttribute('aria-labelledby','my-title');
const myHeading=element('div','my-heading');
const myTitle=element('h1','','저장한 말씀');myTitle.id='my-title';
const editSaved=element('button','edit-saved','편집');editSaved.type='button';
myHeading.append(myTitle,editSaved);
const selectAll=element('button','select-all','전체 선택');selectAll.type='button';selectAll.hidden=true;
const savedList=element('div','saved-verse-list');
const bulkRemove=element('button','bulk-remove','선택한 말씀 저장 취소');bulkRemove.type='button';bulkRemove.hidden=true;
myScreen.append(myHeading,selectAll,savedList,bulkRemove);mainContent.append(myScreen);
const myStyles=document.createElement('link');myStyles.rel='stylesheet';myStyles.href='my-screen.css';document.head.append(myStyles);
let editingSaved=false;
const selectedSaved=new Set();
function exitSavedEdit(){editingSaved=false;selectedSaved.clear();renderSavedList();}
editSaved.addEventListener('click',()=>{
 if(editingSaved)exitSavedEdit();
 else{editingSaved=true;selectedSaved.clear();renderSavedList();}
});
selectAll.addEventListener('click',()=>{
 const ids=SavedVerses.list();
 if(selectedSaved.size===ids.length)selectedSaved.clear();
 else{selectedSaved.clear();ids.forEach(id=>selectedSaved.add(id));}
 renderSavedList();selectAll.focus();
});
bulkRemove.addEventListener('click',()=>{
 if(!selectedSaved.size)return;
 try{
  SavedVerses.removeMany(selectedSaved);selectedSaved.clear();
  if(!SavedVerses.list().length)editingSaved=false;
  refreshSaveButtons();renderSavedList();
 }catch{document.getElementById('profile-status').textContent='선택한 말씀의 저장을 취소하지 못했어요. 브라우저 저장 설정을 확인해주세요.';}
});
function renderSavedList(){
 savedList.replaceChildren();
 const verses=new Map(window.Malsseum.data.verses.map(verse=>[verse.id,verse]));
 const ids=SavedVerses.list();
 for(const id of selectedSaved)if(!ids.includes(id))selectedSaved.delete(id);
 editSaved.hidden=!ids.length;editSaved.textContent=editingSaved?'완료':'편집';
 selectAll.hidden=!editingSaved||!ids.length;
 selectAll.textContent=selectedSaved.size===ids.length&&ids.length?'전체 선택 해제':'전체 선택';
 selectAll.setAttribute('aria-pressed',String(Boolean(ids.length)&&selectedSaved.size===ids.length));
 bulkRemove.hidden=!editingSaved||!ids.length;bulkRemove.disabled=!selectedSaved.size;
 if(!ids.length){
  const empty=element('div','saved-empty');
  empty.append(element('p','','아직 저장한 말씀이 없어요.'),element('p','','마음에 오래 간직하고 싶은 말씀을 저장해보세요.'));
  savedList.append(empty);return;
 }
 for(const id of ids){
  const verse=verses.get(id);
  const card=element('button','saved-verse-card');card.type='button';
  if(editingSaved){
   const chosen=selectedSaved.has(id);
   card.classList.add('is-editing');card.setAttribute('aria-pressed',String(chosen));
   card.setAttribute('aria-label',verse.reference+(chosen?' 선택됨':' 선택'));
   const check=element('span','saved-select-indicator',chosen?'✓':'');check.setAttribute('aria-hidden','true');card.append(check);
  }else card.setAttribute('aria-label',verse.reference+' 말씀 다시 보기');
  card.append(element('span','saved-verse-text',verse.text),element('span','saved-verse-reference',verse.reference));
  card.addEventListener('click',()=>{
   if(!editingSaved){openSavedVerse(id);return;}
   if(selectedSaved.has(id))selectedSaved.delete(id);else selectedSaved.add(id);
   renderSavedList();savedList.children[ids.indexOf(id)]?.focus();
  });savedList.append(card);
 }
}
function openSavedVerse(id){
 const verse=window.Malsseum.data.verses.find(item=>item.id===id);
 if(!verse||!SavedVerses.has(id))return;
 previousId=null;previousAnalysis=null;turnCount=0;
 const selection={verse:{...verse,...(window.Malsseum.data.reflections[id]||{})},matched:true,continued:false,mixed:false,analysis:{primaryTopic:verse.topics[0]}};
 const turn=renderTurn('저장한 말씀',selection);turn.classList.add('saved-verse-turn');
 conversation.replaceChildren(turn);previousId=id;previousAnalysis=selection.analysis;turnCount=1;
 reply.value='';replyError.textContent='';refreshSaveButtons();displayScreen('reflection');
 turn.tabIndex=-1;turn.focus({preventScroll:true});mainContent.scrollTop=0;
}
renderSavedList();
// Personal prayers are separate from scripture, recommendations, and saved verse IDs.
const PrayerJournal=(()=>{
 const key='malsseum-annae.personal-prayers.v1';
 const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 function list(){
  try{
   const stored=JSON.parse(localStorage.getItem(key)||'[]');
   if(!Array.isArray(stored))return [];
   const seen=new Set();
   return stored.filter(item=>{
    if(!item||typeof item.id!=='string'||typeof item.content!=='string'||typeof item.createdAt!=='string'||!Number.isFinite(Date.parse(item.createdAt))||seen.has(item.id))return false;
    seen.add(item.id);return true;
   }).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  }catch{return [];}
 }
 return {
  list,
  save(content,id){
   const prayer=content.trim();if(!prayer)throw new Error('기도 내용을 적어주세요.');
   const entries=list();
   if(id){
    const existing=entries.find(item=>item.id===id);
    if(!existing)throw new Error('수정할 기도를 찾지 못했어요.');
    existing.content=prayer;
   }else{
    let nextId;
    do{nextId=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
    while(entries.some(item=>item.id===nextId));
    entries.unshift({id:nextId,content:prayer,createdAt:new Date().toISOString()});
   }
   localStorage.setItem(key,JSON.stringify(entries));
  },
  remove(id){localStorage.setItem(key,JSON.stringify(list().filter(item=>item.id!==id)));},
  answerFor(item){return item.answer&&validDate(item.answer.date)&&typeof item.answer.content==='string'&&item.answer.content.trim()?item.answer:null;},
  saveAnswer(id,date,content){
   if(!validDate(date)||!content.trim())throw new Error('응답받은 날짜와 내용을 적어주세요.');
   const entries=list(),prayer=entries.find(item=>item.id===id);
   if(!prayer)throw new Error('기도를 찾지 못했어요.');
   prayer.answer={date,content:content.trim()};
   localStorage.setItem(key,JSON.stringify(entries));
  },
  removeAnswer(id){
   const entries=list(),prayer=entries.find(item=>item.id===id);
   if(!prayer)return;
   delete prayer.answer;
   localStorage.setItem(key,JSON.stringify(entries));
  }
 };
})();
const prayerScreen=element('section','prayer-screen');prayerScreen.id='prayer-screen';prayerScreen.hidden=true;
prayerScreen.setAttribute('aria-labelledby','prayer-title');
const prayerTitle=element('h1','','나의 기도');prayerTitle.id='prayer-title';
const prayerIntro=element('p','prayer-intro','오늘 하나님께 어떤 마음을 이야기하고 싶나요?');
const prayerForm=element('form','prayer-form');
const prayerLabel=element('label','sr-only','나의 기도 내용');prayerLabel.htmlFor='personal-prayer';
const prayerInput=element('textarea','');prayerInput.id='personal-prayer';prayerInput.placeholder='오늘의 마음을 천천히 적어보세요.';
const prayerError=element('p','error');prayerError.setAttribute('role','alert');
const prayerSave=element('button','prayer-save','기도 저장하기');prayerSave.type='submit';
const prayerCancel=element('button','prayer-cancel','수정 취소');prayerCancel.type='button';prayerCancel.hidden=true;
prayerForm.append(prayerLabel,prayerInput,prayerError,prayerSave,prayerCancel);
const prayerListTitle=element('h2','','저장한 기도');
const prayerList=element('div','prayer-list');
prayerScreen.append(prayerTitle,prayerIntro,prayerForm,prayerListTitle,prayerList);mainContent.append(prayerScreen);
const prayerStyles=document.createElement('link');prayerStyles.rel='stylesheet';prayerStyles.href='prayer-screen.css';document.head.append(prayerStyles);
let editingPrayerId=null;
let activeAnswerId=null;
function localToday(){const now=new Date();return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');}
function clearPrayerEditor(){
 editingPrayerId=null;prayerInput.value='';prayerError.textContent='';
 prayerSave.textContent='기도 저장하기';prayerCancel.hidden=true;
}
function renderPrayerList(){
 prayerList.replaceChildren();
 const entries=PrayerJournal.list();
 if(!entries.length){
  const empty=element('div','prayer-empty');
  empty.append(element('p','','아직 작성한 기도가 없어요.'),element('p','','오늘의 마음을 하나님께 천천히 적어보세요.'));
  prayerList.append(empty);return;
 }
 const dateFormat=new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric'});
 for(const entry of entries){
  const card=element('article','prayer-entry');
  const date=element('time','prayer-date',dateFormat.format(new Date(entry.createdAt)));date.dateTime=entry.createdAt;
  const body=element('p','prayer-content',entry.content);
  const actions=element('div','prayer-entry-actions');
  const edit=element('button','','수정');edit.type='button';edit.setAttribute('aria-label',date.textContent+' 기도 수정');
  edit.addEventListener('click',()=>{
   editingPrayerId=entry.id;prayerInput.value=entry.content;prayerError.textContent='';
   prayerSave.textContent='수정 저장하기';prayerCancel.hidden=false;
   prayerInput.focus();prayerInput.scrollIntoView({block:'center'});
  });
  const remove=element('button','','삭제');remove.type='button';remove.setAttribute('aria-label',date.textContent+' 기도 삭제');
  remove.addEventListener('click',()=>{
   try{PrayerJournal.remove(entry.id);if(editingPrayerId===entry.id)clearPrayerEditor();if(activeAnswerId===entry.id)activeAnswerId=null;renderPrayerList();}
   catch{prayerError.textContent='기도를 삭제하지 못했어요. 브라우저 저장 설정을 확인해주세요.';}
  });
  const answer=PrayerJournal.answerFor(entry);
  if(!answer){
   const begin=element('button','','응답받았어요');begin.type='button';
   begin.addEventListener('click',()=>{activeAnswerId=entry.id;renderPrayerList();prayerList.querySelector('.answer-form textarea')?.focus();});
   actions.append(begin);
  }
  actions.append(edit,remove);card.append(date,body,actions);
  if(answer&&activeAnswerId!==entry.id){
   const answered=element('div','answered-prayer');
   answered.append(element('strong','answered-label','✓ 응답받은 기도'));
   const answeredDate=element('time','answered-date',dateFormat.format(new Date(answer.date+'T12:00:00')));answeredDate.dateTime=answer.date;
   answered.append(answeredDate,element('p','answered-content',answer.content));
   const answerActions=element('div','answer-actions');
   const revise=element('button','','응답 수정');revise.type='button';
   revise.addEventListener('click',()=>{activeAnswerId=entry.id;renderPrayerList();prayerList.querySelector('.answer-form textarea')?.focus();});
   const discard=element('button','','응답 삭제');discard.type='button';
   discard.addEventListener('click',()=>{
    try{PrayerJournal.removeAnswer(entry.id);renderPrayerList();}
    catch{prayerError.textContent='응답 기록을 삭제하지 못했어요. 브라우저 저장 설정을 확인해주세요.';}
   });
   answerActions.append(revise,discard);answered.append(answerActions);card.append(answered);
  }
  if(activeAnswerId===entry.id){
   const answerForm=element('form','answer-form');
   const dateLabel=element('label','','응답받은 날짜');
   const answerDate=element('input','');answerDate.type='date';answerDate.value=answer?.date||localToday();dateLabel.append(answerDate);
   const contentLabel=element('label','sr-only','응답 내용');
   const answerInput=element('textarea','');answerInput.placeholder='어떻게 응답받았는지 기록해보세요.';answerInput.value=answer?.content||'';
   const feedback=element('p','answer-error');feedback.setAttribute('role','alert');
   const controls=element('div','answer-form-actions');
   const submit=element('button','','응답 기록하기');submit.type='submit';
   const cancel=element('button','','취소');cancel.type='button';cancel.addEventListener('click',()=>{activeAnswerId=null;renderPrayerList();});
   controls.append(submit,cancel);answerForm.append(dateLabel,contentLabel,answerInput,feedback,controls);
   answerForm.addEventListener('submit',event=>{
    event.preventDefault();
    try{PrayerJournal.saveAnswer(entry.id,answerDate.value,answerInput.value);activeAnswerId=null;renderPrayerList();}
    catch(error){feedback.textContent=['기도를 찾지 못했어요.','응답받은 날짜와 내용을 적어주세요.'].includes(error.message)?error.message:'응답 기록을 저장하지 못했어요. 브라우저 저장 설정을 확인해주세요.';}
   });
   card.append(answerForm);
  }
  prayerList.append(card);
 }
}
prayerInput.addEventListener('input',()=>{prayerError.textContent='';});
prayerCancel.addEventListener('click',clearPrayerEditor);
prayerForm.addEventListener('submit',event=>{
 event.preventDefault();
 if(!prayerInput.value.trim()){prayerError.textContent='기도 내용을 적어주세요.';prayerInput.focus();return;}
 try{PrayerJournal.save(prayerInput.value,editingPrayerId);clearPrayerEditor();renderPrayerList();}
 catch(error){prayerError.textContent=error.message==='수정할 기도를 찾지 못했어요.'?error.message:'기도를 저장하지 못했어요. 브라우저 저장 설정을 확인해주세요.';}
});
renderPrayerList();
const resultBack=element('button','result-back');
resultBack.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>';
resultBack.type='button';resultBack.setAttribute('aria-label','홈 고민 입력으로 돌아가기');
resultBack.addEventListener('click',()=>displayScreen('home'));
document.querySelector('.app>header').prepend(resultBack);
function displayScreen(screen){
 if(screen!=='profile'&&editingSaved)exitSavedEdit();
 homeScreen.hidden=screen!=='home';
 myScreen.hidden=screen!=='profile';
 prayerScreen.hidden=screen!=='prayer';
 if(screen==='profile')renderSavedList();
 if(screen==='prayer')renderPrayerList();
 resultScreen.hidden=screen==='home'||screen==='profile'||screen==='prayer'||!conversation.children.length;
 emptyScreen.hidden=screen==='home'||screen==='profile'||screen==='prayer'||Boolean(conversation.children.length);
 bottomNav.querySelectorAll('button').forEach(button=>{if(button.dataset.screen===screen)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 mainContent.scrollTop=0;
 if(screen==='reflection'&&conversation.children.length){
  const latest=conversation.lastElementChild;
  const detail=latest.querySelector('.reflection-action');
  if(detail){detail.open=true;detail.scrollIntoView({block:'center'});}
 }
}
bottomNav.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>displayScreen(button.dataset.screen)));
document.getElementById('empty-home').addEventListener('click',()=>displayScreen('home'));
new MutationObserver(()=>{
 homeScreen.hidden=true;emptyScreen.hidden=true;myScreen.hidden=true;prayerScreen.hidden=true;resultScreen.hidden=false;
 bottomNav.querySelectorAll('button').forEach(button=>{if(button.dataset.screen==='reflection')button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 conversation.lastElementChild?.scrollIntoView({block:'start'});
}).observe(conversation,{childList:true});
window.addEventListener('storage',event=>{if(event.key==='malsseum-annae.saved-verse-ids.v1'){refreshSaveButtons();renderSavedList();}});
window.addEventListener('storage',event=>{if(event.key==='malsseum-annae.personal-prayers.v1')renderPrayerList();});
function syncNavigation(){bottomNav.hidden=mainContent.hidden;}
new MutationObserver(syncNavigation).observe(mainContent,{attributes:true,attributeFilter:['hidden']});syncNavigation();

// 테스트용 이름 초기화: 다른 로컬 데이터와 대화 기록은 건드리지 않습니다.
document.getElementById('reset-name').addEventListener('click',()=>{
 const feedback=document.getElementById('reset-name-error');
 try{
  UserProfile.reset();feedback.textContent='';
  for(const id of ['onboarding-name','settings-name']){const field=document.getElementById(id);field.value='';field.removeAttribute('aria-invalid');}
  document.getElementById('onboarding-error').textContent='';document.getElementById('settings-error').textContent='';
  displayScreen('home');refreshProfile();syncNavigation();settingsDialog.close();
  onboarding.scrollTop=0;document.getElementById('onboarding-name').focus();
  document.getElementById('profile-status').textContent='이름을 초기화했어요. 새 이름을 입력해주세요.';
 }catch(e){feedback.textContent=e.message;}
});
settingsButton.addEventListener('click',()=>{document.getElementById('reset-name-error').textContent='';});

// 하단 여백 계산만 담당합니다. 크기·안전 영역 변경 시 실제 높이를 다시 반영합니다.
function measureBottomNavigation(){
 const height=bottomNav.getBoundingClientRect().height;
 if(height>0)mainContent.style.setProperty('--measured-bottom-nav-height',height+'px');
}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(measureBottomNavigation).observe(bottomNav);
window.addEventListener('resize',measureBottomNavigation);
measureBottomNavigation();
const readingSizeStyles=document.createElement('link');readingSizeStyles.rel='stylesheet';readingSizeStyles.href='reading-size.css';document.head.append(readingSizeStyles);
