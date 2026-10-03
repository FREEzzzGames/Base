import { portalVideoUrl } from "./video-assets";
/* FREEzzz МАФИЯ — campaign game module
 * Fictional 2D platformer. Story/content is data-driven so the campaign can grow
 * without rewriting the renderer.
 */
type FamilyId="valenti"|"moretti"|"rossi"|"bellini";
type HeroId="antonio"|"massimo"|"salvatore"|"giuseppe";
type EnemyType="brawler"|"shooter"|"heavy"|"rusher"|"guard"|"sniper"|"suppressor"|"flanker";
type Mode="select"|"levels"|"family"|"briefing"|"play"|"shop"|"result";
type Objective="reach"|"find"|"clear"|"escort"|"defend"|"recover"|"escape"|"survive";

interface Hero{ id:HeroId; name:string; family:FamilyId; color:string; face:string; ability:string; abilityDesc:string; bio:string; }
interface Dialogue{speaker:string;text:string}
interface Mission{ id:string; number:number; hero:HeroId|"shared"; title:string; ru:string; desc:string; objective:Objective; floors:[string,string,string]; enemies:EnemyType[]; reward:number; xp:number; dialogue:Dialogue[]; optional?:string; }
interface Enemy{type:EnemyType;x:number;y:number;hp:number;maxHp:number;vx:number;vy:number;cool:number;shootCool:number;dir:number;falling?:boolean}
interface Bullet{x:number;y:number;vx:number;vy:number;from:"player"|"enemy";life:number}
interface Player{x:number;y:number;vx:number;vy:number;hp:number;maxHp:number;armor:number;ammo:number;grounded:boolean;cool:number;ability:number;weaponSwap:number;facing:number}
interface Save{hero:HeroId|null;rank:number;xp:number;money:number;weapon:number;armor:number;completed:string[];storySeen?:Partial<Record<HeroId,boolean>>;resumeMission?:Partial<Record<HeroId,string>>;resumeFloor?:Partial<Record<HeroId,number>>}

interface SpeechState{text:string;timer:number;x:number;y:number;kind:"player"|"enemy"}
let speech:SpeechState|null=null;
let speechCooldown=0;
const heroLines:Record<HeroId,string[]>={
 antonio:["Спокойно.","Я вижу путь.","Держимся вместе.","Нам сюда.","Всё под контролем."],
 massimo:["Вперёд!","Не отстаём!","Я здесь!","Давай!","Чисто!"],
 salvatore:["Тише.","Проверь угол.","Я рядом.","Что-то не так.","Осторожно."],
 giuseppe:["Маршрут чист.","Следуем плану.","Я проверил.","Через мост.","Понял."]
};
const enemyLines=["Эй!","Стой!","Там!","Сюда!","Не уйдёшь!"];
function say(text:string,kind:"player"|"enemy",x:number,y:number){
 speech={text,timer:125,x,y,kind};
 if(speechCooldown<=0 && typeof window!=="undefined" && "speechSynthesis" in window){
  try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="ru-RU";u.rate=1.08;u.pitch=kind==="player"?.92:1.04;u.volume=.7;window.speechSynthesis.speak(u);}catch{}
  speechCooldown=70;
 }
}
function drawSpeech(){
 if(!speech||speech.timer<=0)return;
 const fs=Math.max(11,Math.min(15,viewWidth*.027));
 ctx!.save();ctx!.font="700 "+fs+"px \"Nothing Font\",monospace";ctx!.textAlign="center";ctx!.textBaseline="middle";
 const width=Math.min(viewWidth*.58,Math.max(80,ctx!.measureText(speech.text).width+22));
 const bx=clamp(speech.x-width/2,6,viewWidth-width-6),by=clamp(speech.y-fs*3,8,viewHeight-fs*3-8);
 ctx!.fillStyle="rgba(5,10,12,.88)";ctx!.strokeStyle=speech.kind==="player"?hero().color:"#d86c35";ctx!.lineWidth=2;
 ctx!.beginPath();ctx!.roundRect(bx,by,width,fs*1.9,5);ctx!.fill();ctx!.stroke();
 ctx!.fillStyle="#f0eee7";ctx!.fillText(speech.text,bx+width/2,by+fs*.95);ctx!.restore();
 speech.timer--;
}

