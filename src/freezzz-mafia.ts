/* FREEzzz МАФИЯ — campaign game module
 * Fictional 2D platformer. Story/content is data-driven so the campaign can grow
 * without rewriting the renderer.
 */
type FamilyId="valenti"|"moretti"|"rossi"|"bellini";
type HeroId="antonio"|"massimo"|"salvatore"|"giuseppe";
type EnemyType="brawler"|"shooter"|"heavy"|"rusher"|"guard"|"sniper"|"suppressor"|"flanker";
type Mode="select"|"family"|"briefing"|"play"|"shop"|"result";
type Objective="reach"|"find"|"clear"|"escort"|"defend"|"recover"|"escape"|"survive";

interface Hero{ id:HeroId; name:string; family:FamilyId; color:string; face:string; ability:string; abilityDesc:string; bio:string; }
interface Dialogue{speaker:string;text:string}
interface Mission{ id:string; number:number; hero:HeroId|"shared"; title:string; ru:string; desc:string; objective:Objective; floors:[string,string,string]; enemies:EnemyType[]; reward:number; xp:number; dialogue:Dialogue[]; optional?:string; }
interface Enemy{type:EnemyType;x:number;y:number;hp:number;maxHp:number;vx:number;vy:number;cool:number;shootCool:number;dir:number;falling?:boolean}
interface Bullet{x:number;y:number;vx:number;vy:number;from:"player"|"enemy";life:number}
interface Player{x:number;y:number;vx:number;vy:number;hp:number;maxHp:number;armor:number;ammo:number;grounded:boolean;cool:number;ability:number;facing:number}
interface Save{hero:HeroId|null;rank:number;xp:number;money:number;weapon:number;armor:number;completed:string[];storySeen?:Partial<Record<HeroId,boolean>>;resumeMission?:Partial<Record<HeroId,string>>;resumeFloor?:Partial<Record<HeroId,number>>}

const W=640,H=448;
const heroes:Record<HeroId,Hero>={
 antonio:{id:"antonio",name:"ANTONIO",family:"valenti",color:"#54d6d8",face:"#9a6554",ability:"ТАКТИКА",abilityDesc:"Ненадолго показывает противников и цели.",bio:"Спокойный, наблюдательный и всегда ищет закономерность."},
 massimo:{id:"massimo",name:"MASSIMO",family:"moretti",color:"#c58b48",face:"#b97859",ability:"РЫВОК",abilityDesc:"Короткое ускорение с дополнительным контролем прыжка.",bio:"Прямой, смелый и не любит терять время."},
 salvatore:{id:"salvatore",name:"SALVATORE",family:"rossi",color:"#d86c35",face:"#784d42",ability:"ФОКУС",abilityDesc:"Ненадолго уменьшает разброс и замедляет прицеливание.",bio:"Тихий, осторожный и его трудно застать врасплох."},
 giuseppe:{id:"giuseppe",name:"GIUSEPPE",family:"bellini",color:"#9f83d6",face:"#a86d56",ability:"МАРШРУТ",abilityDesc:"Показывает безопасный путь через текущий этаж.",bio:"Спокойный, технически мыслящий и всегда думает о маршруте."}
};

const familyText:Record<FamilyId,{desc:string;intro:string}> = {
 valenti:{desc:"Финансы и влияние.",intro:"Валенти выживает, читая цифры, людей и точки давления."},
 moretti:{desc:"Улица и контроль территории.",intro:"Моретти держит территорию за счёт силы, скорости и верности."},
 rossi:{desc:"Сеть поставок.",intro:"Росси знает: каждая пропажа оставляет след."},
 bellini:{desc:"Перевозки и логистика.",intro:"Беллини знает маршруты, двери и всё, что находится между ними."}
};

const D=(speaker:string,text:string):Dialogue=>({speaker,text});
const M=(id:string,number:number,hero:HeroId|"shared",title:string,ru:string,desc:string,objective:Objective,floors:[string,string,string],enemies:EnemyType[],reward:number,xp:number,dialogue:Dialogue[],optional?:string):Mission=>({id,number,hero,title,ru,desc,objective,floors,enemies,reward,xp,dialogue,optional});

