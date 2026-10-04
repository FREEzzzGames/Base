import { portalVideoUrl } from "./video-assets";
import { drawDistrictMicroDetails, drawWeaponEffects } from "./freezzz-world-detail";
import { drawPhotorealDistrict } from "./freezzz-photoreal-map";
import { TENDERS, tenderById, difficultyRu, arenaMissionsForTender, type ArenaMission } from "./freezzz-tenders";
import { HS_WEAPONS, createCombatState, consumeShot, startReload, stepWeapon, spawnShots, traceShot, lineOfSight, recoilAngle, updateAi, grenade as throwHsGrenade, type HsCombatState, type HsAi } from "./freezzz-combat-core";
/* FREEzzz МАФИЯ — campaign game module
 * Fictional 2D platformer. Story/content is data-driven so the campaign can grow
 * without rewriting the renderer.
 */
type FamilyId="valenti"|"moretti"|"rossi"|"bellini";
type HeroId="antonio"|"massimo"|"salvatore"|"giuseppe";
type EnemyType="brawler"|"shooter"|"heavy"|"rusher"|"guard"|"sniper"|"suppressor"|"flanker";
type Mode="select"|"arena"|"family"|"briefing"|"play"|"shop"|"weaponMenu"|"tenders"|"result";
type Objective="reach"|"find"|"clear"|"escort"|"defend"|"recover"|"escape"|"survive";

interface Hero{ id:HeroId; name:string; family:FamilyId; color:string; face:string; ability:string; abilityDesc:string; bio:string; }
interface Dialogue{speaker:string;text:string}
interface Mission{ id:string; number:number; hero:HeroId|"shared"; title:string; ru:string; desc:string; objective:Objective; floors:[string,string,string]; enemies:EnemyType[]; reward:number; xp:number; dialogue:Dialogue[]; optional?:string; }
interface Enemy{type:EnemyType;x:number;y:number;hp:number;maxHp:number;vx:number;vy:number;cool:number;shootCool:number;dir:number;falling?:boolean;ai:HsAi;coverX?:number;coverY?:number}
interface Bullet{x:number;y:number;vx:number;vy:number;from:"player"|"enemy";life:number;damage:number;penetration:number;weaponId:string;shotId:number;hitIds:Set<number>}
interface GrenadeFx{x:number;y:number;vx:number;vy:number;life:number;radius:number;damage:number}
interface ArenaPickup{x:number;y:number;kind:"medkit"|"weapon";weapon?:number;amount:number;life:number}
interface Player{x:number;y:number;vx:number;vy:number;hp:number;maxHp:number;armor:number;ammo:number;grounded:boolean;cool:number;ability:number;weaponSwap:number;facing:number;combat:HsCombatState}
interface Save{hero:HeroId|null;rank:number;xp:number;money:number;weapon:number;armor:number;activeTenderId?:string;completed:string[];completedTenders?:string[];arenaMissionIndex?:number;storySeen?:Partial<Record<HeroId,boolean>>;resumeMission?:Partial<Record<HeroId,string>>;resumeFloor?:Partial<Record<HeroId,number>>}

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
const weapons=HS_WEAPONS.map(w=>({name:w.name,damage:w.damage,rate:w.fireInterval,mag:w.magazine,cost:w.cost}));

let root:HTMLElement|null=null, canvas:HTMLCanvasElement|null=null, ctx:CanvasRenderingContext2D|null=null;
let mode:Mode="select", selected:HeroId|null=null, missionIndex=0, dialogueIndex=0, dialogueOpen=false;
let frame=0,last=0,raf=0,keys=new Set<string>(),cleanup:()=>void=()=>{};
let tenderPage=0;
let arenaWave=0,arenaKills=0,arenaTaskTarget=6,arenaTaskProgress=0,arenaTaskTimer=0,arenaSpawnTimer=0,arenaTaskLabel="УНИЧТОЖИТЬ ГРУППУ";
let arenaMission:ArenaMission|null=null;
let viewWidth=640,viewHeight=448;
let save:Save={hero:null,rank:0,xp:0,money:0,weapon:0,armor:0,completed:[],completedTenders:[],arenaMissionIndex:0,storySeen:{},resumeMission:{},resumeFloor:{}};
let player:Player={x:80,y:360,vx:0,vy:0,hp:100,maxHp:100,armor:0,ammo:12,grounded:false,cool:0,ability:0,weaponSwap:0,facing:1,combat:createCombatState(HS_WEAPONS[0])};
let enemies:Enemy[]=[],bullets:Bullet[]=[],grenades:GrenadeFx[]=[],arenaPickups:ArenaPickup[]=[];
let arenaPickupTimer=0;
let floor=0,floorTimer=0,objectiveProgress=0,flash=0;
let touch={left:false,right:false,jump:false,ability:false};
let movePointerId:number|null=null;
let moveX=0,moveY=0;
let aimAngle=-Math.PI/4,aimActive=false,aimPointerId:number|null=null;
const completedKey="freezzz:mafia-save:v2";

function loadSave(){try{const s=JSON.parse(localStorage.getItem(completedKey)||"");if(s&&typeof s==="object")save={...save,...s,activeTenderId:s.activeTenderId||undefined,completedTenders:s.completedTenders||[],arenaMissionIndex:typeof s.arenaMissionIndex==="number"?s.arenaMissionIndex:0,storySeen:s.storySeen||{},resumeMission:s.resumeMission||{},resumeFloor:s.resumeFloor||{}};}catch{}}
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
 ctx.save();ctx.translate(Math.round(cx),Math.round(ground));ctx.scale(scale,scale);
 ellipse(0,1,22,6,"rgba(0,0,0,.62)");
 const step=Math.sin(frame*.18)*2.2,suit=m.suit||"#1b1e22",dark="#14191b";
 limb(-6,-8,-9+step,-27,6,dark);limb(6,-8,9-step,-27,6,dark);
 rect(-14+step,-30,9,4,"#080b0d");rect(5-step,-30,9,4,"#080b0d");
 poly([-17,-31,-13,-43,-8,-48,0,-45,8,-48,13,-43,17,-31,10,-15,0,-11,-10,-15],suit);
 poly([-9,-43,0,-34,9,-43,6,-17,0,-13,-6,-17],"#e1dfd6");
 poly([-6,-42,0,-34,6,-42,3,-18,-3,-18],"#c8cbc5");
 rect(-2,-35,4,16,m.tie);line(-10,-20,10,-20,"#30373a",2);
 limb(-15,-39,-27,-22,7,suit);limb(15,-39,27,-22,7,suit);
 ellipse(-28,-20,5,5,m.face);ellipse(28,-20,5,5,m.face);
 ellipse(0,-57,9,10,m.face);rect(-10,-66,20,5,"#101416");rect(-7,-72,14,7,"#1a2022");rect(-13,-67,26,3,"#080b0d");
 rect(-7,-57,4,2,"#15191b");rect(3,-57,4,2,"#15191b");rect(-4,-51,8,2,"#75483f");
 rect(-13,-39,3,11,"#5d6668");rect(10,-39,3,11,"#5d6668");rect(-2,-18,4,3,m.tie);
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
 rect(8,8,viewWidth-16,40,"rgba(5,7,8,.94)");
 const fs=Math.max(10,Math.min(18,viewWidth*.019));
 tx("FREEzzz АРЕНА",18,15,fs,hero().color);tx(hero().name,viewWidth*.20,15,fs,"#f0eee7");
 tx("$"+save.money,viewWidth*.42,15,fs*.82,"#d9b86c");tx("HP "+Math.max(0,Math.round(player.hp)),viewWidth*.58,15,fs*.72,"#d5d8d7");
 tx("МАГ "+player.combat.ammo+"/"+player.combat.reserve,viewWidth*.94,15,fs*.72,hero().color,"right");
 if(save.activeTenderId){const t=tenderById(save.activeTenderId);if(t){tx("ТЕНДЕР · "+t.code+" · ВОЛНА "+arenaWave,18,62,fs*.78,"#d9b86c");tx(arenaTaskLabel+" · "+arenaTaskProgress+"/"+arenaTaskTarget,18,79,fs*.70,hero().color);}}
 else tx("ВЫБЕРИ ТЕНДЕР",18,62,fs*.82,"#aab1b4");
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
  {x:1275,y:505,w:225,h:30}
 ];
 const buildings=[
  // Северная линия.
  {x:28,y:24,w:290,h:150,roof:"#4d595d",wall:"#30383b",kind:"panel"},
  {x:338,y:32,w:205,h:142,roof:"#555f62",wall:"#403b39",kind:"brick"},
  {x:770,y:26,w:286,h:148,roof:"#4b575b",wall:"#30383b",kind:"panel"},
  {x:1082,y:38,w:230,h:136,roof:"#555e61",wall:"#3e3a37",kind:"brick"},
  {x:1338,y:58,w:130,h:118,roof:"#4c585c",wall:"#30383b",kind:"panel"},

  // Западный сектор. Между корпусами оставлены реальные проходы.
  {x:30,y:292,w:250,h:82,roof:"#596467",wall:"#41494b",kind:"school"},
  {x:304,y:286,w:226,h:88,roof:"#505b5e",wall:"#393f41",kind:"low"},
  {x:48,y:580,w:270,h:158,roof:"#4b585c",wall:"#30383b",kind:"panel"},
  {x:344,y:580,w:194,h:170,roof:"#525d61",wall:"#403b39",kind:"brick"},
  {x:34,y:760,w:238,h:80,roof:"#555f62",wall:"#3b4244",kind:"low"},
  {x:300,y:752,w:238,h:86,roof:"#505b5e",wall:"#383f42",kind:"low"},

  // Восточный сектор. Средняя дорога проходит перед фасадами, а не сквозь них.
  {x:758,y:292,w:272,h:82,roof:"#535e61",wall:"#3a4143",kind:"low"},
  {x:1058,y:286,w:210,h:86,roof:"#4f5a5e",wall:"#383f42",kind:"low"},
  {x:1298,y:290,w:170,h:82,roof:"#555f62",wall:"#3a4143",kind:"low"},
  {x:760,y:540,w:252,h:126,roof:"#4b585c",wall:"#30383b",kind:"panel"},
  {x:1038,y:540,w:230,h:126,roof:"#505b60",wall:"#403b39",kind:"brick"},
  {x:1290,y:540,w:178,h:126,roof:"#4c595d",wall:"#30383b",kind:"panel"},
  {x:760,y:750,w:242,h:76,roof:"#555f62",wall:"#3a4143",kind:"low"},
  {x:1030,y:750,w:238,h:76,roof:"#505b60",wall:"#383f42",kind:"low"},
  {x:1292,y:750,w:176,h:76,roof:"#535e61",wall:"#3a4143",kind:"low"},

  // Южная линия.
  {x:30,y:970,w:280,h:154,roof:"#4d595d",wall:"#30383b",kind:"panel"},
  {x:330,y:962,w:216,h:158,roof:"#525d60",wall:"#403b39",kind:"brick"},
  {x:760,y:970,w:270,h:154,roof:"#4d595d",wall:"#30383b",kind:"panel"},
  {x:1052,y:958,w:220,h:166,roof:"#505b60",wall:"#403b39",kind:"brick"},
  {x:1294,y:946,w:174,h:178,roof:"#4c595d",wall:"#30383b",kind:"panel"}
 ];
 return {w,h,roads,buildings,river:{x:0,y:0,w:0,h:0},bridge:{x:0,y:0,w:0,h:0}};
}
function topDownExit(){return mode==="play"&&arenaMission?[ARENA_W/2,90]:[1365,455];}
const ARENA_W=1000,ARENA_H=1500;
function arenaObstacles(){return [
 {x:70,y:220,w:250,h:70},{x:680,y:220,w:250,h:70},
 {x:70,y:470,w:170,h:170},{x:380,y:410,w:240,h:80},{x:760,y:470,w:170,h:170},
 {x:120,y:790,w:260,h:75},{x:620,y:790,w:260,h:75},
 {x:310,y:1050,w:380,h:85},{x:55,y:1210,w:180,h:90},{x:765,y:1210,w:180,h:90}
];}
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
 const arena=mode==="play"&&!!arenaMission;
 const W=arena?ARENA_W:topDownMap().w,H=arena?ARENA_H:topDownMap().h,obs=arena?arenaObstacles():topDownObstacles();
 let nx=clamp(x+dx,r,W-r),ny=clamp(y+dy,r,H-r);
 if(!obs.some(o=>circleRectHit(nx,y,r,o)))x=nx;
 if(!obs.some(o=>circleRectHit(x,ny,r,o)))y=ny;
 return [x,y];
}
function drawFacadeWindow(x:number,y:number,w:number,h:number,variant:number){
  // Глубокий оконный проём, стекло, рамы, откосы и бытовые следы.
  rect(x-3,y-3,w+6,h+6,"#1e2527");
  rect(x-1,y-1,w+2,h+2,"#4b5557");
  rect(x,y,w,h,variant%3===0?"#c9c5b9":variant%3===1?"#aeb3ae":"#737c7d");
  rect(x+3,y+3,w-6,h-6,variant%5===0?"#718f91":variant%5===1?"#415e63":variant%5===2?"#596f72":"#374d51");
  // Отражение неба и тёмная нижняя часть стекла.
  rect(x+4,y+4,Math.max(2,w-8),Math.max(2,h*.20),"rgba(230,235,226,.26)");
  rect(x+4,y+h*.58,Math.max(2,w-8),Math.max(2,h*.34),"rgba(20,29,31,.16)");
  line(x+w*.5,y+2,x+w*.5,y+h-2,"#26383b",1);
  if(h>16)line(x+2,y+h*.58,x+w-2,y+h*.58,"#26383b",1);
  // Откосы.
  line(x+1,y+1,x+1,y+h-1,"#d0cec4",1);
  line(x+w-1,y+1,x+w-1,y+h-1,"#51595a",1);
  if(variant%4===0)rect(x+4,y+h-5,Math.max(3,w-8),2,"rgba(31,38,38,.42)");
  // Случайные занавески/жалюзи — небольшая неоднородность жилого дома.
  if(variant%7===2){
    for(let k=0;k<3;k++)rect(x+4+k*4,y+5,2,Math.max(4,h-9),"rgba(204,202,188,.20)");
  }
  if(variant%9===0)rect(x+w*.72,y+h*.22,2,Math.max(3,h*.48),"rgba(38,47,47,.34)");
}

