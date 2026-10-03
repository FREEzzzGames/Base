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
  // Главная магистраль и центральная улица.
  {x:0,y:392,w:1500,h:124},
  {x:598,y:0,w:126,h:1180},
  // Нижние внутриквартальные дороги — узкие, чтобы оставить полноценные дворы.
  {x:0,y:900,w:598,h:54},
  {x:724,y:900,w:776,h:54},
  // Северные подъезды.
  {x:82,y:205,w:516,h:68},
  {x:724,y:205,w:776,h:68},
  // Средние внутриквартальные улицы.
  {x:72,y:505,w:526,h:62},
  {x:724,y:676,w:776,h:72},
  {x:1275,y:505,w:225,h:30}
 ];
 const buildings=[
  // Северный фронт.
  {x:28,y:24,w:290,h:150,roof:"#4d595d",wall:"#30383b",kind:"panel"},
  {x:338,y:32,w:205,h:142,roof:"#555f62",wall:"#403b39",kind:"brick"},
  {x:770,y:26,w:286,h:148,roof:"#4b575b",wall:"#30383b",kind:"panel"},
  {x:1082,y:38,w:230,h:136,roof:"#555e61",wall:"#3e3a37",kind:"brick"},
  {x:1338,y:58,w:130,h:118,roof:"#4c585c",wall:"#30383b",kind:"panel"},

  // Западный двор: дома образуют карман вокруг детской площадки.
  {x:30,y:292,w:250,h:82,roof:"#596467",wall:"#41494b",kind:"school"},
  {x:304,y:286,w:226,h:88,roof:"#505b5e",wall:"#393f41",kind:"low"},
  {x:48,y:580,w:270,h:158,roof:"#4b585c",wall:"#30383b",kind:"panel"},
  {x:344,y:580,w:194,h:170,roof:"#525d61",wall:"#403b39",kind:"brick"},

  // Гаражная линия за нижней дорогой.
  {x:34,y:966,w:238,h:42,roof:"#555f62",wall:"#4a4039",kind:"garage"},
  {x:300,y:958,w:238,h:48,roof:"#505b5e",wall:"#473e38",kind:"garage"},

  // Восточный двор.
  {x:758,y:292,w:272,h:82,roof:"#535e61",wall:"#3a4143",kind:"low"},
  {x:1058,y:286,w:210,h:86,roof:"#4f5a5e",wall:"#383f42",kind:"low"},
  {x:1298,y:290,w:170,h:82,roof:"#555f62",wall:"#3a4143",kind:"low"},
  {x:760,y:540,w:252,h:126,roof:"#4b585c",wall:"#30383b",kind:"panel"},
  {x:1038,y:540,w:230,h:126,roof:"#505b60",wall:"#403b39",kind:"brick"},
  {x:1290,y:540,w:178,h:126,roof:"#4c595d",wall:"#30383b",kind:"panel"},

  // Восточная гаражная линия.
  {x:760,y:958,w:242,h:48,roof:"#555f62",wall:"#4a4039",kind:"garage"},
  {x:1030,y:954,w:238,h:52,roof:"#505b60",wall:"#473e38",kind:"garage"},
  {x:1292,y:950,w:176,h:42,roof:"#535e61",wall:"#4a4039",kind:"garage"},

  // Южный фронт — оставлен отдельным от гаражей и дворов.
  {x:30,y:1018,w:280,h:142,roof:"#4d595d",wall:"#30383b",kind:"panel"},
  {x:330,y:1010,w:216,h:150,roof:"#525d60",wall:"#403b39",kind:"brick"},
  {x:760,y:1018,w:270,h:142,roof:"#4d595d",wall:"#30383b",kind:"panel"},
  {x:1052,y:1008,w:220,h:152,roof:"#505b60",wall:"#403b39",kind:"brick"},
  {x:1294,y:1000,w:174,h:160,roof:"#4c595d",wall:"#30383b",kind:"panel"}

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
function drawFacadeWindow(x:number,y:number,w:number,h:number,variant:number){
  // Более реалистичное стекло: рама, отражение, внутреннее затемнение и лёгкая грязь.
  rect(x-1,y-1,w+2,h+2,"#1b2325");
  rect(x,y,w,h,variant%3===0?"#b7b7ae":variant%3===1?"#9fa6a4":"#777f80");
  rect(x+3,y+3,w-6,h-6,variant%4===0?"#6f9697":variant%4===1?"#496d72":"#52666a");
  rect(x+5,y+5,Math.max(2,w-12),Math.max(2,h*.24),"rgba(225,235,228,.28)");
  line(x+w*.5,y+2,x+w*.5,y+h-2,"#304548",1);
  if(h>16)line(x+2,y+h*.58,x+w-2,y+h*.58,"#304548",1);
  if(variant%5===0)rect(x+4,y+h-5,Math.max(3,w-8),2,"rgba(35,42,42,.34)");
  if(variant%7===0)rect(x+6,y+7,4,3,"rgba(245,244,232,.45)");
}

function drawSovietBuilding(b:{x:number;y:number;w:number;h:number;roof:string;wall:string;kind:string},index:number){
  const isLow=b.kind==="low",isSchool=b.kind==="school",isGarage=b.kind==="garage";
  const type=index%6;

  // Глубокая тень и цоколь дают зданию массу, а не вид плоского квадрата.
  rect(b.x+16,b.y+18,b.w,b.h,"#293033");
  rect(b.x+9,b.y+10,b.w,b.h,"#596264");
  rect(b.x,b.y,b.w,b.h,b.wall);
  rect(b.x+4,b.y+4,b.w-8,Math.min(26,b.h*.22),b.roof);
  rect(b.x+4,b.y+Math.min(27,b.h-12),b.w-8,5,"#252d2f");
  rect(b.x+5,b.y+b.h-12,b.w-10,12,"#252b2d");
  // Случайные пятна ремонта, потёки и выцветшие панели.
  for(let p=0;p<Math.floor(b.w/95);p++){
    const px=b.x+18+p*83+(index*11)%17;
    const ph=Math.min(22,b.h-55);
    const py=b.y+42+((p*29+index*17)%Math.max(1,ph));
    rect(px,py,18,5,"rgba(205,201,184,.10)");
    rect(px+2,py+5,12,12,"rgba(30,35,36,.10)");
  }
  for(let sx=b.x+28;sx<b.x+b.w-20;sx+=76){
    rect(sx,b.y+39,2,Math.max(12,b.h-58),"rgba(25,30,31,.14)");
  }

  if(isGarage){
    // Ряд старых гаражей: разные двери, ржавчина, козырёк и вентиляционные детали.
    rect(b.x,b.y,b.w,b.h,"#51483f");
    rect(b.x+4,b.y+4,b.w-8,b.h-8,"#6a6258");
    const doors=Math.max(2,Math.floor(b.w/52));
    const gap=b.w/doors;
    for(let d=0;d<doors;d++){
      const gx=b.x+d*gap+5;
      rect(gx,b.y+7,gap-10,b.h-11,d%4===0?"#4f4a46":d%4===1?"#68706e":d%4===2?"#5b4e45":"#74716a");
      rect(gx+2,b.y+9,gap-14,3,"rgba(220,205,176,.18)");
      rect(gx+4,b.y+b.h-14,Math.min(10,gap-18),3,"#302d2a");
      if(d%3===0)rect(gx+gap-16,b.y+12,4,10,"#9b6847");
    }
    rect(b.x+4,b.y+2,b.w-8,4,"#393735");
    for(let rx=b.x+18;rx<b.x+b.w;rx+=45)rect(rx,b.y-2,12,4,"#756d62");
    return;
  }

  if(isSchool){
    const cols=Math.max(7,Math.floor((b.w-34)/43));
    const gap=(b.w-32)/cols;
    for(let c=0;c<cols;c++){
      const wx=b.x+16+c*gap;
      drawFacadeWindow(wx,b.y+48,27,24,(c+index)%4);
    }
    // Центральный вход, козырёк и боковые входы.
    const cx=b.x+b.w*.5;
    rect(cx-32,b.y+b.h-38,64,38,"#d2cec1");
    rect(cx-24,b.y+b.h-33,48,33,"#4c392b");
    rect(cx-37,b.y+b.h-41,74,5,"#596467");
    rect(cx-8,b.y+b.h-29,16,29,"#76553b");
    rect(b.x+16,b.y+10,92,12,"#727b7d");
    tx("ШКОЛА",b.x+62,b.y+19,9,"#ddd9cf","center");
    // Флаг/мачта и хозяйственный блок.
    rect(b.x+b.w-30,b.y-12,3,18,"#4e5758");
    line(b.x+b.w-27,b.y-11,b.x+b.w-8,b.y-8,"#687476",1);
    return;
  }

  // Основной фасад. Каждая серия получает другой ритм секций.
  const cols=isLow?Math.max(4,Math.floor((b.w-30)/44)):Math.max(4,Math.floor((b.w-30)/44));
  const rows=isLow?1:Math.max(2,Math.floor((b.h-54)/31));
  const gap=(b.w-30)/cols;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const wx=b.x+15+c*gap;
      const wy=b.y+46+r*31;
      const pattern=(type+c+r*2)%7;

      if(pattern===1 || pattern===4){
        // Остеклённая лоджия.
        rect(wx-2,wy-2,30,25,"#283335");
        rect(wx,wy,26,20,"#566d70");
        rect(wx+2,wy+2,22,16,pattern===1?"#789596":"#4f676a");
        for(let k=1;k<4;k++)line(wx+2+k*5.5,wy+2,wx+2+k*5.5,wy+18,"#bdc3bd",1);
        rect(wx-2,wy+20,30,3,"#9b9b92");
      }else if(pattern===6 && !isLow){
        // Закрытый балкон.
        rect(wx-2,wy-2,31,25,"#303a3c");
        rect(wx,wy,27,20,"#708083");
        rect(wx+3,wy+3,21,14,"#4b686c");
        for(let k=1;k<5;k++)line(wx+3+k*4.2,wy+2,wx+3+k*4.2,wy+18,"#c0c4bd",1);
      }else{
        drawFacadeWindow(wx,wy,25,20,(pattern+index)%5);
      }

      // Случайные кондиционеры и бытовые детали.
      if((index+c*3+r*5)%17===0){
        rect(wx+20,wy+5,8,5,"#b4b5af");
        rect(wx+21,wy+4,6,2,"#d1d0c6");
      }
      if((index+c*7+r)%23===0){
        rect(wx+4,wy+22,18,2,"#7e5c43");
        rect(wx+7,wy+24,2,5,"#554438");
        rect(wx+19,wy+24,2,5,"#554438");
      }
    }
  }

  // Вертикальные швы панелей — ключевой признак типовой панели.
  if(b.kind==="panel"){
    for(let sx=b.x+gap;sx<b.x+b.w;sx+=gap){
      line(sx,b.y+43,sx,b.y+b.h-13,"#596163",1);
      line(sx+1,b.y+43,sx+1,b.y+b.h-13,"rgba(230,230,220,.18)",1);
    }
    for(let sy=b.y+45;sy<b.y+b.h-14;sy+=31)
      line(b.x+5,sy,b.x+b.w-5,sy,"rgba(30,36,38,.35)",1);
  }

  // Кирпичная серия: тонкая сетка кладки и более тёплые торцы.
  if(b.kind==="brick"){
    for(let yy=b.y+43;yy<b.y+b.h-13;yy+=9){
      const off=((yy-b.y)/9)%2?0:6;
      for(let xx=b.x+5+off;xx<b.x+b.w-5;xx+=12)
        rect(xx,yy,9,1,"rgba(130,110,85,.34)");
    }
  }

  // Подъезды. Они не повторяются идеально симметрично.
  const doors=Math.max(1,Math.floor(b.w/108));
  for(let d=0;d<doors;d++){
    const dx=b.x+(d+.5)*b.w/doors;
    const doorType=(index+d)%3;
    rect(dx-17,b.y+b.h-36,34,36,"#d0ccc0");
    rect(dx-11,b.y+b.h-31,22,31,doorType===0?"#4c382a":doorType===1?"#3d4748":"#594431");
    rect(dx-16,b.y+b.h-38,32,5,"#656e70");
    rect(dx-7,b.y+b.h-14,14,2,"#806b51");
    if(doorType===2){
      rect(dx-21,b.y+b.h-44,42,5,"#858b89");
      rect(dx-17,b.y+b.h-43,34,2,"#b2b1a8");
    }
  }

  // Крыша: парапет, венткамеры, трубы и телевизионные антенны.
  rect(b.x+7,b.y+2,b.w-14,3,"#303739");
  const vents=Math.max(1,Math.floor(b.w/145));
  for(let v=0;v<vents;v++){
    const vx=b.x+38+v*(b.w-76)/Math.max(1,vents-1);
    rect(vx,b.y-5,24,9,"#555f60");
    rect(vx+3,b.y-9,18,5,"#6c7576");
    rect(vx+7,b.y-13,3,6,"#4e5758");
    line(vx+10,b.y-12,vx+27,b.y-15,"#626c6d",1);
  }
  if(type===2||type===5){
    const ax=b.x+b.w*.72;
    rect(ax,b.y-18,2,14,"#4f595a");
    line(ax+2,b.y-16,ax+17,b.y-20,"#646d6d",1);
    line(ax+2,b.y-12,ax+17,b.y-8,"#646d6d",1);
  }
}