const personal:Mission[]=[
 M("valenti_01",1,"antonio","FIRST ACCOUNT","Первый счёт","A missing folder is the first sign that someone arrived before Antonio.","find",["OFFICE","UPPER OFFICE","ESCAPE"],["guard","brawler"],250,100,[D("ANTONIO","Первое правило — сначала смотреть, потом действовать."),D("CONTACT","Папка должна быть в офисе."),D("ANTONIO","Должна? Это уже звучит интересно."),D("ANTONIO","Кто-то был здесь до меня.")],"Find the hidden note."),
 M("valenti_02",2,"antonio","OTHER PEOPLE'S NUMBERS","Чужие счета","Three documents reveal the same unexplained signature.","recover",["FRONT OFFICE","RECORD ROOM","ROOFTOP"],["shooter","guard","rusher"],320,130,[D("ANTONIO","Цифры редко ошибаются."),D("ACCOUNTANT","Я проверял дважды."),D("ANTONIO","Тогда кто-то проверил их за тебя."),D("ANTONIO","Три места. Один и тот же почерк.")],"Recover 3 documents."),
 M("valenti_03",3,"antonio","THE NEW MAN","Новый человек","Antonio escorts a senior family contact through a building that suddenly becomes unsafe.","escort",["LOBBY","STAIRS","SAFE ROOM"],["brawler","shooter","flanker"],380,160,[D("SENIOR","Сегодня ты просто идёшь рядом."),D("ANTONIO","А завтра?"),D("SENIOR","Завтра зависит от того, что ты увидишь сегодня."),D("ANTONIO","Теперь я понимаю, зачем меня взяли.")]),
 M("valenti_04",4,"antonio","PRESSURE POINT","Точка давления","Competitors push into a family location. Antonio has to reclaim the route.","clear",["STREET","WORKМАГАЗИН","UPPER FLOOR"],["rusher","shooter","heavy"],450,190,[D("CONTACT","Они хотят, чтобы мы ушли."),D("ANTONIO","Тогда они выбрали неправильную дверь."),D("ANTONIO","Это была не атака. Это была проверка.")]),
 M("valenti_05",5,"antonio","THE DEBT","Долг","An old contact asks for help and leaves Antonio with one unanswered question.","defend",["МАГАЗИН","НАЗАД ROOM","ROOFTOP"],["guard","brawler","suppressor"],500,220,[D("OLD CONTACT","Я помню, кто однажды помог мне."),D("ANTONIO","Тогда сегодня пришло время вспомнить."),D("ANTONIO","Он ничего не должен нам."),D("ANTONIO","Но теперь я должен ему один ответ.")]),
 M("valenti_06",6,"antonio","SOMEONE ELSE'S GAME","Чужая игра","Several unrelated problems carry the same hidden mark.","find",["WAREHOUSE","RECORDS","CONTROL ROOM"],["shooter","flanker","sniper"],560,250,[D("ANTONIO","Слишком много совпадений."),D("CONTACT","Ты думаешь, это связано?"),D("ANTONIO","Совпадений стало слишком много."),D("ANTONIO","Кто-то двигает фигуры.")]),
 M("valenti_07",7,"antonio","CLOSED DOOR","Закрытая дверь","A key location is locked. The real challenge is finding another route.","reach",["LOCKED FLOOR","SERVICE LEVEL","ROOF ACCESS"],["guard","heavy","rusher"],620,280,[D("GUARD","Дверь закрыта."),D("ANTONIO","Я заметил."),D("GUARD","И что теперь?"),D("ANTONIO","Теперь найдём другую дверь.")]),
 M("valenti_08",8,"antonio","THE TRACE","След","Antonio follows the evidence without waiting for permission.","recover",["ALLEY","ARCHIVE","HIDDEN ROOM"],["flanker","shooter","sniper"],700,310,[D("ANTONIO","Теперь я играю по своим правилам."),D("ANTONIO","Вот он."),D("ANTONIO","Имя знакомое.")],"Recover every trace."),
 M("valenti_09",9,"antonio","THE RED FILE","Красная папка","A red file connects money, routes and all four families.","find",["OFFICE","SECURE ARCHIVE","ROOFTOP"],["guard","suppressor","heavy"],800,350,[D("ANTONIO","Красная папка. Значит, кто-то хотел, чтобы её заметили."),D("CONTACT","Что внутри?"),D("ANTONIO","Имена. Маршруты. Деньги."),D("ANTONIO","И четыре семьи.")]),
 M("valenti_10",10,"antonio","WRONG ENEMY","Не тот враг","Antonio learns that the other families have been pushed by the same hidden hand.","clear",["VALENTI OFFICE","CROSSING","MEETING FLOOR"],["shooter","rusher","flanker","heavy"],950,450,[D("ANTONIO","Мы всё это время смотрели не туда."),D("CONTACT","На кого?"),D("ANTONIO","На друг друга."),D("ANTONIO","Пора поговорить с остальными.")]),
 M("moretti_01",1,"massimo","MY BLOCK","Мой район","Massimo receives his first territory assignment.","clear",["STREET","BLOCK","ROOFTOP"],["brawler","rusher"],250,100,[D("MASSIMO","Это мой район."),D("CONTACT","Пока что."),D("MASSIMO","Мне нравится это слово — пока.")]),
 M("moretti_02",2,"massimo","NEW RULES","Новые правила","Massimo proves he can handle a job without being led.","reach",["НАЗАД STREET","GARAGE","UPPER FLOOR"],["rusher","shooter","guard"],320,130,[D("MASSIMO","Я не пришёл спрашивать разрешения."),D("CONTACT","А зачем пришёл?"),D("MASSIMO","Закончить разговор.")]),
 M("moretti_03",3,"massimo","UNINVITED GUESTS","Незваные гости","An unknown group appears inside Moretti territory.","clear",["ENTRANCE","STORAGE","ROOFTOP"],["brawler","shooter","flanker"],380,160,[D("MASSIMO","Я вас не приглашал."),D("UNKNOWN","Нам приглашение не нужно."),D("MASSIMO","Плохой ответ.")]),
 M("moretti_04",4,"massimo","PRESSURE","Давление","Several locations come under pressure at once.","survive",["BLOCK","WORKМАГАЗИН","STREET"],["rusher","shooter","suppressor"],450,190,[D("CONTACT","Их слишком много."),D("MASSIMO","Тогда будем двигаться быстрее."),D("MASSIMO","Они хотели заставить нас нервничать. Не получилось.")]),
 M("moretti_05",5,"massimo","OLD FRIEND","Старый друг","An old acquaintance is suddenly on the other side.","clear",["BAR","НАЗАД ROOM","ALLEY"],["guard","brawler","heavy"],500,220,[D("MASSIMO","Я тебя помню."),D("OLD FRIEND","А я надеялся, что забудешь."),D("MASSIMO","Не сегодня.")]),
 M("moretti_06",6,"massimo","TERRITORY","Территория","A section of the district has been taken. Massimo wants it back.","clear",["DISTRICT","SERVICE FLOOR","ROOFTOP"],["heavy","rusher","shooter"],560,250,[D("MASSIMO","Они забрали наш район."),D("CONTACT","Что будем делать?"),D("MASSIMO","Возвращать.")]),
 M("moretti_07",7,"massimo","AFTER MIDNIGHT","После полуночи","The opposition moves with unusual coordination.","survive",["NIGHT STREET","WAREHOUSE","UPPER LEVEL"],["flanker","suppressor","sniper"],620,280,[D("MASSIMO","Они не разбегаются."),D("CONTACT","Что?"),D("MASSIMO","Каждый знает, куда идти.")]),
 M("moretti_08",8,"massimo","STRANGERS","Чужие люди","Evidence points beyond Moretti territory.","reach",["STREET","CROSSING","ARCHIVE"],["shooter","flanker","guard"],700,310,[D("MASSIMO","Это уже не наша история."),D("CONTACT","Тогда чья?"),D("MASSIMO","Похоже, общая.")]),
 M("moretti_09",9,"massimo","THE LEAK","Предатель","Someone is leaking information. Massimo must identify the source.","find",["OFFICE","НАЗАД ROOMS","RECORD FLOOR"],["guard","flanker","sniper"],800,350,[D("MASSIMO","Кто-то говорит слишком много."),D("CONTACT","Думаешь, это свой?"),D("MASSIMO","Надеюсь, что нет.")]),
 M("moretti_10",10,"massimo","FOUR NAMES","Четыре имени","A list contains four family names.","find",["MORETTI HQ","RECORD ROOM","ROOFTOP"],["heavy","suppressor","shooter"],950,450,[D("MASSIMO","Valenti."),D("MASSIMO","Rossi."),D("MASSIMO","Bellini."),D("MASSIMO","Moretti."),D("CONTACT","Что это значит?"),D("MASSIMO","Что нас всех ведут в одну сторону.")]),
 M("rossi_01",1,"salvatore","NEW WORK","Новая работа","A first assignment goes wrong when the expected cargo is missing.","find",["STREET","DEPOT","ROOF"],["guard","brawler"],250,100,[D("SALVATORE","Мне сказали забрать груз."),D("CONTACT","И?"),D("SALVATORE","Я хочу знать, почему его уже нет.")]),
 M("rossi_02",2,"salvatore","MISSING CARGO","Пропавший груз","The cargo did not vanish. Someone moved it.","recover",["DEPOT","WAREHOUSE","LOADING FLOOR"],["shooter","rusher","guard"],320,130,[D("SALVATORE","Он не исчез."),D("CONTACT","Откуда такая уверенность?"),D("SALVATORE","Кто-то его взял.")]),
 M("rossi_03",3,"salvatore","THE OTHER TRACE","Чужой след","The trail does not belong to Rossi.","find",["ALLEY","ARCHIVE","ROOF"],["flanker","shooter","sniper"],380,160,[D("SALVATORE","Этот след не наш."),D("CONTACT","Тогда чей?"),D("SALVATORE","Вот это мы и выясним.")]),
 M("rossi_04",4,"salvatore","THE WAREHOUSE","Склад","A warehouse is suspiciously quiet.","clear",["LOADING BAY","WAREHOUSE","UPPER CATWALK"],["guard","heavy","suppressor"],450,190,[D("SALVATORE","Слишком тихо."),D("CONTACT","Это плохо?"),D("SALVATORE","Очень.")]),
 M("rossi_05",5,"salvatore","SILENCE","Молчание","Nobody wants to answer simple questions.","find",["НАЗАД ROOM","OFFICE","ROOF"],["guard","flanker","rusher"],500,220,[D("SALVATORE","Все что-то знают."),D("CONTACT","Но молчат."),D("SALVATORE","Значит, есть причина.")]),
 M("rossi_06",6,"salvatore","TOO CONVENIENT","Слишком удобно","The opposition always seems one step ahead.","survive",["DEPOT","SERVICE FLOOR","ROOFTOP"],["sniper","shooter","suppressor"],560,250,[D("SALVATORE","Они знают наши движения."),D("CONTACT","У нас шпион?"),D("SALVATORE","Или кто-то знает больше, чем должен.")]),
 M("rossi_07",7,"salvatore","INSIDE THE NETWORK","Внутри сети","Separate incidents form one system.","recover",["ARCHIVE","CONTROL ROOM","UPPER FLOOR"],["flanker","guard","heavy"],620,280,[D("SALVATORE","Это уже не отдельные случаи."),D("CONTACT","Что тогда?"),D("SALVATORE","Система.")]),
 M("rossi_08",8,"salvatore","EMPTY CONTAINER","Пустой контейнер","An empty container holds one deliberate clue.","find",["PORT","CONTAINER YARD","CONTROL ROOM"],["shooter","rusher","sniper"],700,310,[D("SALVATORE","Они оставили это специально."),D("CONTACT","Зачем?"),D("SALVATORE","Чтобы мы нашли.")]),
 M("rossi_09",9,"salvatore","MAN WITHOUT A FAMILY","Человек без семьи","A stranger claims to work for none of the four families.","escort",["MEETING ROOM","SERVICE HALL","ROOF"],["guard","flanker","suppressor"],800,350,[D("STRANGER","Вы ищете не того человека."),D("SALVATORE","Тогда назови правильного."),D("STRANGER","Сначала вы должны понять, что он вообще существует.")]),
 M("rossi_10",10,"salvatore","COMMON ENEMY","Общий враг","Salvatore connects the last pieces.","clear",["ROSSI HQ","ARCHIVE","ROOFTOP"],["heavy","sniper","suppressor","flanker"],950,450,[D("SALVATORE","У нас общий враг."),D("CONTACT","Ты уверен?"),D("SALVATORE","Теперь — да.")]),
 M("bellini_01",1,"giuseppe","FIRST МАРШРУТ","Первый маршрут","Giuseppe's first route is simple until everything changes.","reach",["DEPOT","SERVICE LEVEL","ВЫХОД"],["brawler","guard"],250,100,[D("GIUSEPPE","Маршрут простой."),D("CONTACT","Что может пойти не так?"),D("GIUSEPPE","Обычно после этой фразы всё идёт не так.")]),
 M("bellini_02",2,"giuseppe","THE PORT","Порт","Giuseppe finds the direct route blocked.","reach",["DOCK","WAREHOUSE","CRANE FLOOR"],["shooter","guard","rusher"],320,130,[D("GIUSEPPE","Слишком много охраны."),D("CONTACT","Есть другой путь?"),D("GIUSEPPE","Всегда есть другой путь.")]),
 M("bellini_03",3,"giuseppe","NIGHT RUN","Ночной рейс","A night route forces Giuseppe to rely on memory and timing.","reach",["NIGHT DOCK","SERVICE TUNNEL","ROOFTOP"],["flanker","shooter","sniper"],380,160,[D("GIUSEPPE","Ночью всё выглядит одинаково."),D("CONTACT","Ты потерялся?"),D("GIUSEPPE","Нет. Я ищу короткую дорогу.")]),
 M("bellini_04",4,"giuseppe","WAREHOUSE 7","Склад №7","A strange marking appears where it should not be.","find",["WAREHOUSE","CATWALK","OFFICE"],["guard","heavy","rusher"],450,190,[D("GIUSEPPE","Номер семь."),D("CONTACT","И что?"),D("GIUSEPPE","Он не должен здесь находиться.")]),
 M("bellini_05",5,"giuseppe","WRONG ADDRESS","Неправильный адрес","The address is correct. The destination is wrong.","find",["STREET","DEPOT","UPPER FLOOR"],["shooter","flanker","guard"],500,220,[D("GIUSEPPE","Адрес правильный."),D("CONTACT","Но место неправильное."),D("GIUSEPPE","Именно.")]),
 M("bellini_06",6,"giuseppe","SOMEONE ELSE'S CARGO","Чужой груз","A package clearly belongs to another family.","recover",["PORT","STORAGE","ROOF"],["rusher","heavy","shooter"],560,250,[D("GIUSEPPE","Это не наше."),D("CONTACT","Оставим?"),D("GIUSEPPE","Теперь уже поздно.")]),
 M("bellini_07",7,"giuseppe","OLD МАРШРУТ","Старый маршрут","An old route map should have been forgotten.","find",["ARCHIVE","SERVICE FLOOR","ROOF"],["guard","sniper","flanker"],620,280,[D("GIUSEPPE","Эта карта старая."),D("CONTACT","Насколько?"),D("GIUSEPPE","Достаточно, чтобы никто не должен был её использовать.")]),
 M("bellini_08",8,"giuseppe","INVISIBLE MIDDLEMAN","Невидимый посредник","Every route seems to pass through one unseen intermediary.","find",["DEPOT","CONTROL ROOM","ARCHIVE"],["suppressor","shooter","flanker"],700,310,[D("GIUSEPPE","Мы никогда его не видели."),D("CONTACT","Но он знает нас."),D("GIUSEPPE","Да.")]),
 M("bellini_09",9,"giuseppe","LAST CONTAINER","Последний контейнер","The final container contains the clue everyone has been missing.","find",["PORT","CONTAINER YARD","CONTROL FLOOR"],["heavy","guard","sniper"],800,350,[D("GIUSEPPE","Если этот контейнер пуст — всё заканчивается."),D("GIUSEPPE","Он не пуст.")]),
 M("bellini_10",10,"giuseppe","THE MEETING","Встреча","Giuseppe reaches the meeting point and finally sees the other three families.","reach",["PORT","MEETING FLOOR","ROOFTOP"],["shooter","flanker","heavy"],950,450,[D("GIUSEPPE","Значит, это вы."),D("ANTONIO","Похоже, мы искали одно и то же."),D("MASSIMO","Мне не нравится эта компания."),D("SALVATORE","Мне тоже."),D("GIUSEPPE","Тогда мы хотя бы в чём-то согласны.")])
];

