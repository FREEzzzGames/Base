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
interface SiegeTower{x:number;y:number;team:"player"|"enemy";hp:number;maxHp:number;lane:number;cool:number}
interface SiegeBase{x:number;y:number;team:"player"|"enemy";hp:number;maxHp:number}
interface SiegeMob{x:number;y:number;team:"player"|"enemy";lane:number;hp:number;maxHp:number;speed:number;damage:number;cool:number;attackRange:number;type:"brawler"|"shooter"|"sniper";targetX:number;targetY:number;strafe:number;think:number;morale:number;role:number;retreating:boolean;burst:number;burstCool:number;assist:number;anim:number;animState:"idle"|"run"|"strafe"|"attack"|"hit"|"retreat"|"death";animSpeed:number;hitFlash:number;attackFx:number;stepFx:number;path:Array<[number,number]>;pathIndex:number;pathTimer:number;spawnGrace:number;scatterX:number;scatterY:number}
interface Bullet{x:number;y:number;vx:number;vy:number;from:"player"|"enemy";life:number;damage:number;penetration:number;weaponId:string;shotId:number;hitIds:Set<number>}
interface GrenadeFx{x:number;y:number;vx:number;vy:number;life:number;radius:number;damage:number}
interface ArenaPickup{x:number;y:number;kind:"medkit"|"weapon";weapon?:number;amount:number;life:number}
interface Player{x:number;y:number;vx:number;vy:number;hp:number;maxHp:number;armor:number;ammo:number;grounded:boolean;cool:number;ability:number;weaponSwap:number;facing:number;medkits:number;combat:HsCombatState}
interface Save{hero:HeroId|null;rank:number;xp:number;money:number;weapon:number;armor:number;weaponInventory:number[];medkits:number;activeTenderId?:string;completed:string[];completedTenders?:string[];arenaMissionIndex?:number;storySeen?:Partial<Record<HeroId,boolean>>;resumeMission?:Partial<Record<HeroId,string>>;resumeFloor?:Partial<Record<HeroId,number>>}

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
 const fs=Math.max(12,Math.min(17,viewWidth*.032));
 ctx!.save();ctx!.font="700 "+fs+"px \"Nothing Font\",monospace";
 const width=Math.min(viewWidth*.82,Math.max(150,ctx!.measureText(speech.text).width+34));
 const bx=(viewWidth-width)/2,by=88;
 ctx!.textAlign="center";ctx!.textBaseline="middle";
 ctx!.fillStyle="rgba(4,9,12,.94)";ctx!.strokeStyle=speech.kind==="player"?hero().color:"#ff9a52";ctx!.lineWidth=2;
 ctx!.beginPath();ctx!.rect(bx,by,width,fs*2.0);ctx!.fill();ctx!.stroke();
 ctx!.fillStyle="#f5f7f6";ctx!.fillText(speech.text,viewWidth/2,by+fs);
 ctx!.restore();speech.timer--;
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
let save:Save={hero:null,rank:0,xp:0,money:0,weapon:0,armor:0,weaponInventory:[0],medkits:0,completed:[],completedTenders:[],arenaMissionIndex:0,storySeen:{},resumeMission:{},resumeFloor:{}};
let player:Player={x:80,y:360,vx:0,vy:0,hp:100,maxHp:100,armor:0,ammo:12,grounded:false,cool:0,ability:0,weaponSwap:0,facing:1,medkits:0,combat:createCombatState(HS_WEAPONS[0])};
let enemies:Enemy[]=[],bullets:Bullet[]=[],grenades:GrenadeFx[]=[],arenaPickups:ArenaPickup[]=[];
let arenaPickupTimer=0;
let siegeTowers:SiegeTower[]=[];
let siegeBases:SiegeBase[]=[];
let siegeMobs:SiegeMob[]=[];
let siegeWave=0;
let siegeWaveTimer=0;
let siegeMessage="";
let siegeOver=false;
let floor=0,floorTimer=0,objectiveProgress=0,flash=0,damagePulse=0,criticalPulse=0;
let touch={left:false,right:false,jump:false,ability:false};
let movePointerId:number|null=null;
let moveX=0,moveY=0;
let aimAngle=-Math.PI/4,aimActive=false,aimPointerId:number|null=null;
const completedKey="freezzz:mafia-save:v2";