function drawTopDownBackground(){
 const m=topDownMap(),tile=30;
 rect(0,0,m.w,m.h,"#718b5d");

 // Земля: лёгкая неоднородность, без ощущения процедурной сетки.
 for(let y=0;y<m.h;y+=tile)for(let x=0;x<m.w;x+=tile){
  const q=((x/tile)*17+(y/tile)*11+floor*5)%29;
  if(q<4)rect(x+5,y+8,3,3,"#5f794f");
  if(q===9)rect(x+18,y+20,5,2,"#84996d");
  if(q===17)rect(x+12,y+25,2,2,"#557047");
 }

 // Магистрали и внутриквартальные улицы.
 for(const rd of m.roads){
  rect(rd.x,rd.y,rd.w,rd.h,"#c7c8c4");
  rect(rd.x+5,rd.y+5,rd.w-10,rd.h-10,"#777c7b");
  rect(rd.x+10,rd.y+10,rd.w-20,rd.h-20,"#454b4c");
  if(rd.w>rd.h){
    rect(rd.x+12,rd.y+rd.h*.5-2,rd.w-24,4,"#9c925b");
    for(let xx=rd.x+24;xx<rd.x+rd.w-24;xx+=70)rect(xx,rd.y+rd.h*.5-2,34,4,"#d6ca7b");
  }else{
    rect(rd.x+rd.w*.5-2,rd.y+12,4,rd.h-24,"#9c925b");
    for(let yy=rd.y+24;yy<rd.y+rd.h-24;yy+=70)rect(rd.x+rd.w*.5-2,yy,4,34,"#d6ca7b");
  }
 }

 // Тротуары.
 const sidewalks=[
  {x:0,y:385,w:1500,h:15},{x:0,y:516,w:1500,h:15},
  {x:588,y:0,w:15,h:1180},{x:724,y:0,w:15,h:1180},
  {x:0,y:842,w:610,h:15},{x:0,y:954,w:610,h:15},
  {x:105,y:197,w:505,h:13},{x:724,y:197,w:776,h:13},
  {x:724,y:669,w:776,h:13},{x:724,y:748,w:776,h:13},
  {x:170,y:500,w:440,h:12},{x:170,y:577,w:440,h:12}
 ];
 for(const q of sidewalks){
  rect(q.x,q.y,q.w,q.h,"#d7d7d2");
  for(let yy=q.y+2;yy<q.y+q.h;yy+=7)
    for(let xx=q.x+2;xx<q.x+q.w;xx+=27)
      rect(xx,yy,20,3,((xx+yy)/7)%2?"#b9bbb8":"#e5e3dc");
 }

 // Переходы.
 const crossings=[
  {x:540,y:398,w:42,h:116,vertical:true},
  {x:736,y:350,w:118,h:40,vertical:false},
  {x:736,y:850,w:118,h:40,vertical:false},
  {x:1110,y:510,w:118,h:40,vertical:false}
 ];
 for(const z of crossings){
  if(z.vertical)for(let yy=z.y;yy<z.y+z.h;yy+=16)rect(z.x,yy,z.w,8,"#e7e5de");
  else for(let xx=z.x;xx<z.x+z.w;xx+=16)rect(xx,z.y,8,z.h,"#e7e5de");
 }

 // Дворовые проезды.
 const lanes=[
  {x:292,y:225,w:58,h:155},{x:542,y:225,w:34,h:155},
  {x:1060,y:220,w:38,h:165},{x:292,y:748,w:58,h:125},
  {x:545,y:748,w:34,h:130},{x:1038,y:735,w:38,h:135},
  {x:1292,y:735,w:48,h:165},{x:650,y:792,w:78,h:165}
 ];
 for(const q of lanes){rect(q.x,q.y,q.w,q.h,"#9b9e99");rect(q.x+5,q.y+5,q.w-10,q.h-10,"#676b6a");}

 // Дворы, школа и спортзоны.
 rect(835,785,185,150,"#7e9a64");rect(850,800,155,120,"#73915c");rect(865,815,125,90,"#88a66c");
 rect(110,785,235,125,"#789363");rect(122,797,211,101,"#6e8958");
 rect(42,388,220,3,"#6f7a70"); // тонкий зелёный буфер перед магистралью

 // Ограждение школьного участка.
 const fenceX=18,fenceY=278,fenceW=560,fenceH=104;
 rect(fenceX,fenceY,fenceW,4,"#555e60");rect(fenceX,fenceY+fenceH-4,fenceW,4,"#555e60");
 for(let xx=fenceX;xx<=fenceX+fenceW;xx+=18)rect(xx,fenceY,3,fenceH,"#626b6d");
 rect(312,320,176,42,"#789062");rect(318,326,164,30,"#6c855b");line(400,326,400,356,"#d8d2bb",2);line(318,341,482,341,"#d8d2bb",2);rect(326,331,12,6,"#d8d2bb");rect(462,345,12,6,"#d8d2bb");

 // Архитектура — главный слой карты.
 for(let i=0;i<m.buildings.length;i++)drawSovietBuilding(m.buildings[i],i);

 // Дворовые композиции: советские площадки, стихийные тропинки и заросшие края.
 function drawYardPath(x:number,y:number,w:number,h:number){
   rect(x,y,w,h,"#b8a98a");
   rect(x+2,y+2,w-4,h-4,"#8c8977");
   for(let i=8;i<w-6;i+=15) rect(x+i,y+3+(i%7),8,2,"#c3b99f");
 }
 function drawBush(x:number,y:number,s:number){
   ellipse(x,y+10*s,15*s,10*s,"#315d38");
   ellipse(x-9*s,y,12*s,11*s,"#3b7040");
   ellipse(x+9*s,y+1*s,13*s,12*s,"#35673b");
   ellipse(x,y-7*s,12*s,10*s,"#477c45");
 }
 function drawPlayground(cx:number,cy:number,variant:number){
   // Песочная зона.
   rect(cx-68,cy+22,136,54,"#625a4d");
   rect(cx-63,cy+26,126,46,variant%2?"#c5aa72":"#c9b27b");
   rect(cx-58,cy+30,116,38,"#d1bb85");
   // Старая советская горка.
   rect(cx-53,cy-44,4,67,"#3e6265");
   rect(cx-35,cy-44,4,67,"#7a4940");
   rect(cx-53,cy-47,23,4,"#a56b3e");
   rect(cx-49,cy-39,18,3,"#5e7d81");
   for(let yy=cy-28;yy<cy-3;yy+=8)rect(cx-51,yy,19,3,"#4e5f61");
   poly([cx-31,cy-7,cx-4,cy-7,cx+19,cy+32,cx-8,cy+32],"#668a92");
   line(cx-27,cy-3,cx-2,cy-3,"#c2b6a0",2);
   // Качели.
   rect(cx+34,cy-39,4,63,"#466a6c");rect(cx+80,cy-39,4,63,"#466a6c");
   rect(cx+31,cy-42,56,5,"#a15d42");
   line(cx+45,cy-37,cx+45,cy+10,"#6c7775",2);line(cx+70,cy-37,cx+70,cy+10,"#6c7775",2);
   rect(cx+39,cy+10,12,5,"#7a493c");rect(cx+64,cy+10,12,5,"#7a493c");
   // Турник.
   rect(cx-88,cy-38,4,47,"#526d70");rect(cx-62,cy-38,4,47,"#526d70");
   rect(cx-90,cy-42,31,4,"#9b6641");
   for(let xx=cx-84;xx<cx-63;xx+=7)line(xx,cy-38,xx,cy-22,"#597276",2);
   // Карусель.
   ellipse(cx+8,cy+56,29,9,"#454d4d");
   ellipse(cx+8,cy+53,25,7,"#9a7848");
   rect(cx+6,cy+33,4,23,"#4f696c");
   line(cx-15,cy+49,cx+30,cy+49,"#546d70",2);
   line(cx-7,cy+40,cx+23,cy+57,"#546d70",2);
   line(cx+22,cy+40,cx-8,cy+57,"#546d70",2);
   // Лавка.
   rect(cx-88,cy+88,48,5,"#744a31");rect(cx-82,cy+94,5,12,"#4b3b30");rect(cx-47,cy+94,5,12,"#4b3b30");
   // Трещины и вытоптанные места.
   line(cx-62,cy+78,cx-37,cy+84,"#55534b",2);
   line(cx+45,cy+78,cx+70,cy+83,"#55534b",2);
 }
 // Два разных двора: не зеркальные, чтобы квартал не выглядел процедурным.
 drawYardPath(100,756,120,8);drawYardPath(212,756,8,38);drawYardPath(220,790,76,8);
 drawPlayground(185,790,0);
 drawYardPath(820,758,112,8);drawYardPath(925,758,8,34);drawYardPath(932,790,86,8);
 drawPlayground(910,790,1);

 // Заросшие края дворов — кусты и высокая трава.
 const shrubs=[
   [82,760,1.0],[102,810,.8],[118,835,1.15],[286,760,.9],[300,815,1.1],[285,840,.8],
   [780,765,.9],[805,815,1.15],[810,840,.8],[1008,760,1.0],[1018,812,.9],[1005,840,1.2],
   [555,770,.8],[575,815,1.0],[690,770,.9],[705,815,.8]
 ] as [number,number,number][];
 for(const [x,y,s] of shrubs)drawBush(x,y,s);

 // Старые фонари во дворах.
 const yardLamps=[[92,775],[325,780],[785,780],[1045,780],[565,790],[700,790]];
 for(const [x,y] of yardLamps){
   rect(x-2,y-25,4,27,"#343b3c");
   rect(x-7,y-30,14,5,"#252b2d");
   rect(x-4,y-34,8,4,"#d3bd70");
 }

 // Маленькие хозяйственные зоны: контейнеры и металлические ограждения.
 const bins2=[[278,800],[315,835],[1008,800],[1045,835]];
 for(const [x,y] of bins2){
   rect(x,y,13,15,"#384447");rect(x+2,y-3,9,3,"#596365");
 }
 const railings=[[90,842,75],[1010,842,72]];
 for(const [x,y,w] of railings){
   line(x,y,x+w,y,"#657174",2);
   for(let xx=x;xx<=x+w;xx+=14)line(xx,y,xx,y-12,"#657174",2);
 }


 // Парковочные места.
 const parking=[
  // Парковочные карманы вдоль дорог, а не поверх домов.
  [185,238,4],[360,238,4],[835,238,5],[1110,238,5],[1370,238,3],
  [105,525,4],[245,525,4],[760,700,4],[900,700,4],[1080,700,4],[1305,700,4],
  [70,920,4],[225,920,4],[760,920,4],[920,920,4],[1090,920,4],[1305,920,4]
 ];
 for(const [x,y,n] of parking)for(let i=0;i<n;i++){rect(x+i*31,y,2,25,"#b7b8b2");rect(x+i*31+2,y,24,2,"#b7b8b2");}

 // Машины.
 const cars=[
  [205,252,1,"#7a3f3f"],[385,252,-1,"#49606b"],[865,252,1,"#8a7445"],[1140,252,-1,"#52636a"],[1400,252,1,"#6d5448"],
  [125,540,1,"#596c54"],[275,540,-1,"#7a5544"],
  [790,710,1,"#5c6475"],[930,710,-1,"#7b6845"],[1110,710,1,"#56666a"],[1330,710,-1,"#6e5b68"],
  [95,930,1,"#7b4c45"],[250,930,-1,"#6d6349"],[790,930,1,"#4f6269"],[950,930,-1,"#765448"],[1115,930,1,"#596c54"],[1335,930,-1,"#52636a"]
 ] as [number,number,number,string][];
 for(const [x,y,dir,color] of cars){
  ctx!.save();ctx!.translate(x,y);if(dir<0)ctx!.scale(-1,1);
  rect(-25,-11,50,22,"#252d30");rect(-17,-16,29,8,"#34484c");
  rect(-12,-13,11,5,color);rect(2,-13,10,5,"#64858a");
  rect(-20,7,9,7,"#151a1c");rect(12,7,9,7,"#151a1c");
  rect(22,-4,3,6,"#d7c66d");rect(-26,-4,3,6,"#8c4a3e");
  ctx!.restore();
 }

 // Деревья. Кроны не одинаковые.
 const trees=[
  [28,35,1],[345,25,0],[585,85,2],[760,25,1],[1080,25,0],[1460,30,2],
  [30,275,0],[330,275,2],[575,275,1],[785,275,0],[1070,275,2],[1460,275,1],
  [25,545,1],[300,540,0],[570,535,2],[765,535,1],[1055,535,0],[1460,535,2],
  [25,770,2],[360,770,1],[585,770,0],[760,760,2],[1045,760,1],[1460,760,0],
  [30,955,1],[325,950,2],[585,950,0],[760,950,1],[1060,945,2],[1450,945,0],
  [30,1140,2],[620,1120,1],[750,1140,0],[1080,1140,2],[1450,1140,1]
 ] as [number,number,number][];
 for(const [x,y,v] of trees){
  const s=1+v*.12;
  const species=(Math.round(x+y)%5);
  ellipse(x+8,y+39*s,28*s,8*s,"rgba(18,31,20,.28)");
  if(species===0||species===1){
    // Берёза/тополь — высокий силуэт, характерный для дворов.
    rect(x-3,y-1,6,40*s,"#624733");
    rect(x-1,y+8,3,28*s,"#9a8061");
    ellipse(x,y-12*s,15*s,28*s,"#376f3f");
    ellipse(x-10*s,y-2*s,13*s,23*s,"#467f45");
    ellipse(x+10*s,y-3*s,13*s,24*s,"#3d7742");
    ellipse(x,y-28*s,10*s,18*s,"#548a4c");
  }else{
    rect(x-5,y+4,10,36*s,"#67442c");
    rect(x-1,y+7,4,28*s,"#8a6847");
    ellipse(x,y-1*s,29*s,22*s,"#2e6f3b");
    ellipse(x-17*s,y-7*s,18*s,18*s,"#3e8144");
    ellipse(x+17*s,y-7*s,18*s,18*s,"#34783f");
    ellipse(x,y-22*s,19*s,16*s,"#4a8a4b");
  }
 }

 // Городские мелочи.
 const lamps=[[575,375],[770,375],[575,540],[770,540],[575,780],[770,780],[1060,780],[350,935],[920,935]];
 for(const [x,y] of lamps){rect(x-2,y-22,4,25,"#333a3b");rect(x-8,y-27,16,5,"#252b2d");rect(x-5,y-31,10,4,"#dfc96e");}
 const benches=[[405,215],[875,215],[405,765],[1040,765],[375,945],[895,945]];
 for(const [x,y] of benches){rect(x,y,42,5,"#70482e");rect(x+4,y+7,5,12,"#4a3a2d");rect(x+33,y+7,5,12,"#4a3a2d");}
 const bins=[[395,235],[900,235],[395,750],[1020,750],[350,935],[920,935]];
 for(const [x,y] of bins)rect(x,y,10,13,"#394447");

 // Остановка.
 rect(1370,340,72,44,"#4b5658");rect(1376,346,60,30,"#a0aaa5");rect(1380,350,52,22,"#6d8585");
 rect(1372,380,68,5,"#31393a");rect(1390,365,10,4,"#e3d8a3");rect(1412,365,10,4,"#e3d8a3");
 rect(1384,350,3,22,"#53686a");rect(1428,350,3,22,"#53686a");

 tx("ГВАРДЕЙСКИЙ КВАРТАЛ",750,24,18,"#f0eee7","center");
 tx("ЖИЛОЙ МАССИВ · ШКОЛА · ДВОРЫ · ТРАНСПОРТ",750,46,10,"#c4c9c7","center");
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
function drawWeaponSprite(kind:number,handX:number,handY:number,angle:number,sc:number){
 if(!ctx)return;
 // Чисто визуальный слой: стилизованный пиксельный силуэт без изменения игровой логики.
 const lengths=[20,23,27,30,28,32];
 const bodies=[7,7,6,7,9,7];
 const length=lengths[kind]||22;
 const body=bodies[kind]||7;
 ctx.save();
 ctx.translate(handX,handY);
 ctx.rotate(angle);
 // Тень/контур
 rect(-5,-body/2-2,length+9,body+4,"#101417");
 // Основной корпус
 const metal=kind===2?"#6e7477":kind===4?"#7d6750":"#596368";
 rect(0,-body/2,length,body,metal);
 // Верхняя линия и передняя часть
 rect(4,-body/2-2,Math.max(8,length-9),2,"#aeb5b6");
 rect(length-4,-body/2-1,5,body+2,"#20272a");
 // Рукоять
 const gripX=Math.max(4,Math.min(length-5,kind===4?9:11));
 poly([gripX,-body/2+1,gripX+7,-body/2+1,gripX+5,body+5,gripX-2,body+3],"#24292b");
 // Небольшая цветовая маркировка выбранного предмета
 rect(5,0,Math.min(8,length-8),2,hero().color);
 // Дульная часть
 rect(length-1,-1,4,2,"#161b1e");
 ctx.restore();
}
function drawPlayer(){
 const x=player.x,y=player.y,sc=Math.max(.38,Math.min(.50,viewWidth/1450));
 drawMafiaMember(heroVisual(),x,y,frame,sc);

 // Оружие рисуется отдельным слоем и всегда привязано к кисти.
 const handX=x+player.facing*29*sc;
 const handY=y-44*sc;
 const angle=aimAngle;
 drawWeaponSprite(save.weapon,handX,handY,angle,sc);

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