const shared:Mission[]=[
 M("joint_11",11,"shared","THE COMMON DEAL","Общее дело","The four families temporarily unite to expose the hidden force behind the conflict.","recover",["ENTRY","CROSSROADS","CONTROL FLOOR"],["rusher","shooter","flanker","heavy"],1200,600,[D("ANTONIO","У нас четыре истории."),D("SALVATORE","Но причина одна."),D("MASSIMO","И что теперь?"),D("GIUSEPPE","Теперь идём вместе.")]),
 M("joint_12",12,"shared","THE BREAK","Разрыв","The hidden opponent tries to turn the four families against each other.","defend",["OUTER BLOCK","SPLIT LEVEL","MEETING FLOOR"],["shooter","suppressor","flanker","sniper"],1500,750,[D("MASSIMO","Кто-то хочет, чтобы мы начали стрелять друг в друга."),D("SALVATORE","И у него почти получилось."),D("ANTONIO","Тогда не дадим ему закончить."),D("GIUSEPPE","Мы снова вместе.")]),
 M("joint_13",13,"shared","THE LAST MOVE","Последний ход","The final joint operation of Chapter I. The selected hero leads while the other three are AI allies.","clear",["ENTRY","CROSSROAD","FINAL FLOOR"],["guard","rusher","shooter","heavy","suppressor","sniper"],2000,1000,[D("ANTONIO","Последний шанс отступить."),D("MASSIMO","Я уже вошёл."),D("SALVATORE","Тогда идём."),D("GIUSEPPE","Маршрут готов."),D("ANTONIO","Теперь начинается наша.")])
];

const allMissions=[...personal,...shared];

type Platform=[number,number,number,number];
interface TestFloorLayout{
  platforms:Platform[];
  spawn:[number,number];
  exit:[number,number];
  accents:string;
}

/* TEST BUILD: one fully playable 3-floor level per family.
 * The campaign data already contains the later missions; these four are the
 * first concrete level slices used for the current gameplay test.
 */
const testFloorLayouts:Record<FamilyId,TestFloorLayout[][]>={
  valenti:[
    [{platforms:[[0,396,640,16],[32,334,210,10],[300,286,150,10],[478,338,130,10],[92,226,170,10],[350,174,190,10],[44,116,180,10],[286,88,170,10],[478,122,140,10]],spawn:[65,360],exit:[560,95],accents:"OFFICE"},
     {platforms:[[0,396,640,16],[55,344,150,10],[230,304,160,10],[430,346,155,10],[110,242,190,10],[360,206,170,10],[35,144,160,10],[250,108,210,10],[500,150,105,10]],spawn:[55,360],exit:[565,108],accents:"RECORDS"},
     {platforms:[[0,396,640,16],[40,350,130,10],[210,310,160,10],[430,348,160,10],[100,246,150,10],[300,198,170,10],[475,240,125,10],[180,122,170,10],[410,92,180,10]],spawn:[50,360],exit:[560,92],accents:"ROOFTOP"}],
  ],
  moretti:[
    [{platforms:[[0,396,640,16],[0,338,150,12],[180,350,170,12],[390,326,120,12],[535,300,105,12],[90,244,170,10],[315,218,150,10],[470,166,150,10],[250,108,170,10]],spawn:[48,360],exit:[570,108],accents:"STREET"},
     {platforms:[[0,396,640,16],[35,350,180,10],[255,350,125,10],[430,350,175,10],[80,274,120,10],[245,238,180,10],[470,274,120,10],[150,150,150,10],[365,116,210,10]],spawn:[55,360],exit:[570,116],accents:"BLOCK"},
     {platforms:[[0,396,640,16],[70,330,150,10],[280,310,120,10],[460,336,140,10],[120,236,180,10],[350,220,180,10],[55,132,155,10],[260,96,150,10],[455,122,145,10]],spawn:[60,360],exit:[550,96],accents:"ROOFTOP"}],
  ],
  rossi:[
    [{platforms:[[0,396,640,16],[40,340,160,10],[235,318,145,10],[420,342,180,10],[90,250,160,10],[300,230,170,10],[500,260,100,10],[180,142,170,10],[400,106,190,10]],spawn:[60,360],exit:[565,106],accents:"DEPOT"},
     {platforms:[[0,396,640,16],[20,350,120,10],[170,330,160,10],[370,350,120,10],[510,318,110,10],[80,250,170,10],[300,270,130,10],[455,210,150,10],[230,130,190,10]],spawn:[45,360],exit:[555,130],accents:"WAREHOUSE"},
     {platforms:[[0,396,640,16],[45,346,160,10],[260,330,140,10],[455,350,145,10],[115,250,150,10],[330,228,160,10],[500,180,110,10],[185,120,155,10],[395,90,190,10]],spawn:[55,360],exit:[555,90],accents:"ROOF"}],
  ],
  bellini:[
    [{platforms:[[0,396,640,16],[25,346,130,10],[190,326,150,10],[385,344,120,10],[520,316,100,10],[80,250,170,10],[315,236,145,10],[475,178,140,10],[245,110,190,10]],spawn:[48,360],exit:[560,110],accents:"DOCK"},
     {platforms:[[0,396,640,16],[0,350,110,10],[145,340,120,10],[300,350,150,10],[485,330,150,10],[70,270,130,10],[250,250,170,10],[455,220,140,10],[170,132,180,10],[405,100,180,10]],spawn:[40,360],exit:[560,100],accents:"WAREHOUSE"},
     {platforms:[[0,396,640,16],[55,348,150,10],[245,318,125,10],[420,346,175,10],[110,250,150,10],[310,220,170,10],[505,250,95,10],[175,126,160,10],[405,90,190,10]],spawn:[60,360],exit:[565,90],accents:"ВЫХОД МАРШРУТ"}],
  ]
};

