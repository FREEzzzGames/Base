/* FREEzzz MAFIA — campaign game module
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
interface Enemy{type:EnemyType;x:number;y:number;hp:number;maxHp:number;vx:number;cool:number;shootCool:number;dir:number}
interface Bullet{x:number;y:number;vx:number;vy:number;from:"player"|"enemy";life:number}
interface Player{x:number;y:number;vx:number;vy:number;hp:number;maxHp:number;armor:number;ammo:number;grounded:boolean;cool:number;ability:number;facing:number}
interface Save{hero:HeroId|null;rank:number;xp:number;money:number;weapon:number;armor:number;completed:string[]}

const W=640,H=448;
const heroes:Record<HeroId,Hero>={
 antonio:{id:"antonio",name:"ANTONIO",family:"valenti",color:"#54d6d8",face:"#9a6554",ability:"TACTIC",abilityDesc:"Reveals enemies and objective points briefly.",bio:"Calm, observant and always looking for the pattern."},
 massimo:{id:"massimo",name:"MASSIMO",family:"moretti",color:"#c58b48",face:"#b97859",ability:"RUSH",abilityDesc:"A short burst of speed with extra jump control.",bio:"Direct, bold and never interested in wasting time."},
 salvatore:{id:"salvatore",name:"SALVATORE",family:"rossi",color:"#d86c35",face:"#784d42",ability:"FOCUS",abilityDesc:"Temporarily tightens shot spread and slows aim.",bio:"Quiet, suspicious and very hard to surprise."},
 giuseppe:{id:"giuseppe",name:"GIUSEPPE",family:"bellini",color:"#9f83d6",face:"#a86d56",ability:"ROUTE",abilityDesc:"Reveals the safest route through the current floor.",bio:"Patient, technical and always thinking about the route."}
};

const familyText:Record<FamilyId,{desc:string;intro:string}> = {
 valenti:{desc:"Financial crime and influence.",intro:"Valenti survives by reading numbers, people and pressure points."},
 moretti:{desc:"Street crime and protection.",intro:"Moretti controls its territory through presence, speed and loyalty."},
 rossi:{desc:"Distribution network.",intro:"Rossi knows that every missing piece leaves a trail."},
 bellini:{desc:"Smuggling and logistics.",intro:"Bellini understands routes, doors and the spaces between them."}
};

const D=(speaker:string,text:string):Dialogue=>({speaker,text});
const M=(id:string,number:number,hero:HeroId|"shared",title:string,ru:string,desc:string,objective:Objective,floors:[string,string,string],enemies:EnemyType[],reward:number,xp:number,dialogue:Dialogue[],optional?:string):Mission=>({id,number,hero,title,ru,desc,objective,floors,enemies,reward,xp,dialogue,optional});

const personal:Mission[]=[
 M("valenti_01",1,"antonio","FIRST ACCOUNT","Первый счёт","A missing folder is the first sign that someone arrived before Antonio.","find",["OFFICE","UPPER OFFICE","ESCAPE"],["guard","brawler"],250,100,[D("ANTONIO","Первое правило — сначала смотреть, потом действовать."),D("CONTACT","Папка должна быть в офисе."),D("ANTONIO","Должна? Это уже звучит интересно."),D("ANTONIO","Кто-то был здесь до меня.")],"Find the hidden note."),
 M("valenti_02",2,"antonio","OTHER PEOPLE'S NUMBERS","Чужие счета","Three documents reveal the same unexplained signature.","recover",["FRONT OFFICE","RECORD ROOM","ROOFTOP"],["shooter","guard","rusher"],320,130,[D("ANTONIO","Цифры редко ошибаются."),D("ACCOUNTANT","Я проверял дважды."),D("ANTONIO","Тогда кто-то проверил их за тебя."),D("ANTONIO","Три места. Один и тот же почерк.")],"Recover 3 documents."),
 M("valenti_03",3,"antonio","THE NEW MAN","Новый человек","Antonio escorts a senior family contact through a building that suddenly becomes unsafe.","escort",["LOBBY","STAIRS","SAFE ROOM"],["brawler","shooter","flanker"],380,160,[D("SENIOR","Сегодня ты просто идёшь рядом."),D("ANTONIO","А завтра?"),D("SENIOR","Завтра зависит от того, что ты увидишь сегодня."),D("ANTONIO","Теперь я понимаю, зачем меня взяли.")]),
 M("valenti_04",4,"antonio","PRESSURE POINT","Точка давления","Competitors push into a family location. Antonio has to reclaim the route.","clear",["STREET","WORKSHOP","UPPER FLOOR"],["rusher","shooter","heavy"],450,190,[D("CONTACT","Они хотят, чтобы мы ушли."),D("ANTONIO","Тогда они выбрали неправильную дверь."),D("ANTONIO","Это была не атака. Это была проверка.")]),
 M("valenti_05",5,"antonio","THE DEBT","Долг","An old contact asks for help and leaves Antonio with one unanswered question.","defend",["SHOP","BACK ROOM","ROOFTOP"],["guard","brawler","suppressor"],500,220,[D("OLD CONTACT","Я помню, кто однажды помог мне."),D("ANTONIO","Тогда сегодня пришло время вспомнить."),D("ANTONIO","Он ничего не должен нам."),D("ANTONIO","Но теперь я должен ему один ответ.")]),
 M("valenti_06",6,"antonio","SOMEONE ELSE'S GAME","Чужая игра","Several unrelated problems carry the same hidden mark.","find",["WAREHOUSE","RECORDS","CONTROL ROOM"],["shooter","flanker","sniper"],560,250,[D("ANTONIO","Слишком много совпадений."),D("CONTACT","Ты думаешь, это связано?"),D("ANTONIO","Совпадений стало слишком много."),D("ANTONIO","Кто-то двигает фигуры.")]),
 M("valenti_07",7,"antonio","CLOSED DOOR","Закрытая дверь","A key location is locked. The real challenge is finding another route.","reach",["LOCKED FLOOR","SERVICE LEVEL","ROOF ACCESS"],["guard","heavy","rusher"],620,280,[D("GUARD","Дверь закрыта."),D("ANTONIO","Я заметил."),D("GUARD","И что теперь?"),D("ANTONIO","Теперь найдём другую дверь.")]),
 M("valenti_08",8,"antonio","THE TRACE","След","Antonio follows the evidence without waiting for permission.","recover",["ALLEY","ARCHIVE","HIDDEN ROOM"],["flanker","shooter","sniper"],700,310,[D("ANTONIO","Теперь я играю по своим правилам."),D("ANTONIO","Вот он."),D("ANTONIO","Имя знакомое.")],"Recover every trace."),
 M("valenti_09",9,"antonio","THE RED FILE","Красная папка","A red file connects money, routes and all four families.","find",["OFFICE","SECURE ARCHIVE","ROOFTOP"],["guard","suppressor","heavy"],800,350,[D("ANTONIO","Красная папка. Значит, кто-то хотел, чтобы её заметили."),D("CONTACT","Что внутри?"),D("ANTONIO","Имена. Маршруты. Деньги."),D("ANTONIO","И четыре семьи.")]),
 M("valenti_10",10,"antonio","WRONG ENEMY","Не тот враг","Antonio learns that the other families have been pushed by the same hidden hand.","clear",["VALENTI OFFICE","CROSSING","MEETING FLOOR"],["shooter","rusher","flanker","heavy"],950,450,[D("ANTONIO","Мы всё это время смотрели не туда."),D("CONTACT","На кого?"),D("ANTONIO","На друг друга."),D("ANTONIO","Пора поговорить с остальными.")]),
 M("moretti_01",1,"massimo","MY BLOCK","Мой район","Massimo receives his first territory assignment.","clear",["STREET","BLOCK","ROOFTOP"],["brawler","rusher"],250,100,[D("MASSIMO","Это мой район."),D("CONTACT","Пока что."),D("MASSIMO","Мне нравится это слово — пока.")]),
 M("moretti_02",2,"massimo","NEW RULES","Новые правила","Massimo proves he can handle a job without being led.","reach",["BACK STREET","GARAGE","UPPER FLOOR"],["rusher","shooter","guard"],320,130,[D("MASSIMO","Я не пришёл спрашивать разрешения."),D("CONTACT","А зачем пришёл?"),D("MASSIMO","Закончить разговор.")]),
 M("moretti_03",3,"massimo","UNINVITED GUESTS","Незваные гости","An unknown group appears inside Moretti territory.","clear",["ENTRANCE","STORAGE","ROOFTOP"],["brawler","shooter","flanker"],380,160,[D("MASSIMO","Я вас не приглашал."),D("UNKNOWN","Нам приглашение не нужно."),D("MASSIMO","Плохой ответ.")]),
 M("moretti_04",4,"massimo","PRESSURE","Давление","Several locations come under pressure at once.","survive",["BLOCK","WORKSHOP","STREET"],["rusher","shooter","suppressor"],450,190,[D("CONTACT","Их слишком много."),D("MASSIMO","Тогда будем двигаться быстрее."),D("MASSIMO","Они хотели заставить нас нервничать. Не получилось.")]),
 M("moretti_05",5,"massimo","OLD FRIEND","Старый друг","An old acquaintance is suddenly on the other side.","clear",["BAR","BACK ROOM","ALLEY"],["guard","brawler","heavy"],500,220,[D("MASSIMO","Я тебя помню."),D("OLD FRIEND","А я надеялся, что забудешь."),D("MASSIMO","Не сегодня.")]),
 M("moretti_06",6,"massimo","TERRITORY","Территория","A section of the district has been taken. Massimo wants it back.","clear",["DISTRICT","SERVICE FLOOR","ROOFTOP"],["heavy","rusher","shooter"],560,250,[D("MASSIMO","Они забрали наш район."),D("CONTACT","Что будем делать?"),D("MASSIMO","Возвращать.")]),
 M("moretti_07",7,"massimo","AFTER MIDNIGHT","После полуночи","The opposition moves with unusual coordination.","survive",["NIGHT STREET","WAREHOUSE","UPPER LEVEL"],["flanker","suppressor","sniper"],620,280,[D("MASSIMO","Они не разбегаются."),D("CONTACT","Что?"),D("MASSIMO","Каждый знает, куда идти.")]),
 M("moretti_08",8,"massimo","STRANGERS","Чужие люди","Evidence points beyond Moretti territory.","reach",["STREET","CROSSING","ARCHIVE"],["shooter","flanker","guard"],700,310,[D("MASSIMO","Это уже не наша история."),D("CONTACT","Тогда чья?"),D("MASSIMO","Похоже, общая.")]),
 M("moretti_09",9,"massimo","THE LEAK","Предатель","Someone is leaking information. Massimo must identify the source.","find",["OFFICE","BACK ROOMS","RECORD FLOOR"],["guard","flanker","sniper"],800,350,[D("MASSIMO","Кто-то говорит слишком много."),D("CONTACT","Думаешь, это свой?"),D("MASSIMO","Надеюсь, что нет.")]),
 M("moretti_10",10,"massimo","FOUR NAMES","Четыре имени","A list contains four family names.","find",["MORETTI HQ","RECORD ROOM","ROOFTOP"],["heavy","suppressor","shooter"],950,450,[D("MASSIMO","Valenti."),D("MASSIMO","Rossi."),D("MASSIMO","Bellini."),D("MASSIMO","Moretti."),D("CONTACT","Что это значит?"),D("MASSIMO","Что нас всех ведут в одну сторону.")]),
 M("rossi_01",1,"salvatore","NEW WORK","Новая работа","A first assignment goes wrong when the expected cargo is missing.","find",["STREET","DEPOT","ROOF"],["guard","brawler"],250,100,[D("SALVATORE","Мне сказали забрать груз."),D("CONTACT","И?"),D("SALVATORE","Я хочу знать, почему его уже нет.")]),
 M("rossi_02",2,"salvatore","MISSING CARGO","Пропавший груз","The cargo did not vanish. Someone moved it.","recover",["DEPOT","WAREHOUSE","LOADING FLOOR"],["shooter","rusher","guard"],320,130,[D("SALVATORE","Он не исчез."),D("CONTACT","Откуда такая уверенность?"),D("SALVATORE","Кто-то его взял.")]),
 M("rossi_03",3,"salvatore","THE OTHER TRACE","Чужой след","The trail does not belong to Rossi.","find",["ALLEY","ARCHIVE","ROOF"],["flanker","shooter","sniper"],380,160,[D("SALVATORE","Этот след не наш."),D("CONTACT","Тогда чей?"),D("SALVATORE","Вот это мы и выясним.")]),
 M("rossi_04",4,"salvatore","THE WAREHOUSE","Склад","A warehouse is suspiciously quiet.","clear",["LOADING BAY","WAREHOUSE","UPPER CATWALK"],["guard","heavy","suppressor"],450,190,[D("SALVATORE","Слишком тихо."),D("CONTACT","Это плохо?"),D("SALVATORE","Очень.")]),
 M("rossi_05",5,"salvatore","SILENCE","Молчание","Nobody wants to answer simple questions.","find",["BACK ROOM","OFFICE","ROOF"],["guard","flanker","rusher"],500,220,[D("SALVATORE","Все что-то знают."),D("CONTACT","Но молчат."),D("SALVATORE","Значит, есть причина.")]),
 M("rossi_06",6,"salvatore","TOO CONVENIENT","Слишком удобно","The opposition always seems one step ahead.","survive",["DEPOT","SERVICE FLOOR","ROOFTOP"],["sniper","shooter","suppressor"],560,250,[D("SALVATORE","Они знают наши движения."),D("CONTACT","У нас шпион?"),D("SALVATORE","Или кто-то знает больше, чем должен.")]),
 M("rossi_07",7,"salvatore","INSIDE THE NETWORK","Внутри сети","Separate incidents form one system.","recover",["ARCHIVE","CONTROL ROOM","UPPER FLOOR"],["flanker","guard","heavy"],620,280,[D("SALVATORE","Это уже не отдельные случаи."),D("CONTACT","Что тогда?"),D("SALVATORE","Система.")]),
 M("rossi_08",8,"salvatore","EMPTY CONTAINER","Пустой контейнер","An empty container holds one deliberate clue.","find",["PORT","CONTAINER YARD","CONTROL ROOM"],["shooter","rusher","sniper"],700,310,[D("SALVATORE","Они оставили это специально."),D("CONTACT","Зачем?"),D("SALVATORE","Чтобы мы нашли.")]),
 M("rossi_09",9,"salvatore","MAN WITHOUT A FAMILY","Человек без семьи","A stranger claims to work for none of the four families.","escort",["MEETING ROOM","SERVICE HALL","ROOF"],["guard","flanker","suppressor"],800,350,[D("STRANGER","Вы ищете не того человека."),D("SALVATORE","Тогда назови правильного."),D("STRANGER","Сначала вы должны понять, что он вообще существует.")]),
 M("rossi_10",10,"salvatore","COMMON ENEMY","Общий враг","Salvatore connects the last pieces.","clear",["ROSSI HQ","ARCHIVE","ROOFTOP"],["heavy","sniper","suppressor","flanker"],950,450,[D("SALVATORE","У нас общий враг."),D("CONTACT","Ты уверен?"),D("SALVATORE","Теперь — да.")]),
 M("bellini_01",1,"giuseppe","FIRST ROUTE","Первый маршрут","Giuseppe's first route is simple until everything changes.","reach",["DEPOT","SERVICE LEVEL","EXIT"],["brawler","guard"],250,100,[D("GIUSEPPE","Маршрут простой."),D("CONTACT","Что может пойти не так?"),D("GIUSEPPE","Обычно после этой фразы всё идёт не так.")]),
 M("bellini_02",2,"giuseppe","THE PORT","Порт","Giuseppe finds the direct route blocked.","reach",["DOCK","WAREHOUSE","CRANE FLOOR"],["shooter","guard","rusher"],320,130,[D("GIUSEPPE","Слишком много охраны."),D("CONTACT","Есть другой путь?"),D("GIUSEPPE","Всегда есть другой путь.")]),
 M("bellini_03",3,"giuseppe","NIGHT RUN","Ночной рейс","A night route forces Giuseppe to rely on memory and timing.","reach",["NIGHT DOCK","SERVICE TUNNEL","ROOFTOP"],["flanker","shooter","sniper"],380,160,[D("GIUSEPPE","Ночью всё выглядит одинаково."),D("CONTACT","Ты потерялся?"),D("GIUSEPPE","Нет. Я ищу короткую дорогу.")]),
 M("bellini_04",4,"giuseppe","WAREHOUSE 7","Склад №7","A strange marking appears where it should not be.","find",["WAREHOUSE","CATWALK","OFFICE"],["guard","heavy","rusher"],450,190,[D("GIUSEPPE","Номер семь."),D("CONTACT","И что?"),D("GIUSEPPE","Он не должен здесь находиться.")]),
 M("bellini_05",5,"giuseppe","WRONG ADDRESS","Неправильный адрес","The address is correct. The destination is wrong.","find",["STREET","DEPOT","UPPER FLOOR"],["shooter","flanker","guard"],500,220,[D("GIUSEPPE","Адрес правильный."),D("CONTACT","Но место неправильное."),D("GIUSEPPE","Именно.")]),
 M("bellini_06",6,"giuseppe","SOMEONE ELSE'S CARGO","Чужой груз","A package clearly belongs to another family.","recover",["PORT","STORAGE","ROOF"],["rusher","heavy","shooter"],560,250,[D("GIUSEPPE","Это не наше."),D("CONTACT","Оставим?"),D("GIUSEPPE","Теперь уже поздно.")]),
 M("bellini_07",7,"giuseppe","OLD ROUTE","Старый маршрут","An old route map should have been forgotten.","find",["ARCHIVE","SERVICE FLOOR","ROOF"],["guard","sniper","flanker"],620,280,[D("GIUSEPPE","Эта карта старая."),D("CONTACT","Насколько?"),D("GIUSEPPE","Достаточно, чтобы никто не должен был её использовать.")]),
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
const rankNames=["RECRUIT","RUNNER","SOLDIER","OPERATOR","CAPO","UNDERBOSS"];
const weapons=[{name:"POCKET 9",damage:2,rate:18,mag:12,cost:0},{name:"SERVICE",damage:3,rate:14,mag:14,cost:450},{name:"REVOLVER",damage:5,rate:28,mag:6,cost:700},{name:"SMG",damage:2,rate:7,mag:24,cost:1100},{name:"SHOTGUN",damage:8,rate:34,mag:5,cost:1400},{name:"CARBINE",damage:6,rate:16,mag:10,cost:1800}];

let root:HTMLElement|null=null, canvas:HTMLCanvasElement|null=null, ctx:CanvasRenderingContext2D|null=null;
let mode:Mode="select", selected:HeroId|null=null, missionIndex=0, dialogueIndex=0, dialogueOpen=false;
let frame=0,last=0,raf=0,keys=new Set<string>(),cleanup:()=>void=()=>{};
let save:Save={hero:null,rank:0,xp:0,money:0,weapon:0,armor:0,completed:[]};
let player:Player={x:80,y:360,vx:0,vy:0,hp:100,maxHp:100,armor:0,ammo:12,grounded:false,cool:0,ability:0,facing:1};
let enemies:Enemy[]=[],bullets:Bullet[]=[];
let floor=0,floorTimer=0,objectiveProgress=0,flash=0;
let touch={left:false,right:false,jump:false,fire:false,ability:false};
const completedKey="freezzz:mafia-save:v2";

function loadSave(){try{const s=JSON.parse(localStorage.getItem(completedKey)||"");if(s&&typeof s==="object")save={...save,...s};}catch{}}
function storeSave(){try{localStorage.setItem(completedKey,JSON.stringify(save));}catch{}}
function rank(){return Math.min(rankNames.length-1,Math.floor(save.xp/650));}
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
interface MafiaVisual{face:string;tie:string;}
function drawMafiaMember(m:MafiaVisual,cx:number,ground:number,frame:number,scale=1){
 if(!ctx)return;
 ctx.save();ctx.translate(cx,ground);ctx.scale(scale,scale);
 ctx.translate(0,Math.sin(frame*.08)*.35);
 ellipse(0,0,24,3,"rgba(0,0,0,.72)");
 limb(6,-43,10,-9,11,"#181b1e");limb(-6,-43,-10,-9,11,"#181b1e");
 rect(5,-10,12,3,"#080a0c");rect(-17,-10,12,3,"#080a0c");
 poly([-19,-83,-12,-89,-5,-56,0,-50,5,-56,12,-89,19,-83,12,-51,0,-45,-12,-51],"#1b1e22");
 poly([-9,-82,0,-68,9,-82,6,-51,0,-46,-6,-51],"#f0eee7");
 poly([-7,-78,0,-68,7,-78,4,-52,-4,-52],"#d5d8d7");
 rect(-2,-68,4,19,m.tie);rect(-9,-56,18,3,"#0e1114");
 limb(-19,-76,-28,-48,8,"#1b1e22");limb(19,-76,28,-48,8,"#1b1e22");
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
 tx("FREEzzz MAFIA",18,15,9,hero().color);tx(hero().name,142,15,9,"#f0eee7");tx(rankNames[rank()],220,15,8,"#aab1b4");
 tx("$"+save.money,322,15,8,"#d9b86c");tx("HP "+Math.max(0,Math.round(player.hp)),410,15,8,"#d5d8d7");tx("ARM "+player.armor,490,15,8,"#9f83d6");tx("AMMO "+player.ammo,548,15,8,hero().color);
 tx("FLOOR "+(floor+1)+"/3, "+m.objective.toUpperCase(),18,57,8,"#aab1b4");
}

function drawWorld(m:Mission){
 drawBackdrop();drawHud(m);
 const platforms=[[0,396,640,16],[40,330,180,10],[270,290,160,10],[470,340,130,10],[120,220,170,10],[350,180,190,10],[30,120,180,10],[260,95,170,10],[470,125,140,10]];
 platforms.forEach(p=>{rect(p[0],p[1],p[2],p[3],"#303b40");rect(p[0],p[1],p[2],2,hero().color);});
 const targetX=560,targetY=95;
 if(hero().id==="giuseppe"&&player.ability>0){line(player.x,player.y-45,targetX,targetY,"#9f83d6",2);tx("ROUTE",targetX,targetY-18,7,"#9f83d6","center");}
 if(hero().id==="antonio"&&player.ability>0){enemies.forEach(e=>rect(e.x-7,e.y-35,14,2,"#54d6d8"));}
 rect(targetX-8,targetY-8,16,16,hero().color);tx("EXIT",targetX,targetY+18,7,hero().color,"center");
 enemies.forEach(drawEnemy);drawPlayer();
 bullets.forEach(b=>rect(b.x,b.y,5,2,b.from==="player"?hero().color:"#d86c35"));
 if(flash>0){rect(0,0,W,H,"rgba(255,255,255,"+Math.min(.18,flash)+")");flash-=.02;}
}
function enemyVisual(type:EnemyType):MafiaVisual{
 const faces:Record<EnemyType,string>={brawler:"#9c5f4e",shooter:"#6d8790",heavy:"#8a6b43",rusher:"#a94c42",guard:"#68776f",sniper:"#75658d",suppressor:"#9b7546",flanker:"#6d7e92"};
 const ties:Record<EnemyType,string>={brawler:"#b94f46",shooter:"#6d8790",heavy:"#c58b48",rusher:"#a94c42",guard:"#68776f",sniper:"#75658d",suppressor:"#9b7546",flanker:"#6d7e92"};
 return {face:faces[type],tie:ties[type]};
}
function drawEnemy(e:Enemy){
 const v=enemyVisual(e.type);drawMafiaMember(v,e.x,e.y,frame,.56);
 tx(e.type.toUpperCase(),e.x,e.y-86,5,v.tie,"center");
 rect(e.x-12,e.y-80,24,2,"#20282c");rect(e.x-12,e.y-80,24*clamp(e.hp/e.maxHp,0,1),2,v.tie);
}
function drawPlayer(){
 const x=player.x,y=player.y;drawMafiaMember(heroVisual(),x,y,frame,.82);
 const gunX=x+player.facing*26;line(x+player.facing*12,y-52,gunX,y-52,"#9ba3a5",5);
 if(player.ability>0)tx(hero().ability,x,y-104,7,hero().color,"center");
}
function spawnFloor(){
 floorTimer=0;objectiveProgress=0;bullets=[];enemies=[];
 const m=currentMission(),base=3+floor;
 const types=m.enemies;
 for(let i=0;i<base+2;i++){
   const type=types[i%types.length];const hp=18+(i%3)*12+(save.rank*3);
   enemies.push({type,x:100+i*82%500,y:390-(i%4)*55,hp,maxHp:hp,vx:0,cool:30+i*9,shootCool:70+i*13,dir:i%2?1:-1});
 }
 player={x:65,y:360,vx:0,vy:0,hp:Math.min(player.maxHp,100+save.armor*5),maxHp:100+save.armor*5,armor:save.armor*5,ammo:weapons[save.weapon].mag,grounded:false,cool:0,ability:0,facing:1};
}

function fire(){
 if(mode!=="play"||player.cool>0)return;
 const w=weapons[save.weapon];if(player.ammo<=0){player.ammo=w.mag;player.cool=18;return;}
 player.ammo--;player.cool=w.rate;bullets.push({x:player.x+player.facing*22,y:player.y-44,vx:player.facing*7,vy:0,from:"player",life:80});
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
 const left=keys.has("ArrowLeft")||keys.has("a")||touch.left,right=keys.has("ArrowRight")||keys.has("d")||touch.right;
 if(left){player.vx=-2.6;player.facing=-1;}else if(right){player.vx=2.6;player.facing=1;}else player.vx*=.75;
 if((keys.has("ArrowUp")||keys.has("w")||touch.jump)&&player.grounded){player.vy=-9;player.grounded=false;}
 if(keys.has(" ")||keys.has("f")||touch.fire)fire();
 if(keys.has("e")||touch.ability)useAbility();
 if(player.ability>0&&hero().id==="massimo")player.vx*=1.04;
 player.vy+=.42;player.x=clamp(player.x+player.vx,18,622);player.y+=player.vy;
 player.grounded=false;
 const plats=[[0,396,640,16],[40,330,180,10],[270,290,160,10],[470,340,130,10],[120,220,170,10],[350,180,190,10],[30,120,180,10],[260,95,170,10],[470,125,140,10]];
 for(const p of plats)if(player.vy>=0&&player.y>=p[1]&&player.y<=p[1]+12&&player.x>=p[0]&&player.x<=p[0]+p[2]){player.y=p[1];player.vy=0;player.grounded=true;}
 for(const b of bullets){b.x+=b.vx;b.y+=b.vy;b.life-=dt;if(b.from==="enemy"&&Math.abs(b.x-player.x)<15&&Math.abs(b.y-(player.y-40))<25){b.life=0;hurt(7);}}
 bullets=bullets.filter(b=>b.life>0&&b.x>-10&&b.x<W+10);
 for(const e of enemies){
   e.cool-=dt;e.shootCool-=dt;
   const dx=player.x-e.x;
   if(e.type==="rusher"||e.type==="brawler"||e.type==="flanker")e.x+=Math.sign(dx)*(e.type==="rusher"?.9:.45);
   else if(Math.abs(dx)<180)e.x+=Math.sign(dx)*.18;
   if((e.type==="shooter"||e.type==="sniper"||e.type==="suppressor")&&e.shootCool<=0){e.shootCool=e.type==="suppressor"?28:65;bullets.push({x:e.x,y:e.y-40,vx:Math.sign(dx||1)*3.2,vy:0,from:"enemy",life:110});}
   if(Math.abs(e.x-player.x)<24&&Math.abs(e.y-player.y)<40&&e.cool<=0){e.cool=55;hurt(e.type==="heavy"?12:7);}
 }
 for(const b of bullets)if(b.from==="player")for(const e of enemies)if(Math.abs(b.x-e.x)<16&&Math.abs(b.y-(e.y-35))<30){e.hp-=weapons[save.weapon].damage;b.life=0;if(e.hp<=0){save.money+=25;save.xp+=18;}}
 enemies=enemies.filter(e=>e.hp>0);
 if(enemies.length===0){objectiveProgress=1;}
 floorTimer+=dt;
 const m=currentMission();
 const reachedExit=player.x>600&&player.y<145;
 const objectiveDone=m.objective==="reach"?reachedExit:objectiveProgress>=1||(m.objective==="survive"&&floorTimer>900);
 if(objectiveDone){
   if(floor<2){floor++;spawnFloor();}else completeMission();
 }
}

function completeMission(){
 mode="result";const m=currentMission();save.money+=m.reward;save.xp+=m.xp;
 if(!save.completed.includes(m.id))save.completed.push(m.id);
 save.rank=rank();storeSave();dialogueIndex=0;dialogueOpen=true;
}
function nextMission(){
 const h=selected!;
 const donePersonal=personal.filter(m=>m.hero===h&&save.completed.includes(m.id)).length;
 if(donePersonal<10){
   missionIndex=personal.findIndex(m=>m.hero===h&&!save.completed.includes(m.id));
 }else{
   const jointOrder=["joint_11","joint_12","joint_13"];
   const nextJoint=jointOrder.find(id=>!save.completed.includes(id));
   missionIndex=nextJoint?allMissions.findIndex(m=>m.id===nextJoint):-1;
   if(missionIndex<0){mode="select";dialogueOpen=false;storeSave();return;}
 }
 if(missionIndex<0)missionIndex=0;
 mode="briefing";dialogueIndex=0;dialogueOpen=true;
}
function beginSelected(){
 save.hero=selected;save.rank=rank();storeSave();
 const first=personal.findIndex(m=>m.hero===selected&&!save.completed.includes(m.id));
 missionIndex=first>=0?first:personal.findIndex(m=>m.hero===selected);
 mode="family";dialogueIndex=0;dialogueOpen=true;
}
function advanceDialogue(){
 const m=currentMission();
 if(mode==="shop"){mode="play";dialogueOpen=false;return;}
 if(mode==="family"){mode="briefing";dialogueIndex=0;dialogueOpen=true;return;}
 if(mode==="result"){dialogueOpen=false;nextMission();return;}
 if(!dialogueOpen){dialogueOpen=true;dialogueIndex=0;return;}
 dialogueIndex++;
 if(dialogueIndex>=m.dialogue.length){dialogueOpen=false;if(mode==="briefing"){mode="play";floor=0;spawnFloor();}else if(mode==="play"){}}
}
function missionForHero():Mission{const m=currentMission();return m;}
function startMissionById(id:string){const i=allMissions.findIndex(m=>m.id===id);if(i>=0){missionIndex=i;mode="briefing";dialogueIndex=0;dialogueOpen=true;}}

function renderCanvas(){
 if(!ctx)return;const m=currentMission();
 if(mode==="play"){drawWorld(m);return;}
 rect(0,0,W,H,"#07090b");
 if(mode==="select"){drawSelect();return;}
 if(mode==="family"){drawFamily();return;}
 if(mode==="briefing"){drawBriefing();return;}
 if(mode==="shop"){drawShop();return;}
 if(mode==="result"){drawResult();return;}
}
function panel(x:number,y:number,w:number,h:number){rect(x,y,w,h,"rgba(8,11,13,.94)");rect(x,y,w,2,hero().color);rect(x,y+h-2,w,2,"#252e33");}
function drawSelect(){
 tx("FOUR FAMILIES",W/2,26,16,"#f0eee7","center");tx("CHOOSE YOUR NEW MEMBER",W/2,49,7,"#7e898d","center");
 const ids:HeroId[]=["antonio","massimo","salvatore","giuseppe"];
 ids.forEach((id,i)=>{const h=heroes[id],x=80+i*160,a=id===selected;
   rect(x-68,82,136,190,a?"#151d21":"#0b1013");rect(x-68,82,136,3,a?h.color:"#263137");
   tx(h.family.toUpperCase(),x,94,8,a?"#f0eee7":"#aeb5b7","center");tx(h.name,x,111,6,h.color,"center");
   drawMafiaMember({face:h.face,tie:h.color},x,238,frame+i*4,.58);
   tx(familyText[h.family].desc,x,259,5,h.color,"center");
   tx(h.ability,x,267,4,"#7e898d","center");
 });
 tx("TAP A FAMILY MEMBER TO SELECT",W/2,306,7,"#d5d8d7","center");
 tx("CLASSIC SUITS · FEDORAS · FOUR FAMILY MEMBERS · 3 FLOORS",W/2,323,5,"#58646a","center");
}
function drawFamily(){
 const h=hero();panel(44,54,552,340);
 tx(h.family.toUpperCase(),320,78,18,h.color,"center");tx(h.name,320,103,12,"#f0eee7","center");tx(familyText[h.family].desc,320,126,8,"#aab1b4","center");
 tx("FAMILY STORY",320,157,9,h.color,"center");
 const lines=[familyText[h.family].intro,h.bio,"Ability: "+h.ability,"• "+h.abilityDesc];
 lines.forEach((s,i)=>tx(s,320,190+i*28,9,i===0?"#f0eee7":"#aab1b4","center"));
 tx("TAP / ENTER TO CONTINUE",320,370,8,h.color,"center");
}
function drawBriefing(){
 const m=currentMission();panel(35,48,570,350);
 tx("MISSION "+String(m.number).padStart(2,"0"),55,68,9,hero().color);
 tx(m.title,55,91,19,"#f0eee7");tx(m.ru,55,116,10,"#aab1b4");
 tx(m.desc,55,145,8,"#d5d8d7");tx("OBJECTIVE · "+m.objective.toUpperCase(),55,174,9,hero().color);
 m.floors.forEach((f,i)=>{tx("FLOOR "+(i+1),55,210+i*42,7,"#59656b");tx(f,125,208+i*42,9,"#f0eee7");});
 tx("REWARD  $"+m.reward+"   XP "+m.xp,55,345,8,"#d9b86c");
 tx("TAP / ENTER TO START",55,372,8,hero().color);
 if(dialogueOpen)drawDialogue();
}
function drawDialogue(){
 const m=currentMission(),d=m.dialogue[Math.min(dialogueIndex,m.dialogue.length-1)];if(!d)return;
 rect(20,292,600,125,"rgba(5,7,8,.97)");rect(20,292,600,3,hero().color);
 tx(d.speaker,36,308,9,hero().color);tx(d.text,36,335,10,"#f0eee7");
 tx("TAP / ENTER",590,391,7,"#59656b","right");
}
function drawShop(){
 panel(35,45,570,355);tx("ARMORY",55,67,16,hero().color);tx("CASH $"+save.money,575,69,9,"#d9b86c","right");
 weapons.forEach((w,i)=>{const y=105+i*40;const owned=save.weapon>=i;tx(String(i+1),55,y,8,"#59656b");tx(w.name,78,y,9,"#f0eee7");tx("$"+w.cost,275,y,8,"#d9b86c");tx(owned?"OWNED":"BUY",380,y,8,owned?hero().color:"#aab1b4");});
 tx("ESC / BACK   ·   number 1-6 selects weapon",55,374,7,"#59656b");
}
function drawResult(){
 const m=currentMission();panel(50,55,540,330);tx("MISSION COMPLETE",320,82,17,hero().color,"center");tx(m.title,320,110,10,"#f0eee7","center");
 tx("+$"+m.reward,320,160,15,"#d9b86c","center");tx("+"+m.xp+" XP",320,188,11,"#aab1b4","center");
 tx("RANK · "+rankNames[rank()],320,226,10,hero().color,"center");tx("TOTAL CASH · $"+save.money,320,250,9,"#f0eee7","center");
 if(m.number===10)tx("THE FOUR FAMILIES ARE NOW CONNECTED.",320,290,7,"#aab1b4","center");
 if(m.number===13)tx("CHAPTER I COMPLETE",320,290,11,hero().color,"center");
 tx("TAP / ENTER · CONTINUE",320,350,8,"#f0eee7","center");
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
function bindButtons(){
 root?.querySelectorAll<HTMLElement>("[data-hero]").forEach(el=>el.onclick=()=>{selected=el.dataset.hero as HeroId;beginSelected();});
 root?.querySelectorAll<HTMLElement>("[data-action]").forEach(el=>el.onclick=()=>{const a=el.dataset.action;if(a==="advance")advanceDialogue();if(a==="shop"){mode="shop";renderCanvas();}});
 root?.querySelectorAll<HTMLElement>("[data-touch]").forEach(el=>{const k=el.dataset.touch as keyof typeof touch;const on=(v:boolean)=>{touch[k]=v;};el.addEventListener("pointerdown",e=>{e.preventDefault();on(true)});["pointerup","pointercancel","pointerleave"].forEach(ev=>el.addEventListener(ev,()=>on(false)));});
}
function render(){
 if(!root)return;
 root.innerHTML='<div class="freezzz-mafia-frame"><canvas class="freezzz-mafia-canvas" width="'+W+'" height="'+H+'"></canvas><div class="freezzz-mafia-ui"></div></div>';
 canvas=root.querySelector("canvas");ctx=canvas?.getContext("2d")||null;
 const ui=root.querySelector<HTMLElement>(".freezzz-mafia-ui")!;
 if(mode==="select"){
   ui.innerHTML='<div class="mafia-select-grid">'+(["antonio","massimo","salvatore","giuseppe"] as HeroId[]).map(id=>'<button aria-label="Select '+heroes[id].name+'" data-hero="'+id+'"></button>').join("")+'</div>';
 }else if(mode==="play"){
   ui.innerHTML='<div class="mafia-controls"><button data-touch="left">◀</button><button data-touch="right">▶</button><button data-touch="jump">▲</button><button data-touch="fire">FIRE</button><button data-touch="ability">★</button><button data-action="shop">SHOP</button></div>';
 }else{
   ui.innerHTML='<div class="mafia-action"><button data-action="advance">'+(dialogueOpen?"CONTINUE":mode==="shop"?"BACK":"START / CONTINUE")+'</button></div>';
 }
 bindButtons();renderCanvas();
}
function loop(t:number){const dt=Math.min(2,(t-last)/16.67||1);last=t;if(mode==="play")update(dt);renderCanvas();raf=requestAnimationFrame(loop);}
function setup(){
 loadSave();selected=save.hero;
 render();raf=requestAnimationFrame(loop);
 cleanup=()=>{cancelAnimationFrame(raf);};
}
export function mountFreezzzMafia(host:HTMLElement){cleanup();root=host;mode="select";dialogueOpen=false;setup();return ()=>{cleanup();root=null;canvas=null;ctx=null;};}
