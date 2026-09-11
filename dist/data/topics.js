(function () {
window.Malsseum = { data: {}, services: {} };
const definitions = [
 ['rest','지침 · 부담 · 쉼',/낙심|지치|지쳐|지쳤|지친|피곤|번아웃|소진|버겁|버거|부담|힘들|힘든|무기력|쉬고\s*싶|잠을?\s*못/],
 ['fear','불안 · 두려움 · 걱정',/불안|걱정|염려|초조|긴장|두렵|두려|무섭|무서|겁이\s*나/],
 ['loneliness','외로움 · 소외감',/외롭|외로|쓸쓸|고독|소외|혼자\s*남|혼자인|혼자인\s*것|아무도\s*없/],
 ['grief','슬픔 · 상실 · 이별',/슬프|슬퍼|슬픔|눈물|상실|이별|헤어졌|헤어진|헤어져|사별|돌아가셨|세상을\s*떠|그립|그리워/],
 ['relationship','관계의 상처 · 갈등 · 용서',/상처|배신|거절|따돌림|왕따|싸웠|다퉜|갈등|용서|괴롭힘/],
 ['future','미래 · 진로 · 선택',/미래|진로|선택|앞날|취업|면접|이직|결정|어떻게\s*될/],
 ['failure','실패 · 좌절 · 자신감',/실패|좌절|자신감|낙방|불합격|떨어졌|쓸모없|못난/],
 ['guilt','죄책감 · 후회 · 회복',/죄책감|후회|잘못했|잘못한|죄를|회개|회복/],
 ['faith','기도의 어려움 · 믿음의 흔들림',/기도.*(?:어렵|안\s*나|못하)|믿음.*(?:흔들|약해)|하나님.*(?:멀게|안\s*느껴|의심)|신앙.*(?:흔들|어렵)/],
 ['gratitude','감사 · 기쁨 · 일상의 은혜',/감사|고마워|기쁘|기뻐|기쁨|행복|은혜/]
];
// Stable IDs are shared by rule-based and future AI analysis.
window.Malsseum.data.topics = Object.freeze(definitions.map(([id,label]) => ({id,label})));
window.Malsseum.data.topicRules = definitions.map(([id,,pattern]) => ({id,pattern}));
window.Malsseum.data.situationRules = [
 {id:'overload',pattern:/야근|업무|육아|돌봄|간병|감당|할\s*일이\s*많/},
 {id:'uncertain_future',pattern:/진로|취업|면접|앞날|미래|이직|결정/},
 {id:'isolation',pattern:/혼자|소외|외롭|외로|아무도/},
 {id:'bereavement',pattern:/사별|돌아가셨|세상을\s*떠|장례/},
 {id:'separation',pattern:/이별|헤어졌|헤어진|헤어져/},
 {id:'conflict',pattern:/싸웠|다퉜|갈등|배신|상처|따돌림/},
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