const rankNames=["RECRUIT","RUNNER","SOLDIER","OPERATOR","CAPO","UNDERBOSS"];
const weapons=[{name:"POCKET 9",damage:2,rate:18,mag:12,cost:0},{name:"SERVICE",damage:3,rate:14,mag:14,cost:450},{name:"REVOLVER",damage:5,rate:28,mag:6,cost:700},{name:"SMG",damage:2,rate:7,mag:24,cost:1100},{name:"SHOTGUN",damage:8,rate:34,mag:5,cost:1400},{name:"CARBINE",damage:6,rate:16,mag:10,cost:1800}];

let root:HTMLElement|null=null, canvas:HTMLCanvasElement|null=null, ctx:CanvasRenderingContext2D|null=null;
let mode:Mode="select", selected:HeroId|null=null, missionIndex=0, dialogueIndex=0, dialogueOpen=false;
let frame=0,last=0,raf=0,keys=new Set<string>(),cleanup:()=>void=()=>{};
let viewWidth=640,viewHeight=448;
let save:Save={hero:null,rank:0,xp:0,money:0,weapon:0,armor:0,completed:[],storySeen:{},resumeMission:{},resumeFloor:{}};
let player:Player={x:80,y:360,vx:0,vy:0,hp:100,maxHp:100,armor:0,ammo:12,grounded:false,cool:0,ability:0,facing:1};
let enemies:Enemy[]=[],bullets:Bullet[]=[];
let floor=0,floorTimer=0,objectiveProgress=0,flash=0;
let touch={left:false,right:false,jump:false,ability:false};
let aimAngle=-Math.PI/4,aimActive=false,aimPointerId:number|null=null;
const completedKey="freezzz:mafia-save:v2";

function loadSave(){try{const s=JSON.parse(localStorage.getItem(completedKey)||"");if(s&&typeof s==="object")save={...save,...s,storySeen:s.storySeen||{},resumeMission:s.resumeMission||{},resumeFloor:s.resumeFloor||{}};}catch{}}
function storeSave(){try{localStorage.setItem(completedKey,JSON.stringify(save));}catch{}}
function storySeen(h:HeroId){return save.storySeen?.[h]===true;}
function markStorySeen(h:HeroId){save.storySeen={...(save.storySeen||{}),[h]:true};storeSave();}
function missionIndexForHero(h:HeroId){const savedId=save.resumeMission?.[h];const savedIndex=savedId?allMissions.findIndex(m=>m.id===savedId):-1;if(savedIndex>=0&&!save.completed.includes(allMissions[savedIndex].id))return savedIndex;const first=personal.findIndex(m=>m.hero===h&&!save.completed.includes(m.id));if(first>=0)return first;const jointOrder=["joint_11","joint_12","joint_13"];const nextJoint=jointOrder.find(id=>!save.completed.includes(id));return nextJoint?allMissions.findIndex(m=>m.id===nextJoint):0;}
function saveResumeState(){if(!selected)return;save.resumeMission={...(save.resumeMission||{}),[selected]:currentMission().id};save.resumeFloor={...(save.resumeFloor||{}),[selected]:Math.max(0,Math.min(2,floor))};storeSave();}
function setResumeMission(index:number,floorNumber=0){if(!selected)return;const m=allMissions[index];if(!m)return;save.resumeMission={...(save.resumeMission||{}),[selected]:m.id};save.resumeFloor={...(save.resumeFloor||{}),[selected]:floorNumber};storeSave();}
function rank(){return Math.min(rankNames.length-1,Math.floor(save.xp/650));}
function rankRu(r:string){const map:Record<string,string>={RECRUIT:"НОВИЧОК",RUNNER:"ПОСЛАННИК",SOLDIER:"БОЕЦ",OPERATOR:"ОПЕРАТИВНИК",CAPO:"КАПО",UNDERBOSS:"ПРАВАЯ РУКА"};return map[r]||r;}
function objectiveRu(o:Objective){const map:Record<Objective,string>={find:"НАЙТИ",recover:"ЗАБРАТЬ",escort:"СОПРОВОЖДАТЬ",clear:"ЗАЧИСТИТЬ",reach:"ДОБРАТЬСЯ",defend:"ЗАЩИТИТЬ",survive:"ВЫЖИТЬ",escape:"ОТХОД"};return map[o]||o.toUpperCase();}
function currentMission():Mission{return allMissions[missionIndex]||shared[2];}
function hero(){return heroes[selected||"antonio"];}
function family(){return familyText[hero().family];}
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(b,n));}
function esc(s:string){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]||c));}
function tx(s:string,x:number,y:number,size=10,color="#f0eee7",align:CanvasTextAlign="left"){if(!ctx)return;ctx.font="700 "+size+"px monospace";ctx.textAlign=align;ctx.textBaseline="top";ctx.fillStyle=color;ctx.fillText(s,x,y);}
function rect(x:number,y:number,w:number,h:number,c:string){if(ctx){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}}
function line(x1:number,y1:number,x2:number,y2:number,c:string,w=2){if(ctx){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}}


function ellipse(x:number,y:number,rx:number,ry:number,c:string,rot=0){
 if(!ctx)return;ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx.fill();
}
function poly(points:number[],c:string){
 if(!ctx)return;ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(points[0],points[1]);
 for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);ctx.closePath();ctx.fill();
}
function limb(x1:number,y1:number,x2:number,y2:number,w:number,c:string){
 if(!ctx)return;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap="square";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}
interface MafiaVisual{face:string;tie:string;suit?:string;}
function drawMafiaMember(m:MafiaVisual,cx:number,ground:number,frame:number,scale=1){
 if(!ctx)return;
 ctx.save();ctx.translate(cx,ground);ctx.scale(scale,scale);
 ctx.translate(0,Math.sin(frame*.08)*.35);
 ellipse(0,0,24,3,"rgba(0,0,0,.72)");
 limb(6,-43,10,-9,11,"#181b1e");limb(-6,-43,-10,-9,11,"#181b1e");
 rect(5,-10,12,3,"#080a0c");rect(-17,-10,12,3,"#080a0c");
 const suit=m.suit||"#1b1e22";
 poly([-19,-83,-12,-89,-5,-56,0,-50,5,-56,12,-89,19,-83,12,-51,0,-45,-12,-51],suit);
 poly([-9,-82,0,-68,9,-82,6,-51,0,-46,-6,-51],"#f0eee7");
 poly([-7,-78,0,-68,7,-78,4,-52,-4,-52],"#d5d8d7");
 rect(-2,-68,4,19,m.tie);rect(-9,-56,18,3,"#0e1114");
 limb(-19,-76,-28,-48,8,suit);limb(19,-76,28,-48,8,suit);
 ellipse(-29,-44,5,6,m.face);ellipse(29,-44,5,6,m.face);
 rect(-7,-98,14,14,m.face);ellipse(0,-105,12,13,m.face);
 rect(-16,-117,32,5,"#111417");rect(-11,-124,22,8,"#171b1f");rect(-18,-119,36,3,"#080a0c");
 rect(-9,-107,18,3,"#c98563");rect(-8,-100,4,2,"#171b1f");rect(4,-100,4,2,"#171b1f");
 rect(-3,-96,6,2,"#6b4038");rect(-6,-92,12,2,"#d5a08b");
 poly([-10,-82,-2,-68,-7,-62,-14,-80],"#30353a");poly([10,-82,2,-68,7,-62,14,-80],"#30353a");
 rect(10,-72,5,4,m.tie);rect(-14,-77,2,12,"#596166");rect(12,-77,2,12,"#596166");rect(-2,-50,4,2,m.tie);
 ctx.restore();
}
function heroVisual():MafiaVisual{const h=hero();return {face:h.face,tie:h.color};}