function loadSave(){try{const s=JSON.parse(localStorage.getItem(completedKey)||"");if(s&&typeof s==="object")save={...save,...s,activeTenderId:s.activeTenderId||undefined,completedTenders:s.completedTenders||[],arenaMissionIndex:typeof s.arenaMissionIndex==="number"?s.arenaMissionIndex:0,storySeen:s.storySeen||{},resumeMission:s.resumeMission||{},resumeFloor:s.resumeFloor||{},weaponInventory:Array.isArray(s.weaponInventory)&&s.weaponInventory.length?s.weaponInventory:[0],medkits:Math.max(0,Math.min(5,Number(s.medkits)||0))};}catch{}}
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
function drawAlienHero(id:HeroId,cx:number,ground:number,frame:number,scale=1,menu=false){
 if(!ctx)return;
 const cfg={
  antonio:{body:"#1f4d55",skin:"#69c8c5",accent:"#54d6d8",size:1.0,crest:"#9cf3f0"},
  massimo:{body:"#5a3f25",skin:"#d59a62",accent:"#e3a64f",size:1.15,crest:"#ffd27b"},
  salvatore:{body:"#3b315d",skin:"#9a7fbd",accent:"#a980ff",size:.82,crest:"#d5bdff"},
  giuseppe:{body:"#263f39",skin:"#79a88f",accent:"#65e0b0",size:1.02,crest:"#a5ffe0"}
 }[id];
 const s=scale*cfg.size,step=Math.sin(frame*.18)*2.2;
 ctx.save();ctx.translate(Math.round(cx),Math.round(ground));ctx.scale(s,s);
 ellipse(0,2,30,8,"rgba(0,0,0,.55)");
 // Anatomical rig: feet -> shins -> knees -> thighs -> pelvis -> torso -> shoulders -> forearms -> hands.
 limb(-7,-7,-10+step,-24,6,"#162327");limb(7,-7,10-step,-24,6,"#162327");
 ellipse(-10+step,-25,5,5,"#66757a");ellipse(10-step,-25,5,5,"#66757a");
 limb(-10,-28,-13,-48,7,cfg.body);limb(10,-28,13,-48,7,cfg.body);
 ellipse(-13,-49,6,6,"#8a9698");ellipse(13,-49,6,6,"#8a9698");
 poly([-18,-48,-14,-57,-6,-61,0,-58,6,-61,14,-57,18,-48,12,-13,0,-7,-12,-13],cfg.body);
 ellipse(0,-12,9,5,cfg.accent);
 limb(-17,-45,-30,-29,6,cfg.body);limb(17,-45,30,-29,6,cfg.body);
 ellipse(-31,-28,5,5,cfg.skin);ellipse(31,-28,5,5,cfg.skin);
 line(-33,-27,-37,-22,cfg.crest,3);line(33,-27,37,-22,cfg.crest,3);
 poly([-18,-33,-14,-51,-6,-57,0,-54,6,-57,14,-51,18,-33,12,-10,0,-5,-12,-10],cfg.body);
 rect(-20,-39,40,5,"#11191c");rect(-16,-43,32,4,cfg.accent);
 ellipse(0,-63,12,15,cfg.skin);poly([-12,-66,-7,-75,0,-79,7,-75,12,-66,9,-58,-9,-58],cfg.body);
 rect(-8,-65,16,5,cfg.crest);ellipse(-5,-64,2.5,2.5,cfg.accent);ellipse(5,-64,2.5,2.5,cfg.accent);
 // Hero-specific equipment.
 if(id==="antonio"){rect(-25,-25,8,22,cfg.accent);rect(17,-25,8,22,cfg.accent);ellipse(0,-28,4,8,cfg.crest);}
 if(id==="massimo"){rect(-29,-35,7,29,cfg.accent);rect(22,-35,7,29,cfg.accent);poly([-7,-13,7,-13,4,3,-4,3],cfg.accent);}
 if(id==="salvatore"){line(-20,-29,-31,-8,cfg.accent,4);line(20,-29,31,-8,cfg.accent,4);ellipse(0,-29,6,6,cfg.crest);}
 if(id==="giuseppe"){rect(-27,-22,9,16,cfg.accent);rect(18,-22,9,16,cfg.accent);line(-12,-26,12,-26,cfg.crest,2);}
 if(menu){ellipse(0,-86,18,3,"rgba(84,214,216,.10)");}
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
 rect(8,8,viewWidth-16,58,"rgba(3,8,11,.97)");
 const fs=Math.max(11,Math.min(18,viewWidth*.021));const hp=Math.max(0,Math.round(player.hp)),max=Math.max(1,Math.round(player.maxHp));
 const hpColor=hp/max<=.3?"#ff5b55":hp/max<=.55?"#ffd36b":"#f0f5f3";
 tx("CARGO",16,17,fs*.82,hero().color);tx("COMBAT",viewWidth*.38,17,fs*.82,"#f0eee7","center");
 tx("HP "+hp+"/"+max,viewWidth*.66,17,fs*.92,hpColor,"center");tx("MAG "+player.combat.ammo+"/"+player.combat.reserve,viewWidth-16,17,fs*.82,hero().color,"right");
 rect(16,29,viewWidth*.30,7,"rgba(255,255,255,.10)");rect(16,29,viewWidth*.30*clamp(hp/max,0,1),7,hpColor);
 tx("WAVE "+siegeWave,16,48,fs*.78,"#ffe08a");tx(arenaTaskLabel+" · "+arenaTaskProgress+"/"+arenaTaskTarget,viewWidth-16,48,fs*.70,hero().color,"right");
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
const ARENA_W=1000,ARENA_H=2600;
const ARENA_CARGO:{x:number;y:number;w:number;h:number}[]=[
 {x:112,y:390,w:170,h:86},{x:720,y:390,w:170,h:86},
 {x:110,y:790,w:150,h:74},{x:740,y:790,w:150,h:74},
 {x:120,y:1210,w:180,h:88},{x:700,y:1210,w:180,h:88},
 {x:105,y:1680,w:165,h:82},{x:730,y:1680,w:165,h:82},
 {x:120,y:2100,w:170,h:86},{x:710,y:2100,w:170,h:86}
];
function arenaObstacles(){
 const out=ARENA_CARGO.map(o=>({...o}));
 for(const t of siegeTowers)if(t.hp>0)out.push({x:t.x-34,y:t.y-48,w:68,h:62});
 for(const b of siegeBases)if(b.hp>0)out.push({x:b.x-108,y:b.y-48,w:216,h:92});
 return out;
}
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
 const minY=arena?180:r,maxY=arena?2520-r:(arena?ARENA_H-r:topDownMap().h-r);
 const W=arena?ARENA_W:topDownMap().w;
 const obs=arena?arenaObstacles():topDownObstacles();
 const maxMove=Math.max(Math.abs(dx),Math.abs(dy));
 const steps=Math.max(1,Math.ceil(maxMove/4));
 const sx=dx/steps,sy=dy/steps;
 for(let i=0;i<steps;i++){
  // X sweep: find the furthest safe point before contact.
  const tx=clamp(x+sx,r,W-r);
  if(!obs.some(o=>circleRectHit(tx,y,r,o)))x=tx;
  else{
   let lo=0,hi=1;
   for(let k=0;k<7;k++){const mid=(lo+hi)*.5;if(!obs.some(o=>circleRectHit(clamp(x+sx*mid,r,W-r),y,r,o)))lo=mid;else hi=mid;}
   x=clamp(x+sx*lo,r,W-r);
  }
  // Y sweep uses the updated X, producing natural wall sliding at corners.
  const ty=clamp(y+sy,minY,maxY);
  if(!obs.some(o=>circleRectHit(x,ty,r,o)))y=ty;
  else{
   let lo=0,hi=1;
   for(let k=0;k<7;k++){const mid=(lo+hi)*.5;if(!obs.some(o=>circleRectHit(x,clamp(y+sy*mid,minY,maxY),r,o)))lo=mid;else hi=mid;}
   y=clamp(y+sy*lo,minY,maxY);
  }
 }
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
 // Portrait combat camera: keep the whole active squad around the hero.
 const scale=Math.max(.62,Math.min(1.08,Math.min(viewWidth/420,viewHeight/780)));
 const camX=clamp(player.x-viewWidth/(2*scale),0,Math.max(0,ARENA_W-viewWidth/scale));
 const camY=clamp(player.y-viewHeight/(2*scale),0,Math.max(0,ARENA_H-viewHeight/scale));
 ctx.save();ctx.scale(scale,scale);ctx.translate(-camX,-camY);
 drawArenaBackground();
 // Top-down painter's order: entities are sorted by their physical Y anchor,
 // so cargo structures correctly occlude characters instead of simply stacking by code order.
 const actors:{y:number;draw:()=>void}[]=[];
 siegeTowers.forEach(t=>actors.push({y:t.y,draw:()=>drawSiegeTower(t)}));
 siegeBases.forEach(b=>actors.push({y:b.y,draw:()=>drawSiegeBase(b)}));
 siegeMobs.forEach(m=>actors.push({y:m.y,draw:()=>drawAlienCombatant(m)}));
 arenaPickups.forEach(p=>actors.push({y:p.y,draw:()=>drawArenaPickup(p)}));
 enemies.forEach(e=>actors.push({y:e.y,draw:()=>drawEnemy(e)}));
 actors.push({y:player.y,draw:drawPlayer});
 actors.sort((a,b)=>a.y-b.y);actors.forEach(a=>a.draw());
 grenades.forEach(g=>{ellipse(g.x,g.y,Math.max(5,g.radius*(1-g.life/70)),Math.max(5,g.radius*(1-g.life/70)),"rgba(207,110,53,.10)");ellipse(g.x,g.y,6,6,"#6e6f62");});
 bullets.forEach(b=>{line(b.x-b.vx*1.8,b.y-b.vy*1.8,b.x,b.y,b.from==="player"?hero().color:"#d86c35",Math.max(1,1.2));rect(b.x-2,b.y-2,4,4,b.from==="player"?hero().color:"#d86c35");});
 ctx.restore();drawHudOverlay(m);drawSpeech();
 if(damagePulse>0||criticalPulse>0){
  const p=Math.max(damagePulse,criticalPulse*(.55+.45*Math.sin(frame*.18)*.5));
  const g=ctx!.createRadialGradient(viewWidth/2,viewHeight/2,Math.min(viewWidth,viewHeight)*.28,viewWidth/2,viewHeight/2,Math.max(viewWidth,viewHeight)*.72);
  g.addColorStop(0,"rgba(255,40,40,0)");g.addColorStop(.72,"rgba(255,45,45,"+(p*.10)+")");g.addColorStop(1,"rgba(255,25,25,"+(p*.48)+")");
  ctx!.fillStyle=g;ctx!.fillRect(0,0,viewWidth,viewHeight);damagePulse=Math.max(0,damagePulse-.045);
  if(player.hp/player.maxHp>.32)criticalPulse=Math.max(0,criticalPulse-.035);
 }
 if(flash>0){rect(0,0,viewWidth,viewHeight,"rgba(255,255,255,"+Math.min(.12,flash)+")");flash-=.02;}
}
function drawArenaBackground(){
 if(!ctx)return;
 rect(0,0,ARENA_W,ARENA_H,"#05080d");
 for(let i=0;i<180;i++){const x=(i*137+Math.floor(frame*.12))%ARENA_W,y=(i*83+Math.floor(frame*.035))%ARENA_H;if(x<70||x>930)rect(x,y,1+(i%3===0?1:0),1,"rgba(180,220,255,"+(.28+(i%5)*.09)+")");}
 rect(68,0,864,ARENA_H,"#222b30");rect(82,0,836,ARENA_H,"#303a3e");
 for(let y=0;y<ARENA_H;y+=72)line(82,y,918,y,"rgba(190,215,218,.08)",1);
 for(let x=82;x<=918;x+=64)line(x,0,x,ARENA_H,"rgba(0,0,0,.12)",1);
 const lanes=[250,500,750];
 lanes.forEach((x,i)=>{rect(x-58,180,116,2340,i===1?"rgba(64,180,188,.075)":"rgba(10,20,24,.12)");line(x,180,x,2520,i===1?"rgba(82,218,226,.28)":"rgba(190,210,210,.10)",2);for(let y=220;y<2480;y+=180)rect(x-48,y,96,3,i===1?"rgba(85,220,226,.18)":"rgba(200,220,220,.07)");});
 ARENA_CARGO.forEach(({x,y,w,h},i)=>{rect(x+7,y+8,w,h,"rgba(0,0,0,.35)");rect(x,y,w,h,i%3===0?"#45545a":i%3===1?"#3e4b50":"#4b4b55");rect(x+8,y+8,w-16,7,i%2?"#6c8589":"#657276");for(let k=1;k<4;k++)line(x+k*w/4,y+18,x+k*w/4,y+h-8,"rgba(10,15,17,.35)",2);rect(x+14,y+h-15,w-28,4,"rgba(77,211,220,.25)");});
 for(const yy of [520,1010,1510,1980,2380]){line(90,yy,910,yy,"#17282d",12);line(90,yy,910,yy,"rgba(75,211,220,.22)",3);for(let x=120;x<900;x+=95)ellipse(x,yy,4,4,"rgba(104,235,239,.65)");}
 rect(0,0,68,ARENA_H,"#03060a");rect(932,0,68,ARENA_H,"#03060a");
 for(let y=0;y<ARENA_H;y+=110){line(55,y,68,y+22,"#52636a",2);line(932,y+22,945,y,"#52636a",2);}
 rect(82,70,836,98,"#151d21");rect(102,88,796,62,"#25343a");rect(102,88,260,62,"#234c53");rect(638,88,260,62,"#4a3038");tx("CARGO DECK // COMBAT ZONE",500,109,17,"#d8e3e3","center");
 rect(82,ARENA_H-168,836,98,"#151d21");rect(102,ARENA_H-150,796,62,"#25343a");tx("CARGO CORE // DEFENSE LINE",500,ARENA_H-127,16,"#d8e3e3","center");
 line(82,180,918,180,"#708083",3);line(82,2520,918,2520,"#708083",3);
 tx("LANE 01",250,218,12,"rgba(180,215,218,.55)","center");tx("LANE 02",500,218,12,"rgba(180,215,218,.55)","center");tx("LANE 03",750,218,12,"rgba(180,215,218,.55)","center");
}
function initSiege(){
 siegeTowers=[];siegeBases=[];siegeMobs=[];siegeWave=0;siegeWaveTimer=0;siegeOver=false;siegeMessage="";
 const lanes=[250,500,750];
 lanes.forEach((x,lane)=>{
  siegeTowers.push({x,y:340,team:"enemy",lane,hp:900,maxHp:900,cool:0});
  siegeTowers.push({x,y:2320,team:"player",lane,hp:900,maxHp:900,cool:0});
 });
 siegeBases.push({x:500,y:220,team:"enemy",hp:2600,maxHp:2600});
 siegeBases.push({x:500,y:2470,team:"player",hp:2600,maxHp:2600});
 // Player and both teams are created in the same encounter transaction.
 spawnSiegeWave();
}
function spawnSiegeWave(){
 if(siegeOver)return;
 siegeWave++;siegeWaveTimer=0;

 // Один спавн на команду. Линий спавна больше нет.
 // Все бойцы появляются у центра своей базы, после чего расходятся по карте.
 const formation:("brawler"|"brawler"|"brawler"|"shooter"|"shooter"|"sniper")[]=[
  "brawler","brawler","brawler","shooter","shooter","sniper"
 ];
 const spawnPoints={
  enemy:{x:500,y:1880},
  player:{x:500,y:2240}
 };
 // Compact combat line: enemies start inside the initial camera window instead
 // of 2,000+ world units away from the player.
 const enemyScatter=[
  [170,1940],[350,2020],[500,2080],[650,2020],[830,1940],[500,1870]
 ];
 const playerScatter=[
  [170,2180],[350,2220],[500,2260],[650,2220],[830,2180],[500,2140]
 ];
 formation.forEach((type,i)=>{
  const waveScale=siegeWave-1;
  const hp=(type==="brawler"?105:type==="shooter"?78:64)+waveScale*7;
  const damage=type==="brawler"?24:type==="shooter"?15:28;
  const speed=type==="brawler"?1.38:type==="shooter"?1.05:.78;
  const range=type==="brawler"?42:type==="shooter"?210:430;
  for(const team of ["enemy","player"] as const){
   const s=spawnPoints[team];
   const dir=team==="enemy"?1:-1;
   const spread=(i-2.5)*13;
   const sx=s.x+spread,sy=s.y+dir*(i%3)*14;
   const target=team==="enemy"?enemyScatter[i]:playerScatter[i];
   const common={
    lane:-1,hp,maxHp:hp,speed,damage,cool:25+i*7,type,attackRange:range,
    targetX:target[0],targetY:target[1],strafe:i%2?1:-1,think:i*8,
    morale:100,role:i<3?0:i<5?1:2,retreating:false,burst:0,
    burstCool:20+i*5,assist:0,anim:Math.random()*6.28,animState:"idle" as const,
    animSpeed:.08,hitFlash:0,attackFx:0,stepFx:Math.random()*6.28,
    path:[],pathIndex:0,pathTimer:0,spawnGrace:150,scatterX:target[0],
    scatterY:target[1]
   };
   siegeMobs.push({x:sx,y:sy,team,...common});
  }
 });
}
function drawSiegeTower(t:SiegeTower){
 const alive=t.hp>0,teamColor=t.team==="player"?hero().color:"#ff557d";
 if(alive){ctx!.save();ctx!.globalAlpha=.20;ctx!.shadowColor=teamColor;ctx!.shadowBlur=20;ellipse(t.x,t.y-28,40,52,teamColor);ctx!.restore();}
 ellipse(t.x,t.y+8,43,13,"rgba(0,0,0,.35)");rect(t.x-30,t.y-52,60,58,alive?"#3b4b50":"#252b2e");
 poly([t.x-30,t.y-52,t.x-18,t.y-76,t.x+18,t.y-76,t.x+30,t.y-52],alive?"#536a70":"#343b3e");
 rect(t.x-20,t.y-68,40,9,teamColor);ellipse(t.x,t.y-32,13,13,alive?"#8ce9ec":"#444b4d");if(alive)ellipse(t.x,t.y-32,6,6,teamColor);
 rect(t.x-35,t.y-91,70,6,"#101619");if(alive)rect(t.x-35,t.y-91,70*clamp(t.hp/t.maxHp,0,1),6,teamColor);
 tx("NODE "+String(t.lane+1),t.x,t.y+17,11,alive?teamColor:"#697174","center");
}
function drawSiegeBase(b:SiegeBase){
 const alive=b.hp>0,teamColor=b.team==="player"?hero().color:"#ff557d";
 if(alive){ctx!.save();ctx!.globalAlpha=.16;ctx!.shadowColor=teamColor;ctx!.shadowBlur=24;ellipse(b.x,b.y-28,118,58,teamColor);ctx!.restore();}
 rect(b.x-116,b.y-38,232,76,alive?"#202e33":"#20282b");rect(b.x-96,b.y-62,192,20,teamColor);
 poly([b.x-58,b.y-38,b.x-30,b.y-78,b.x+30,b.y-78,b.x+58,b.y-38],alive?"#536b70":"#373e40");
 ellipse(b.x,b.y-38,19,19,alive?"#8ce9ec":"#454c4d");if(alive)ellipse(b.x,b.y-38,9,9,teamColor);
 rect(b.x-116,b.y+48,232,8,"#101619");if(alive)rect(b.x-116,b.y+48,232*clamp(b.hp/b.maxHp,0,1),8,teamColor);
 tx(alive?(b.team==="player"?"CARGO CORE":"HOST CORE"):"CORE OFFLINE",b.x,b.y+63,13,alive?teamColor:"#777f81","center");
}
function drawSiegeStructures(){siegeTowers.forEach(drawSiegeTower);siegeBases.forEach(drawSiegeBase);}
function drawRobotMob(x:number,y:number,kind:string,scale:number,accent:string,state:string,anim:number,hp:number,maxHp:number,weapon:boolean,hitFlash=0){
 if(!ctx)return;
 const moving=state==="run"||state==="strafe"||state==="retreat";
 const attacking=state==="attack";
 const hitState=state==="hit";
 const walk=moving?Math.sin(anim)*4:0;
 const bob=moving?Math.abs(Math.sin(anim))*.9:(attacking?Math.sin(anim*1.7)*1.2:0);
 const hit=hitFlash>0||hitState;
 const body="#394247",dark="#1a2225",mid="#566268",metal="#7f8d91",light="#b6c0c0";
 ctx.save();
 ctx.translate(x,y+bob);
 ctx.scale(scale,scale);
 ctx.globalAlpha=hit?.72:1;
 ctx.lineJoin="round";
 ctx.lineCap="round";
 ellipse(0,5,25,7,"rgba(0,0,0,.52)");

 if(kind==="rusher"||kind==="flanker"){
   // Low multi-legged machine: spider/insect silhouettes from the reference sheets.
   const legCol=kind==="rusher"?dark:"#263337";
   const legs=kind==="rusher"?4:6;
   for(let i=0;i<legs;i++){
     const side=i%2?-1:1;
     const row=Math.floor(i/2);
     const ox=side*(8+row*5), oy=-2+row*7;
     const lift=Math.sin(anim*.9+i)*2;
     limb(ox,oy,side*(19+row*6),8+row*5+lift,4,legCol);
     line(side*(19+row*6),8+row*5+lift,side*(27+row*5),4+row*8+lift,legCol,3);
   }
   if(kind==="rusher"){
     ellipse(0,-20,20,15,body);poly([-20,-20,-11,-31,4,-35,20,-25,17,-10,-8,-8],mid);
     ellipse(6,-23,9,7,dark);ellipse(8,-24,3,3,accent);
     line(-6,-30,-13,-39,metal,2);line(1,-32,4,-42,metal,2);
   }else{
     poly([-22,-19,-11,-32,10,-31,23,-16,15,-5,-14,-6],dark);
     ellipse(0,-21,13,10,mid);ellipse(5,-23,5,5,dark);ellipse(5,-23,2.5,2.5,accent);
     rect(-8,-31,18,3,accent);
   }
 }else if(kind==="heavy"){
   // Tall industrial biped: broad shoulders, exposed joints and a boxy core.
   limb(-14,-8,-22+walk,-32,8,dark);limb(14,-8,22-walk,-32,8,dark);
   rect(-22,-42,44,35,body);rect(-15,-37,30,24,mid);
   rect(-10,-31,20,10,dark);rect(-6,-29,12,5,accent);
   ellipse(-22,-30,7,8,metal);ellipse(22,-30,7,8,metal);
   limb(-12,-6,-14+walk,-36,7,dark);limb(12,-6,14-walk,-36,7,dark);
   ellipse(-14+walk,-37,5,5,light);ellipse(14-walk,-37,5,5,light);
   rect(-10,-54,20,13,mid);rect(-7,-57,14,5,dark);ellipse(0,-52,5,5,accent);
   rect(-5,-66,10,9,metal);rect(-2,-72,4,7,light);
 }else if(kind==="guard"){
   // Compact sentry with a camera head and rectangular chassis.
   limb(-9,-8,-13+walk,-31,5,dark);limb(9,-8,13-walk,-31,5,dark);
   rect(-17,-34,34,29,body);rect(-13,-30,26,19,mid);
   rect(-10,-27,20,8,dark);ellipse(0,-23,5,5,accent);ellipse(0,-23,2,2,light);
   rect(-11,-47,22,13,metal);rect(-8,-44,16,7,dark);
   ellipse(-5,-41,3,3,accent);ellipse(5,-41,3,3,accent);
   line(0,-47,0,-56,light,2);ellipse(0,-59,3,3,accent);
   limb(-16,-24,-25,-10,4,dark);limb(16,-24,25,-10,4,dark);
 }else if(kind==="sniper"){
   // Long-legged observation platform / tripod silhouette.
   limb(-7,-5,-16+walk,-43,5,dark);limb(7,-5,16-walk,-43,5,dark);
   limb(-2,-5,0,-48,5,dark);
   ellipse(0,-50,6,6,metal);rect(-7,-69,14,17,body);
   rect(-5,-66,10,8,dark);ellipse(0,-62,4,4,accent);
   line(5,-61,29,-65,metal,3);rect(26,-68,13,6,mid);ellipse(39,-65,4,4,accent);
   line(0,-70,0,-79,light,2);ellipse(0,-82,3,3,accent);
 }else if(kind==="suppressor"){
   // Floating drone with articulated arms and a central sensor.
   ellipse(0,-26,22,18,body);ellipse(0,-28,13,10,mid);
   ellipse(0,-29,7,7,dark);ellipse(0,-29,3,3,accent);
   line(-18,-29,-29,-40,metal,4);line(18,-29,29,-40,metal,4);
   ellipse(-31,-42,6,6,light);ellipse(31,-42,6,6,light);
   line(-12,-14,-22,-2,dark,5);line(12,-14,22,-2,dark,5);
   ellipse(-24,1,5,5,metal);ellipse(24,1,5,5,metal);
   line(0,-44,0,-54,light,2);ellipse(0,-57,3,3,accent);
 }else if(kind==="flanker"){
   // Four-legged low-profile reconnaissance mech.
   const side=-1;
   limb(-14,-7,-25+walk,-25,5,dark);limb(14,-7,25-walk,-25,5,dark);
   limb(-9,-4,-15-walk,3,4,dark);limb(9,-4,15+walk,3,4,dark);
   poly([-20,-29,-8,-39,10,-37,21,-26,12,-12,-12,-12],body);
   rect(-11,-31,22,10,mid);ellipse(7,-27,5,5,dark);ellipse(8,-27,2.5,2.5,accent);
   line(-2,-37,-6,-45,light,2);ellipse(-6,-48,2.5,2.5,accent);
 }else{
   // Default shooter / brawler: modular humanoid robot.
   limb(-8,-6,-13+walk,-25,5,dark);limb(8,-6,13-walk,-25,5,dark);
   ellipse(-13+walk,-26,5,5,metal);ellipse(13-walk,-26,5,5,metal);
   limb(-13,-28,-16+walk,-43,7,body);limb(13,-28,16-walk,-43,7,body);
   ellipse(-16+walk,-44,5,5,light);ellipse(16-walk,-44,5,5,light);
   poly([-16,-43,-11,-50,-5,-54,0,-51,5,-54,11,-50,16,-43,12,-10,0,-6,-12,-10],body);
   ellipse(0,-11,8,4,accent);
   rect(-8,-29,16,8,dark);ellipse(0,-25,4,4,accent);
   rect(-10,-56,20,17,metal);rect(-7,-52,14,9,dark);
   ellipse(-5,-48,3,3,accent);ellipse(5,-48,3,3,accent);
   line(0,-56,0,-64,light,2);ellipse(0,-67,3,3,accent);
   limb(-15,-29,-27,-18,5,dark);limb(15,-29,27,-18,5,dark);
   ellipse(-28,-17,5,5,metal);ellipse(28,-17,5,5,metal);
 }
 if(weapon && (kind==="shooter"||kind==="sniper"||kind==="suppressor"||kind==="guard")){
   const wy=kind==="sniper"?-62:kind==="suppressor"?-18:-28;
   const wx=kind==="sniper"?18:kind==="suppressor"?18:16;
   const len=kind==="sniper"?42:31;
   line(wx,wy,wx+len,wy-3,metal,4);rect(wx+len-4,wy-6,9,7,mid);
   rect(wx+6,wy-2,13,3,accent);ellipse(wx+len+1,wy-3,3,3,accent);
   if(attacking){line(wx+len+2,wy-3,wx+len+10,wy-3,accent,2);}
 }
 ctx.restore();
 const hpW=36*scale;
 rect(x-hpW/2,y-92*scale,hpW,4,"#101619");
 rect(x-hpW/2,y-92*scale,hpW*clamp(hp/Math.max(1,maxHp),0,1),4,accent);
}