const W=640,H=448;
const heroes:Record<HeroId,Hero>={
 antonio:{id:"antonio",name:"ANTONIO",family:"valenti",color:"#54d6d8",face:"#9a6554",ability:"ТАКТИЧЕСКИЙ СБОЙ",abilityDesc:"Кратко останавливает противников и их активность.",bio:"Спокойный, наблюдательный и всегда ищет закономерность."},
 massimo:{id:"massimo",name:"MASSIMO",family:"moretti",color:"#c58b48",face:"#b97859",ability:"РЫВОК",abilityDesc:"Мощный рывок вперёд с прыжком.",bio:"Прямой, смелый и не любит терять время."},
 salvatore:{id:"salvatore",name:"SALVATORE",family:"rossi",color:"#d86c35",face:"#784d42",ability:"ФОКУС",abilityDesc:"На короткое время сильно замедляет противников.",bio:"Тихий, осторожный и его трудно застать врасплох."},
 giuseppe:{id:"giuseppe",name:"GIUSEPPE",family:"bellini",color:"#9f83d6",face:"#a86d56",ability:"МАРШРУТ",abilityDesc:"Временно создаёт дополнительный запас защиты.",bio:"Спокойный, технически мыслящий и всегда думает о маршруте."}
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
let player:Player={x:80,y:360,vx:0,vy:0,hp:100,maxHp:100,armor:0,ammo:12,grounded:false,cool:0,ability:0,weaponSwap:0,facing:1};
let enemies:Enemy[]=[],bullets:Bullet[]=[];
let floor=0,floorTimer=0,objectiveProgress=0,flash=0;
let touch={left:false,right:false,jump:false,ability:false};
let movePointerId:number|null=null;
let moveX=0,moveY=0;
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
function tx(s:string,x:number,y:number,size=10,color="#f0eee7",align:CanvasTextAlign="left"){if(!ctx)return;ctx.font="700 "+size+"px \"Nothing Font\",monospace";ctx.textAlign=align;ctx.textBaseline="top";ctx.fillStyle=color;ctx.fillText(s,x,y);}
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
 ctx.save();
 ctx.translate(Math.round(cx),Math.round(ground));
 ctx.scale(scale,scale);
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
function portraitScale(){return Math.max(.85,Math.min(2.15,Math.min(viewWidth/360,viewHeight/780)));}
function topDownMap(){
 const w=1500,h=1180;
 // Гвардейский квартал — художественная реконструкция плана жилого микрорайона.
 // План квартала используется как пространственная основа; типология зданий
 // собрана из характерных советских 5-этажных панельных/кирпичных домов,
 // малоэтажных корпусов и типовой общеобразовательной школы.
 const roads=[
  {x:0,y:392,w:1500,h:124},
  {x:598,y:0,w:126,h:1180},
  {x:0,y:850,w:598,h:104},
  {x:82,y:205,w:516,h:68},
  {x:724,y:205,w:776,h:68},
  {x:724,y:676,w:776,h:72},
  {x:724,y:830,w:776,h:72},
  {x:72,y:505,w:526,h:62},
  {x:1115,y:505,w:385,h:62}
 ];
 const buildings=[
  // Север: несколько типовых 5-этажных корпусов, поставленных с небольшим разбросом.
  {x:34,y:34,w:250,h:145,roof:"#4d595d",wall:"#30383b",kind:"panel"},
  {x:310,y:30,w:246,h:151,roof:"#555f62",wall:"#333b3e",kind:"brick"},
  {x:758,y:32,w:258,h:150,roof:"#4b575b",wall:"#30383b",kind:"panel"},
  {x:1046,y:30,w:246,h:154,roof:"#505b5f",wall:"#343b3d",kind:"brick"},
  {x:1320,y:48,w:148,h:136,roof:"#4c585c",wall:"#30383b",kind:"panel"},

  // Западный двор: дома образуют полузамкнутые дворовые пространства.
  {x:34,y:292,w:226,h:74,roof:"#555f62",wall:"#3b4244",kind:"low"},
  {x:282,y:288,w:252,h:78,roof:"#505b5e",wall:"#393f41",kind:"low"},
  {x:48,y:548,w:226,h:174,roof:"#4b585c",wall:"#30383b",kind:"panel"},
  {x:302,y:542,w:244,h:180,roof:"#525d61",wall:"#343b3e",kind:"brick"},
  {x:45,y:758,w:210,h:80,roof:"#555f62",wall:"#3b4244",kind:"low"},
  {x:286,y:754,w:250,h:84,roof:"#505b5e",wall:"#383f42",kind:"low"},

  // Восточная часть: плотная жилая застройка и небольшие дворы.
  {x:758,y:292,w:240,h:76,roof:"#535e61",wall:"#3a4143",kind:"low"},
  {x:1022,y:292,w:246,h:78,roof:"#4f5a5e",wall:"#383f42",kind:"low"},
  {x:1292,y:290,w:176,h:80,roof:"#555f62",wall:"#3a4143",kind:"low"},
  {x:760,y:540,w:224,h:176,roof:"#4b585c",wall:"#30383b",kind:"panel"},
  {x:1010,y:534,w:252,h:182,roof:"#505b60",wall:"#343b3e",kind:"brick"},
  {x:1290,y:538,w:178,h:178,roof:"#4c595d",wall:"#30383b",kind:"panel"},
  {x:758,y:760,w:220,h:76,roof:"#555f62",wall:"#3a4143",kind:"low"},
  {x:1008,y:758,w:258,h:78,roof:"#505b60",wall:"#383f42",kind:"low"},
  {x:1290,y:758,w:178,h:78,roof:"#535e61",wall:"#3a4143",kind:"low"},

  // Южная жилая группа.
  {x:34,y:970,w:240,h:154,roof:"#4d595d",wall:"#30383b",kind:"panel"},
  {x:300,y:970,w:246,h:150,roof:"#525d60",wall:"#343b3e",kind:"brick"},
  {x:758,y:970,w:244,h:154,roof:"#4d595d",wall:"#30383b",kind:"panel"},
  {x:1030,y:964,w:254,h:160,roof:"#505b60",wall:"#343b3e",kind:"brick"},
  {x:1310,y:958,w:158,h:166,roof:"#4c595d",wall:"#30383b",kind:"panel"},

  // Типовая школа: отдельный гражданский объект с двором и спортплощадкой.
  {x:84,y:101,w:448,h:82,roof:"#596467",wall:"#41494b",kind:"school"}
 ];
 return {w,h,roads,buildings,river:{x:0,y:0,w:0,h:0},bridge:{x:0,y:0,w:0,h:0}};
}
function topDownExit(){return [1365,455];}
function topDownObstacles(){
 const m=topDownMap(),out:{x:number;y:number;w:number;h:number}[]=[];
 for(const b of m.buildings)out.push({x:b.x,y:b.y,w:b.w,h:b.h});
 return out;
}
function circleRectHit(x:number,y:number,r:number,o:{x:number;y:number;w:number;h:number}){
 const nx=Math.max(o.x,Math.min(x,o.x+o.w)),ny=Math.max(o.y,Math.min(y,o.y+o.h));
 return (x-nx)*(x-nx)+(y-ny)*(y-ny)<r*r;
}
function moveTopDown(x:number,y:number,dx:number,dy:number,r:number){
 const m=topDownMap(),obs=topDownObstacles();
 let nx=clamp(x+dx,r,m.w-r),ny=clamp(y+dy,r,m.h-r);
 if(!obs.some(o=>circleRectHit(nx,y,r,o)))x=nx;
 if(!obs.some(o=>circleRectHit(x,ny,r,o)))y=ny;
 return [x,y];
}
function drawTopDownBackground(){
 const m=topDownMap(),tile=30;
 rect(0,0,m.w,m.h,"#6c8657");

 // Живой, но неброский фон дворов: трава, грунт, редкая пиксельная растительность.
 for(let y=0;y<m.h;y+=tile)for(let x=0;x<m.w;x+=tile){
  const q=((x/tile)*13+(y/tile)*7+floor*3)%23;
  if(q<5)rect(x+5,y+9,3,3,"#587447");
  if(q===8)rect(x+19,y+19,4,2,"#7f9665");
  if(q===14)rect(x+12,y+25,2,2,"#4f6c42");
 }

 // Дороги: сначала широкий серый коридор, затем асфальт, бордюр и разметка.
 for(const rd of m.roads){
  rect(rd.x,rd.y,rd.w,rd.h,"#c2c3bf");
  rect(rd.x+7,rd.y+7,rd.w-14,rd.h-14,"#4e5354");
  rect(rd.x+11,rd.y+11,rd.w-22,rd.h-22,"#44494a");
  if(rd.w>rd.h){
   rect(rd.x+12,rd.y+rd.h*.5-2,rd.w-24,4,"#a99e62");
   for(let xx=rd.x+22;xx<rd.x+rd.w-20;xx+=68)rect(xx,rd.y+rd.h*.5-2,34,4,"#d2c77e");
  }else{
   rect(rd.x+rd.w*.5-2,rd.y+12,4,rd.h-24,"#a99e62");
   for(let yy=rd.y+22;yy<rd.y+rd.h-20;yy+=68)rect(rd.x+rd.w*.5-2,yy,4,34,"#d2c77e");
  }
 }

 // Тротуарная плитка вокруг основных улиц.
 const sidewalks=[
  {x:0,y:393,w:1500,h:12},{x:0,y:521,w:1500,h:12},
  {x:598,y:0,w:12,h:1180},{x:728,y:0,w:12,h:1180},
  {x:0,y:853,w:610,h:12},{x:0,y:957,w:610,h:12},
  {x:116,y:207,w:495,h:11},{x:728,y:202,w:772,h:11},
  {x:728,y:678,w:617,h:11},{x:728,y:759,w:617,h:11},
  {x:173,y:509,w:440,h:10},{x:173,y:584,w:440,h:10}
 ];
 for(const q of sidewalks){
  rect(q.x,q.y,q.w,q.h,"#d1d1cc");
  for(let yy=q.y+2;yy<q.y+q.h;yy+=8)
   for(let xx=q.x+2;xx<q.x+q.w;xx+=24)
    rect(xx,yy,18,4,((xx+yy)/8)%2?"#babbb7":"#e0dfd8");
 }

 // Дворовые проезды и парковочные карманы.
 const lanes=[
  {x:300,y:235,w:55,h:130},{x:545,y:235,w:34,h:150},
  {x:1070,y:220,w:34,h:160},{x:300,y:760,w:55,h:115},
  {x:555,y:760,w:30,h:130},{x:1040,y:745,w:34,h:120},
  {x:1300,y:745,w:42,h:155},{x:660,y:805,w:70,h:155}
 ];
 for(const q of lanes){
  rect(q.x,q.y,q.w,q.h,"#8d918d");
  rect(q.x+5,q.y+5,q.w-10,q.h-10,"#666b6b");
 }

 // Большой внутренний двор / зелёная зона.
 rect(835,785,185,150,"#789663");
 rect(850,800,155,120,"#6f8e5d");
 rect(865,815,125,90,"#809f68");
 // спортивная площадка как гражданский ориентир.
 rect(110,800,235,115,"#777f80");
 rect(118,808,219,99,"#7d966e");
 rect(128,818,199,79,"#9a9c8f");
 line(227,818,227,897,"#e2dfc8",2);
 line(128,858,327,858,"#e2dfc8",2);
 rect(128,818,199,79,"rgba(0,0,0,0)");
 rect(127,817,201,81,"#ddd8c1");
 rect(130,820,195,75,"#7e9870");
 line(227,820,227,895,"#ddd8c1",2);
 line(130,857,325,857,"#ddd8c1",2);

 // Жилые дома: плоская крыша, торцы, подъезды, ряды окон.
 for(const b of m.buildings){
  rect(b.x+13,b.y+15,b.w,b.h,"#3a4245");
  rect(b.x+7,b.y+8,b.w,b.h,"#697174");
  rect(b.x,b.y,b.w,b.h,b.wall);
  rect(b.x+5,b.y+5,b.w-10,34,b.roof);
  rect(b.x+5,b.y+39,b.w-10,5,"#20282b");

  const cols=Math.max(3,Math.floor((b.w-34)/43));
  const rows=b.kind==="low"?1:Math.max(2,Math.floor((b.h-62)/34));
  const gap=(b.w-32)/cols;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   const wx=b.x+16+c*gap,wy=b.y+52+r*34;
   rect(wx,wy,25,21,"#172a2e");
   rect(wx+3,wy+3,19,15,"#3f7c82");
   line(wx+12.5,wy+3,wx+12.5,wy+18,"#173c42",1);
   if((r+c)%3===0)rect(wx+4,wy+4,7,3,"#a3c2bd");
  }

  // Подъезды.
  const doors=Math.max(1,Math.floor(b.w/105));
  for(let d=0;d<doors;d++){
   const dx=b.x+(d+0.5)*b.w/doors;
   rect(dx-15,b.y+b.h-32,30,32,"#d6d1c4");
   rect(dx-10,b.y+b.h-28,20,28,"#543e2c");
   rect(dx-12,b.y+b.h-3,24,3,"#999995");
  }

  // Вентиляционные/технические блоки.
  rect(b.x+b.w-42,b.y+12,25,13,"#303b3d");
  rect(b.x+b.w-37,b.y+8,15,5,"#788486");
 }

 // Машины — маленькие гражданские силуэты, распределённые по парковкам и дворам.
 const cars=[
  [250,265,1,"#7a3f3f"],[455,270,-1,"#49606b"],[845,265,1,"#8a7445"],[1260,265,-1,"#52636a"],
  [340,545,1,"#596c54"],[520,548,-1,"#7a5544"],[825,548,1,"#5c6475"],[1225,548,-1,"#7b6845"],
  [350,790,1,"#56666a"],[540,805,-1,"#7b4c45"],[1080,790,1,"#5c6d5c"],[1320,820,-1,"#6e5b68"],
  [430,1010,1,"#6d6349"],[900,1010,-1,"#4f6269"],[1210,950,1,"#765448"]
 ] as [number,number,number,string][];
 for(const [x,y,dir,color] of cars){
  ctx!.save();ctx!.translate(x,y);if(dir<0)ctx!.scale(-1,1);
  rect(-23,-10,46,20,"#263034");
  rect(-17,-15,28,8,"#34474b");
  rect(-12,-12,11,5,color);rect(2,-12,10,5,"#5f8186");
  rect(-18,7,8,6,"#151a1c");rect(12,7,8,6,"#151a1c");
  rect(21,-4,3,6,"#d2c46f");rect(-24,-4,3,6,"#8c4a3e");
  ctx!.restore();
 }

 // Деревья: нерегулярная сетка, чтобы двор не выглядел процедурным.
 const trees=[
  [28,35],[345,25],[585,85],[760,25],[1080,25],[1460,30],
  [30,275],[330,275],[575,275],[785,275],[1070,275],[1460,275],
  [25,545],[300,540],[570,535],[765,535],[1055,535],[1460,535],
  [25,770],[360,770],[585,770],[760,760],[1045,760],[1460,760],
  [30,955],[325,950],[585,950],[760,950],[1060,945],[1450,945],
  [30,1140],[620,1120],[750,1140],[1080,1140],[1450,1140]
 ];
 for(const [x,y] of trees){
  ellipse(x+5,y+34,22,6,"rgba(25,45,25,.28)");
  rect(x-4,y+10,8,27,"#68442c");
  ellipse(x,y,25,19,"#2c783f");
  ellipse(x-14,y-7,17,15,"#3b8b4a");
  ellipse(x+14,y-6,17,15,"#347f43");
  rect(x-9,y-22,18,4,"#4e9a51");
 }

 // Скамейки, урны, фонари и остановочный павильон.
 const lamps=[[575,375],[770,375],[575,540],[770,540],[575,780],[770,780],[1060,780]];
 for(const [x,y] of lamps){
  rect(x-2,y-22,4,25,"#333a3b");
  rect(x-8,y-27,16,5,"#252b2d");
  rect(x-5,y-31,10,4,"#dfc96e");
 }
 const benches=[[405,215],[875,215],[405,765],[1040,765],[375,945],[895,945]];
 for(const [x,y] of benches){
  rect(x,y,40,5,"#70482e");rect(x+4,y+7,5,12,"#4a3a2d");rect(x+31,y+7,5,12,"#4a3a2d");
 }
 const bins=[[395,235],[900,235],[395,750],[1020,750],[350,935],[920,935]];
 for(const [x,y] of bins)rect(x,y,9,12,"#394447");

 // Небольшой остановочный павильон — гражданская деталь квартала.
 rect(1370,340,72,44,"#4b5658");
 rect(1376,346,60,30,"#9da9a4");
 rect(1380,350,52,22,"#6d8585");
 rect(1372,380,68,5,"#31393a");
 rect(1390,365,10,4,"#e3d8a3");
 rect(1412,365,10,4,"#e3d8a3");

 // Подпись уровня — ориентир, а не навигационная точка.
 tx("ГВАРДЕЙСКИЙ КВАРТАЛ",750,24,18,"#f0eee7","center");
 tx("ЖИЛОЙ МАССИВ",750,46,11,"#c4c9c7","center");
}
function drawWorld(m:Mission){
 if(!ctx)return;
 const map=topDownMap(),scale=Math.max(.78,Math.min(1.35,Math.min(viewWidth/430,viewHeight/820)));
 const camX=clamp(player.x-viewWidth/(2*scale),0,map.w-viewWidth/scale);
 const camY=clamp(player.y-viewHeight/(2*scale),0,map.h-viewHeight/scale);
 ctx.save();ctx.scale(scale,scale);ctx.translate(-camX,-camY);
 drawTopDownBackground();
 const [exitX,exitY]=topDownExit();
 rect(exitX-24,exitY-24,48,48,"#151d21");rect(exitX-17,exitY-17,34,34,hero().color);
 tx("ВЫХОД",exitX,exitY-38,14,"#f0eee7","center");
 enemies.forEach(drawEnemy);drawPlayer();
 bullets.forEach(b=>{rect(b.x-3,b.y-3,Math.max(6,portraitScale()*4),Math.max(4,portraitScale()*3),b.from==="player"?hero().color:"#d86c35");});
 ctx.restore();drawHudOverlay(m);drawSpeech();
 if(flash>0){rect(0,0,viewWidth,viewHeight,"rgba(255,255,255,"+Math.min(.18,flash)+")");flash-=.02;}
}
function enemyVisual(type:EnemyType):MafiaVisual{
 const suits:Record<EnemyType,string>={brawler:"#30242a",shooter:"#26323a",heavy:"#40352a",rusher:"#3a2024",guard:"#28342e",sniper:"#302a40",suppressor:"#403323",flanker:"#26313d"};
 const ties:Record<EnemyType,string>={brawler:"#b94f46",shooter:"#6d8790",heavy:"#c58b48",rusher:"#a94c42",guard:"#68776f",sniper:"#75658d",suppressor:"#9b7546",flanker:"#6d7e92"};
 return {face:"#9a6554",tie:ties[type],suit:suits[type]};
}
function drawEnemy(e:Enemy){
 const v=enemyVisual(e.type),sc=Math.max(.32,Math.min(.42,viewWidth/1700));
 drawMafiaMember(v,e.x,e.y,frame,sc);
 if(!e.falling){
   const bw=30*sc;
   rect(e.x-bw/2,e.y-82*sc,bw,3*sc,"#20282c");
   rect(e.x-bw/2,e.y-82*sc,bw*clamp(e.hp/e.maxHp,0,1),3*sc,v.tie);
 }
}
function drawPlayer(){
 const x=player.x,y=player.y,sc=Math.max(.38,Math.min(.50,viewWidth/1450));
 drawMafiaMember(heroVisual(),x,y,frame,sc);

 // Игровой предмет всегда начинается именно от кисти персонажа.
 const handX=x+player.facing*29*sc;
 const handY=y-44*sc;
 const muzzleX=handX+Math.cos(aimAngle)*28*sc;
 const muzzleY=handY+Math.sin(aimAngle)*28*sc;
 line(handX,handY,muzzleX,muzzleY,"#9ba3a5",Math.max(3,4*sc));

 if(player.ability>0)tx(hero().ability,x,y-104*sc,Math.max(11,7*sc),hero().color,"center");
}
function spawnFloor(){
 floorTimer=0;objectiveProgress=0;bullets=[];enemies=[];
 const types=currentMission().enemies;
 const spots=[[450,410],[500,560],[820,300],[1040,410],[520,760],[1010,720],[250,420],[1180,360]];
 for(let i=0;i<Math.min(spots.length,2+floor+2);i++){
  const type=types[i%types.length],hp=18+(i%3)*12+(save.rank*3),[x,y]=spots[i];
  enemies.push({type,x,y,hp,maxHp:hp,vx:0,vy:0,cool:30+i*9,shootCool:70+i*13,dir:i%2?1:-1});
 }
 player={x:420,y:400,vx:0,vy:0,hp:100+save.armor*5,maxHp:100+save.armor*5,armor:save.armor*5,ammo:weapons[save.weapon].mag,cool:0,ability:0,weaponSwap:0,facing:1,grounded:true};
}
function fire(){
 if(mode!=="play"||player.cool>0)return;
 const w=weapons[save.weapon];
 if(player.ammo<=0){player.ammo=w.mag;player.cool=12;return;}
 player.ammo--;player.cool=w.rate;
 const scale=portraitScale();
 const speed=7*scale;
 const handX=player.x+player.facing*29*scale;
 const handY=player.y-44*scale;
 bullets.push({x:handX,y:handY,vx:Math.cos(aimAngle)*speed,vy:Math.sin(aimAngle)*speed,from:"player",life:100});
}
function switchWeapon(){
 if(mode!=="play"||player.weaponSwap>0)return;
 save.weapon=(save.weapon+1)%weapons.length;
 player.ammo=weapons[save.weapon].mag;
 player.weaponSwap=120;
 storeSave();
}
function useAbility(){
 if(mode!=="play"||player.ability>0)return;
 player.ability=300;
 const h=hero().id;
 if(h==="antonio"){
   enemies.forEach(e=>{e.cool=Math.max(e.cool,110);e.shootCool=Math.max(e.shootCool,110);});
 }else if(h==="massimo"){
   player.vx=player.facing*10;
   player.vy=-6.5*portraitScale();
 }else if(h==="salvatore"){
   enemies.forEach(e=>{e.vx*=.15;e.shootCool=Math.max(e.shootCool,150);});
 }else if(h==="giuseppe"){
   player.armor=Math.max(player.armor,player.maxHp*.35);
 }
}
function hurt(amount:number){
 const blocked=Math.min(player.armor,amount*.5);player.armor-=blocked;player.hp-=amount-blocked;flash=.15;
 if(player.hp<=0){player.hp=player.maxHp;player.armor=save.armor*5;spawnFloor();}
}