function drawBackdrop(){
 rect(0,0,W,H,"#080b0d");
 for(let i=0;i<18;i++){const x=(i*73+floor*19)%W,y=45+(i*31)%250;rect(x,y,1,1,"#657077");}
 rect(0,300,W,148,"#12181b");
 for(let y=315;y<448;y+=22)line(0,y,W,y,"#1d262a",1);
 rect(0,280,W,20,"#222c31");
 for(let i=0;i<12;i++){const x=i*58;rect(x,252-(i%3)*8,40,28+(i%3)*8,"#151d21");rect(x+5,258-(i%3)*8,10,14,"#29343a");}
 rect(0,396,W,4,"#39464b");
}

function drawHud(m:Mission){
 rect(8,8,624,34,"rgba(5,7,8,.92)");
 tx("FREEzzz МАФИЯ",18,15,9,hero().color);tx(hero().name,142,15,9,"#f0eee7");tx(rankRu(rankNames[rank()]),220,15,8,"#aab1b4");
 tx("$"+save.money,322,15,8,"#d9b86c");tx("ЗДОРОВЬЕ "+Math.max(0,Math.round(player.hp)),410,15,8,"#d5d8d7");tx("БРОНЯ "+player.armor,490,15,8,"#9f83d6");tx("ПАТРОНЫ "+player.ammo,548,15,8,hero().color);
 tx("ЭТАЖ "+(floor+1)+"/3, "+objectiveRu(m.objective),18,57,8,"#aab1b4");
}

function getTestLayout():TestFloorLayout{
 const familyId=hero().family;
 return testFloorLayouts[familyId][0][Math.min(floor,2)];
}

function drawHudOverlay(m:Mission){
 rect(8,8,viewWidth-16,40,"rgba(5,7,8,.92)");
 const fs=Math.max(10,Math.min(18,viewWidth*.019));
 tx("FREEzzz МАФИЯ",18,15,fs,hero().color);tx(hero().name,viewWidth*.20,15,fs,"#f0eee7");tx(rankRu(rankNames[rank()]),viewWidth*.36,15,fs*.82,"#aab1b4");
 tx("$"+save.money,viewWidth*.48,15,fs*.82,"#d9b86c");tx("ЗДОРОВЬЕ "+Math.max(0,Math.round(player.hp)),viewWidth*.62,15,fs*.72,"#d5d8d7");
 tx("БРОНЯ "+player.armor,viewWidth*.80,15,fs*.72,"#9f83d6");tx("АВТО",viewWidth*.94,15,fs*.72,hero().color,"right");
 tx("ЭТАЖ "+(floor+1)+"/3 · "+objectiveRu(m.objective),18,62,fs*.82,"#aab1b4");
}
function drawWorld(m:Mission){
 if(!ctx)return;
 // Масштаб по высоте: игровая сцена занимает всю высоту Telegram Mini App.
 // Камера следует за игроком по X, поэтому широкая логическая сцена естественно
 // обрезается по бокам, а не сжимается по вертикали.
 const scale=viewHeight/H;
 const cameraX=clamp(player.x-viewWidth/(2*scale),0,Math.max(0,W-viewWidth/scale));
 ctx.save();ctx.beginPath();ctx.rect(0,0,viewWidth,viewHeight);ctx.clip();
 ctx.translate(-cameraX,0);ctx.scale(scale,scale);
 drawBackdrop();
 const layout=getTestLayout();
 layout.platforms.forEach(p=>{rect(p[0],p[1],p[2],p[3],"#303b40");rect(p[0],p[1],p[2],2,hero().color);});
 tx(layout.accents,612,57,6,"#59656b","right");
 const [targetX,targetY]=layout.exit;
 if(hero().id==="giuseppe"&&player.ability>0){line(player.x,player.y-45,targetX,targetY,"#9f83d6",2);tx("МАРШРУТ",targetX,targetY-18,7,"#9f83d6","center");}
 if(hero().id==="antonio"&&player.ability>0){enemies.forEach(e=>rect(e.x-7,e.y-35,14,2,"#54d6d8"));}
 rect(targetX-8,targetY-8,16,16,hero().color);tx("ВЫХОД",targetX,targetY+18,7,hero().color,"center");
 enemies.forEach(drawEnemy);drawPlayer();
 bullets.forEach(b=>rect(b.x,b.y,5,2,b.from==="player"?hero().color:"#d86c35"));
 if(flash>0){rect(0,0,W,H,"rgba(255,255,255,"+Math.min(.18,flash)+")");flash-=.02;}
 ctx.restore();
 drawHudOverlay(m);
}
function enemyVisual(type:EnemyType):MafiaVisual{
 const suits:Record<EnemyType,string>={brawler:"#30242a",shooter:"#26323a",heavy:"#40352a",rusher:"#3a2024",guard:"#28342e",sniper:"#302a40",suppressor:"#403323",flanker:"#26313d"};
 const ties:Record<EnemyType,string>={brawler:"#b94f46",shooter:"#6d8790",heavy:"#c58b48",rusher:"#a94c42",guard:"#68776f",sniper:"#75658d",suppressor:"#9b7546",flanker:"#6d7e92"};
 return {face:"#9a6554",tie:ties[type],suit:suits[type]};
}
function drawEnemy(e:Enemy){
 const v=enemyVisual(e.type);
 drawMafiaMember(v,e.x,e.y,frame,.56);
 if(!e.falling){rect(e.x-12,e.y-80,24,2,"#20282c");rect(e.x-12,e.y-80,24*clamp(e.hp/e.maxHp,0,1),2,v.tie);}
}
function drawPlayer(){
 const x=player.x,y=player.y;drawMafiaMember(heroVisual(),x,y,frame,.82);
 const gunX=x+Math.cos(aimAngle)*28,gunY=y-44+Math.sin(aimAngle)*28;
 line(x+Math.cos(aimAngle)*12,y-44+Math.sin(aimAngle)*12,gunX,gunY,"#9ba3a5",5);
 if(player.ability>0)tx(hero().ability,x,y-104,7,hero().color,"center");
}
function spawnFloor(){
 floorTimer=0;objectiveProgress=0;bullets=[];enemies=[];
 const m=currentMission(),base=2+floor;
 const types=m.enemies;
 const layout=getTestLayout();
 for(let i=0;i<base+2;i++){
   const type=types[i%types.length];const hp=18+(i%3)*12+(save.rank*3);
   const x=92+(i*97+floor*41)%500;
   const y=layout.platforms[(i+1)%layout.platforms.length][1];
   enemies.push({type,x,y,hp,maxHp:hp,vx:0,vy:0,cool:30+i*9,shootCool:70+i*13,dir:i%2?1:-1});
 }
 const [spawnX,spawnY]=layout.spawn;
 player={x:spawnX,y:spawnY,vx:0,vy:0,hp:Math.min(player.maxHp,100+save.armor*5),maxHp:100+save.armor*5,armor:save.armor*5,ammo:weapons[save.weapon].mag,grounded:false,cool:0,ability:0,facing:1};
}

function fire(){
 if(mode!=="play"||player.cool>0)return;
 const w=weapons[save.weapon];
 if(player.ammo<=0){player.ammo=w.mag;player.cool=12;return;}
 player.ammo--;player.cool=w.rate;
 const speed=7;
 bullets.push({x:player.x+Math.cos(aimAngle)*22,y:player.y-44+Math.sin(aimAngle)*22,vx:Math.cos(aimAngle)*speed,vy:Math.sin(aimAngle)*speed,from:"player",life:100});
}
function useAbility(){
 if(mode!=="play"||player.ability>0)return;
 player.ability=300;
 if(hero().id==="massimo")player.vx=player.facing*10;
}
function hurt(amount:number){
 const blocked=Math.min(player.armor,amount*.5);player.armor-=blocked;player.hp-=amount-blocked;flash=.15;
 if(player.hp<=0){player.hp=player.maxHp;player.armor=save.armor*5;spawnFloor();}
}