function drawAlienCombatant(m:SiegeMob){
 if(!ctx)return;
 const enemy=m.team==="enemy";
 const visualScale=enemy?1:.76;
 const accent=enemy
   ? (m.type==="brawler"?"#ff557d":m.type==="shooter"?"#ffb04f":"#cf7cff")
   : (m.type==="brawler"?"#54f2ee":m.type==="shooter"?"#5fe8ff":"#8eabff");
 let kind="sniper",scale=.82,weapon=true;
 if(m.type==="brawler"){kind=(m.role%2===0)?"heavy":"rusher";scale=kind==="heavy"?1.18:1.02;weapon=false;}
 else if(m.type==="shooter"){kind=(m.role%2===0)?"guard":"suppressor";scale=kind==="guard"?1.02:1.08;weapon=true;}
 ctx.save();
 ctx.globalAlpha=enemy?1:.58;ctx.shadowColor=accent;ctx.shadowBlur=18;
 ellipse(m.x,m.y-25*(scale*visualScale),31*(scale*visualScale),49*(scale*visualScale),accent);
 ctx.shadowBlur=0;
 drawRobotMob(m.x,m.y,kind,scale*visualScale,accent,m.animState,m.anim,m.hp,m.maxHp,weapon,m.hitFlash);
 ctx.restore();
}

