(function () {
window.Malsseum = { data: {}, services: {} };
const angerPattern=/화가\s*(?:나|났)|화났|짜증(?:나|났)|분노|열받/;
const definitions = [
 ['rest','지침 · 부담 · 쉼',/낙심|지치|지쳐|지쳤|지친|피곤|번아웃|소진|버겁|버거|부담|힘들|힘든|무기력|아무\s*것도\s*하(?:기|고)\s*싫|쉬고\s*싶|잠을?\s*못|내\s*힘으로(?:는)?\s*어떻게\s*할\s*수가?\s*없|내가\s*할\s*수\s*있는\s*게\s*없|아무리\s*해도\s*해결이\s*안|통제할\s*수\s*없는\s*일/],
 ['fear','불안 · 두려움 · 걱정',/불안|걱정|염려|초조|긴장|두렵|두려|무섭|무서|겁이\s*나|잠이\s*안\s*와|못\s*자겠|누우면.*생각이\s*많|편하게\s*자고\s*싶|갑자기\s*(?:큰일|일이\s*터졌|문제가\s*생겼)|갑작스러운.*일|큰일이\s*생겼|모든\s*게\s*무너지|상황이.*크게\s*흔들|결과.*기다리|결과가.*신경\s*쓰|조급|마음이\s*(?:자꾸\s*)?흔들|(?:머리가|머릿속이)\s*(?:너무\s*)?복잡|생각(?:이|도)\s*너무\s*많|근심이\s*많|마음을?\s*(?:좀\s*)?(?:고요하게\s*)?가라앉히고\s*싶|마음이\s*진정이\s*안|생각을\s*멈추고\s*싶|마음이\s*편안해지고\s*싶|뭐라도\s*해야\s*할|자꾸\s*서두르|빨리\s*해결하고\s*싶|염려를\s*맡기|걱정을\s*내려놓|걱정을\s*혼자\s*안고|^(?:계속\s*제가\s*붙들고\s*있어요|내려놓고\s*싶은데\s*안\s*돼요)$/],
 ['loneliness','외로움 · 소외감',/외롭|외로|쓸쓸|고독|소외|혼자\s*남|혼자인|혼자인\s*것|아무도\s*없/],
 ['grief','슬픔 · 상실 · 이별',/슬프|슬퍼|슬픔|눈물|우울(?:해|하|한|함|감)|울적(?:해|하|한|함)|(?:기분|마음)이\s*가라앉|마음이\s*무거워|상실|죽음|떠나보|이별|헤어졌|헤어진|헤어져|사별|돌아가셨|세상을\s*떠|그립|그리워/],
 ['relationship','관계의 상처 · 갈등 · 용서',new RegExp('상처|배신|거절|따돌림|왕따|싸웠|다퉜|갈등|용서|괴롭힘|경계|마음을?\\s*지키|'+angerPattern.source)],
 ['future','미래 · 진로 · 선택',/미래|진로|선택|앞날|취업|면접|이직|결정|어떻게\s*될|고민(?:이\s*(?:되|돼)|돼|이에)|어떻게\s*해야\s*할지\s*모르|어느\s*쪽이\s*맞는지\s*모르|방향을\s*모르|어디서\s*도움|도움(?:이|을)\s*(?:필요|받)|누구한테\s*도움|어디에\s*의지|혼자\s*해결하기\s*어려|도와줄\s*사람이\s*없는/],
 ['failure','실패 · 좌절 · 자신감',/실패|좌절|자신감|낙방|불합격|떨어졌|쓸모없|못난/],
 ['guilt','죄책감 · 후회 · 회복',/죄책감|후회|잘못했|잘못한|죄를|회개|회복/],
 ['faith','기도의 어려움 · 믿음의 흔들림',/기도.*(?:어렵|안\s*나|못하)|믿음.*(?:흔들|약해)|하나님.*(?:멀게|안\s*느껴|의심)|신앙.*(?:흔들|어렵)|기다림이\s*너무\s*길|언제까지\s*기다려|계속\s*기다리고\s*있|응답을\s*기다리고\s*있|아무\s*변화가\s*없/],
 ['gratitude','감사 · 기쁨 · 일상의 은혜',/감사|고마워|기쁘|기뻐|기쁨|행복|은혜/]
];
// Stable IDs are shared by rule-based and future AI analysis.
window.Malsseum.data.topics = Object.freeze(definitions.map(([id,label]) => ({id,label})));
window.Malsseum.data.topicRules = definitions.map(([id,,pattern]) => ({id,pattern}));
window.Malsseum.data.situationRules = [
 {id:'overload',pattern:/야근|업무|육아|돌봄|간병|감당|할\s*일이\s*많/},
 {id:'uncertain_future',pattern:/진로|취업|면접|앞날|미래|이직|결정/},
 {id:'decision_uncertainty',pattern:/결정(?:을)?\s*못\s*하|(?:뭘|무엇을)\s*선택해야\s*할지\s*모르|어느\s*쪽이\s*맞는지\s*모르/},
 {id:'seeking_guidance',pattern:/방향을\s*모르/},
 {id:'sleep_worry',pattern:/잠이\s*안\s*와|잠을\s*못\s*자|못\s*자겠|잠들기\s*어렵|밤마다\s*걱정|누우면.*생각|편하게\s*자고\s*싶/},
 {id:'sudden_upheaval',pattern:/갑자기.*(?:일|큰일|문제)|갑작스러운.*(?:일|변화)|모든\s*게\s*무너지|상황이.*(?:크게\s*흔들|무너지)|큰일이\s*생겼/},
 {id:'anxious_waiting',pattern:/(?:결과|소식).*(?:기다리|신경\s*쓰)|기다리.*(?:조급|마음이\s*흔들)|마음이\s*자꾸\s*흔들/},
 {id:'seeking_help',pattern:/어디서\s*도움|도움(?:이|을)\s*(?:필요|받)|누구한테\s*도움|어디에\s*의지|혼자\s*해결하기\s*어려|도와줄\s*사람/},
 {id:'prolonged_waiting',pattern:/기다림이\s*너무\s*길|언제까지\s*기다려|계속\s*기다리고\s*있|응답을\s*기다리고\s*있|아무\s*변화가\s*없/},
 {id:'restless_urgency',pattern:/조급|뭐라도\s*해야\s*할|가만히\s*있으면\s*불안|자꾸\s*서두르|빨리\s*해결하고\s*싶/},
 {id:'uncontrollable_burden',pattern:/내\s*힘으로(?:는)?.*할\s*수(?:가)?\s*없|아무리\s*해도\s*해결이\s*안|계속\s*해결하려다\s*지쳤|통제할\s*수\s*없는\s*일/},
 {id:'seeking_calm',pattern:/마음을?\s*(?:좀\s*)?(?:고요하게\s*)?가라앉히고\s*싶|머리가\s*너무\s*복잡|마음이\s*진정이\s*안|생각을\s*멈추고\s*싶|마음이\s*편안해지고\s*싶/},
 {id:'releasing_worry',pattern:/걱정.*(?:내려놓|혼자\s*(?:안고|붙들))|염려.*맡기|계속\s*제가\s*붙들|내려놓고\s*싶은데\s*안/},
 {id:'crowded_thoughts',pattern:/생각(?:이|도)\s*너무\s*많|걱정(?:거리|이).*많|근심이\s*많|여러\s*가지\s*걱정|머릿속이\s*복잡/},
 {id:'isolation',pattern:/혼자|소외|외롭|외로|아무도/},
 {id:'bereavement',pattern:/사별|돌아가셨|세상을\s*떠|장례/},
 {id:'separation',pattern:/이별|헤어졌|헤어진|헤어져/},
 {id:'conflict',pattern:/싸웠|다퉜|갈등|배신|상처|따돌림/},
 {id:'anger_processing',pattern:angerPattern},
 {id:'healthy_boundaries',pattern:/경계가\s*필요|마음을?\s*지켜야/},
 {id:'prolonged_effort',pattern:/오래.*(?:노력|좋은\s*일)|꾸준히.*(?:노력|봉사)|노력.*(?:오래|몇\s*년)/},
 {id:'discouraged_service',pattern:/봉사.*(?:낙심|보람|헛된)|좋은\s*일.*(?:낙심|보람)/},
 {id:'severe_exhaustion',pattern:/번아웃|소진|심하게\s*지쳤|너무\s*지쳐.*(?:못|한계)|몸이.*한계|잠을\s*못\s*자/},
 {id:'need_rest',pattern:/쉬어야|쉬고\s*싶|휴식이\s*필요|쉬는\s*게\s*필요/},
 {id:'fresh_relationship_wound',pattern:/(?:오늘|어제|방금|최근).*(?:상처|배신|다퉜|싸웠)/},
 {id:'forgiveness_when_ready',pattern:/용서할\s*준비가\s*(?:되었|됐)|시간이\s*지난\s*뒤\s*용서를\s*생각/},
 {id:'hope_when_ready',pattern:/소망.*(?:생각해보고\s*싶|이야기하고\s*싶)|희망.*생각하고\s*싶/}
];
window.Malsseum.data.riskRules = [
 {id:'violence',pattern:/폭력|폭행|때려|때렸|때리|맞았|맞고|구타|죽이겠|죽인다고|칼로\s*위협/},
 {id:'abuse',pattern:/학대|성폭력|성추행|협박|감금/},
 {id:'coercive_control',pattern:/통제|감시|휴대폰.*검사|핸드폰.*검사|못\s*나가게|나가지\s*못하게|돈을.*못\s*쓰게|연락.*못\s*하게/},
 {id:'self_harm',pattern:/죽고\s*싶|자살|자해|목숨.*끊|살고\s*싶지\s*않/}
];
})();