function update(dt:number){
 frame++;player.cool=Math.max(0,player.cool-dt);player.ability=Math.max(0,player.ability-dt);
 const left=touch.left,right=touch.right;
 if(left){player.vx=-2.6;player.facing=-1;}else if(right){player.vx=2.6;player.facing=1;}else player.vx*=.75;
 if(touch.jump&&player.grounded){player.vy=-9;player.grounded=false;}
 // Стрельба полностью автоматическая: направление задаёт сенсорное кольцо.
 if(mode==="play")fire();
 if(touch.ability)useAbility();
 if(player.ability>0&&hero().id==="massimo")player.vx*=1.04;
 player.vy+=.42;player.x=clamp(player.x+player.vx,18,622);player.y+=player.vy;
 player.grounded=false;
 const plats=getTestLayout().platforms;
 for(const p of plats)if(player.vy>=0&&player.y>=p[1]&&player.y<=p[1]+12&&player.x>=p[0]&&player.x<=p[0]+p[2]){player.y=p[1];player.vy=0;player.grounded=true;}
 for(const b of bullets){b.x+=b.vx;b.y+=b.vy;b.life-=dt;if(b.from==="enemy"&&Math.abs(b.x-player.x)<15&&Math.abs(b.y-(player.y-40))<25){b.life=0;hurt(7);}}
 bullets=bullets.filter(b=>b.life>0&&b.x>-10&&b.x<W+10);
 for(const e of enemies){
   if(e.falling){e.vy+=.5*dt;e.y+=e.vy*dt;continue;}
   e.cool-=dt;e.shootCool-=dt;
   const dx=player.x-e.x;
   if(e.type==="rusher"||e.type==="brawler"||e.type==="flanker")e.x+=Math.sign(dx)*(e.type==="rusher"?.9:.45);
   else if(Math.abs(dx)<180)e.x+=Math.sign(dx)*.18;
   if((e.type==="shooter"||e.type==="sniper"||e.type==="suppressor")&&e.shootCool<=0){e.shootCool=e.type==="suppressor"?28:65;bullets.push({x:e.x,y:e.y-40,vx:Math.sign(dx||1)*3.2,vy:0,from:"enemy",life:110});}
   if(Math.abs(e.x-player.x)<24&&Math.abs(e.y-player.y)<40&&e.cool<=0){e.cool=55;hurt(e.type==="heavy"?12:7);}
 }
 for(const b of bullets)if(b.from==="player")for(const e of enemies)if(!e.falling&&Math.abs(b.x-e.x)<16&&Math.abs(b.y-(e.y-35))<30){
   e.hp-=weapons[save.weapon].damage;b.life=0;
   if(e.hp<=0){e.falling=true;e.vy=-4.5;save.money+=25;save.xp+=18;}
 }
 enemies=enemies.filter(e=>!e.falling||e.y<520);
 if(enemies.length===0){objectiveProgress=1;}
 floorTimer+=dt;
 const m=currentMission();
 const [exitX,exitY]=getTestLayout().exit;
 const reachedExit=Math.abs(player.x-exitX)<28&&Math.abs(player.y-exitY)<28;
 const objectiveDone=m.objective==="reach"?reachedExit:objectiveProgress>=1||(m.objective==="survive"&&floorTimer>900);
 if(objectiveDone){
   if(floor<2){floor++;if(selected){save.resumeFloor={...(save.resumeFloor||{}),[selected]:floor};storeSave();}spawnFloor();}else completeMission();
 }
}

function completeMission(){
 mode="result";const m=currentMission();save.money+=m.reward;save.xp+=m.xp;
 if(!save.completed.includes(m.id))save.completed.push(m.id);
 save.rank=rank();
 const h=selected;
 if(h){const next=missionIndexForHero(h);setResumeMission(next,0);}
 dialogueIndex=0;dialogueOpen=true;storeSave();render();
}
function nextMission(){
 const h=selected!;missionIndex=missionIndexForHero(h);
 if(missionIndex<0)missionIndex=0;
 setResumeMission(missionIndex,0);
 mode="briefing";dialogueIndex=0;dialogueOpen=true;
}
function beginSelected(){
 const h=selected;if(!h)return;
 save.hero=h;save.rank=rank();missionIndex=missionIndexForHero(h);
 if(storySeen(h)){
   floor=Math.max(0,Math.min(2,save.resumeFloor?.[h]??0));
   mode="play";dialogueOpen=false;spawnFloor();saveResumeState();
 }else{
   mode="family";dialogueIndex=0;dialogueOpen=false;
 }
 storeSave();
}
function advanceDialogue(){
 const m=currentMission();
 if(mode==="shop"){mode="play";dialogueOpen=false;return;}
 if(mode==="family"){
   if(selected)markStorySeen(selected);
   floor=Math.max(0,Math.min(2,save.resumeFloor?.[selected!]??0));
   mode="play";dialogueOpen=false;spawnFloor();saveResumeState();return;
 }
 if(mode==="result"){
   dialogueOpen=false;
   if(m.number===1){
     mode="select";selected=null;save.hero=null;storeSave();
   }else{
     nextMission();
   }
   return;
 }
 if(!dialogueOpen){dialogueOpen=true;dialogueIndex=0;return;}
 dialogueIndex++;
 if(dialogueIndex>=m.dialogue.length){dialogueOpen=false;if(mode==="briefing"){mode="play";floor=0;spawnFloor();}else if(mode==="play"){}}
}
function missionForHero():Mission{const m=currentMission();return m;}
function startMissionById(id:string){const i=allMissions.findIndex(m=>m.id===id);if(i>=0){missionIndex=i;mode="briefing";dialogueIndex=0;dialogueOpen=true;}}