function drawArenaPickup(p:ArenaPickup){
 const pulse=1+Math.sin(frame*.08+p.x)*.08;
 ctx!.save();ctx!.globalAlpha=.22;ctx!.shadowColor=p.kind==="medkit"?"#ff5b55":hero().color;ctx!.shadowBlur=18;ellipse(p.x,p.y,26*pulse,26*pulse,p.kind==="medkit"?"#ff5b55":hero().color);ctx!.restore();
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
 const suits:Record<EnemyType,string>={brawler:"#30383b",shooter:"#343c40",heavy:"#3f4548",rusher:"#273438",guard:"#394246",sniper:"#343c47",suppressor:"#3b4044",flanker:"#29383c"};
 const ties:Record<EnemyType,string>={brawler:"#ff557d",shooter:"#ffb04f",heavy:"#ffd06a",rusher:"#ff655c",guard:"#63e4eb",sniper:"#cf7cff",suppressor:"#e4b14e",flanker:"#65c9ff"};
 return {face:"#a8b2b3",tie:ties[type],suit:suits[type]};
}
function drawEnemy(e:Enemy){
 if(!ctx)return;
 const map:Record<EnemyType,{kind:string;scale:number;accent:string;weapon:boolean}>={
  brawler:{kind:"brawler",scale:1.18,accent:"#ff557d",weapon:false},
  shooter:{kind:"shooter",scale:.96,accent:"#ffb04f",weapon:true},
  heavy:{kind:"heavy",scale:1.34,accent:"#ffd06a",weapon:false},
  rusher:{kind:"rusher",scale:1.02,accent:"#ff655c",weapon:false},
  guard:{kind:"guard",scale:1.0,accent:"#63e4eb",weapon:true},
  sniper:{kind:"sniper",scale:.86,accent:"#cf7cff",weapon:true},
  suppressor:{kind:"suppressor",scale:1.08,accent:"#e4b14e",weapon:true},
  flanker:{kind:"flanker",scale:.9,accent:"#65c9ff",weapon:false}
 };
 const cfg=map[e.type];
 drawRobotMob(e.x,e.y,cfg.kind,cfg.scale,cfg.accent,e.ai.state,frame*.18,e.hp,e.maxHp,cfg.weapon,e.falling?0:0);
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
 if(ctx){ctx.save();ctx.globalAlpha=.22;ctx.shadowColor=hero().color;ctx.shadowBlur=18;ellipse(x,y-28*sc,34*sc,56*sc,hero().color);ctx.restore();}
 drawAlienHero(selected||"antonio",x,y,frame,sc,false);
 const handX=x+player.facing*31*sc;
 const handY=y-43*sc;
 const angle=aimAngle;
 const kick=Math.min(3.2,player.combat.recoil*.22);
 const wx=handX-Math.cos(angle)*kick,wy=handY-Math.sin(angle)*kick;
 drawWeaponSprite(save.weapon,wx,wy,angle,sc);
 const w=HS_WEAPONS[save.weapon],len=([32,38,42,49,55,61,66,58,78][save.weapon]||36)*sc;
 const muzzleX=wx+Math.cos(angle)*len,muzzleY=wy+Math.sin(angle)*len;
 drawWeaponEffects(ctx!,muzzleX,muzzleY,angle,sc,save.weapon,player.combat.fireTimer>w.fireInterval-4,hero().color);
 if(player.ability>0)tx(hero().ability,x,y-104*sc,Math.max(11,7*sc),hero().color,"center");
}
const ALIEN_ARENA_MISSION:ArenaMission={
 id:"ALIEN-CARGO-01",tenderId:"alien",order:1,title:"БОРТ КОРАБЛЯ",
 briefing:"Чужой экипаж захватил открытую грузовую платформу. Удержи CARGO CORE и уничтожь волну нападающих.",
 objective:"clear",target:8,reward:0,enemies:["brawler","shooter","sniper"],arenaRule:"CARGO DECK"
};
function arenaTaskSetup(){
 const tenderId=save.activeTenderId;
 const missions=tenderId?arenaMissionsForTender(tenderId):[];
 arenaMission=missions[save.arenaMissionIndex||0]||ALIEN_ARENA_MISSION;
 arenaTaskProgress=0;arenaTaskTimer=0;arenaWave=0;arenaKills=0;arenaSpawnTimer=0;
 arenaTaskTarget=arenaMission.target;
 const labels:Record<ArenaMission["objective"],string>={
  clear:"УНИЧТОЖИТЬ ВРАГОВ",
  survive:"ВЫЖИТЬ",
  reach:"ДОБРАТЬСЯ ДО ВЫХОДА",
  recover:"ЗАБРАТЬ ЦЕЛЬ",
  defend:"ЗАЩИТИТЬ CARGO CORE"
 };
 arenaTaskLabel=labels[arenaMission.objective]+" · "+arenaMission.target;
}
function startTenderMission(){beginSelected();}
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
   if(player.medkits>=5)continue;
   player.medkits=Math.min(5,player.medkits+1);
   save.medkits=player.medkits;
   arenaPickups.splice(i,1);
   say("+АПТЕЧКА · "+player.medkits,"player",player.x,player.y-48);
   storeSave();
  }else{
   if(typeof p.weapon!=="number")continue;
   const id=p.weapon;
   if(!save.weaponInventory.includes(id)){
    save.weaponInventory=[...save.weaponInventory,id].slice(0,8);
    arenaPickups.splice(i,1);
    say("ОРУЖИЕ В АРСЕНАЛ · "+HS_WEAPONS[id].name,"player",player.x,player.y-48);
    storeSave();
   }else{
    // Duplicate pickup becomes reserve ammunition instead of changing the equipped weapon.
    player.combat.reserve=Math.min(player.combat.reserve+HS_WEAPONS[id].magazine*2,HS_WEAPONS[id].magazine*12);
    player.ammo=player.combat.ammo;
    arenaPickups.splice(i,1);
    say("БОЕПРИПАСЫ · "+HS_WEAPONS[id].name,"player",player.x,player.y-48);
   }
  }
 }
 arenaPickups=arenaPickups.filter(p=>p.life>0);
}
function spawnFloor(){
 floorTimer=0;objectiveProgress=0;bullets=[];grenades=[];arenaWave=0;arenaKills=0;arenaTaskTimer=0;arenaSpawnTimer=0;
 // Spawn the hero first, then instantiate the exact same encounter tick for both factions.
 save.weaponInventory=Array.from(new Set([0,...(save.weaponInventory||[]),save.weapon])).slice(0,8);
player={x:500,y:2180,vx:0,vy:0,hp:100+save.armor*5,maxHp:100+save.armor*5,armor:save.armor*5,ammo:HS_WEAPONS[save.weapon].magazine,grounded:true,cool:0,ability:0,weaponSwap:0,facing:1,medkits:Math.max(0,Math.min(5,save.medkits||0)),combat:createCombatState(HS_WEAPONS[save.weapon])};
 if(!arenaMission)arenaTaskSetup();
 resetArenaPickups();initSiege();
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
 const owned=save.weaponInventory?.filter(n=>n>=0&&n<HS_WEAPONS.length)||[0];
 if(owned.length<2)return;
 const at=Math.max(0,owned.indexOf(save.weapon));
 const next=owned[(at+1)%owned.length];
 save.weapon=next;
 player.combat=createCombatState(HS_WEAPONS[next]);
 player.ammo=player.combat.ammo;
 player.weaponSwap=90;
 storeSave();
}
function useMedkit(){
 if(mode!=="play"||player.medkits<=0||player.hp>=player.maxHp)return;
 player.medkits--;
 player.hp=Math.min(player.maxHp,player.hp+40);
 save.medkits=player.medkits;
 storeSave();
 say("АПТЕЧКА · +40 HP","player",player.x,player.y-48);
}
function useAbility(){
 if(mode!=="play"||player.ability>0)return;
 player.ability=300;
 const h=hero().id;
 if(h==="antonio"){
   enemies.forEach(e=>{e.cool=Math.max(e.cool,110);e.shootCool=Math.max(e.shootCool,110);});
   for(const m of siegeMobs)if(m.team==="enemy"&&m.hp>0){m.cool=Math.max(m.cool,110);m.burstCool=Math.max(m.burstCool,110);m.think=Math.max(m.think,70);}
 }else if(h==="massimo"){
   const sc=portraitScale();
   const q=moveTopDown(player.x,player.y,player.facing*110*sc,0,18*sc);
   player.x=q[0];player.y=q[1];
   damagePulse=Math.max(damagePulse,.18);
 }else if(h==="salvatore"){
   enemies.forEach(e=>{e.vx*=.15;e.shootCool=Math.max(e.shootCool,150);});
   for(const m of siegeMobs)if(m.team==="enemy"&&m.hp>0){m.speed*=.15;m.cool=Math.max(m.cool,75);m.burstCool=Math.max(m.burstCool,75);}
 }else if(h==="giuseppe"){
   player.armor=Math.max(player.armor,player.maxHp*.35);
 }
}
function playDamageCue(critical=false){
 if(typeof window==="undefined")return;
 try{
  const AC=window.AudioContext||((window as any).webkitAudioContext);if(!AC)return;
  const ac=new AC(),o=ac.createOscillator(),g=ac.createGain();
  o.type="sawtooth";o.frequency.setValueAtTime(critical?145:210,ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(critical?72:115,ac.currentTime+.12);
  g.gain.setValueAtTime(critical?.065:.035,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.14);
  o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.15);setTimeout(()=>ac.close().catch(()=>{}),220);
 }catch{}
}
function hurt(amount:number){
 const blocked=Math.min(player.armor,amount*.5);player.armor-=blocked;player.hp=Math.max(0,player.hp-(amount-blocked));
 damagePulse=Math.min(1,damagePulse+.72);const critical=player.hp<=player.maxHp*.3;criticalPulse=critical?1:Math.max(criticalPulse,.35);flash=.22;playDamageCue(critical);
 if(player.hp<=0){player.hp=player.maxHp;player.armor=save.armor*5;damagePulse=1;criticalPulse=0;spawnFloor();}
}

