/* 추천 데이터와 단계는 data/ 및 services/에서 불러옵니다. */
const {classifyConcern,findCandidates,selectVerse,recommendationHistory}=window.Malsseum.services;
const OPENINGS=window.Malsseum.data.openings, FOLLOWUPS=window.Malsseum.data.followups;
// 사용자 입력은 textContent로 표시하고 대화는 페이지 메모리에만 유지합니다.
const input=document.getElementById('heart'), error=document.getElementById('error');
const reply=document.getElementById('reply'), replyError=document.getElementById('reply-error');
const conversation=document.getElementById('conversation');
let previousId=null, turnCount=0;
function element(tag,className,text) {
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=text;
 return node;
}
function renderTurn(message,selection) {
 const {verse,matched,continued,mixed}=selection, sameVerse=previousId===verse.id;
 const turn=element('article','conversation-turn'); turn.setAttribute('aria-label',(turnCount+1)+'번째 대화');
 const user=element('div','user-message');
 user.append(element('span','speaker','나의 이야기'),element('p','',message.trim()));
 const response=element('div','assistant-message');
 const empathy=element('div','empathy-bubble');
 const identity=element('span','speaker app-identity','말씀 안에');identity.prepend(sproutIcon());empathy.append(identity);
 let opening=OPENINGS[verse.primaryTopic];
 if(continued)opening='이야기를 더 들려주셨네요. 이 말만으로 마음을 단정하기는 어려워, 앞서 읽은 말씀 곁에서 조금 더 생각해보려 해요.';
 else if(!matched)opening='이야기를 들려주셔서 고마워요. 어떤 마음인지 아직 조심스러워요. 우선 쉼으로 초대하는 말씀을 펼쳐볼게요.';
 else if(sameVerse)opening='나눠주신 마음을 이번에도 같은 말씀과 함께 살펴보면 좋겠어요. 마음을 서둘러 정리하지 않고 조금 더 머물러볼까요?';
 else if(turnCount)opening='이번에 나눠주신 마음에는 다른 말씀을 함께 읽어보면 좋겠어요. '+opening;
 if(mixed)opening='여러 마음이 함께 담겨 있는 것 같아요. 그중 한 마음에 먼저 기대어볼게요. '+opening;
 opening=UserProfile.address(opening,turnCount);
 empathy.append(element('p','conversation-text',opening));response.append(empathy);
 const scripture=element('figure','scripture');
 const scriptureLabel=element('div','scripture-label','오늘 당신에게 닿은 말씀');scriptureLabel.prepend(sproutIcon());
 scripture.append(scriptureLabel,element('span','translation','성경 본문 · 개역한글'),element('blockquote','',verse.text));
 const caption=element('figcaption','',verse.reference), link=element('a','','성경 본문 읽기 ↗');
 link.href='https://ko.wikisource.org/wiki/'+encodeURIComponent('성경 (개역한글판)/'+verse.book)+'#'+verse.chapter+'장';
 link.target='_blank';link.rel='noopener noreferrer';caption.append(link);scripture.append(caption);response.append(scripture);
 const followup=sameVerse&&turnCount%2===1?FOLLOWUPS[verse.primaryTopic]:[verse.reflection,verse.question];
 const explanation=element('div','explanation-card');
 explanation.append(element('span','speaker explanation-label','말씀 곁에서 · 앱의 설명'),element('p','conversation-text',followup[0]));
 response.append(explanation);
 const actions=element('div','verse-actions');
 const talk=element('button','talk-action','이 말씀으로 더 이야기하기 →');talk.type='button';
 talk.addEventListener('click',()=>{reply.focus();reply.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});});
 const question=element('details','reflection-action');
 question.append(element('summary','','묵상 질문 보기'),element('p','conversation-question',followup[1]));
 const prayer=element('details','prayer-action');
 prayer.append(element('summary','','기도로 이어가기'),element('p','',verse.prayer),element('small','','앱이 준비한 기도 예시예요. 마음에 맞는 말로 바꾸어도 좋아요.'));
 actions.append(talk,question,prayer);response.append(actions);turn.append(user,response);return turn;
}
function updateCount(){document.getElementById('count').textContent=input.value.length.toLocaleString()+' / 1,000';}
function showVerse(message,continueConversation=false) {
 const classification=classifyConcern(message);
 const candidates=findCandidates(classification);
 const selected=selectVerse(classification,candidates,{previousId,continueConversation,history:continueConversation?[]:recommendationHistory.snapshot()});
 const selection={...selected,verse:{...selected.verse,...window.Malsseum.data.reflections[selected.verse.id]}};
 if(!continueConversation){previousId=null;turnCount=0;conversation.replaceChildren();}
 const turn=renderTurn(message,selection);conversation.append(turn);
 if(!continueConversation)recommendationHistory.record(selection.verse.id);
 previousId=selection.verse.id;turnCount++;
 document.getElementById('result').hidden=false;
 error.textContent='';replyError.textContent='';input.removeAttribute('aria-invalid');reply.removeAttribute('aria-invalid');
 if(!continueConversation){input.value=message;updateCount();}
 reply.value='';turn.tabIndex=-1;turn.focus({preventScroll:true});
 turn.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 return {reference:selection.verse.reference,text:selection.verse.text,matched:selection.matched,continued:selection.continued};
}
input.addEventListener('input',()=>{updateCount();error.textContent='';input.removeAttribute('aria-invalid');});
reply.addEventListener('input',()=>{replyError.textContent='';reply.removeAttribute('aria-invalid');});
function submit(event,field,feedback,continuing){event.preventDefault();try{showVerse(field.value,continuing);}catch(e){feedback.textContent=e.message;field.setAttribute('aria-invalid','true');field.focus();}}
 document.getElementById('heart-form').addEventListener('submit',event=>submit(event,input,error,false));
 document.getElementById('reply-form').addEventListener('submit',event=>submit(event,reply,replyError,true));
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 try{Promise.resolve(document.modelContext.registerTool({name:'show_scripture_for_feeling',title:'마음에 따라 말씀 펼치기',description:'현재 대화를 새로 시작하고 입력한 마음에 따라 준비된 성경 말씀과 묵상 안내를 표시합니다. 입력을 저장하거나 전송하지 않습니다.',inputSchema:{type:'object',properties:{message:{type:'string',minLength:1,maxLength:1000}},required:['message'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(data){if(!data||typeof data.message!=='string')throw new Error('마음을 문자열로 입력해주세요.');return showVerse(data.message);}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
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
document.getElementById('settings-form').addEventListener('submit',event=>saveProfile(event,'settings-name','settings-error',false));
settingsButton.addEventListener('click',()=>{
 const field=document.getElementById('settings-name');field.value=UserProfile.getName();field.removeAttribute('aria-invalid');document.getElementById('settings-error').textContent='';settingsDialog.showModal();field.focus();
});
document.getElementById('close-settings').addEventListener('click',()=>settingsDialog.close());
for(const [fieldId,errorId] of [['onboarding-name','onboarding-error'],['settings-name','settings-error']]){
 document.getElementById(fieldId).addEventListener('input',()=>{document.getElementById(errorId).textContent='';document.getElementById(fieldId).removeAttribute('aria-invalid');});
}
UserProfile.load();refreshProfile();

// 화면 이동 전용 계층: 기존 말씀 선택, 대화, 이름 저장 코드는 변경하지 않습니다.
const homeScreen=document.getElementById('home-screen');
const resultScreen=document.getElementById('result');
const emptyScreen=document.getElementById('empty-screen');
const bottomNav=document.getElementById('bottom-nav');
function displayScreen(screen){
 if(screen==='profile'){settingsButton.click();return;}
 homeScreen.hidden=screen!=='home';
 resultScreen.hidden=screen==='home'||!conversation.children.length;
 emptyScreen.hidden=screen==='home'||Boolean(conversation.children.length);
 bottomNav.querySelectorAll('button').forEach(button=>{if(button.dataset.screen===screen)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 mainContent.scrollTop=0;
 if(screen!=='home'&&conversation.children.length){
  const latest=conversation.lastElementChild;
  const detail=latest.querySelector(screen==='prayer'?'.prayer-action':'.reflection-action');
  if(detail){detail.open=true;detail.scrollIntoView({block:'center'});}
 }
}
bottomNav.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>displayScreen(button.dataset.screen)));
document.getElementById('empty-home').addEventListener('click',()=>displayScreen('home'));
new MutationObserver(()=>{
 homeScreen.hidden=true;emptyScreen.hidden=true;resultScreen.hidden=false;
 bottomNav.querySelectorAll('button').forEach(button=>{if(button.dataset.screen==='reflection')button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 conversation.lastElementChild?.scrollIntoView({block:'start'});
}).observe(conversation,{childList:true});
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
