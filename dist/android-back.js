(function(){
 // One Android navigation policy; never use browser history for tab navigation.
 window.Malsseum.createAndroidBack=function({closeOverlay,closeEditor,goToParent,isRoot,contextKey,keyboardOpen,dismissKeyboard,exit,notice,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}){
  let deadline=0,timer=null,context=contextKey(),exiting=false;
  function reset(){deadline=0;if(timer!==null)cancel(timer);timer=null;notice(false);}
  function changed(){const next=contextKey();if(next!==context){context=next;reset();}}
  async function back(){
   changed();if(exiting)return;
   // Android normally consumes Back to dismiss IME before dispatching App.backButton.
   // If a keyboard-sized viewport is still present, consume this event only.
   if(keyboardOpen()){reset();dismissKeyboard();return;}
   if(closeOverlay()||closeEditor()||goToParent()){reset();context=contextKey();return;}
   if(!isRoot()){reset();return;}
   const time=now();
   if(deadline&&time<deadline){reset();exiting=true;try{await exit();}finally{exiting=false;}return;}
   reset();deadline=time+2000;notice(true);timer=schedule(reset,2000);
  }
  return {back,reset,changed};
 };
})();