function update(dt:number){
 frame++;
 speechCooldown=Math.max(0,speechCooldown-dt);
 if(speech)speech.timer-=dt;
 if(mode!=="play")return;
 const hpRatio=player.hp/Math.max(1,player.maxHp);if(hpRatio<=.30)criticalPulse=Math.min(1,criticalPulse+.035);else criticalPulse=Math.max(0,criticalPulse-.06);

 if(arenaMission){
  arenaTaskTimer+=dt;arenaSpawnTimer+=dt;updateSiege(dt);
  if(siegeOver)return;
  // CARGO DECK uses the siege runtime exclusively; no legacy wave spawner here.
  const [exitX,exitY]=topDownExit(),scale=portraitScale();
  const reachedExit=Math.hypot(player.x-exitX,player.y-exitY)<95*scale;
  const taskObjective=arenaMission?.objective||"clear";
  if(taskObjective==="reach"&&reachedExit)completeArenaTask();
 }
 if(frame%420===0){
  const lines=heroLines[selected||"antonio"];
  say(lines[Math.floor(Math.random()*lines.length)],"player",player.x,player.y-45);
 }

 const weapon=HS_WEAPONS[save.weapon];
 stepWeapon(player.combat,weapon,dt);
 player.ammo=player.combat.ammo;
 player.cool=player.combat.fireTimer;
 const abilityWasActive=player.ability>0;
 player.ability=Math.max(0,player.ability-dt);
 if(abilityWasActive&&player.ability===0){
  for(const m of siegeMobs)if(m.team==="enemy"&&m.hp>0)m.speed=m.type==="brawler"?1.38:m.type==="shooter"?1.05:.78;
 }
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
   for(const m of siegeMobs){
    if(m.team!=="enemy"||m.hp<=0)continue;
    const md=Math.hypot(m.x-g.x,m.y-g.y);
    if(md<g.radius){m.hp=Math.max(0,m.hp-g.damage*(1-md/g.radius));m.hitFlash=1;m.animState="hit";}
   }
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
function resolveSiegeMobCollisions(){
 const live=siegeMobs.filter(m=>m.hp>0);
 for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
  const a=live[i],b=live[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.001;
  const minDist=30;
  if(d>=minDist)continue;
  const push=(minDist-d)*.5,nx=dx/d,ny=dy/d;
  const ar=moveTopDown(a.x,a.y,-nx*push,-ny*push,18),br=moveTopDown(b.x,b.y,nx*push,ny*push,18);
  a.x=ar[0];a.y=ar[1];b.x=br[0];b.y=br[1];
 }
 const pr=22;
 for(const m of live){
  const dx=m.x-player.x,dy=m.y-player.y,d=Math.hypot(dx,dy)||.001,minDist=pr+18;
  if(d>=minDist)continue;
  const nx=dx/d,ny=dy/d,push=minDist-d;
  const q=moveTopDown(m.x,m.y,nx*push,ny*push,18);m.x=q[0];m.y=q[1];
 }
}
function siegeNearest(m:SiegeMob,predicate:(o:SiegeMob)=>boolean,visibleOnly=false){
 const obs=arenaObstacles();
 let best:SiegeMob|undefined,bestD=Infinity;
 for(const o of siegeMobs){
  if(o.team===m.team||o.hp<=0||!predicate(o))continue;
  const dx=o.x-m.x,dy=o.y-m.y,d2=dx*dx+dy*dy;
  if(d2>=bestD)continue;
  if(visibleOnly&&!lineOfSight(m.x,m.y,o.x,o.y,obs))continue;
  best=o;bestD=d2;
 }
 return best;
}
function siegeAttackable(m:SiegeMob){
 const obs=arenaObstacles();
 let best:SiegeMob|undefined,bestD=Infinity,maxD2=m.attackRange*m.attackRange;
 for(const o of siegeMobs){
  if(o.team===m.team||o.hp<=0)continue;
  const dx=o.x-m.x,dy=o.y-m.y,d2=dx*dx+dy*dy;
  if(d2>maxD2||d2>=bestD)continue;
  if(!lineOfSight(m.x,m.y,o.x,o.y,obs))continue;
  best=o;bestD=d2;
 }
 return best;
}
function siegeGridBlocked(gx:number,gy:number,cell:number){
 const x=gx*cell+cell*.5,y=gy*cell+cell*.5;
 if(x<24||x>ARENA_W-24||y<140||y>ARENA_H-140)return true;
 return arenaObstacles().some(o=>circleRectHit(x,y,22,o));
}
function siegeBuildPath(m:SiegeMob,targetX:number,targetY:number){
 const cell=50,cols=Math.ceil(ARENA_W/cell),rows=Math.ceil(ARENA_H/cell);
 const sx=Math.max(0,Math.min(cols-1,Math.floor(m.x/cell))),sy=Math.max(0,Math.min(rows-1,Math.floor(m.y/cell)));
 const txg=Math.max(0,Math.min(cols-1,Math.floor(targetX/cell))),tyg=Math.max(0,Math.min(rows-1,Math.floor(targetY/cell)));
 const start=sx+","+sy,goal=txg+","+tyg;
 const open:Array<{x:number;y:number;g:number;f:number;key:string;parent:string|null}>=[{x:sx,y:sy,g:0,f:Math.abs(txg-sx)+Math.abs(tyg-sy),key:start,parent:null}];
 const best=new Map<string,number>([[start,0]]);
 const parent=new Map<string,string|null>();
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
 let found:string|null=null;
 let guard=0;
 while(open.length&&guard++<2200){
  open.sort((p,q)=>p.f-q.f);
  const cur=open.shift()!;
  if(cur.key===goal){found=cur.key;parent.set(cur.key,cur.parent);break;}
  for(const [dx,dy] of dirs){
   const nx=cur.x+dx,ny=cur.y+dy;
   if(nx<0||ny<0||nx>=cols||ny>=rows||siegeGridBlocked(nx,ny,cell))continue;
   if(dx!==0&&dy!==0&&(siegeGridBlocked(cur.x+dx,cur.y,cell)||siegeGridBlocked(cur.x,cur.y+dy,cell)))continue;
   const key=nx+","+ny,g=cur.g+(dx&&dy?1.414:1);
   if(g>=(best.get(key)??Infinity))continue;
   best.set(key,g);parent.set(key,cur.key);
   open.push({x:nx,y:ny,g,f:g+Math.hypot(txg-nx,tyg-ny),key,parent:cur.key});
  }
 }
 if(!found){m.path=[];m.pathIndex=0;return false;}
 const cells:Array<[number,number]>=[];let k: string|null=found;
 while(k&&k!==start){
  const [x,y]=k.split(",").map(Number);cells.push([x*cell+cell*.5,y*cell+cell*.5]);k=parent.get(k)||null;
 }
 cells.reverse();
 m.path=cells;m.pathIndex=0;m.pathTimer=70;
 return true;
}
function siegeMoveTo(m:SiegeMob,x:number,y:number,dt:number,r=18){
 // CARGO DECK uses direct steering plus collision sliding. The previous per-mob
 // A* search rebuilt a ~20x52 grid repeatedly and caused frame-time spikes
 // once the first siege wave became active on mobile devices.
 m.targetX=x;m.targetY=y;
 siegeStep(m,x-m.x,y-m.y,dt,r);
 m.pathTimer=18;
}
function siegeStep(m:SiegeMob,dx:number,dy:number,dt:number,r:number){
 const len=Math.hypot(dx,dy)||1,nx=dx/len,ny=dy/len,step=m.speed*dt;
 const direct=moveTopDown(m.x,m.y,nx*step,ny*step,r);
 if(Math.hypot(direct[0]-m.x,direct[1]-m.y)>0.1){m.x=direct[0];m.y=direct[1];return;}
 const sideA=moveTopDown(m.x,m.y,-ny*step*1.9,nx*step*1.9,r);
 const sideB=moveTopDown(m.x,m.y,ny*step*1.9,-nx*step*1.9,r);
 const da=Math.hypot(sideA[0]-m.targetX,sideA[1]-m.targetY);
 const db=Math.hypot(sideB[0]-m.targetX,sideB[1]-m.targetY);
 const q=da<=db?sideA:sideB;m.x=q[0];m.y=q[1];
}
function updateSiege(dt:number){
 if(siegeOver)return;
 siegeWaveTimer+=dt;
 if(siegeWaveTimer>900&&siegeMobs.length===0)spawnSiegeWave();

 const liveMobs=siegeMobs.filter(o=>o.hp>0);
 for(let i=siegeMobs.length-1;i>=0;i--){
  const m=siegeMobs[i];
  if(m.hp<=0){
   if(m.team==="enemy"){arenaKills++;arenaTaskProgress=Math.min(arenaTaskTarget,arenaTaskProgress+1);}
   siegeMobs.splice(i,1);continue;
  }
  m.cool-=dt;m.think-=dt;m.burstCool-=dt;m.assist-=dt;m.pathTimer-=dt;m.spawnGrace=Math.max(0,m.spawnGrace-dt);
  m.hitFlash=Math.max(0,m.hitFlash-dt*.09);m.attackFx=Math.max(0,m.attackFx-dt*.09);m.anim+=dt*m.animSpeed;
  const hpRatio=m.hp/m.maxHp;
  let nearbyAllies=0,nearbyEnemies=0;
  for(const a of liveMobs){
   if(a===m)continue;
   const dx=a.x-m.x,dy=a.y-m.y;
   if(dx*dx+dy*dy>=32400)continue;
   if(a.team===m.team)nearbyAllies++;else nearbyEnemies++;
  }
  m.morale=clamp(65+nearbyAllies*12-nearbyEnemies*10,15,130);
  m.retreating=(hpRatio<.28&&m.type!=="brawler")||(hpRatio<.18&&nearbyEnemies>2);

  if(m.retreating){
   m.animState="retreat";
   const homeY=m.team==="enemy"?230:ARENA_H-230;
   siegeMoveTo(m,m.x,homeY,dt,18);
   if(hpRatio<.2&&m.cool<=0){m.cool=75;m.hp=Math.min(m.maxHp,m.hp+2);}
   continue;
  }

  // 1. Жёсткое правило: ближайший противник в радиусе атаки атакуется первым.
  const attackTarget=siegeAttackable(m);
  if(attackTarget){
   const d=Math.hypot(attackTarget.x-m.x,attackTarget.y-m.y);
   m.targetX=attackTarget.x;m.targetY=attackTarget.y;m.animState="attack";
   if(m.type==="brawler"){
    if(m.cool<=0){m.cool=44;m.burst=2;m.attackFx=1;attackTarget.hp=Math.max(0,attackTarget.hp-m.damage*(m.morale>105?1.15:1));}
   }else if(m.cool<=0&&m.burstCool<=0){
    m.cool=m.type==="sniper"?72:30;m.burstCool=m.type==="sniper"?115:42;m.attackFx=1;
    attackTarget.hp=Math.max(0,attackTarget.hp-(m.type==="sniper"?m.damage*1.7:m.damage*.8));
    if(m.type==="shooter"&&m.burst<2)m.burst++;else m.burst=0;
   }
   if(m.type!=="brawler"&&d<(m.type==="sniper"?305:110)){
    m.animState="retreat";siegeStep(m,m.x-attackTarget.x,m.y-attackTarget.y,dt,18);
   }
   continue;
  }

  // После единственного спавна бойцы сначала расходятся веером.
  // Если противник уже обнаружен, боевой приоритет немедленно отменяет рассредоточение.
  const visible=siegeNearest(m,()=>true,true);
  if(!attackTarget&&!visible&&m.spawnGrace>0){
   m.targetX=m.scatterX;m.targetY=m.scatterY;m.animState="run";
   siegeMoveTo(m,m.scatterX,m.scatterY,dt,18);
   continue;
  }

  // 2. Ближайший видимый враг — преследуем независимо от линии.

  if(visible){
   m.targetX=visible.x;m.targetY=visible.y;
   const d=Math.hypot(visible.x-m.x,visible.y-m.y);
   if(m.type==="brawler"||d>(m.type==="sniper"?360:165)){
    m.animState="run";siegeMoveTo(m,visible.x,visible.y,dt,18);
   }else{
    m.animState="strafe";
    if(m.think<=0){m.think=45+Math.random()*55;m.strafe=Math.random()<.5?-1:1;}
    siegeStep(m,-(visible.y-m.y)*m.strafe,(visible.x-m.x)*m.strafe,dt*.7,18);
   }
   continue;
  }

  // 3. Враг скрыт препятствием: строим маршрут вокруг препятствий и ищем его.
  const hidden=siegeNearest(m,()=>true,false);
  if(hidden){
   m.targetX=hidden.x;m.targetY=hidden.y;m.animState="run";
   siegeMoveTo(m,hidden.x,hidden.y,dt,18);
   if(m.think<=0){m.think=35+Math.random()*50;m.strafe=Math.random()<.5?-1:1;}
   continue;
  }

  // 4. Все вражеские мобы уничтожены: штурм ближайшей живой башни.
  const enemyTowers=siegeTowers.filter(t=>t.team!==m.team&&t.hp>0);
  if(enemyTowers.length){
   const tower=enemyTowers.sort((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(b.x-m.x,b.y-m.y))[0];
   m.targetX=tower.x;m.targetY=tower.y;m.animState="run";
   const d=Math.hypot(tower.x-m.x,tower.y-m.y);
   if(d>m.attackRange)siegeMoveTo(m,tower.x,tower.y,dt,18);
   else if(m.cool<=0){m.cool=m.type==="brawler"?48:m.type==="shooter"?36:82;m.attackFx=1;tower.hp=Math.max(0,tower.hp-m.damage);}
   continue;
  }

  // 5. Все башни уничтожены: штурм базы.
  const enemyBase=siegeBases.find(b=>b.team!==m.team)!;
  m.targetX=enemyBase.x;m.targetY=enemyBase.y;m.animState="run";
  const bd=Math.hypot(enemyBase.x-m.x,enemyBase.y-m.y);
  if(bd>m.attackRange)siegeMoveTo(m,enemyBase.x,enemyBase.y,dt,18);
  else if(m.cool<=0){m.cool=52;m.attackFx=1;enemyBase.hp=Math.max(0,enemyBase.hp-m.damage);}
 }

 resolveSiegeMobCollisions();

 // Реакция на огонь игрока.
 for(const b of bullets){
  if(b.from!=="player"||b.life<=0)continue;
  for(let i=siegeMobs.length-1;i>=0;i--){
   const m=siegeMobs[i];if(m.team!=="enemy"||m.hp<=0)continue;
   if(Math.hypot(b.x-m.x,b.y-m.y)<28){
    m.hitFlash=1;m.animState="hit";
    if(m.type!=="brawler"&&Math.random()<.18){m.think=0;m.strafe=-m.strafe;siegeStep(m,-b.vy,b.vx,1.4,18);}
    else m.hp=Math.max(0,m.hp-b.damage);
    b.life=0;break;
   }
  }
  if(b.life<=0)continue;
  const enemyMobsRemain=siegeMobs.some(m=>m.team==="enemy"&&m.hp>0);
  for(const t of siegeTowers){
   if(t.hp>0&&!enemyMobsRemain&&Math.hypot(b.x-t.x,b.y-t.y)<48){t.hp=Math.max(0,t.hp-b.damage);b.life=0;break;}
  }
  if(b.life>0){
   const base=siegeBases.find(x=>x.team==="enemy")!;
   if(base.hp>0&&siegeTowers.filter(t=>t.team==="enemy"&&t.hp>0).length===0&&Math.hypot(b.x-base.x,b.y-base.y)<115){base.hp=Math.max(0,base.hp-b.damage);b.life=0;}
  }
 }

 for(const t of siegeTowers){
  if(t.hp<=0)continue;t.cool-=dt;if(t.cool>0)continue;
  const hostile=siegeMobs.filter(m=>m.team!==t.team&&m.hp>0).sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y))[0];
  if(hostile&&Math.hypot(hostile.x-t.x,hostile.y-t.y)<360){t.cool=42;hostile.hp=Math.max(0,hostile.hp-(t.team==="enemy"?34:38));continue;}
  if(t.team==="enemy"&&Math.hypot(player.x-t.x,player.y-t.y)<330){t.cool=55;hurt(8);}
 }
 const taskObjective=arenaMission?.objective||"clear";
 const surviveDone=(taskObjective==="survive"||taskObjective==="defend")&&arenaTaskTimer>=arenaTaskTarget*60;
 const clearDone=taskObjective==="clear"&&arenaTaskProgress>=arenaTaskTarget;
 if(clearDone||surviveDone){
  siegeMessage=taskObjective==="clear"?"ЗАДАЧА ВЫПОЛНЕНА · ВРАГИ УНИЧТОЖЕНЫ":"ЗАДАЧА ВЫПОЛНЕНА · ПОЗИЦИЯ УДЕРЖАНА";
  completeArenaTask();return;
 }
 const enemyBase=siegeBases.find(b=>b.team==="enemy")!,playerBase=siegeBases.find(b=>b.team==="player")!;
 if(enemyBase.hp<=0){siegeOver=true;siegeMessage="ПОБЕДА · ВРАЖЕСКАЯ БАЗА РАЗРУШЕНА";completeArenaTask();return;}
 if(playerBase.hp<=0){siegeOver=true;siegeMessage="ПОРАЖЕНИЕ · ВАША БАЗА РАЗРУШЕНА";mode="result";dialogueOpen=false;render();}
}
function completeArenaTask(){
 if(!arenaMission)return;
 say("CARGO DECK ОЧИЩЕН","player",player.x,player.y-55);
 siegeOver=true;mode="result";dialogueOpen=false;storeSave();render();
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
 const h=selected||"antonio";
 selected=h;save.hero=h;save.rank=rank();dialogueOpen=false;mode="play";
 arenaMission=ALIEN_ARENA_MISSION;arenaTaskSetup();spawnFloor();storeSave();render();
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
   if(save.activeTenderId&&arenaMission){
     advanceTenderMission();
     return;
   }
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
function activateCheatAll(){return;}

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
 rect(0,0,viewWidth,viewHeight,"#050a0e");
 for(let i=0;i<90;i++){const x=(i*83)%viewWidth,y=(i*137)%viewHeight;rect(x,y,1+(i%3===0?1:0),1,"rgba(125,225,235,"+(.18+(i%4)*.08)+")");}
 rect(viewWidth*.045,viewHeight*.045,viewWidth*.91,viewHeight*.88,"rgba(20,31,36,.88)");
 rect(viewWidth*.045,viewHeight*.045,viewWidth*.91,4,"#54d6d8");
 tx("FREEzzz // CARGO DECK",viewWidth/2,viewHeight*.075,menuTextSize(.034,22,32),"#54d6d8","center");
 tx("ВЫБОР ЭКИПАЖА",viewWidth/2,viewHeight*.115,menuTextSize(.019,13,18),"#aebbc0","center");
 tx("OPEN PLATFORM · DEEP SPACE",viewWidth/2,viewHeight*.145,menuTextSize(.012,8,12),"#607177","center");
 const ids:HeroId[]=["antonio","massimo","salvatore","giuseppe"];
 const padX=viewWidth*.075,gapX=viewWidth*.035,top=viewHeight*.18,gridH=viewHeight*.61,gapY=viewHeight*.018;
 const cardW=(viewWidth-padX*2-gapX)/2,cardH=(gridH-gapY)/2;
 ids.forEach((id,i)=>{
  const h=heroes[id],col=i%2,row=Math.floor(i/2),x=padX+col*(cardW+gapX),y=top+row*(cardH+gapY),a=id===selected;
  rect(x,y,cardW,cardH,a?"#13272b":"#0b1418");rect(x,y,cardW,3,a?h.color:"#24343a");
  tx(h.name,x+cardW/2,y+24,menuTextSize(.018,12,17),h.color,"center");
  tx(["SCOUT","BREACHER","VOID","TECH"][i],x+cardW/2,y+43,menuTextSize(.011,8,11),"#73858b","center");
  const scale=(cardW/220)*[.92,1.16,.82,1.02][i];
  c.save();c.translate(x+cardW/2,y+cardH*.70);
  drawAlienHero(id,0,0,frame+i*7,Math.max(.75,Math.min(1.25,scale)),true);
  c.restore();
  tx(h.ability,x+cardW/2,y+cardH*.90,menuTextSize(.010,7,10),"#9eafb4","center");
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
 const searchY=top+headerH+H*.018,searchH=Math.min(46,H*.055);glass(margin,searchY,W*.86,searchH);tx("⌕",margin+W*.035,searchY+searchH*.65,menuTextSize(.028,19,25),"#5b6d77","center");tx("СОБРАНО "+(save.weaponInventory?.length||0)+"/"+Math.min(8,weapons.length),margin+W*.095,searchY+searchH*.65,menuTextSize(.018,12,17),"#52636c","left");tx("HP ×"+player.medkits,W-margin-W*.035,searchY+searchH*.65,menuTextSize(.016,11,15),"#77858c","center");
 const bottomH=Math.min(52,H*.064),bottomY=H-bottomH-H*.025;button(W*.08,bottomY,W*.34,bottomH,"НАЗАД");button(W*.53,bottomY,W*.39,bottomH,"В БОЙ",true);
 const listTop=searchY+searchH+H*.018,listBottom=bottomY-H*.015;const gap=H*.007,cardH=Math.min(64,H*.075),left=margin,cardW=W-margin*2;
 c.save();c.beginPath();c.rect(0,listTop,W,listBottom-listTop);c.clip();
 weapons.forEach((w,i)=>{const y=listTop+i*(cardH+gap),owned=save.weaponInventory.includes(i),active=save.weapon===i;glass(left,y,cardW,cardH,active);c.save();c.globalAlpha=owned?1:.30;drawWeaponSprite(i,left+cardW*.25,y+cardH*.50,0,Math.min(.54,cardW/740));c.restore();tx(String(i+1).padStart(2,"0"),left+cardW*.43,y+cardH*.24,menuTextSize(.012,8,12),active?hero().color:"#68777f","left");tx(weaponRu(w.name),left+cardW*.43,y+cardH*.47,menuTextSize(.018,12,17),"#20323a","left");tx("УРОН "+w.damage+" · МАГ "+w.mag+" · "+Math.round(w.rate*60)+"/МИН",left+cardW*.43,y+cardH*.68,menuTextSize(.009,7,10),"#64737a","left");const bw=cardW*.27,bh=Math.min(21,cardH*.24),bx=left+cardW*.69,by=y+cardH*.64;button(bx,by,bw,bh,owned?(active?"ВЫБРАНО":"ВЫБРАТЬ"):"ЗАКРЫТО",active);});
 c.restore();
 const contentH=weapons.length*(cardH+gap)-gap,viewport=listBottom-listTop;if(contentH>viewport){const trackH=viewport*.72,trackY=listTop+(viewport-trackH)/2,thumbH=Math.max(22,trackH*viewport/contentH);c.fillStyle="rgba(255,255,255,.45)";c.beginPath();c.roundRect(W*.955,trackY,W*.012,trackH,4);c.fill();c.fillStyle="rgba(65,180,188,.72)";c.beginPath();c.roundRect(W*.955,trackY,W*.012,thumbH,4);c.fill();}
 c.restore();
}
function drawResult(){
 const m=currentMission();rect(0,0,viewWidth,viewHeight,"#07090b");
 if(siegeMessage){tx(siegeMessage,viewWidth/2,viewHeight*.18,menuTextSize(.042,26,40),siegeMessage.startsWith("ПОБЕДА")?hero().color:"#d85b52","center");}
 else tx("МИССИЯ ЗАВЕРШЕНА",viewWidth/2,viewHeight*.18,menuTextSize(.045,28,40),hero().color,"center");tx(m.ru,viewWidth/2,viewHeight*.27,menuTextSize(.032,21,32),"#f0eee7","center");
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
function bindTenderCanvasHit(){
 if(!canvas||mode!=="tenders")return;
 const handler=(e:PointerEvent)=>{
  e.preventDefault();
  const r=canvas!.getBoundingClientRect();
  const x=e.clientX-r.left,y=e.clientY-r.top;
  const W=viewWidth,H=viewHeight;
  const top=H*.12,bottom=H*.90,gap=H*.018,cardH=(bottom-top-gap*2)/3;
  if(y>=top&&y<bottom){
   const index=Math.floor((y-top)/(cardH+gap));
   const inside=(y-top)-index*(cardH+gap);
   if(index>=0&&index<3&&inside>=0&&inside<=cardH){
    const t=TENDERS[tenderPage*3+index];
    if(t&&!(save.completedTenders||[]).includes(t.id)){
     save.activeTenderId=t.id;
     save.arenaMissionIndex=0;
     const mi=allMissions.findIndex(m=>m.id===t.linkedMission);
     if(mi>=0){
      missionIndex=mi;
      if(allMissions[mi].hero!=="shared")selected=allMissions[mi].hero;
     }
     save.hero=selected;
     arenaTaskSetup();
     mode="arena";
     storeSave();
     render();
     return;
    }
   }
  }
  const bh=Math.min(38,H*.052),by=H-bh-H*.025;
  if(y>=by&&y<=by+bh){
   if(x<=W*.22&&tenderPage>0){tenderPage--;render();return;}
   if(x>=W*.38&&x<=W*.62){mode="select";render();return;}
   if(x>=W*.75&&tenderPage<Math.ceil(TENDERS.length/3)-1){tenderPage++;render();return;}
  }
 };
 canvas.addEventListener("pointerup",handler);
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
         if(save.weaponInventory.includes(n)){
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
   if(a==="play"){beginSelected();}
   if(a==="exit")return;
   if(a==="menu"){returnToMainMenu();}
   if(a==="advance"){advanceDialogue();render();}
   if(a==="cheat"){activateCheatAll();}
   if(a==="shop"){mode="weaponMenu";render();}
   if(a==="weapon-menu"){mode="weaponMenu";render();}
   if(a==="tenders")return;
   if(a==="tender-next"){tenderPage=Math.min(Math.ceil(TENDERS.length/3)-1,tenderPage+1);render();}
   if(a==="tender-prev"){tenderPage=Math.max(0,tenderPage-1);render();}
   if(a==="tender"){const id=el.dataset.tender||"";const t=tenderById(id);if(t&&!(save.completedTenders||[]).includes(t.id)){save.activeTenderId=t.id;save.arenaMissionIndex=0;const mi=allMissions.findIndex(m=>m.id===t.linkedMission);if(mi>=0){missionIndex=mi;if(allMissions[mi].hero!=="shared")selected=allMissions[mi].hero;}save.hero=selected;arenaTaskSetup();mode="arena";storeSave();render();}}
   if(a==="select-weapon"){const n=Number(el.dataset.weapon);if(save.weaponInventory.includes(n)){save.weapon=n;storeSave();player.combat=createCombatState(HS_WEAPONS[n]);player.ammo=player.combat.ammo;mode="play";render();}}
   if(a==="weapon-back"){mode="play";render();}
   if(a==="swap")switchWeapon();
   if(a==="medkit")useMedkit();
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
   ui.innerHTML='<div class="mafia-select-grid">'+(["antonio","massimo","salvatore","giuseppe"] as HeroId[]).map(id=>'<button class="'+(id===selected?"selected":"")+'" aria-label="Выбрать '+heroes[id].name+'" data-hero="'+id+'"></button>').join("")+'</div><div class="mafia-menu-actions"><button data-action="play">ИГРАТЬ</button></div>';
 }else if(mode==="family"){
   ui.innerHTML='<div class="mafia-action"><button data-action="menu">ГЛАВНОЕ МЕНЮ</button><button data-action="advance">ПРОПУСТИТЬ</button></div>';
 }else if(mode==="arena"){
   ui.innerHTML=save.activeTenderId?'<div class="mafia-action"><button data-action="advance">НАЧАТЬ МИССИЮ</button><button data-action="tenders">ТЕНДЕРЫ</button></div>':'<div class="mafia-action"><button data-action="tenders">ВЫБРАТЬ ТЕНДЕР</button><button data-action="menu">ГЛАВНОЕ МЕНЮ</button></div>';
 }else if(mode==="play"){
   ui.innerHTML='<div class="mafia-touch-move" aria-label="Сенсор движения"><span class="mafia-touch-stick"></span></div><div class="mafia-combat-buttons"><button data-action="weapon-menu">ОРУЖИЕ</button><button data-action="medkit">АПТЕЧКА · '+player.medkits+'</button><button data-action="special">СПЕЦ</button></div><div class="mafia-aim-sensor" aria-label="Сенсор стрельбы"><span class="mafia-aim-ring"></span><span class="mafia-aim-dot"></span></div><div class="mafia-game-menu"><button data-action="menu">МЕНЮ</button></div>';
  }else if(mode==="weaponMenu"){
    // Weapon menu is rendered entirely on canvas; no legacy DOM overlay.
    ui.innerHTML="";
  }else if(mode==="tenders"){
    ui.innerHTML=TENDERS.slice(tenderPage*3,tenderPage*3+3).map((t,i)=>`<button class="mafia-tender-hit" data-action="tender" data-tender="${t.id}" style="position:absolute;left:4.5%;right:4.5%;top:${12+i*26.0}%;height:22%;opacity:0;appearance:none;border:0;background:transparent;outline:none;box-shadow:none"></button>`).join("")+`<button data-action="tender-prev" style="position:absolute;left:0;bottom:2%;width:20%;height:7%;opacity:0">‹</button><button data-action="menu" style="position:absolute;left:40%;bottom:2%;width:20%;height:7%;opacity:0">НАЗАД</button><button data-action="tender-next" style="position:absolute;right:0;bottom:2%;width:20%;height:7%;opacity:0">›</button>`;
  }else{
   ui.innerHTML='<div class="mafia-action"><button data-action="menu">ГЛАВНОЕ МЕНЮ</button><button data-action="advance">'+(dialogueOpen?"ПРОДОЛЖИТЬ":mode==="shop"?"НАЗАД":"НАЧАТЬ / ПРОДОЛЖИТЬ")+'</button></div>';
 }
 bindButtons();bindTenderCanvasHit();renderCanvas();
}
function updateCombatButtonLabels(){
 if(!root||mode!=="play")return;
 const special=root.querySelector<HTMLElement>('[data-action="special"]');
 if(special)special.textContent=player.ability>0?"СПЕЦ "+(player.ability/60).toFixed(1):"СПЕЦ";
}
let physicsAccumulator=0;
const PHYSICS_STEP=1;
const MAX_PHYSICS_STEPS=4;
function loop(t:number){
 const frameDt=Math.min(4,(t-last)/16.67||1);last=t;
 physicsAccumulator+=frameDt;
 let steps=0;
 while(physicsAccumulator>=PHYSICS_STEP&&steps<MAX_PHYSICS_STEPS){
  if(mode==="play"){update(PHYSICS_STEP);updateCombatButtonLabels();}
  physicsAccumulator-=PHYSICS_STEP;steps++;
 }
 if(steps===MAX_PHYSICS_STEPS&&physicsAccumulator>=PHYSICS_STEP)physicsAccumulator=0;
 renderCanvas();raf=requestAnimationFrame(loop);
}
function setup(){
 loadSave();selected=save.hero||"antonio";
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