function update(dt:number){
 frame++;speechCooldown=Math.max(0,speechCooldown-dt);if(speech)speech.timer-=dt;
 if(mode==="play"&&frame%420===0){const lines=heroLines[selected||"antonio"];say(lines[Math.floor(Math.random()*lines.length)],"player",player.x,player.y-45);}
 player.cool=Math.max(0,player.cool-dt);player.ability=Math.max(0,player.ability-dt);player.weaponSwap=Math.max(0,player.weaponSwap-dt);
 const scale=Math.max(.78,Math.min(1.35,Math.min(viewWidth/430,viewHeight/820))),speed=3.2*scale;
 if(Math.abs(moveX)>.12||Math.abs(moveY)>.12){
  const len=Math.hypot(moveX,moveY)||1,moved=moveTopDown(player.x,player.y,(moveX/Math.max(1,len))*speed,(moveY/Math.max(1,len))*speed,18*scale);
  player.x=moved[0];player.y=moved[1];
  if(Math.abs(moveX)>.12)player.facing=moveX<0?-1:1;
 }
 if(mode==="play")fire();if(touch.ability)useAbility();
 for(const b of bullets){b.x+=b.vx;b.y+=b.vy;b.life-=dt;if(b.from==="enemy"&&Math.abs(b.x-player.x)<18*scale&&Math.abs(b.y-player.y)<24*scale){b.life=0;hurt(7);}}
 bullets=bullets.filter(b=>b.life>0&&b.x>-30&&b.x<topDownMap().w+30&&b.y>-30&&b.y<topDownMap().h+30);
 for(const e of enemies){
  if(e.falling){e.vy+=.5*scale*dt;e.y+=e.vy*dt;continue;}
  e.cool-=dt;e.shootCool-=dt;
  const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy)||1;
  if(e.type==="rusher"||e.type==="brawler"||e.type==="flanker"){
   const q=moveTopDown(e.x,e.y,dx/dist*(e.type==="rusher"?1:.55)*scale,dy/dist*(e.type==="rusher"?1:.55)*scale,15*scale);e.x=q[0];e.y=q[1];
  }else if(dist<260*scale){
   const q=moveTopDown(e.x,e.y,dx/dist*.22*scale,dy/dist*.22*scale,15*scale);e.x=q[0];e.y=q[1];
  }
  if((e.type==="shooter"||e.type==="sniper"||e.type==="suppressor")&&e.shootCool<=0){
   e.shootCool=e.type==="suppressor"?28:65;
   bullets.push({x:e.x,y:e.y,vx:dx/dist*3.2*scale,vy:dy/dist*3.2*scale,from:"enemy",life:110});
  }
  if(dist<30*scale&&e.cool<=0){e.cool=55;hurt(e.type==="heavy"?12:7);say(enemyLines[Math.floor(Math.random()*enemyLines.length)],"enemy",e.x,e.y-35);}
 }
 for(const b of bullets)if(b.from==="player")for(const e of enemies)if(!e.falling&&Math.abs(b.x-e.x)<22*scale&&Math.abs(b.y-e.y)<24*scale){
  e.hp-=weapons[save.weapon].damage;b.life=0;if(e.hp<=0){e.falling=true;e.vy=-4.5*scale;save.money+=25;save.xp+=18;}
 }
 enemies=enemies.filter(e=>!e.falling||e.y<topDownMap().h+80);if(enemies.length===0)objectiveProgress=1;
 floorTimer+=dt;
 const [exitX,exitY]=topDownExit(),m=currentMission(),reachedExit=Math.hypot(player.x-exitX,player.y-exitY)<42*scale;
 const objectiveDone=m.objective==="reach"?reachedExit:objectiveProgress>=1||(m.objective==="survive"&&floorTimer>900);
 if(objectiveDone){if(floor<2){floor++;if(selected){save.resumeFloor={...(save.resumeFloor||{}),[selected]:floor};storeSave();}spawnFloor();}else completeMission();}
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
function startMissionById(id:string){
 const i=allMissions.findIndex(m=>m.id===id);if(i<0)return;
 missionIndex=i;const m=allMissions[i];
 if(m.hero!=="shared")selected=m.hero;
 save.hero=selected;
 save.storySeen=save.storySeen||{};
 if(selected)save.storySeen[selected]=true;
 floor=0;dialogueIndex=0;dialogueOpen=false;mode="play";
 spawnFloor();saveResumeState();storeSave();render();
}
function returnToMainMenu(){touch={left:false,right:false,jump:false,ability:false};movePointerId=null;moveX=0;moveY=0;aimActive=false;aimPointerId=null;mode="select";dialogueOpen=false;render();}
function activateCheatAll(){save.completed=allMissions.map(m=>m.id);save.money=999999;save.xp=999999;save.rank=rankNames.length-1;save.storySeen={antonio:true,massimo:true,salvatore:true,giuseppe:true};storeSave();mode="levels";dialogueOpen=false;render();}