function renderCanvas(){
 if(!ctx)return;resizeCanvas();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,viewWidth,viewHeight);
 const m=currentMission();
 if(mode==="play"){
   const scale=Math.min(viewWidth/W,viewHeight/H),ox=(viewWidth-W*scale)/2,oy=(viewHeight-H*scale)/2;
   ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);drawWorld(m);ctx.restore();return;
 }
 if(mode==="select"){drawSelect();return;}
 if(mode==="family"){drawFamily();return;}
 if(mode==="briefing"){drawBriefing();return;}
 if(mode==="shop"){drawShop();return;}
 if(mode==="result"){drawResult();return;}
}
function panel(x:number,y:number,w:number,h:number){rect(x,y,w,h,"rgba(8,11,13,.94)");rect(x,y,w,2,hero().color);rect(x,y+h-2,w,2,"#252e33");}
function menuTextSize(base:number,min:number,max:number){return Math.max(min,Math.min(max,viewWidth*base));}
function drawWrapped(text:string,x:number,y:number,maxChars:number,lineHeight:number,size:number,color:string,align:CanvasTextAlign="left"){
 const words=text.split(/\s+/);let line="";let row=0;
 for(const word of words){const next=line?line+" "+word:word;if(next.length>maxChars){tx(line,x,y+row*lineHeight,size,color,align);line=word;row++;}else line=next;}
 if(line)tx(line,x,y+row*lineHeight,size,color,align);
 return row+1;
}
function drawSelect(){
 if(!ctx)return;
 const ids:HeroId[]=["antonio","massimo","salvatore","giuseppe"];
 const gapX=viewWidth*.035,padX=viewWidth*.06,cardW=(viewWidth-padX*2-gapX)/2;
 const gapY=viewHeight*.02,top=viewHeight*.18,cardH=Math.min(viewHeight*.265,(viewHeight-top-viewHeight*.18-gapY)/2);
 tx("ЧЕТЫРЕ СЕМЬИ",viewWidth/2,viewHeight*.045,menuTextSize(.045,28,40),"#f0eee7","center");
 tx("ВЫБЕРИТЕ ПЕРСОНАЖА",viewWidth/2,viewHeight*.105,menuTextSize(.022,15,20),"#8e999d","center");
 ids.forEach((id,i)=>{
   const h=heroes[id],col=i%2,row=Math.floor(i/2),x=padX+col*(cardW+gapX),y=top+row*(cardH+gapY),a=id===selected;
   rect(x,y,cardW,cardH,a?"#151d21":"#0b1013");rect(x,y,cardW,4,a?h.color:"#263137");
   tx(h.family.toUpperCase(),x+cardW/2,y+18,menuTextSize(.014,11,16),a?"#f0eee7":"#aeb5b7","center");
   tx(h.name,x+cardW/2,y+44,menuTextSize(.018,13,20),h.color,"center");
   const artScale=Math.max(1.05,Math.min(1.65,cardW/220));
   // Медленное вращение аватарки вокруг центральной вертикальной оси.
   // Используем мягкое сжатие по X: персонаж не меняет высоту и остаётся пиксельным.
   const spin=performance.now()/1000*.95+i*0.8;
   const spinX=Math.max(.12,Math.abs(Math.cos(spin)));
   ctx.save();
   ctx.translate(x+cardW/2,y+cardH*.72);
   ctx.scale(spinX,1);
   drawMafiaMember({face:h.face,tie:h.color},0,0,frame+i*4,artScale);
   ctx.restore();
   tx(familyText[h.family].desc,x+cardW/2,y+cardH*.86,menuTextSize(.012,9,14),h.color,"center");
   tx(h.ability,x+cardW/2,y+cardH*.91,menuTextSize(.011,8,12),"#7e898d","center");
 });
}
function drawFamily(){
 const h=hero();
 rect(0,0,viewWidth,viewHeight,"#07090b");
 tx("ИСТОРИЯ СЕМЬИ",viewWidth/2,viewHeight*.055,menuTextSize(.04,28,38),h.color,"center");
 tx(h.family.toUpperCase(),viewWidth/2,viewHeight*.13,menuTextSize(.052,34,52),"#f0eee7","center");
 tx(h.name,viewWidth/2,viewHeight*.205,menuTextSize(.028,20,30),"#aab1b4","center");
 const maxChars=Math.max(24,Math.floor(viewWidth/15));
 const lh=menuTextSize(.022,22,30);
 let y=viewHeight*.30;
 drawWrapped(familyText[h.family].intro,viewWidth/2,y,maxChars,lh,menuTextSize(.025,18,26),"#f0eee7","center");
 y+=lh*2.3;
 drawWrapped(h.bio,viewWidth/2,y,maxChars,lh,menuTextSize(.022,17,24),"#c2c7c8","center");
 y+=lh*3.2;
 tx("СПОСОБНОСТЬ · "+h.ability,viewWidth/2,y,menuTextSize(.025,18,26),h.color,"center");
 y+=lh*1.6;
 drawWrapped(h.abilityDesc,viewWidth/2,y,maxChars,lh,menuTextSize(.021,16,22),"#aab1b4","center");
}
function drawBriefing(){
 const m=currentMission();rect(0,0,viewWidth,viewHeight,"#07090b");
 tx("МИССИЯ "+String(m.number).padStart(2,"0"),viewWidth*.07,viewHeight*.07,menuTextSize(.025,18,26),hero().color);
 tx(m.ru,viewWidth*.07,viewHeight*.15,menuTextSize(.042,28,44),"#f0eee7");
 tx("ЦЕЛЬ · "+objectiveRu(m.objective),viewWidth*.07,viewHeight*.28,menuTextSize(.024,17,25),hero().color);
 m.floors.forEach((f,i)=>{tx("ЭТАЖ "+(i+1),viewWidth*.07,viewHeight*(.36+i*.07),menuTextSize(.018,13,20),"#59656b");tx(floorRu(f),viewWidth*.20,viewHeight*(.355+i*.07),menuTextSize(.024,16,25),"#f0eee7");});
 tx("НАГРАДА  $"+m.reward+"   ОПЫТ "+m.xp,viewWidth*.07,viewHeight*.72,menuTextSize(.021,15,22),"#d9b86c");
 if(dialogueOpen)drawDialogue();
}
function drawDialogue(){
 const m=currentMission(),d=m.dialogue[Math.min(dialogueIndex,m.dialogue.length-1)];if(!d)return;
 rect(viewWidth*.04,viewHeight*.65,viewWidth*.92,viewHeight*.25,"rgba(5,7,8,.97)");rect(viewWidth*.04,viewHeight*.65,viewWidth*.92,4,hero().color);
 tx(speakerRu(d.speaker),viewWidth*.07,viewHeight*.68,menuTextSize(.022,16,24),hero().color);
 drawWrapped(d.text,viewWidth*.07,viewHeight*.73,Math.max(24,Math.floor(viewWidth/16)),menuTextSize(.023,18,27),menuTextSize(.024,17,26),"#f0eee7");
}
function drawShop(){
 rect(0,0,viewWidth,viewHeight,"#07090b");tx("АРСЕНАЛ",viewWidth*.07,viewHeight*.08,menuTextSize(.04,26,38),hero().color);tx("ДЕНЬГИ $"+save.money,viewWidth*.93,viewHeight*.08,menuTextSize(.022,15,24),"#d9b86c","right");
 weapons.forEach((w,i)=>{const y=viewHeight*(.18+i*.075);const owned=save.weapon>=i;tx(String(i+1),viewWidth*.07,y,menuTextSize(.02,14,20),"#59656b");tx(weaponRu(w.name),viewWidth*.13,y,menuTextSize(.023,16,24),"#f0eee7");tx("$"+w.cost,viewWidth*.58,y,menuTextSize(.021,15,22),"#d9b86c");tx(owned?"ЕСТЬ":"КУПИТЬ",viewWidth*.78,y,menuTextSize(.021,15,22),owned?hero().color:"#aab1b4");});
}
function drawResult(){
 const m=currentMission();rect(0,0,viewWidth,viewHeight,"#07090b");tx("МИССИЯ ЗАВЕРШЕНА",viewWidth/2,viewHeight*.18,menuTextSize(.045,28,40),hero().color,"center");tx(m.ru,viewWidth/2,viewHeight*.27,menuTextSize(.032,21,32),"#f0eee7","center");
 tx("+$"+m.reward,viewWidth/2,viewHeight*.39,menuTextSize(.04,26,38),"#d9b86c","center");tx("+"+m.xp+" XP",viewWidth/2,viewHeight*.46,menuTextSize(.026,18,26),"#aab1b4","center");
 tx("РАНГ · "+rankRu(rankNames[rank()]),viewWidth/2,viewHeight*.54,menuTextSize(.023,16,24),hero().color,"center");tx("ВСЕГО ДЕНЕГ · $"+save.money,viewWidth/2,viewHeight*.59,menuTextSize(.021,15,22),"#f0eee7","center");
 if(m.number===10)tx("ЧЕТЫРЕ СЕМЬИ ТЕПЕРЬ СВЯЗАНЫ.",viewWidth/2,viewHeight*.68,menuTextSize(.02,14,22),"#aab1b4","center");
 if(m.number===13)tx("ГЛАВА I ЗАВЕРШЕНА",viewWidth/2,viewHeight*.68,menuTextSize(.026,18,26),hero().color,"center");
}

function buyOrSelectWeapon(n:number){
 if(n<0||n>=weapons.length)return;
 const w=weapons[n];
 if(save.weapon>=n){save.weapon=n;storeSave();return;}
 if(save.money>=w.cost){save.money-=w.cost;save.weapon=n;storeSave();}
}