function drawSovietBuilding(b:{x:number;y:number;w:number;h:number;roof:string;wall:string;kind:string},index:number){
 if(!ctx)return;
 const low=b.kind==="low",school=b.kind==="school",brick=b.kind==="brick";
 const depth=Math.max(14,Math.min(24,b.h*.10));
 const roof=brick?"#66635d":school?"#70736c":b.roof;
 const wall=brick?"#5a5048":school?"#777a70":b.wall;
 poly([b.x+12,b.y+15,b.x+b.w+12,b.y+15,b.x+b.w+12,b.y+b.h+depth,b.x+12,b.y+b.h+depth],"rgba(8,12,13,.34)");
 rect(b.x+7,b.y+8,b.w,b.h,"#202728");
 poly([b.x,b.y+b.h-18,b.x+b.w,b.y+b.h-18,b.x+b.w+8,b.y+b.h+depth,b.x+8,b.y+b.h+depth],wall);
 poly([b.x+b.w-18,b.y,b.x+b.w,b.y+8,b.x+b.w+8,b.y+b.h+depth,b.x+b.w-8,b.y+b.h+depth],low?"#41494a":"#343c3e");
 rect(b.x,b.y,b.w,b.h-18,roof);
 rect(b.x+5,b.y+5,b.w-10,b.h-28,school?"#797c73":brick?"#615e58":"#596366");
 rect(b.x+8,b.y+8,b.w-16,b.h-34,"rgba(35,42,43,.24)");
 rect(b.x+4,b.y+4,b.w-8,5,"#353d3e");
 rect(b.x+4,b.y+b.h-24,b.w-8,6,"#3b4344");
 if(!school){
   if(!brick){
     const gx=Math.max(42,Math.floor(b.w/6)),gy=low?24:30;
     for(let x=b.x+gx;x<b.x+b.w-4;x+=gx)line(x,b.y+10,x,b.y+b.h-30,"rgba(190,196,191,.16)",1);
     for(let y=b.y+gy;y<b.y+b.h-28;y+=gy)line(b.x+7,y,b.x+b.w-7,y,"rgba(20,27,28,.28)",1);
   }else{
     for(let y=b.y+13;y<b.y+b.h-30;y+=10){
       const off=((y-b.y)/10)%2?0:7;
       for(let x=b.x+9+off;x<b.x+b.w-8;x+=14)line(x,y,x+9,y,"rgba(210,174,134,.30)",1);
     }
   }
 }
 const modules=Math.max(1,Math.floor(b.w/135));
 for(let i=0;i<modules;i++){
   const x=b.x+24+i*(b.w-48)/Math.max(1,modules-1),y=b.y+18+(i%2)*28;
   rect(x,y,30,18,"#444d4e");rect(x+4,y+3,22,11,"#747b79");rect(x+8,y+5,14,7,"#303839");
   for(let k=0;k<4;k++)rect(x+7+k*5,y+12,2,4,"#202728");
 }
 const sx=b.x+b.w*.66,sy=b.y+b.h*.52;
 rect(sx,sy,34,22,"#343d3f");rect(sx+4,sy+4,26,13,"#626a69");
 line(sx+8,sy+8,sx+25,sy+8,"#a1a59e",1);line(sx+8,sy+12,sx+20,sy+12,"#41494a",1);
 if(index%2===0){const ax=b.x+b.w*.78;line(ax,b.y+10,ax,b.y-16,"#3e4748",2);line(ax,b.y-13,ax+18,b.y-17,"#596364",1);line(ax,b.y-13,ax+15,b.y-7,"#596364",1);}
 rect(b.x+b.w*.48,b.y+b.h*.40,38,30,"#353d3e");
 rect(b.x+b.w*.48+4,b.y+b.h*.40+4,30,22,"#686f6d");
 rect(b.x+b.w*.48+8,b.y+b.h*.40+8,22,14,"#252d2e");
 const cols=Math.max(3,Math.floor((b.w-28)/42)),gap=(b.w-24)/cols;
 for(let c=0;c<cols;c++){
   const wx=b.x+12+c*gap,wy=b.y+b.h-14,ww=Math.min(22,gap-8);
   rect(wx,wy,ww,10,"#202829");rect(wx+2,wy+2,ww-4,5,(c+index)%4===0?"#91a29d":(c+index)%4===1?"#718789":"#485f63");
   line(wx+ww*.5,wy+2,wx+ww*.5,wy+7,"#bec4bc",1);
 }
 if(!school&&!low)for(let c=1;c<cols;c+=3){
   const bx=b.x+10+c*gap,by=b.y+b.h-23;rect(bx,by,26,3,"#9b9e98");
   for(let k=0;k<4;k++)line(bx+3+k*6,by,bx+3+k*6,by-9,"#747b79",1);
 }
 for(let c=0;c<cols;c++)if((c+index)%7===0){
   const ax=b.x+14+c*gap;rect(ax,b.y+b.h-2,12,5,"#a4a39b");rect(ax+2,b.y+b.h-5,8,3,"#c4c1b6");
 }
 const doors=school?Math.max(1,Math.floor(b.w/160)):Math.max(1,Math.floor(b.w/115));
 for(let d=0;d<doors;d++){
   const dx=b.x+(d+.5)*b.w/doors;
   rect(dx-13,b.y+b.h+depth-22,26,22,"#292f30");rect(dx-9,b.y+b.h+depth-19,18,19,(d+index)%3===0?"#72533a":"#4a5758");
   rect(dx-17,b.y+b.h+depth-25,34,4,"#737977");
 }
 if(school){rect(b.x+18,b.y+b.h-29,92,12,"#5f6868");tx("ШКОЛА",b.x+64,b.y+b.h-20,8,"#dedbd1","center");}
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
  rect(rd.x-3,rd.y-3,rd.w+6,rd.h+6,"#b2b4b0");
  rect(rd.x,rd.y,rd.w,rd.h,"#727776");
  rect(rd.x+7,rd.y+7,rd.w-14,rd.h-14,"#414748");
  for(let p=0;p<Math.max(3,Math.floor(rd.w/150));p++){
    const px=rd.x+18+(p*137)%Math.max(20,rd.w-50);
    const py=rd.y+18+(p*43)%Math.max(20,rd.h-45);
    rect(px,py,26+(p%3)*10,3,"rgba(110,106,98,.28)");
    line(px+3,py+3,px+18,py+7,"rgba(28,31,31,.28)",1);
  }
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
 rect(128,808,199,79,"#a19f8e");rect(133,813,189,69,"#7d9a70");rect(138,818,179,59,"#739062");
 line(227,818,227,877,"#ddd8c1",2);line(138,847,317,847,"#ddd8c1",2);
 rect(145,824,14,7,"#d8d2bb");rect(295,824,14,7,"#d8d2bb");rect(145,858,14,7,"#d8d2bb");rect(295,858,14,7,"#d8d2bb");

 // Ограждение школьного участка.
 const fenceX=70,fenceY=78,fenceW=500,fenceH=118;
 rect(fenceX,fenceY,fenceW,4,"#555e60");rect(fenceX,fenceY+fenceH-4,fenceW,4,"#555e60");
 for(let xx=fenceX;xx<=fenceX+fenceW;xx+=18)rect(xx,fenceY,3,fenceH,"#626b6d");
 rect(286,180,70,16,"#394143");rect(294,184,54,8,"#9b8b6a");

 // Микродетализация квартала: трещины, пятна ремонта, люки и дорожная пыль.
 const micro=[140,280,420,560,700,840,980,1120,1260,1400];
 for(let i=0;i<micro.length;i++){
   const x=micro[i], y=350+(i%4)*128;
   ellipse(x,y,22+(i%3)*7,4,"rgba(48,50,46,.10)");
   line(x-16,y-1,x+12,y+(i%2?3:-2),"rgba(46,49,46,.18)",1);
 }
 const manholes=[[665,370],[665,690],[1145,385],[1145,690],[365,515],[950,515]];
 for(const [x,y] of manholes){
   ellipse(x,y,10,5,"#4c5050");ellipse(x,y-1,7,3,"#696c69");
   line(x-5,y-1,x+5,y-1,"#363b3b",1);line(x,y-3,x,y+2,"#3a3e3d",1);
 }
 // Архитектура — главный слой карты.
 for(let i=0;i<m.buildings.length;i++)drawSovietBuilding(m.buildings[i],i);
 drawPhotorealDistrict(ctx!,m.buildings,m.roads);

 function drawUrbanMicroArchitecture(){
   // Дополнительный проход: фасадные выступы, балконы, кондиционеры,
   // водостоки, технические блоки и дворовые ограждения. Всё находится
   // в той же мировой геометрии, что и коллизии.
   for(let i=0;i<m.buildings.length;i++){
     const b=m.buildings[i],low=b.kind==="low",school=b.kind==="school";
     if(school)continue;
     // Балконы/лоджии — нерегулярный ритм, чтобы дома не выглядели клонами.
     const count=Math.max(1,Math.floor(b.w/150));
     for(let k=0;k<count;k++){
       const bx=b.x+32+k*((b.w-64)/Math.max(1,count));
       const by=b.y+b.h*.36+(i%3)*7;
       rect(bx,by,30,4,"#9a9b93");
       rect(bx+3,by+4,24,3,"#454e4f");
       for(let q=0;q<5;q++)line(bx+4+q*5,by+4,bx+4+q*5,by+14,"#7a817f",1);
       rect(bx+4,by+14,22,3,"#303738");
     }
     // Кондиционеры и кабельные трассы.
     if(i%2===0){
       const ax=b.x+b.w*.18,ay=b.y+b.h*.48;
       rect(ax,ay,20,12,"#8c918b");rect(ax+3,ay+3,14,6,"#515a59");
       line(ax+10,ay+12,ax+15,ay+22,"#5a5f5d",2);
       line(ax+15,ay+22,ax+28,ay+22,"#5a5f5d",1);
     }
     // Водосточная труба.
     const dx=b.x+b.w*.92;
     line(dx,b.y+8,dx,b.y+b.h+8,"#333a3b",2);
     line(dx-2,b.y+b.h+7,dx+8,b.y+b.h+7,"#454b4b",2);
     // Крыша: вентиляция, технические короба, антенны.
     const rx=b.x+b.w*.18,ry=b.y+9;
     rect(rx,ry,24,10,"#3e4647");rect(rx+4,ry-4,16,5,"#596162");
     if(i%3===0){
       line(rx+55,ry+5,rx+55,ry-17,"#353d3e",2);
       line(rx+55,ry-14,rx+70,ry-18,"#4f5959",1);
       ellipse(rx+55,ry-19,3,2,"#6d7471");
     }
     if(!low){
       const ex=b.x+b.w*.52,ey=b.y+b.h+10;
       rect(ex-18,ey-3,36,5,"#737773");
       rect(ex-11,ey+2,22,14,"#3a4243");
       rect(ex-7,ey+5,14,7,"#59605e");
     }
   }
   // Малые ограждения у подъездов и пешеходных дорожек.
   const fences=[[20,560,90,0],[548,585,42,0],[742,520,55,0],[1270,510,70,0],[548,925,52,0],[1275,925,65,0]];
   for(const [x,y,w] of fences){
     line(x,y,x+w,y,"#5b6668",2);
     for(let q=0;q<=w;q+=11)line(x+q,y,x+q,y-12,"#687375",2);
     line(x,y-12,x+w,y-12,"#687375",2);
   }
 }
 drawUrbanMicroArchitecture();

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
 drawYardPath(108,850,96,8);drawYardPath(188,850,8,56);drawYardPath(196,900,70,8);
 drawPlayground(210,880,0);
 drawYardPath(820,852,102,8);drawYardPath(915,852,8,44);drawYardPath(922,895,72,8);
 drawPlayground(930,878,1);

 // Заросшие края дворов — кусты и высокая трава.
 const shrubs=[
   [82,860,1.0],[102,905,.8],[118,930,1.15],[286,855,.9],[300,900,1.1],[285,940,.8],
   [780,860,.9],[805,900,1.15],[810,930,.8],[1008,855,1.0],[1018,900,.9],[1005,935,1.2],
   [555,865,.8],[575,900,1.0],[690,865,.9],[705,905,.8]
 ] as [number,number,number][];
 for(const [x,y,s] of shrubs)drawBush(x,y,s);

 // Старые фонари во дворах.
 const yardLamps=[[92,878],[325,875],[785,882],[1045,880],[565,900],[700,900]];
 for(const [x,y] of yardLamps){
   rect(x-2,y-25,4,27,"#343b3c");
   rect(x-7,y-30,14,5,"#252b2d");
   rect(x-4,y-34,8,4,"#d3bd70");
 }

 // Маленькие хозяйственные зоны: контейнеры и металлические ограждения.
 const bins2=[[278,870],[315,920],[1008,870],[1045,920]];
 for(const [x,y] of bins2){
   rect(x,y,13,15,"#384447");rect(x+2,y-3,9,3,"#596365");
 }
 const railings=[[90,945,75],[1010,944,72]];
 for(const [x,y,w] of railings){
   line(x,y,x+w,y,"#657174",2);
   for(let xx=x;xx<=x+w;xx+=14)line(xx,y,xx,y-12,"#657174",2);
 }


 // Парковочные места.
 const parking=[
  [220,250,5],[385,250,4],[815,250,4],[1110,250,5],
  [215,548,4],[370,548,4],[800,548,4],[1085,548,5],
  [220,760,4],[375,760,4],[815,760,4],[1090,760,4],[1320,760,3],
  [220,980,5],[820,980,5],[1120,970,4]
 ];
 for(const [x,y,n] of parking)for(let i=0;i<n;i++){rect(x+i*31,y,2,25,"#b7b8b2");rect(x+i*31+2,y,24,2,"#b7b8b2");}

 // Машины.
 const cars=[
  [250,265,1,"#7a3f3f"],[455,270,-1,"#49606b"],[845,265,1,"#8a7445"],[1260,265,-1,"#52636a"],
  [340,545,1,"#596c54"],[520,548,-1,"#7a5544"],[825,548,1,"#5c6475"],[1225,548,-1,"#7b6845"],
  [350,790,1,"#56666a"],[540,805,-1,"#7b4c45"],[1080,790,1,"#5c6d5c"],[1320,820,-1,"#6e5b68"],
  [430,1010,1,"#6d6349"],[900,1010,-1,"#4f6269"],[1210,950,1,"#765448"]
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
  ellipse(x+7,y+40*s,28*s,8*s,"rgba(20,30,20,.30)");
  rect(x-5,y+10,10,31,"#60402b");
  rect(x-2,y+8,4,27,"#7a5234");
  // Неровная крона из нескольких слоёв, с просветами и разной высотой.
  ellipse(x,y,29*s,22*s,"#295f35");
  ellipse(x-15*s,y-7*s,19*s,17*s,"#3a7a40");
  ellipse(x+15*s,y-6*s,19*s,17*s,"#34713c");
  ellipse(x-3*s,y-18*s,16*s,13*s,"#427f45");
  ellipse(x+9*s,y+8*s,15*s,12*s,"#2e6838");
  ellipse(x-18*s,y+5*s,11*s,9*s,"#326d39");
  rect(x-8*s,y-23*s,17*s,3*s,"#4e8e4c");
  if(v===2)line(x-1*s,y+2*s,x-15*s,y-11*s,"#5b7040",2);
  if(v===1)line(x+2*s,y+4*s,x+17*s,y-12*s,"#5b7040",2);
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

  drawDistrictMicroDetails(ctx!,m.buildings,m.roads);
}
function drawWorld(m:Mission){
 if(!ctx)return;
 const scale=Math.max(.62,Math.min(1.08,Math.min(viewWidth/420,viewHeight/780)));
 const camX=clamp(player.x-viewWidth/(2*scale),0,ARENA_W-viewWidth/scale);
 const camY=clamp(player.y-viewHeight/(2*scale),0,ARENA_H-viewHeight/scale);
 ctx.save();ctx.scale(scale,scale);ctx.translate(-camX,-camY);
 drawArenaBackground();
 arenaPickups.forEach(drawArenaPickup);
 enemies.forEach(drawEnemy);drawPlayer();
 grenades.forEach(g=>{ellipse(g.x,g.y,Math.max(5,g.radius*(1-g.life/70)),Math.max(5,g.radius*(1-g.life/70)),"rgba(207,110,53,.10)");ellipse(g.x,g.y,6,6,"#6e6f62");});
 bullets.forEach(b=>{line(b.x-b.vx*1.8,b.y-b.vy*1.8,b.x,b.y,b.from==="player"?hero().color:"#d86c35",Math.max(1,1.2));rect(b.x-2,b.y-2,4,4,b.from==="player"?hero().color:"#d86c35");});
 ctx.restore();drawHudOverlay(m);drawSpeech();
 if(flash>0){rect(0,0,viewWidth,viewHeight,"rgba(255,255,255,"+Math.min(.18,flash)+")");flash-=.02;}
}
function drawArenaBackground(){
 rect(0,0,ARENA_W,ARENA_H,"#30383b");
 // Simplified CS-style compact arena: two bases, central lanes and cover.
 rect(0,0,ARENA_W,180,"#26363a");rect(0,ARENA_H-180,ARENA_W,180,"#34443b");
 for(let y=180;y<ARENA_H-180;y+=80)rect(0,y,ARENA_W,2,"rgba(210,210,190,.08)");
 for(let x=0;x<ARENA_W;x+=80)line(x,180,x,ARENA_H-180,"rgba(0,0,0,.10)",1);
 rect(0,160,ARENA_W,18,"#5c6766");rect(0,ARENA_H-178,ARENA_W,18,"#68736b");
 // Central combat lanes.
 rect(330,180,340,1140,"#414a4b");rect(340,180,10,1140,"#59605d");rect(650,180,10,1140,"#59605d");
 // Cover blocks.
 for(const o of arenaObstacles()){rect(o.x+5,o.y+7,o.w,o.h,"rgba(0,0,0,.25)");rect(o.x,o.y,o.w,o.h,"#56605e");rect(o.x+8,o.y+8,o.w-16,Math.min(12,o.h-16),"#707875");}
 // Side base markings.
 rect(70,80,220,45,hero().color);rect(710,80,220,45,"#b34b42");
 tx("ИГРОК",180,108,16,"#0a1112","center");tx("ВРАГ",820,108,16,"#f0eee7","center");
 // Spawn barriers.
 line(30,180,970,180,"#d7d2bc",3);line(30,1320,970,1320,"#d7d2bc",3);
}
function drawArenaPickup(p:ArenaPickup){
 const pulse=1+Math.sin(frame*.08+p.x)*.08;
 if(p.kind==="medkit"){
  rect(p.x-13*pulse,p.y-13*pulse,26*pulse,26*pulse,"#e8ece7");
  rect(p.x-5,p.y-11,10,22,"#d24d47");rect(p.x-11,p.y-5,22,10,"#d24d47");
  tx("HP",p.x,p.y+28,10,"#f0eee7","center");
 }else{
  const w=p.weapon??0;
  rect(p.x-25,p.y-10,50,20,"#171d1f");drawWeaponSprite(w,p.x-20,p.y,0,1);
  tx("W",p.x,p.y+28,10,hero().color,"center");
 }
}
function enemyVisual(type:EnemyType):MafiaVisual{
 const suits:Record<EnemyType,string>={brawler:"#30242a",shooter:"#26323a",heavy:"#40352a",rusher:"#3a2024",guard:"#28342e",sniper:"#302a40",suppressor:"#403323",flanker:"#26313d"};
 const ties:Record<EnemyType,string>={brawler:"#b94f46",shooter:"#6d8790",heavy:"#c58b48",rusher:"#a94c42",guard:"#68776f",sniper:"#75658d",suppressor:"#9b7546",flanker:"#6d7e92"};
 return {face:"#9a6554",tie:ties[type],suit:suits[type]};
}
function drawEnemy(e:Enemy){
 const v=enemyVisual(e.type),sc=Math.max(.52,Math.min(.68,viewWidth/1200));
 drawMafiaMember(v,e.x,e.y,frame,sc);
 if(!e.falling){
   const bw=30*sc;
   rect(e.x-bw/2,e.y-82*sc,bw,3*sc,"#20282c");
   rect(e.x-bw/2,e.y-82*sc,bw*clamp(e.hp/e.maxHp,0,1),3*sc,v.tie);
 }
}
function drawWeaponSprite(kind:number,handX:number,handY:number,angle:number,sc:number){
 if(!ctx)return;
 // Реальные силуэты используются только как визуальные ориентиры:
 // pistol → Beretta-92-подобный профиль; revolver → классический барабан;
 // SMG → компактный MP5-подобный профиль; shotgun → pump-action;
 // carbine → классическая деревянно-металлическая карабинная компоновка.
 // Это оригинальные игровые силуэты, а не копии конкретных моделей.
 const skins=[
  {body:"#566064",metal:"#a5abad",grip:"#292e30",accent:"#54d6d8"},
  {body:"#4e5559",metal:"#9da4a6",grip:"#25292b",accent:"#c58b48"},
  {body:"#3f4447",metal:"#b0b3ae",grip:"#2b2725",accent:"#d8b86c"},
  {body:"#4b5558",metal:"#a9afb0",grip:"#302b27",accent:"#d86c35"},
  {body:"#5a4b3a",metal:"#7f8583",grip:"#3b2c23",accent:"#9f83d6"},
  {body:"#3e484b",metal:"#b1b6b5",grip:"#24292a",accent:"#54d6d8"}
 ];
 const skin=skins[kind]||skins[0];
 const lengths=[32,38,42,49,55,61];
 const length=lengths[kind]||36;
 const h=Math.max(5,Math.round((kind===4?9:kind>=5?7:kind===3?8:6)*sc));
 ctx.save();
 ctx.translate(handX,handY);
 ctx.rotate(angle);
 ctx.lineJoin="round";
 ctx.lineCap="round";
 // Grounded shadow/outline gives the weapon a readable RTS sprite silhouette.
 rect(-5,-h/2-3,length+10,h+8,"rgba(6,9,10,.75)");

 if(kind===0){
   // Compact service pistol: slide, open ejection area, trigger guard, grip.
   rect(0,-h/2,length-7,h,skin.body);
   rect(3,-h/2-2,length-13,2,"#c0c5c4");
   rect(length-9,-h/2-1,6,h+2,skin.metal);
   rect(length-4,-1,5,2,"#22282a");
   poly([8,h/2-1,17,h/2-1,14,h/2+12,7,h/2+10],skin.grip);
   ellipse(11,h/2+4,4,2,"#14191a");
   rect(5,-h/2+1,9,2,skin.accent);
 }else if(kind===1){
   // Full-size pistol with longer slide and pronounced frame.
   rect(0,-h/2,length-8,h,skin.body);
   rect(2,-h/2-2,length-15,3,skin.metal);
   poly([length-14,-h/2,length-5,-h/2,length-2,0,length-8,h/2,length-14,h/2],skin.metal);
   poly([8,h/2-1,18,h/2-1,15,h/2+14,7,h/2+11],skin.grip);
   rect(5,h/2-1,10,2,skin.accent);
   line(6,0,14,0,"#171d1f",1);
 }else if(kind===2){
   // Revolver: barrel + frame + clearly visible cylinder.
   rect(0,-h/2,length-15,h,skin.metal);
   rect(5,-h/2-2,length-20,2,"#d0d1cc");
   rect(length-15,-h/2-1,10,h+2,skin.body);
   ellipse(length-10,0,6,6,skin.metal);
   ellipse(length-10,0,3,3,"#34383a");
   for(let k=0;k<6;k++){const q=k*Math.PI/3;ellipse(length-10+Math.cos(q)*4,Math.sin(q)*4,1.2,1.2,"#303537");}
   poly([4,h/2-1,13,h/2-1,10,h/2+13,3,h/2+10],skin.grip);
   rect(0,-1,6,2,skin.accent);
 }else if(kind===3){
   // Compact SMG: receiver, magazine, stock and long barrel.
   rect(2,-h/2,length-9,h,skin.body);
   rect(0,-h/2-2,25,2,skin.metal);
   rect(length-10,-2,10,4,"#202628");
   poly([9,h/2-1,17,h/2-1,15,h/2+12,7,h/2+10],skin.grip);
   poly([2,-h/2,10,-h/2,5,-h/2-7,-2,-h/2-6],skin.body);
   rect(4,-h/2+1,12,2,skin.accent);
   // magazine
   poly([20,h/2-1,28,h/2-1,25,h/2+11,18,h/2+9],skin.grip);
 }else if(kind===4){
   // Pump shotgun: long tube, wooden fore-end, receiver and butt.
   rect(3,-h/2,length-8,h,skin.metal);
   rect(13,-h/2-2,length-14,3,skin.metal);
   rect(10,-h/2+1,18,h-2,skin.body);
   rect(18,h/2-1,17,4,skin.grip);
   poly([2,-h/2,10,-h/2,7,-h/2-7,-3,-h/2-5],skin.body);
   poly([4,h/2-1,13,h/2-1,11,h/2+13,3,h/2+10],skin.grip);
   for(let k=0;k<4;k++)line(13+k*4,-h/2+2,13+k*4,h/2-2,"rgba(210,170,115,.28)",1);
   rect(4,0,11,2,skin.accent);
 }else if(kind===5){
   // Classic carbine.
   poly([0,-h/2,15,-h/2,20,0,15,h/2,0,h/2-1],skin.metal);
   rect(17,-h/2+1,length-20,h-2,skin.body);rect(length-6,-2,8,4,skin.metal);
   poly([7,h/2-1,18,h/2-1,15,h/2+13,4,h/2+9],skin.grip);rect(23,h/2-1,10,3,skin.grip);
   rect(length-1,-h/2-5,3,7,skin.metal);line(19,0,length-5,0,"#c1c5c3",1);rect(6,-h/2+1,11,2,skin.accent);
 }else if(kind===6){
   // Assault rifle: extended receiver, magazine, handguard and muzzle device.
   poly([0,-h/2,18,-h/2,22,h/2,0,h/2-1],skin.metal);
   rect(20,-h/2+1,length-30,h-2,skin.body);rect(28,-h/2-2,length-34,2,skin.metal);
   poly([27,h/2-1,36,h/2-1,33,h/2+12,25,h/2+10],skin.grip);
   poly([38,h/2-1,48,h/2-1,45,h/2+10,36,h/2+8],skin.grip);
   rect(length-8,-2,10,4,skin.metal);rect(length-3,-h/2-4,4,8,skin.metal);rect(23,-h/2+1,12,2,skin.accent);
 }else if(kind===7){
   // Compact carbine: short receiver, folding-style stock silhouette and compact magazine.
   poly([0,-h/2,13,-h/2,18,0,13,h/2,0,h/2-1],skin.metal);
   rect(17,-h/2+1,length-25,h-2,skin.body);rect(length-8,-2,9,4,skin.metal);
   poly([18,h/2-1,27,h/2-1,24,h/2+11,16,h/2+9],skin.grip);
   poly([3,-h/2,12,-h/2,7,-h/2-7,-2,-h/2-5],skin.body);rect(20,-h/2+1,12,2,skin.accent);
 }else{
   // Marksman carbine: long precision-oriented silhouette with stock, receiver and barrel.
   poly([0,-h/2,19,-h/2,23,0,18,h/2,0,h/2-1],skin.grip);
   rect(21,-h/2+1,length-32,h-2,skin.body);rect(30,-h/2-2,length-35,2,skin.metal);
   poly([13,h/2-1,25,h/2-1,21,h/2+12,11,h/2+10],skin.grip);
   rect(length-10,-2,12,4,skin.metal);rect(31,-h/2+2,18,2,skin.accent);rect(length-2,-h/2-5,3,8,skin.metal);
 }

 // Small highlights separate metal from paint and keep each weapon readable at phone scale.
 rect(Math.max(4,length*.55),-1,Math.max(3,length*.18),1,"rgba(235,238,235,.45)");
 rect(length-3,-1,3,2,"#151a1c");
 ctx.restore();
}
function drawPlayer(){
 const x=player.x,y=player.y,sc=Math.max(.68,Math.min(.84,viewWidth/1050));
 drawMafiaMember(heroVisual(),x,y,frame,sc);
 const handX=x+player.facing*29*sc;
 const handY=y-44*sc;
 const angle=aimAngle;
 const kick=Math.min(3.2,player.combat.recoil*.22);
 const wx=handX-Math.cos(angle)*kick,wy=handY-Math.sin(angle)*kick;
 drawWeaponSprite(save.weapon,wx,wy,angle,sc);
 const w=HS_WEAPONS[save.weapon],len=[32,38,42,49,55,61,66,58,78][save.weapon]||36;
 const muzzleX=wx+Math.cos(angle)*len,muzzleY=wy+Math.sin(angle)*len;
 drawWeaponEffects(ctx!,muzzleX,muzzleY,angle,sc,save.weapon,player.combat.fireTimer>w.fireInterval-4,hero().color);
 if(player.ability>0)tx(hero().ability,x,y-104*sc,Math.max(11,7*sc),hero().color,"center");
}
function arenaTaskSetup(){
 const t=save.activeTenderId?tenderById(save.activeTenderId):null;
 const list=t?arenaMissionsForTender(t.id):[];
 arenaMission=list[Math.max(0,Math.min(list.length-1,save.arenaMissionIndex||0))]||null;
 arenaTaskProgress=0;arenaTaskTimer=0;arenaWave=0;arenaKills=0;arenaSpawnTimer=0;
 if(!arenaMission){arenaTaskTarget=0;arenaTaskLabel="НЕТ МИССИИ";return;}
 arenaTaskTarget=arenaMission.target;
 arenaTaskLabel=arenaMission.objective==="survive"?"ВЫЖИТЬ · "+arenaMission.target+" СЕК":arenaMission.objective==="reach"?"ДОБРАТЬСЯ ДО ТОЧКИ":arenaMission.objective==="recover"?"ИЗВЛЕЧЬ ЦЕЛЬ":arenaMission.objective==="defend"?"ЗАЩИТИТЬ ТОЧКУ":"УНИЧТОЖИТЬ ГРУППУ · "+arenaMission.target;
}
function startTenderMission(){arenaTaskSetup();if(!arenaMission){mode="tenders";render();return;}mode="play";dialogueOpen=false;spawnFloor();storeSave();render();}
function advanceTenderMission(){
 const id=save.activeTenderId;if(!id||!arenaMission)return;
 const list=arenaMissionsForTender(id),next=(save.arenaMissionIndex||0)+1;
 if(next>=list.length){const tender=tenderById(id);if(tender){save.money+=tender.reward;save.xp+=Math.floor(tender.reward*.18);save.completedTenders=[...(save.completedTenders||[]),id];}save.activeTenderId=undefined;save.arenaMissionIndex=0;arenaMission=null;mode="tenders";storeSave();render();return;}
 save.arenaMissionIndex=next;arenaTaskSetup();spawnFloor();storeSave();render();
}
function arenaRandomPoint(){
 for(let tries=0;tries<30;tries++){
  const x=70+Math.random()*(ARENA_W-140),y=180+Math.random()*(ARENA_H-360);
  if(!arenaObstacles().some(o=>circleRectHit(x,y,28,o)))return [x,y];
 }
 return [500,750];
}
function spawnArenaPickup(){
 const [x,y]=arenaRandomPoint();
 const kind=Math.random()<.34?"medkit":"weapon";
 arenaPickups.push(kind==="medkit"?{x,y,kind,amount:30,life:99999}:{x,y,kind,weapon:Math.floor(Math.random()*HS_WEAPONS.length),amount:1,life:99999});
}
function resetArenaPickups(){
 arenaPickups=[];arenaPickupTimer=0;
 for(let i=0;i<7;i++)spawnArenaPickup();
}
function updateArenaPickups(dt:number){
 arenaPickupTimer+=dt;
 for(const p of arenaPickups)p.life-=dt;
 if(arenaPickupTimer>360){arenaPickupTimer=0;spawnArenaPickup();}
 for(let i=arenaPickups.length-1;i>=0;i--){
  const p=arenaPickups[i];
  if(Math.hypot(player.x-p.x,player.y-p.y)>38)continue;
  if(p.kind==="medkit"){
   if(player.hp>=player.maxHp)continue;
   player.hp=Math.min(player.maxHp,player.hp+p.amount);arenaPickups.splice(i,1);say("+АПТЕЧКА","player",player.x,player.y-48);
  }else{
   if(typeof p.weapon!=="number")continue;
   save.weapon=p.weapon;player.combat=createCombatState(HS_WEAPONS[p.weapon]);player.ammo=player.combat.ammo;
   arenaPickups.splice(i,1);say("ОРУЖИЕ · "+HS_WEAPONS[p.weapon].name,"player",player.x,player.y-48);storeSave();
  }
 }
 arenaPickups=arenaPickups.filter(p=>p.life>0);
}
function spawnFloor(){
 floorTimer=0;objectiveProgress=0;bullets=[];grenades=[];enemies=[];arenaWave=0;arenaKills=0;arenaTaskTimer=0;arenaSpawnTimer=0;
 player={x:ARENA_W/2,y:ARENA_H-150,vx:0,vy:0,hp:100+save.armor*5,maxHp:100+save.armor*5,armor:save.armor*5,ammo:HS_WEAPONS[save.weapon].magazine,grounded:true,cool:0,ability:0,weaponSwap:0,facing:1,combat:createCombatState(HS_WEAPONS[save.weapon])};
 if(save.activeTenderId&&arenaMission){resetArenaPickups();spawnArenaWave();}else arenaPickups=[];
}
function fire(){
 if(mode!=="play")return;
 const w=HS_WEAPONS[save.weapon];
 if(player.combat.reloadTimer>0)return;
 if(!consumeShot(player.combat,w))return;
 player.ammo=player.combat.ammo;
 const scale=portraitScale();
 const handX=player.x+player.facing*29*scale;
 const handY=player.y-44*scale;
 const angle=recoilAngle(aimAngle,player.combat);
 for(const shot of spawnShots(handX,handY,angle,w,"player",player.combat.shotCounter*100))bullets.push({...shot});
}
function switchWeapon(){
 if(mode!=="play"||player.weaponSwap>0)return;
 save.weapon=(save.weapon+1)%weapons.length;
 player.combat=createCombatState(HS_WEAPONS[save.weapon]);
 player.ammo=player.combat.ammo;
 player.weaponSwap=90;
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
 frame++;
 speechCooldown=Math.max(0,speechCooldown-dt);
 if(speech)speech.timer-=dt;
 if(mode!=="play")return;

 if(save.activeTenderId&&arenaMission){
  arenaTaskTimer+=dt;arenaSpawnTimer+=dt;
  if(enemies.length===0&&arenaSpawnTimer>70)spawnArenaWave();
  const [exitX,exitY]=topDownExit(),scale=portraitScale();
  const reachedExit=Math.hypot(player.x-exitX,player.y-exitY)<55*scale;
  const done=(arenaMission.objective==="survive"&&arenaTaskTimer>=arenaMission.target*60)||
    ((arenaMission.objective==="reach")&&reachedExit)||
    ((arenaMission.objective==="recover")&&reachedExit)||
    ((arenaMission.objective==="defend")&&arenaTaskProgress>=arenaMission.target)||
    ((arenaMission.objective==="clear")&&arenaTaskProgress>=arenaMission.target);
  if(done)completeArenaTask();
 }
 if(frame%420===0){
  const lines=heroLines[selected||"antonio"];
  say(lines[Math.floor(Math.random()*lines.length)],"player",player.x,player.y-45);
 }

 const weapon=HS_WEAPONS[save.weapon];
 stepWeapon(player.combat,weapon,dt);
 player.ammo=player.combat.ammo;
 player.cool=player.combat.fireTimer;
 player.ability=Math.max(0,player.ability-dt);
 player.weaponSwap=Math.max(0,player.weaponSwap-dt);

 const scale=Math.max(.78,Math.min(1.35,Math.min(viewWidth/430,viewHeight/820))),speed=3.2*scale;
 if(Math.abs(moveX)>.12||Math.abs(moveY)>.12){
  const len=Math.hypot(moveX,moveY)||1;
  const moved=moveTopDown(player.x,player.y,(moveX/len)*speed,(moveY/len)*speed,18*scale);
  player.x=moved[0];player.y=moved[1];
  if(Math.abs(moveX)>.12)player.facing=moveX<0?-1:1;
 }
 fire();if(touch.ability)useAbility();
 updateArenaPickups(dt);

 const obstacles=arenaObstacles();
 for(const g of grenades){
  g.x+=g.vx*dt;g.y+=g.vy*dt;g.vx*=.94;g.vy*=.94;g.life-=dt;
  if(g.life<=0){
   for(const e of enemies)if(!e.falling){
    const d=Math.hypot(e.x-g.x,e.y-g.y);
    if(d<g.radius){
     const k=1-d/g.radius;e.hp-=g.damage*k;
     if(e.hp<=0){e.falling=true;e.vy=-4.5*scale;save.money+=25;save.xp+=18;arenaKills++;arenaTaskProgress++;}
    }
   }
   if(Math.hypot(player.x-g.x,player.y-g.y)<g.radius)hurt(24);
   g.life=0;
  }
 }
 grenades=grenades.filter(g=>g.life>0);

 for(const b of bullets){
  const result=traceShot(b,dt,obstacles);
  if(result.blocked){b.life=0;continue;}
  if(b.from==="enemy"&&Math.hypot(b.x-player.x,b.y-player.y)<20*scale){b.life=0;hurt(Math.max(3,b.damage*.38));continue;}
  if(b.from==="player"){
   for(let i=0;i<enemies.length;i++){
    const e=enemies[i];if(e.falling||b.hitIds.has(i))continue;
    if(Math.hypot(b.x-e.x,b.y-e.y)<24*scale){
     b.hitIds.add(i);e.hp-=b.damage;b.damage*=.62;b.penetration-=.12;
     if(e.hp<=0){e.falling=true;e.vy=-4.5*scale;save.money+=25;save.xp+=18;arenaKills++;arenaTaskProgress++;}
     if(b.penetration<=0)b.life=0;break;
    }
   }
  }
 }
 bullets=bullets.filter(b=>b.life>0&&b.x>-30&&b.x<ARENA_W+30&&b.y>-30&&b.y<ARENA_H+30);

 for(let i=0;i<enemies.length;i++){
  const e=enemies[i];
  if(e.falling){e.vy+=.5*scale*dt;e.y+=e.vy*dt;continue;}
  e.cool-=dt;e.shootCool-=dt;
  const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy)||1;
  const visible=lineOfSight(e.x,e.y,player.x,player.y,obstacles);
  const bulletThreat=bullets.some(b=>b.from==="player"&&Math.hypot(e.x-b.x,e.y-b.y)<70&&Math.abs((e.x-b.x)*b.vy-(e.y-b.y)*b.vx)<2600);
  if(bulletThreat)e.ai.state="dodge";
  updateAi(e.ai,dt,visible,dist,player.x,player.y);
  if(e.ai.state==="dodge"){
   const side=e.ai.strafe||1,q=moveTopDown(e.x,e.y,-dy/dist*1.35*scale*side,dx/dist*1.35*scale*side,15*scale);e.x=q[0];e.y=q[1];
  }else if(e.ai.state==="retreat"){
   const q=moveTopDown(e.x,e.y,-dx/dist*.7*scale+(-dy/dist)*e.ai.strafe*.35*scale,-dy/dist*.7*scale+(dx/dist)*e.ai.strafe*.35*scale,15*scale);e.x=q[0];e.y=q[1];
  }else if(e.ai.state==="chase"||e.ai.state==="attack"){
   const mult=e.type==="rusher"?1:e.type==="brawler"?.72:e.type==="flanker"?.62:.22;
   const side=e.ai.strafe*(visible?.28:0),q=moveTopDown(e.x,e.y,(dx/dist*mult-dy/dist*side)*scale,(dy/dist*mult+dx/dist*side)*scale,15*scale);e.x=q[0];e.y=q[1];
  }else if(!visible&&e.ai.alert>0){
   const d2=Math.hypot(e.ai.lastSeenX-e.x,e.ai.lastSeenY-e.y)||1,q=moveTopDown(e.x,e.y,(e.ai.lastSeenX-e.x)/d2*.3*scale,(e.ai.lastSeenY-e.y)/d2*.3*scale,15*scale);e.x=q[0];e.y=q[1];
  }
  if((e.type==="shooter"||e.type==="sniper"||e.type==="suppressor")&&e.shootCool<=0&&visible){
   e.shootCool=e.type==="suppressor"?24:e.type==="sniper"?95:62;
   const a=Math.atan2(dy,dx)+(Math.random()-.5)*(e.type==="sniper"?.025:.11);
   const ew=HS_WEAPONS[e.type==="sniper"?5:e.type==="suppressor"?3:1];
   for(const shot of spawnShots(e.x,e.y,a,ew,"enemy",frame*100+i))bullets.push({...shot});
  }
  if(dist<30*scale&&e.cool<=0){e.cool=55;hurt(e.type==="heavy"?16:8);say(enemyLines[Math.floor(Math.random()*enemyLines.length)],"enemy",e.x,e.y-35);}
 }
 enemies=enemies.filter(e=>!e.falling||e.y<ARENA_H+80);
 if(enemies.length===0)objectiveProgress=1;
 floorTimer+=dt;
}
function completeArenaTask(){
 const t=save.activeTenderId?tenderById(save.activeTenderId):null;if(!t||!arenaMission)return;
 const payout=Math.max(50,arenaMission.reward);save.money+=payout;save.xp+=Math.floor(payout*.18);
 say("МИССИЯ ВЫПОЛНЕНА +$"+payout,"player",player.x,player.y-55);advanceTenderMission();
}
function completeMission(){
 const tender=save.activeTenderId?tenderById(save.activeTenderId):null;
 if(tender&&tender.linkedMission===currentMission().id){save.money+=tender.reward;save.xp+=Math.floor(tender.reward*.18);save.activeTenderId=undefined;}
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
 if(mode==="arena"){startTenderMission();return;}
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
function activateCheatAll(){save.completed=allMissions.map(m=>m.id);save.money=999999;save.weapon=weapons.length-1;save.xp=999999;save.rank=rankNames.length-1;save.storySeen={antonio:true,massimo:true,salvatore:true,giuseppe:true};storeSave();mode="arena";dialogueOpen=false;render();}

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
 if(mode==="arena"){drawArenaBriefing();return;}
 if(mode==="family"){drawFamily();return;}
 if(mode==="briefing"){drawBriefing();return;}
 if(mode==="shop"){drawShop();return;}
 if(mode==="tenders"){drawTenders();return;}
  if(mode==="weaponMenu"){drawWeaponMenu();return;}
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
function drawArenaBriefing(){
 rect(0,0,viewWidth,viewHeight,"#07090b");const t=save.activeTenderId?tenderById(save.activeTenderId):null;
 tx("АРЕНА",viewWidth*.07,viewHeight*.07,menuTextSize(.045,28,40),hero().color);
 tx("ОДНА АРЕНА · ПОСЛЕДОВАТЕЛЬНЫЕ МИССИИ",viewWidth*.07,viewHeight*.115,menuTextSize(.014,9,14),"#68777f");
 if(t&&arenaMission){tx(t.code+" · "+t.title,viewWidth*.07,viewHeight*.20,menuTextSize(.026,18,28),"#f0eee7");tx(t.client,viewWidth*.07,viewHeight*.25,menuTextSize(.016,11,16),"#aeb6b8");tx("МИССИЯ "+arenaMission.order+" / 3",viewWidth*.07,viewHeight*.35,menuTextSize(.020,14,21),hero().color);tx(arenaMission.title,viewWidth*.07,viewHeight*.42,menuTextSize(.030,20,30),"#f0eee7");drawWrapped(arenaMission.briefing,viewWidth*.07,viewHeight*.49,Math.max(26,Math.floor(viewWidth/15)),menuTextSize(.021,15,22),menuTextSize(.021,15,22),"#aeb6b8");tx("ЦЕЛЬ · "+arenaTaskLabel,viewWidth*.07,viewHeight*.65,menuTextSize(.018,12,19),hero().color);tx("ПРАВИЛО · "+arenaMission.arenaRule,viewWidth*.07,viewHeight*.71,menuTextSize(.016,11,17),"#8d999d");}else{tx("ТЕНДЕР НЕ ПРИНЯТ",viewWidth/2,viewHeight*.40,menuTextSize(.028,19,28),"#aeb6b8","center");tx("Выбери контракт, чтобы открыть арену.",viewWidth/2,viewHeight*.47,menuTextSize(.018,12,18),"#68777f","center");}
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
function drawTenders(){
 const c=ctx!;c.save();const W=viewWidth,H=viewHeight;c.fillStyle="#070a0c";c.fillRect(0,0,W,H);
 const g=c.createRadialGradient(W*.18,H*.12,0,W*.18,H*.12,W*.55);g.addColorStop(0,"rgba(216,108,53,.18)");g.addColorStop(1,"rgba(7,10,12,0)");c.fillStyle=g;c.fillRect(0,0,W,H);
 tx("ЗАКРЫТЫЙ ТЕНДЕР",W*.06,H*.055,menuTextSize(.032,21,30),"#d86c35");
 tx("ОРУЖИЕ · ЭКИПИРОВКА · КОНТРАКТЫ",W*.06,H*.09,menuTextSize(.014,9,14),"#68777f");
 tx((tenderPage+1)+"/"+Math.ceil(TENDERS.length/3),W*.94,H*.055,menuTextSize(.016,11,15),hero().color,"right");
 const top=H*.12,bottom=H*.90,gap=H*.018,cardH=(bottom-top-gap*2)/3,left=W*.045,cardW=W*.91;
 const pageItems=TENDERS.slice(tenderPage*3,tenderPage*3+3);
 const bodyChars=Math.max(31,Math.floor(W/16.2));
 pageItems.forEach((t,i)=>{
   const y=top+i*(cardH+gap),active=save.activeTenderId===t.id,done=save.completed.includes(t.linkedMission);
   c.save();c.fillStyle=active?"#172024":"#0c1114";c.strokeStyle=active?hero().color:"#334047";c.lineWidth=active?2:1;
   c.shadowColor=active?"rgba(84,214,216,.18)":"rgba(0,0,0,.4)";c.shadowBlur=active?12:6;
   c.beginPath();c.roundRect(left,y,cardW,cardH,7);c.fill();c.stroke();c.restore();

   tx(t.code,left+12,y+20,menuTextSize(.010,7,10),active?hero().color:"#68777f");
   tx(t.title,left+48,y+20,menuTextSize(.015,10,14),"#f0eee7","left");
   tx(done?"ВЫПОЛНЕН":active?"КОНТРАКТ ПРИНЯТ":"ПРИНЯТЬ",left+cardW-12,y+20,menuTextSize(.010,7,10),done?"#68777f":active?hero().color:"#d86c35","right");
   tx(t.client,left+48,y+38,menuTextSize(.009,7,10),"#9fa9ad","left");

   const loreSize=menuTextSize(.009,7,10),loreLine=loreSize*1.18;
   const loreRows=Math.min(3,drawWrapped(t.lore,left+12,y+57,bodyChars,loreLine,loreSize,"#aeb6b8","left"));
   let cy=y+57+loreRows*loreLine+8;

   tx(t.weaponType+" · "+t.caliber,left+12,cy,menuTextSize(.010,7,10),"#d9b86c","left");cy+=18;
   tx("У "+t.spec.damage+"  ТОЧ "+t.spec.accuracy+"  МОБ "+t.spec.mobility+"  НАД "+t.spec.reliability,left+12,cy,menuTextSize(.009,7,10),"#7f8b90","left");cy+=17;

   const reqSize=menuTextSize(.0085,6,9),reqLine=reqSize*1.2;
   const reqRows=Math.min(2,drawWrapped("ТРЕБ.: "+t.requirements.join(" · "),left+12,cy,bodyChars,reqLine,reqSize,"#8d999d","left"));
   cy+=reqRows*reqLine+6;

   tx("$"+t.reward+" НАГРАДА · $"+t.advance+" АВАНС · $"+t.penalty+" ШТРАФ · "+t.durationHours+"Ч",left+12,cy,menuTextSize(.009,7,10),"#c6a86d","left");cy+=17;
   const riskSize=menuTextSize(.0085,6,9),riskLine=riskSize*1.2;
   drawWrapped("РИСК: "+t.risk,left+12,cy,bodyChars,riskLine,riskSize,"#9a6c55","left");
 });
 const bh=Math.min(38,H*.052),by=H-bh-H*.025;
 const enabledPrev=tenderPage>0,enabledNext=tenderPage<Math.ceil(TENDERS.length/3)-1;
 c.save();c.strokeStyle="#283136";c.lineWidth=1;c.fillStyle="rgba(10,14,16,.86)";
 c.beginPath();c.roundRect(W*.045,by,W*.18,bh,4);c.fill();c.stroke();
 c.beginPath();c.roundRect(W*.405,by,W*.19,bh,4);c.fill();c.stroke();
 c.beginPath();c.roundRect(W*.775,by,W*.18,bh,4);c.fill();c.stroke();c.restore();
 tx("‹",W*.135,by+bh*.68,menuTextSize(.028,18,26),enabledPrev?"#d86c35":"#394248","center");
 tx("НАЗАД",W/2,by+bh*.68,menuTextSize(.014,9,13),"#aeb6b8","center");
 tx("›",W*.865,by+bh*.68,menuTextSize(.028,18,26),enabledNext?"#d86c35":"#394248","center");
 c.restore();
}
function drawWeaponMenu(){
 const c=ctx!;c.save();const W=viewWidth,H=viewHeight;
 const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#eef5f7");bg.addColorStop(.52,"#e2eaee");bg.addColorStop(1,"#f5f7f8");c.fillStyle=bg;c.fillRect(0,0,W,H);
 c.globalAlpha=.15;c.fillStyle=hero().color;c.beginPath();c.arc(W*.08,H*.17,W*.20,0,Math.PI*2);c.fill();c.fillStyle="#e07b42";c.beginPath();c.arc(W*.94,H*.72,W*.18,0,Math.PI*2);c.fill();c.globalAlpha=1;
 const glass=(x:number,y:number,w:number,h:number,active=false)=>{c.save();c.shadowColor=active?"rgba(37,196,204,.28)":"rgba(42,61,72,.12)";c.shadowBlur=active?12:9;c.shadowOffsetY=5;const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,"rgba(255,255,255,.76)");g.addColorStop(.5,"rgba(248,252,253,.54)");g.addColorStop(1,active?"rgba(209,241,243,.58)":"rgba(222,232,237,.50)");c.fillStyle=g;c.beginPath();c.roundRect(x,y,w,h,Math.min(22,h*.34));c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle=active?"rgba(45,204,210,.88)":"rgba(255,255,255,.92)";c.lineWidth=1.4;c.stroke();c.fillStyle="rgba(255,255,255,.38)";c.beginPath();c.roundRect(x+3,y+3,w-6,Math.max(5,h*.12),Math.min(9,h*.07));c.fill();c.restore();};
 const button=(x:number,y:number,w:number,h:number,label:string,active=false)=>{glass(x,y,w,h,active);const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,active?"#56d8d8":"rgba(255,255,255,.82)");g.addColorStop(1,active?"#2cb6bd":"rgba(222,231,235,.72)");c.fillStyle=g;c.beginPath();c.roundRect(x+7,y+7,w-14,h-14,Math.min(17,h*.34));c.fill();c.strokeStyle="rgba(255,255,255,.72)";c.stroke();tx(label,x+w/2,y+h*.60,menuTextSize(.017,11,17),active?"#153b40":"#263740","center");if(active){c.fillStyle="#e69a45";c.beginPath();c.arc(x+w-19,y+h/2,5,0,Math.PI*2);c.fill();}};
 const margin=W*.07,top=H*.035,headerH=Math.min(48,H*.055);tx("АРСЕНАЛ",margin,top+headerH*.68,menuTextSize(.032,21,30),hero().color,"left");button(W*.76,top,W*.17,headerH,"×");
 const searchY=top+headerH+H*.018,searchH=Math.min(46,H*.055);glass(margin,searchY,W*.86,searchH);tx("⌕",margin+W*.035,searchY+searchH*.65,menuTextSize(.028,19,25),"#5b6d77","center");tx("Выберите оружие",margin+W*.095,searchY+searchH*.65,menuTextSize(.018,12,17),"#52636c","left");tx(String(weapons.length),W-margin-W*.035,searchY+searchH*.65,menuTextSize(.016,11,15),"#77858c","center");
 const bottomH=Math.min(52,H*.064),bottomY=H-bottomH-H*.025;button(W*.08,bottomY,W*.34,bottomH,"НАЗАД");button(W*.53,bottomY,W*.39,bottomH,"В БОЙ",true);
 const listTop=searchY+searchH+H*.018,listBottom=bottomY-H*.015;const gap=H*.007,cardH=Math.min(64,H*.075),left=margin,cardW=W-margin*2;
 c.save();c.beginPath();c.rect(0,listTop,W,listBottom-listTop);c.clip();
 weapons.forEach((w,i)=>{const y=listTop+i*(cardH+gap),owned=save.weapon>=i,active=save.weapon===i;glass(left,y,cardW,cardH,active);c.save();c.globalAlpha=owned?1:.30;drawWeaponSprite(i,left+cardW*.25,y+cardH*.50,0,Math.min(.54,cardW/740));c.restore();tx(String(i+1).padStart(2,"0"),left+cardW*.43,y+cardH*.24,menuTextSize(.012,8,12),active?hero().color:"#68777f","left");tx(weaponRu(w.name),left+cardW*.43,y+cardH*.47,menuTextSize(.018,12,17),"#20323a","left");tx("УРОН "+w.damage+" · МАГ "+w.mag+" · "+Math.round(w.rate*60)+"/МИН",left+cardW*.43,y+cardH*.68,menuTextSize(.009,7,10),"#64737a","left");const bw=cardW*.27,bh=Math.min(21,cardH*.24),bx=left+cardW*.69,by=y+cardH*.64;button(bx,by,bw,bh,owned?(active?"ВЫБРАНО":"ВЫБРАТЬ"):"ЗАКРЫТО",active);});
 c.restore();
 const contentH=weapons.length*(cardH+gap)-gap,viewport=listBottom-listTop;if(contentH>viewport){const trackH=viewport*.72,trackY=listTop+(viewport-trackH)/2,thumbH=Math.max(22,trackH*viewport/contentH);c.fillStyle="rgba(255,255,255,.45)";c.beginPath();c.roundRect(W*.955,trackY,W*.012,trackH,4);c.fill();c.fillStyle="rgba(65,180,188,.72)";c.beginPath();c.roundRect(W*.955,trackY,W*.012,thumbH,4);c.fill();}
 c.restore();
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
 if(mode==="shop"){mode="weaponMenu";return;}
 if(mode==="tenders"){if(e.key==="Escape"){mode="play";render();}return;}
 if(mode==="weaponMenu"){
   if(e.key>="1"&&e.key<="9"){const n=Number(e.key)-1;if(save.weapon>=n){save.weapon=n;storeSave();player.combat=createCombatState(HS_WEAPONS[n]);player.ammo=HS_WEAPONS[n].magazine;mode="play";render();}}
   if(e.key==="Escape"){mode="play";render();}
   return;
 }
 if(mode==="play"&&(e.key==="r"||e.key==="R"))startReload(player.combat,HS_WEAPONS[save.weapon]);
 if(mode==="play"&&(e.key==="g"||e.key==="G")){const g=throwHsGrenade(player.combat,player.x,player.y,aimAngle);if(g){grenades.push(g);say("ГРАНАТА","player",player.x,player.y-45);}}

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
 if(canvas&&mode==="weaponMenu"){
   const hit=(e:PointerEvent)=>{
     e.preventDefault();
     const r=canvas!.getBoundingClientRect();
     const x=e.clientX-r.left,y=e.clientY-r.top;
     const W=viewWidth,H=viewHeight,margin=W*.07,top=H*.035,headerH=Math.min(48,H*.055);
     const bottomH=Math.min(52,H*.064),bottomY=H-bottomH-H*.025;
     if(y>=bottomY){
       if(x>=W*.08&&x<=W*.42){mode="play";render();return;}
       if(x>=W*.53&&x<=W*.92){mode="play";render();return;}
     }
     const searchY=top+headerH+H*.018,searchH=Math.min(46,H*.055);
     const listTop=searchY+searchH+H*.018,listBottom=bottomY-H*.015;
     const gap=H*.007,cardH=Math.min(64,H*.075),left=margin,cardW=W-margin*2;
     if(x>=left&&x<=left+cardW&&y>=listTop&&y<listBottom){
       const n=Math.floor((y-listTop)/(cardH+gap));
       const inside=(y-listTop)-n*(cardH+gap);
       if(n>=0&&n<weapons.length&&inside<=cardH){
         if(save.weapon>=n){
           save.weapon=n;storeSave();
           player.combat=createCombatState(HS_WEAPONS[n]);
           player.ammo=HS_WEAPONS[n].magazine;
           mode="play";render();
         }
       }
     }
   };
   canvas.addEventListener("pointerup",hit);
 }
 root?.querySelectorAll<HTMLElement>("[data-hero]").forEach(el=>el.onclick=()=>{selected=el.dataset.hero as HeroId;render();});
 root?.querySelectorAll<HTMLElement>("[data-action]").forEach(el=>el.onclick=()=>{
   const a=el.dataset.action;
   if(a==="play"&&selected){mode="tenders";tenderPage=0;render();}
   if(a==="exit")exitToPortal();
   if(a==="menu"){returnToMainMenu();}
   if(a==="advance"){advanceDialogue();render();}
      if(a==="cheat"){activateCheatAll();}
      if(a==="advance"){advanceDialogue();render();}
   if(a==="shop"){mode="weaponMenu";render();}
   if(a==="weapon-menu"){mode="weaponMenu";render();}
   if(a==="tenders"){tenderPage=0;mode="tenders";render();}
   if(a==="tender-next"){tenderPage=Math.min(Math.ceil(TENDERS.length/3)-1,tenderPage+1);render();}
   if(a==="tender-prev"){tenderPage=Math.max(0,tenderPage-1);render();}
   if(a==="tender"){const id=el.dataset.tender||"";const t=tenderById(id);if(t&&!(save.completedTenders||[]).includes(t.id)){save.activeTenderId=t.id;save.arenaMissionIndex=0;const mi=allMissions.findIndex(m=>m.id===t.linkedMission);if(mi>=0){missionIndex=mi;if(allMissions[mi].hero!=="shared")selected=allMissions[mi].hero;}save.hero=selected;arenaTaskSetup();mode="arena";storeSave();render();}}
   if(a==="select-weapon"){const n=Number(el.dataset.weapon);if(save.weapon>=n){save.weapon=n;storeSave();player.combat=createCombatState(HS_WEAPONS[n]);player.ammo=HS_WEAPONS[n].magazine;mode="play";render();}}
   if(a==="weapon-back"){mode="play";render();}
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
   ui.innerHTML='<div class="mafia-select-grid">'+(["antonio","massimo","salvatore","giuseppe"] as HeroId[]).map(id=>'<button class="'+(id===selected?"selected":"")+'" aria-label="Выбрать '+heroes[id].name+'" data-hero="'+id+'"></button>').join("")+'</div><div class="mafia-menu-actions"><button data-action="play" '+(selected?"":"disabled")+'>ИГРАТЬ</button><button data-action="exit">ВЫХОД</button><button data-action="tenders">ТЕНДЕРЫ</button><button data-action="cheat">ЧИТ: ВСЁ</button></div>';
 }else if(mode==="family"){
   ui.innerHTML='<div class="mafia-action"><button data-action="menu">ГЛАВНОЕ МЕНЮ</button><button data-action="advance">ПРОПУСТИТЬ</button></div>';
 }else if(mode==="arena"){
   ui.innerHTML=save.activeTenderId?'<div class="mafia-action"><button data-action="advance">НАЧАТЬ МИССИЮ</button><button data-action="tenders">ТЕНДЕРЫ</button></div>':'<div class="mafia-action"><button data-action="tenders">ВЫБРАТЬ ТЕНДЕР</button><button data-action="menu">ГЛАВНОЕ МЕНЮ</button></div>';
 }else if(mode==="play"){
   ui.innerHTML='<div class="mafia-touch-move" aria-label="Сенсор движения"><span class="mafia-touch-stick"></span></div><div class="mafia-combat-buttons"><button data-action="weapon-menu">ОРУЖИЕ</button><button data-action="special">СПЕЦ</button></div><div class="mafia-aim-sensor" aria-label="Сенсор стрельбы"><span class="mafia-aim-ring"></span><span class="mafia-aim-dot"></span></div><div class="mafia-game-menu"><button data-action="tenders">ТЕНДЕРЫ</button><button data-action="menu">МЕНЮ</button></div>';
  }else if(mode==="weaponMenu"){
    // Weapon menu is rendered entirely on canvas; no legacy DOM overlay.
    ui.innerHTML="";
  }else if(mode==="tenders"){
    ui.innerHTML=TENDERS.slice(tenderPage*3,tenderPage*3+3).map((t,i)=>`<button class="mafia-tender-hit" data-action="tender" data-tender="${t.id}" style="position:absolute;left:4.5%;right:4.5%;top:${12+i*26.0}%;height:22%;opacity:0;appearance:none;border:0;background:transparent;outline:none;box-shadow:none"></button>`).join("")+`<button data-action="tender-prev" style="position:absolute;left:0;bottom:2%;width:20%;height:7%;opacity:0">‹</button><button data-action="menu" style="position:absolute;left:40%;bottom:2%;width:20%;height:7%;opacity:0">НАЗАД</button><button data-action="tender-next" style="position:absolute;right:0;bottom:2%;width:20%;height:7%;opacity:0">›</button>`;
  }else{
   ui.innerHTML='<div class="mafia-action"><button data-action="menu">ГЛАВНОЕ МЕНЮ</button><button data-action="advance">'+(dialogueOpen?"ПРОДОЛЖИТЬ":mode==="shop"?"НАЗАД":"НАЧАТЬ / ПРОДОЛЖИТЬ")+'</button></div>';
 }
 bindButtons();renderCanvas();
}
function updateCombatButtonLabels(){
 if(!root||mode!=="play")return;
 const special=root.querySelector<HTMLElement>('[data-action="special"]');
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
function spawnArenaWave(){
 arenaWave++;arenaSpawnTimer=0;
 const types:EnemyType[]=arenaMission?.enemies?.length?(arenaMission.enemies as EnemyType[]):["guard","rusher","shooter"];
 const count=Math.min(10,3+Math.floor(arenaWave*.65));
 const spots=[[140,150],[300,170],[500,145],[700,170],[860,150],[220,330],[500,300],[780,330]];
 for(let i=0;i<count;i++){
  const type=types[(i+arenaWave)%types.length],hp=42+(i%3)*16+arenaWave*3,[x,y]=spots[(i+arenaWave*2)%spots.length];
  enemies.push({type,x,y,hp,maxHp:hp,vx:0,vy:0,cool:30+i*9,shootCool:70+i*13,dir:i%2?1:-1,ai:{state:"idle",alert:0,think:i*2,strafe:i%2?1:-1,lastSeenX:x,lastSeenY:y}});
 }
}