function renderCanvas(){
 if(!ctx)return;
 resizeCanvas();
 const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,viewWidth,viewHeight);
 ctx.imageSmoothingEnabled=false;
 const m=currentMission();
 if(mode==="play"){
   // Игровой мир уже полностью рассчитывается в реальных portrait-координатах
   // текущего viewport. Старый масштаб 640x448 здесь больше не применяется.
   drawWorld(m);return;
 }
 if(mode==="select"){drawSelect();return;}
 if(mode==="levels"){drawLevels();return;}
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
 const c=ctx;if(!c)return;
 const ids:HeroId[]=["antonio","massimo","salvatore","giuseppe"];
 const padX=viewWidth*.06,gapX=viewWidth*.04;
 const top=viewHeight*.17,gridH=viewHeight*.55,gapY=viewHeight*.018;
 const cardW=(viewWidth-padX*2-gapX)/2;
 const cardH=(gridH-gapY)/2;
 tx("ЧЕТЫРЕ СЫРА, МАЦЕРАРИЙ",viewWidth/2,viewHeight*.045,menuTextSize(.038,24,36),"#f0eee7","center");
 tx("ВЫБЕРИТЕ ПЕРСОНАЖА",viewWidth/2,viewHeight*.105,menuTextSize(.022,15,20),"#8e999d","center");
 ids.forEach((id,i)=>{
   const h=heroes[id],col=i%2,row=Math.floor(i/2);
   const x=padX+col*(cardW+gapX),y=top+row*(cardH+gapY),a=id===selected;
   rect(x,y,cardW,cardH,a?"#151d21":"#0b1013");
   rect(x,y,cardW,4,a?h.color:"#263137");

   // Карточка имеет жёсткие независимые зоны: заголовок → имя → персонаж → описание → способность.
   tx(h.family.toUpperCase(),x+cardW/2,y+18,menuTextSize(.014,11,16),a?"#f0eee7":"#aeb5b7","center");
   tx(h.name,x+cardW/2,y+44,menuTextSize(.018,13,20),h.color,"center");

   // Полная фигура живёт в собственной зоне: голова не режется клипом, ноги не уходят в описание.
   const avatarTop=y+cardH*.25;
   const avatarBottom=y+cardH*.76;
   const avatarZoneH=avatarBottom-avatarTop;
   const artScale=Math.max(.90,Math.min(1.08,cardW/270));
   const spin=performance.now()/1000*.42+i*.8;
   const spinX=.72+.28*Math.abs(Math.cos(spin));
   c.save();
   c.beginPath();
   c.rect(x+8,avatarTop,cardW-16,avatarZoneH);
   c.clip();
   c.translate(x+cardW/2,avatarBottom);
   c.scale(spinX,1);
   drawMafiaMember({face:h.face,tie:h.color,suit:"#20262b"},0,0,frame+i*4,artScale);
   c.restore();

   tx(familyText[h.family].desc,x+cardW/2,y+cardH*.84,menuTextSize(.011,8,13),h.color,"center");
   tx(h.ability,x+cardW/2,y+cardH*.92,menuTextSize(.010,8,12),"#aab1b4","center");
 });
}
function drawLevels(){
 rect(0,0,viewWidth,viewHeight,"#07090b");
 tx("ВЫБОР УРОВНЯ",viewWidth/2,viewHeight*.045,menuTextSize(.04,26,38),"#f0eee7","center");
 tx("ИСТОРИЯ · ЦЕЛЬ · ЭТАЖИ · НАГРАДА",viewWidth/2,viewHeight*.085,menuTextSize(.015,11,17),"#7e898d","center");
}
function drawFamily(){
 const h=hero();
 rect(0,0,viewWidth,viewHeight,"#07090b");
 const title=menuTextSize(.04,28,38);
 const familySize=menuTextSize(.052,34,52);
 const nameSize=menuTextSize(.028,20,30);
 tx("ИСТОРИЯ СЕМЬИ",viewWidth/2,viewHeight*.055,title,h.color,"center");
 tx(h.family.toUpperCase(),viewWidth/2,viewHeight*.135,familySize,"#f0eee7","center");
 tx(h.name,viewWidth/2,viewHeight*.205,nameSize,"#aab1b4","center");

 const maxChars=Math.max(25,Math.floor(viewWidth/14.5));
 const bodySize=menuTextSize(.025,18,26);
 const bodyLine=bodySize*1.38;
 const smallSize=menuTextSize(.022,16,23);
 const smallLine=smallSize*1.38;
 let y=viewHeight*.285;

 const introRows=drawWrapped(familyText[h.family].intro,viewWidth/2,y,maxChars,bodyLine,bodySize,"#f0eee7","center");
 y+=introRows*bodyLine+viewHeight*.055;

 const bioRows=drawWrapped(h.bio,viewWidth/2,y,maxChars,smallLine,smallSize,"#c2c7c8","center");
 y+=bioRows*smallLine+viewHeight*.06;

 tx("СПОСОБНОСТЬ · "+h.ability,viewWidth/2,y,menuTextSize(.025,18,26),h.color,"center");
 y+=menuTextSize(.025,18,26)*1.8;
 drawWrapped(h.abilityDesc,viewWidth/2,y,maxChars,smallLine,smallSize,"#aab1b4","center");
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
 const bubbleW=viewWidth*.86,bubbleH=Math.min(viewHeight*.25,260),bx=(viewWidth-bubbleW)/2,by=viewHeight*.68;
 const speaker=speakerRu(d.speaker),accent=hero().color;
 rect(bx,by,bubbleW,bubbleH,"#f0eee7");
 rect(bx+4,by+4,bubbleW-8,bubbleH-8,"#101518");
 // Хвост комикса.
 const tailX=d.speaker===hero().name?bx+bubbleW*.72:bx+bubbleW*.24;
 poly([tailX-18,by+bubbleH,tailX,by+bubbleH+Math.min(34,viewHeight*.025),tailX+12,by+bubbleH],"#101518");
 rect(bx,by,bubbleW,5,accent);
 tx(speaker,bx+22,by+30,menuTextSize(.024,17,27),accent,"left");
 drawWrapped(d.text,bx+22,by+72,Math.max(25,Math.floor(viewWidth/17)),menuTextSize(.026,19,30),menuTextSize(.028,20,32),"#f0eee7","left");
 tx("ТАП",bx+bubbleW-22,by+bubbleH-18,menuTextSize(.016,11,17),"#8e999d","right");
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
   if(a==="menu"){returnToMainMenu();}
   if(a==="levels"){mode="levels";dialogueOpen=false;render();}
   if(a==="cheat"){activateCheatAll();}
   if(a==="level"){startMissionById(el.dataset.level||"");}
   if(a==="advance"){advanceDialogue();render();}
   if(a==="shop"){mode="shop";render();}
   if(a==="swap")switchWeapon();
   if(a==="special")useAbility();
 });
 root?.querySelectorAll<HTMLElement>("[data-touch]").forEach(el=>{const k=el.dataset.touch as keyof typeof touch;const on=(v:boolean)=>{touch[k]=v;};el.addEventListener("pointerdown",e=>{e.preventDefault();on(true)});["pointerup","pointercancel","pointerleave"].forEach(ev=>el.addEventListener(ev,()=>on(false)));});
 const moveSensor=root?.querySelector<HTMLElement>(".mafia-touch-move");
 if(moveSensor){
   const updateMove=(e:PointerEvent)=>{
     const r=moveSensor.getBoundingClientRect();
     const dx=(e.clientX-(r.left+r.width/2))/(r.width*.42);
     const dy=(e.clientY-(r.top+r.height/2))/(r.height*.42);
     moveX=Math.max(-1,Math.min(1,dx));moveY=Math.max(-1,Math.min(1,dy));
     const stick=moveSensor.querySelector<HTMLElement>(".mafia-touch-stick");
     if(stick)stick.style.transform='translate('+Math.max(-34,Math.min(34,dx*34))+'px,'+Math.max(-34,Math.min(34,dy*34))+'px)';
   };
   const stopMove=(e:PointerEvent)=>{if(e.pointerId===movePointerId){movePointerId=null;moveX=0;moveY=0;touch.jump=false;const stick=moveSensor.querySelector<HTMLElement>(".mafia-touch-stick");if(stick)stick.style.transform='translate(0,0)';}};
   moveSensor.addEventListener("pointerdown",e=>{e.preventDefault();movePointerId=e.pointerId;moveSensor.setPointerCapture(e.pointerId);updateMove(e);});
   moveSensor.addEventListener("pointermove",e=>{if(e.pointerId===movePointerId)updateMove(e);});
   moveSensor.addEventListener("pointerup",stopMove);moveSensor.addEventListener("pointercancel",stopMove);
 }
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
 const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
 const pw=Math.round(w*dpr),ph=Math.round(h*dpr);
 if(canvas.width!==pw||canvas.height!==ph){
   canvas.width=pw;canvas.height=ph;
   canvas.style.width=w+"px";canvas.style.height=h+"px";
 }
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.imageSmoothingEnabled=false;
 viewWidth=w;viewHeight=h;
}
function render(){
 if(!root)return;
 root.innerHTML='<div class="freezzz-mafia-frame">'+(mode==="select"?'<video class="mafia-menu-live-bg" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>':mode==="play"?'<video class="mafia-level-bg" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>':"")+'<canvas class="freezzz-mafia-canvas"></canvas><div class="freezzz-mafia-ui"></div></div>';
 if(mode==="select"){
   const bg=root.querySelector<HTMLVideoElement>(".mafia-menu-live-bg");
   if(bg){bg.src=portalVideoUrl("live");bg.play().catch(()=>{});}
 }else if(mode==="play"){
   const bg=root.querySelector<HTMLVideoElement>(".mafia-level-bg");
   if(bg){bg.src=portalVideoUrl("library");bg.play().catch(()=>{});}
 }
 canvas=root.querySelector("canvas");ctx=canvas?.getContext("2d")||null;
 resizeCanvas();
 const ui=root.querySelector<HTMLElement>(".freezzz-mafia-ui")!;
 if(mode==="select"){
   ui.innerHTML='<div class="mafia-select-grid">'+(["antonio","massimo","salvatore","giuseppe"] as HeroId[]).map(id=>'<button class="'+(id===selected?"selected":"")+'" aria-label="Выбрать '+heroes[id].name+'" data-hero="'+id+'"></button>').join("")+'</div><div class="mafia-menu-actions"><button data-action="play" '+(selected?"":"disabled")+'>ИГРАТЬ</button><button data-action="exit">ВЫХОД</button><button data-action="levels">УРОВНИ</button><button data-action="cheat">ЧИТ: ВСЁ</button></div>';
 }else if(mode==="family"){
   ui.innerHTML='<div class="mafia-action"><button data-action="menu">ГЛАВНОЕ МЕНЮ</button><button data-action="advance">ПРОПУСТИТЬ</button></div>';
 }else if(mode==="levels"){
   const cards=allMissions.map((m)=>{
     const accent=m.hero==="shared"?"#f0eee7":heroes[m.hero].color;
     const owner=m.hero==="shared"?"ОБЩАЯ МИССИЯ":heroes[m.hero].family.toUpperCase()+" · "+heroes[m.hero].name;
     const done=save.completed.includes(m.id);
     const floors=m.floors.map((f,n)=>'<span><b>'+String(n+1)+'</b> '+floorRu(f)+'</span>').join("");
     return '<button class="mafia-level-card '+(done?"completed":"")+'" data-action="level" data-level="'+m.id+'" style="--level-accent:'+accent+'">'+
       '<div class="mafia-level-head"><strong>'+String(m.number).padStart(2,"0")+'</strong><div><b>'+esc(m.ru)+'</b><small>'+esc(owner)+'</small></div><i>'+(done?"✓":"")+'</i></div>'+
       '<div class="mafia-level-meta"><span>ЦЕЛЬ</span><b>'+esc(objectiveRu(m.objective))+'</b></div>'+
       '<div class="mafia-level-floors">'+floors+'</div>'+
       '<div class="mafia-level-footer"><span>НАГРАДА $'+m.reward+'</span><span>'+m.xp+' XP</span><span>3 ЭТАЖА</span></div>'+
       '</button>';
   }).join("");
   ui.innerHTML='<div class="mafia-levels-panel">'+cards+'</div><div class="mafia-levels-bottom"><button data-action="menu">ГЛАВНОЕ МЕНЮ</button><button data-action="cheat">ЧИТ: ВСЁ</button></div>';
 }else if(mode==="play"){
   ui.innerHTML='<div class="mafia-touch-move" aria-label="Сенсор движения"><span class="mafia-touch-stick"></span></div><div class="mafia-combat-buttons"><button data-action="swap">СМЕНА</button><button data-action="special">СПЕЦ</button></div><div class="mafia-aim-sensor" aria-label="Сенсор стрельбы"><span class="mafia-aim-ring"></span><span class="mafia-aim-dot"></span></div><div class="mafia-game-menu"><button data-action="shop">МАГАЗИН</button><button data-action="menu">МЕНЮ</button></div>';
 }else{
   ui.innerHTML='<div class="mafia-action"><button data-action="menu">ГЛАВНОЕ МЕНЮ</button><button data-action="advance">'+(dialogueOpen?"ПРОДОЛЖИТЬ":mode==="shop"?"НАЗАД":"НАЧАТЬ / ПРОДОЛЖИТЬ")+'</button></div>';
 }
 bindButtons();renderCanvas();
}
function updateCombatButtonLabels(){
 if(!root||mode!=="play")return;
 const swap=root.querySelector<HTMLElement>('[data-action="swap"]');
 const special=root.querySelector<HTMLElement>('[data-action="special"]');
 if(swap)swap.textContent=player.weaponSwap>0?"СМЕНА "+(player.weaponSwap/60).toFixed(1):"СМЕНА";
 if(special)special.textContent=player.ability>0?"СПЕЦ "+(player.ability/60).toFixed(1):"СПЕЦ";
}
function loop(t:number){const dt=Math.min(2,(t-last)/16.67||1);last=t;if(mode==="play"){update(dt);updateCombatButtonLabels();}renderCanvas();raf=requestAnimationFrame(loop);}
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