function handleKey(e:KeyboardEvent){
 if(["ArrowLeft","ArrowRight","ArrowUp"," ","Enter"].includes(e.key))e.preventDefault();
 if(mode==="select"){
   if(e.key==="ArrowRight"){const ids=["antonio","massimo","salvatore","giuseppe"] as HeroId[];const i=selected?ids.indexOf(selected):-1;selected=ids[(i+1+4)%4];}
   if(e.key==="ArrowLeft"){const ids=["antonio","massimo","salvatore","giuseppe"] as HeroId[];const i=selected?ids.indexOf(selected):0;selected=ids[(i-1+4)%4];}
   if(e.key==="Enter"&&selected)beginSelected();
   return;
 }
 if(mode==="shop"){if(e.key>="1"&&e.key<="6")buyOrSelectWeapon(Number(e.key)-1);if(e.key==="Escape")mode="briefing";return;}
 if(e.key==="Escape"){mode="select";dialogueOpen=false;renderCanvas();return;}
 if(e.key==="Enter"||e.key===" "){if(mode!=="play")advanceDialogue();else fire();return;}
 keys.add(e.key);
}
function keyup(e:KeyboardEvent){keys.delete(e.key);}
function exitToPortal(){
 saveResumeState();
 mode="select";dialogueOpen=false;
 window.dispatchEvent(new CustomEvent("freezzz:navigate",{detail:{view:"home"}}));
}
function bindButtons(){
 root?.querySelectorAll<HTMLElement>("[data-hero]").forEach(el=>el.onclick=()=>{selected=el.dataset.hero as HeroId;render();});
 root?.querySelectorAll<HTMLElement>("[data-action]").forEach(el=>el.onclick=()=>{
   const a=el.dataset.action;
   if(a==="play"&&selected){beginSelected();render();}
   if(a==="exit")exitToPortal();
   if(a==="advance"){advanceDialogue();render();}
   if(a==="shop"){mode="shop";render();}
 });
 root?.querySelectorAll<HTMLElement>("[data-touch]").forEach(el=>{const k=el.dataset.touch as keyof typeof touch;const on=(v:boolean)=>{touch[k]=v;};el.addEventListener("pointerdown",e=>{e.preventDefault();on(true)});["pointerup","pointercancel","pointerleave"].forEach(ev=>el.addEventListener(ev,()=>on(false)));});
 const sensor=root?.querySelector<HTMLElement>(".mafia-aim-sensor");
 if(sensor){
   const setAim=(e:PointerEvent)=>{const r=sensor.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);if(Math.hypot(dx,dy)<10)return;aimAngle=Math.atan2(dy,dx);aimActive=true;};
   sensor.addEventListener("pointerdown",e=>{e.preventDefault();aimPointerId=e.pointerId;sensor.setPointerCapture(e.pointerId);setAim(e);});
   sensor.addEventListener("pointermove",e=>{if(e.pointerId===aimPointerId)setAim(e);});
   const stop=(e:PointerEvent)=>{if(e.pointerId===aimPointerId){aimPointerId=null;aimActive=false;}};
   sensor.addEventListener("pointerup",stop);sensor.addEventListener("pointercancel",stop);
 }
}
function resizeCanvas(){
 if(!root||!canvas||!ctx)return;
 const w=Math.max(320,root.clientWidth||window.innerWidth);
 const h=Math.max(480,root.clientHeight||window.innerHeight);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 viewWidth=w;viewHeight=h;
}
function render(){
 if(!root)return;
 root.innerHTML='<div class="freezzz-mafia-frame"><canvas class="freezzz-mafia-canvas"></canvas><div class="freezzz-mafia-ui"></div></div>';
 canvas=root.querySelector("canvas");ctx=canvas?.getContext("2d")||null;
 resizeCanvas();
 const ui=root.querySelector<HTMLElement>(".freezzz-mafia-ui")!;
 if(mode==="select"){
   ui.innerHTML='<div class="mafia-select-grid">'+(["antonio","massimo","salvatore","giuseppe"] as HeroId[]).map(id=>'<button class="'+(id===selected?"selected":"")+'" aria-label="Выбрать '+heroes[id].name+'" data-hero="'+id+'"></button>').join("")+'</div><div class="mafia-menu-actions"><button data-action="play" '+(selected?"":"disabled")+'>ИГРАТЬ</button><button data-action="exit">ВЫХОД</button></div>';
 }else if(mode==="family"){
   ui.innerHTML='<div class="mafia-action"><button data-action="advance">ПРОПУСТИТЬ</button></div>';
 }else if(mode==="play"){
   ui.innerHTML='<div class="mafia-controls"><button data-touch="left">◀</button><button data-touch="right">▶</button><button data-touch="jump">▲</button><button data-touch="ability">★</button><button data-action="shop">МАГАЗИН</button></div><div class="mafia-aim-sensor" aria-label="Сенсорное наведение"><span class="mafia-aim-ring"></span><span class="mafia-aim-dot"></span></div>';
 }else{
   ui.innerHTML='<div class="mafia-action"><button data-action="advance">'+(dialogueOpen?"ПРОДОЛЖИТЬ":mode==="shop"?"НАЗАД":"НАЧАТЬ / ПРОДОЛЖИТЬ")+'</button></div>';
 }
 bindButtons();renderCanvas();
}
function loop(t:number){const dt=Math.min(2,(t-last)/16.67||1);last=t;if(mode==="play")update(dt);renderCanvas();raf=requestAnimationFrame(loop);}
function setup(){
 loadSave();selected=save.hero;
 render();raf=requestAnimationFrame(loop);
 cleanup=()=>{cancelAnimationFrame(raf);};
}
export function mountFreezzzMafia(host:HTMLElement){cleanup();root=host;mode="select";dialogueOpen=false;setup();return ()=>{saveResumeState();cleanup();root=null;canvas=null;ctx=null;};}function floorRu(s:string){
 const map:Record<string,string>={OFFICE:"ОФИС","UPPER OFFICE":"ВЕРХНИЙ ОФИС",ESCAPE:"ОТХОД","FRONT OFFICE":"ПЕРЕДНИЙ ОФИС","RECORD ROOM":"АРХИВ",ROOFTOP:"КРЫША",STREET:"УЛИЦА",BLOCK:"КВАРТАЛ","BACK STREET":"ЗАДНЯЯ УЛИЦА",GARAGE:"ГАРАЖ",ENTRANCE:"ВХОД",STORAGE:"СКЛАД",BAR:"БАР","BACK ROOM":"ЗАДНЯЯ КОМНАТА",ALLEY:"ПЕРЕУЛОК",WAREHOUSE:"СКЛАД",DEPOT:"ДЕПО","LOADING BAY":"ПОГРУЗОЧНАЯ ЗОНА","UPPER CATWALK":"ВЕРХНЯЯ ПЛОЩАДКА","CONTROL ROOM":"ЦЕНТР УПРАВЛЕНИЯ","SERVICE FLOOR":"СЛУЖЕБНЫЙ ЭТАЖ","UPPER FLOOR":"ВЕРХНИЙ ЭТАЖ","LOCKED FLOOR":"ЗАКРЫТЫЙ ЭТАЖ","ROOF ACCESS":"ВЫХОД НА КРЫШУ","MEETING FLOOR":"ЭТАЖ ВСТРЕЧИ","ROSSI HQ":"ШТАБ РОССИ","MORETTI HQ":"ШТАБ МОРЕТТИ","VALENTI OFFICE":"ОФИС ВАЛЕНТИ","PORT":"ПОРТ","CONTAINER YARD":"КОНТЕЙНЕРНЫЙ ДВОР","CONTROL FLOOR":"ЭТАЖ УПРАВЛЕНИЯ","SERVICE HALL":"СЛУЖЕБНЫЙ КОРИДОР","MEETING ROOM":"КОМНАТА ВСТРЕЧИ","SERVICE TUNNEL":"СЛУЖЕБНЫЙ ТОННЕЛЬ","NIGHT DOCK":"НОЧНОЙ ПРИЧАЛ","CRANE FLOOR":"ЭТАЖ КРАНА","NIGHT STREET":"НОЧНАЯ УЛИЦА","DISTRICT":"РАЙОН","CROSSING":"ПЕРЕКРЁСТОК","ARCHIVE":"АРХИВ","HIDDEN ROOM":"СКРЫТАЯ КОМНАТА","SECURE ARCHIVE":"ЗАКРЫТЫЙ АРХИВ","FINAL FLOOR":"ФИНАЛЬНЫЙ ЭТАЖ","ENTRY":"ВХОД","CROSSROADS":"ПЕРЕКРЁСТОК","SPLIT LEVEL":"РАЗДЕЛЁННЫЙ ЭТАЖ","OUTER BLOCK":"ВНЕШНИЙ КВАРТАЛ"};
 return map[s]||s;
}
function speakerRu(s:string){
 const map:Record<string,string>={CONTACT:"СВЯЗНОЙ",ACCOUNTANT:"БУХГАЛТЕР",SENIOR:"СТАРШИЙ",GUARD:"ОХРАННИК","OLD CONTACT":"СТАРЫЙ КОНТАКТ",UNKNOWN:"НЕИЗВЕСТНЫЙ","OLD FRIEND":"СТАРЫЙ ЗНАКОМЫЙ",STRANGER:"НЕЗНАКОМЕЦ"};
 return map[s]||s;
}
function enemyRu(s:string){
 const map:Record<string,string>={guard:"ОХРАНА",brawler:"БОРЕЦ",rusher:"ШТУРМОВИК",shooter:"СТРЕЛОК",flanker:"ОБХОДЧИК",heavy:"ТЯЖЁЛЫЙ",suppressor:"ПОДАВИТЕЛЬ",sniper:"СНАЙПЕР"};
 return map[s]||s;
}
function weaponRu(s:string){
 const map:Record<string,string>={"POCKET 9":"КАРМАННЫЙ","SERVICE":"СЛУЖЕБНЫЙ","REVOLVER":"РЕВОЛЬВЕР","SMG":"АВТОМАТ","SHOTGUN":"ДРОБОВИК","CARBINE":"КАРАБИН"};
 return map[s]||s;
}

