export type GameRace="human"|"elf"|"orc"|"dwarf";
export type GameTab="story"|"character"|"skills"|"achievements"|"journal";
export interface GameState{race:GameRace|null;level:number;xp:number;step:number;health:number;energy:number;mysteryClues:string[];mysteryRevealed:boolean;stats:{strength:number;endurance:number;mind:number;awareness:number;influence:number};skills:{exploration:number;negotiation:number;survival:number;knowledge:number;observation:number;will:number};reputation:{human:number;elf:number;orc:number;dwarf:number};achievements:string[];abilities:string[];abilityPoints:number;known:string[];promises:string[];choices:string[]}
const KEY="freezzz:game-state:v3";
const RACES:Record<GameRace,{name:string;gender:string;role:string;icon:string;description:string;stats:GameState["stats"]}>={
 human:{name:"Человек",gender:"Парень",role:"Маг",icon:"○",description:"Маг, который любит разбираться в том, чего ещё никто не объяснил. Сильнее всего растёт через знания и наблюдение.",stats:{strength:4,endurance:5,mind:8,awareness:5,influence:6}},
 elf:{name:"Эльф",gender:"Девушка",role:"Лучник",icon:"✧",description:"Лучница с хорошим глазом на детали. Чем дольше она смотрит и исследует, тем больше замечает.",stats:{strength:5,endurance:4,mind:6,awareness:9,influence:5}},
 orc:{name:"Орк",gender:"Девушка",role:"Воин",icon:"◇",description:"Воительница, которая привыкла не отступать перед трудным делом. Её путь — выдержка, воля и действие.",stats:{strength:9,endurance:9,mind:3,awareness:5,influence:3}},
 dwarf:{name:"Гном",gender:"Парень",role:"Вор",icon:"△",description:"Вор, который замечает тайники и странности раньше других. Любит разбираться, как всё устроено и где спрятан секрет.",stats:{strength:5,endurance:6,mind:7,awareness:8,influence:4}}
};
const DEFAULT_STATE:GameState={race:null,level:1,xp:0,step:1,health:72,energy:60,mysteryClues:[],mysteryRevealed:false,stats:{strength:5,endurance:5,mind:5,awareness:5,influence:5},skills:{exploration:0,negotiation:0,survival:0,knowledge:0,observation:0,will:0},reputation:{human:50,elf:0,orc:0,dwarf:0},achievements:[],abilities:[],abilityPoints:0,known:[],promises:[],choices:[]};
export function loadGameState():GameState{try{const raw=localStorage.getItem(KEY);if(!raw)return structuredClone(DEFAULT_STATE);const p=JSON.parse(raw) as Partial<GameState>;return {...structuredClone(DEFAULT_STATE),...p,mysteryClues:[...(p.mysteryClues||[])],mysteryRevealed:Boolean(p.mysteryRevealed),stats:{...DEFAULT_STATE.stats,...p.stats},skills:{...DEFAULT_STATE.skills,...p.skills},reputation:{...DEFAULT_STATE.reputation,...p.reputation},abilities:[...(p.abilities||[])],abilityPoints:p.abilityPoints||0}}catch{return structuredClone(DEFAULT_STATE)}}
export function saveGameState(s:GameState){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}
export function restartGame():GameState{const n=structuredClone(DEFAULT_STATE);try{localStorage.removeItem(KEY)}catch{}return n}
export function chooseRace(s:GameState,r:GameRace):GameState{const base=RACES[r];const n={...structuredClone(DEFAULT_STATE),race:r,stats:{...base.stats}};saveGameState(n);return n}
export function raceInfo(r:GameRace){return RACES[r]}
const SKILLS=[
 ["exploration","Исследование","◇"],["negotiation","Переговоры","◫"],["survival","Выживание","✦"],
 ["knowledge","Знания","▤"],["observation","Наблюдение","◉"],["will","Воля","◇"]
] as const;
const ABILITIES:Record<GameRace,{name:string;desc:string}[]>={
 human:[{name:"Искра маны",desc:"Магические решения дают дополнительный опыт и развивают разум."},{name:"Арканное чутьё",desc:"Изучение знаний открывает новые магические возможности."}],
 elf:[{name:"Меткий взгляд",desc:"Наблюдение и исследование развиваются быстрее."},{name:"Следопыт",desc:"Последовательные решения лучницы открывают дополнительные знания о мире."}],
 orc:[{name:"Боевой дух",desc:"Испытания быстрее развивают силу и выносливость."},{name:"Несокрушимая воля",desc:"Последовательные испытания открывают дополнительную стойкость."}],
 dwarf:[{name:"Тихая рука",desc:"Исследование и наблюдение развиваются быстрее."},{name:"Вскрытие тайны",desc:"Найденные секреты дают дополнительные очки способности."}]
};
type Choice={id:string;label:string;skill:keyof GameState["skills"];xp:number};
type Scene={title:string;text:string;choices:Choice[]};
const SCENES:Record<GameRace,Scene[]>={
 human:[
  {title:"Глава I · Перекрёсток",text:"У старой дороги расходятся три пути. Никто не скажет, какой выбрать. На обочине ты замечаешь странный знак на старом камне — такой же, как на полях найденной карты.",choices:[{id:"h1",label:"Рассмотреть карту и старую дорогу",skill:"exploration",xp:24},{id:"h2",label:"Поговорить с путником",skill:"negotiation",xp:24},{id:"h3",label:"Разбить лагерь и осмотреться",skill:"survival",xp:24}]},
  {title:"Глава II · Чужие правила",text:"В соседнем поселении всё устроено непривычно. Пока ты пытаешься понять местные правила, один старик замечает твой знак на карте и резко замолкает.",choices:[{id:"h4",label:"Понаблюдать и запомнить детали",skill:"observation",xp:26},{id:"h5",label:"Предложить поговорить спокойно",skill:"negotiation",xp:28},{id:"h6",label:"Самому разобраться, как здесь всё устроено",skill:"knowledge",xp:26}]},
  {title:"Глава III · Испытание выбора",text:"Дорога приводит к развилке. На одном пути стоят свежие следы, на другом — старый камень с тем же знаком. Теперь совпадений становится слишком много.",choices:[{id:"h7",label:"Пойти по неизвестному маршруту",skill:"exploration",xp:30},{id:"h8",label:"Выслушать обе стороны",skill:"negotiation",xp:30},{id:"h9",label:"Проверить решение в деле",skill:"survival",xp:30}]},
  {title:"Глава IV · Свой путь",text:"Ты прошёл достаточно, чтобы понять: случайностей здесь нет. В найденном тексте не хватает последней строки, а на камне у дороги появляется тот же знак.",choices:[{id:"h10",label:"Сопоставить всё, что удалось узнать",skill:"knowledge",xp:35},{id:"h11",label:"Поговорить с теми, кому доверяешь",skill:"negotiation",xp:35},{id:"h12",label:"Проверить найденное на дороге",skill:"exploration",xp:35}]}
 ],
 elf:[
  {title:"Глава I · Шёпот листвы",text:"В лесу всё спокойно, но птицы вдруг замолкают. На дереве четыре тонкие зарубки, и ты раньше такого знака не видел.",choices:[{id:"e1",label:"Понаблюдать за ветвями",skill:"observation",xp:28},{id:"e2",label:"Проверить следы на тропе",skill:"exploration",xp:28},{id:"e3",label:"Запомнить странные знаки",skill:"knowledge",xp:24}]},
  {title:"Глава II · Забытый сад",text:"В заброшенном саду лежит серебряный лист. На нём тот же знак. Он не похож ни на один известный тебе родовой символ.",choices:[{id:"e4",label:"Понять, что здесь повторяется",skill:"observation",xp:30},{id:"e5",label:"Осмотреть дальнюю часть сада",skill:"exploration",xp:32},{id:"e6",label:"Сравнить символы",skill:"knowledge",xp:30}]},
  {title:"Глава III · Безмолвный выбор",text:"Старая тропа заканчивается у каменной арки. Часть надписи сбита, будто кто-то специально убрал имена.",choices:[{id:"e7",label:"Сначала спокойно осмотреться",skill:"observation",xp:34},{id:"e8",label:"Проверить тропу",skill:"exploration",xp:34},{id:"e9",label:"Попробовать понять знаки",skill:"knowledge",xp:34}]},
  {title:"Глава IV · Чутьё",text:"Теперь всё начинает сходиться. Следы из леса, серебряный лист и арка говорят об одном и том же. Осталось понять, почему об этом молчат.",choices:[{id:"e10",label:"Пойти по едва заметному следу",skill:"observation",xp:40},{id:"e11",label:"Найти скрытую тропу",skill:"exploration",xp:40},{id:"e12",label:"Записать то, что удалось понять",skill:"knowledge",xp:40}]}
 ],
 orc:[
  {title:"Глава I · Испытание воли",text:"Перед первым испытанием старейшина замечает на камне четыре луча. Он знает этот знак, но вместо ответа велит тебе идти дальше.",choices:[{id:"o1",label:"Закончить тренировку",skill:"will",xp:26},{id:"o2",label:"Подготовиться к долгой дороге",skill:"survival",xp:28},{id:"o3",label:"Проверить, сколько ещё выдержишь",skill:"survival",xp:30}]},
  {title:"Глава II · Каменный подъём",text:"На горном пути ты находишь камень со старой зарубкой. Она похожа на знак предков, но никто не может объяснить, откуда он взялся.",choices:[{id:"o4",label:"Идти своим темпом",skill:"survival",xp:30},{id:"o5",label:"Беречь силы на потом",skill:"survival",xp:32},{id:"o6",label:"Взяться за сложное задание",skill:"will",xp:32}]},
  {title:"Глава III · Тяжёлое решение",text:"В заброшенной крепости ты находишь имя, выскобленное из старых списков. Рядом стоят четыре одинаковые метки.",choices:[{id:"o7",label:"Сдержаться и идти дальше",skill:"will",xp:36},{id:"o8",label:"Помочь остальным не сбиться с пути",skill:"survival",xp:36},{id:"o9",label:"Взять на себя ещё одну задачу",skill:"will",xp:38}]},
  {title:"Глава IV · Внутренний стержень",text:"Ты понимаешь, что старый запрет был не просто правилом племени. Кто-то когда-то очень хотел, чтобы эта история осталась забытой.",choices:[{id:"o10",label:"Закрепить привычку доводить дело до конца",skill:"will",xp:42},{id:"o11",label:"Подготовиться к следующей дороге",skill:"survival",xp:42},{id:"o12",label:"Поделиться опытом с другими",skill:"negotiation",xp:42}]}
 ],
 dwarf:[
  {title:"Глава I · Камень с памятью",text:"В стене старой дороги ты замечаешь работу неизвестного мастера. В камне спрятан знак из четырёх лучей. Возникает простой вопрос: кто это построил?",choices:[{id:"d1",label:"Разобраться, как сделана конструкция",skill:"knowledge",xp:28},{id:"d2",label:"Понять, для чего это можно использовать",skill:"survival",xp:26},{id:"d3",label:"Набросать схему находки",skill:"knowledge",xp:30}]},
  {title:"Глава II · Старая мастерская",text:"В заброшенной мастерской сохранились записи и странный чертёж. В углах стоят четыре одинаковых знака, но названия у механизма нет.",choices:[{id:"d4",label:"Разобрать старые записи",skill:"knowledge",xp:34},{id:"d5",label:"Проверить механизм в деле",skill:"survival",xp:32},{id:"d6",label:"Сравнить найденные схемы",skill:"exploration",xp:32}]},
  {title:"Глава III · Три тайны",text:"За стеной находится тайный проход. На его конце тот же узор и дата, которая совпадает с записью из мастерской.",choices:[{id:"d7",label:"Собрать всё, что уже известно",skill:"knowledge",xp:38},{id:"d8",label:"Выяснить, откуда это взялось",skill:"exploration",xp:38},{id:"d9",label:"Проверить решение на практике",skill:"survival",xp:38}]},
  {title:"Глава IV · Мастер",text:"Чертёж наконец складывается в понятную картину. Это не один механизм и не одна мастерская — кто-то собирал здесь общую память четырёх народов.",choices:[{id:"d10",label:"Собрать свою схему",skill:"knowledge",xp:44},{id:"d11",label:"Проверить следующий тайник",skill:"exploration",xp:44},{id:"d12",label:"Проверить всё на деле",skill:"survival",xp:44}]}
 ]};
function bars(s:GameState){return [["Сила","✦",s.stats.strength],["Выносливость","○",s.stats.endurance],["Разум","◇",s.stats.mind],["Внимание","◉",s.stats.awareness],["Влияние","●",s.stats.influence]].map(x=>'<div class="game-stat"><span><i>'+x[1]+'</i>'+x[0]+'</span><b>'+x[2]+'</b><em><u style="width:'+Math.min(100,(x[2] as number)*10)+'%"></u></em></div>').join("")}
function tabs(t:GameTab){return [["story","▤","История"],["character","○","Герой"],["skills","✦","Навыки"],["achievements","◆","Ачивки"],["journal","▤","Журнал"]].map(x=>'<button class="'+(t===x[0]?"active":"")+'" data-game-tab="'+x[0]+'" type="button" aria-label="'+x[2]+'" title="'+x[2]+'"><span aria-hidden="true">'+x[1]+'</span><small>'+x[2]+'</small></button>').join("")}
function racePicker(){return '<div class="game-rpg game-race-picker"><div class="game-intro"><span>FREEzzz STORY · FOUR PATHS</span><h2>КТО ТЫ?</h2><p>У каждого персонажа своя история, система развития навыков и способы открытия способностей.</p></div><div class="race-grid">'+(Object.keys(RACES) as GameRace[]).map(r=>{const x=RACES[r];return '<button class="race-card" data-game-race="'+r+'" type="button"><span>'+x.icon+'</span><strong>'+x.name+'</strong><small>'+x.description+'</small><em>Сила '+x.stats.strength+' · Разум '+x.stats.mind+' · Внимание '+x.stats.awareness+'</em></button>'}).join("")+'</div></div>'}
function abilityPanel(s:GameState){const list=ABILITIES[s.race!];return '<div class="game-abilities"><div class="game-panel-title"><span>СПОСОБНОСТИ</span><small>Очки '+s.abilityPoints+'</small></div>'+list.map(a=>'<div class="game-ability '+(s.abilities.includes(a.name)?"unlocked":"locked")+'"><span>'+(s.abilities.includes(a.name)?"◆":"?")+'</span><div><b>'+a.name+'</b><small>'+a.desc+'</small></div></div>').join("")+'</div>'}
const MYSTERY_CLUES:Record<GameRace,string[]>={
 human:[
  "На полях старой карты повторяется знак четырёх лучей. Рядом нет объяснения, только стёртая дата.",
  "Один из древних текстов откликается на магию, но в нём намеренно отсутствует последняя строка.",
  "На камне у дальней дороги найден тот же знак. Он старше местных поселений, хотя никто не помнит, кто его оставил.",
  "Четвёртый фрагмент показывает: твои странные находки были частями одной записи, разделённой между четырьмя народами."
 ],
 elf:[
  "В лесу птицы замолкают у дерева с четырьмя тонкими зарубками. Причина неизвестна.",
  "В забытом саду найден серебряный лист с тем же знаком, который не принадлежит ни одному известному роду.",
  "Старая тропа ведёт к каменной арке, но её символы намеренно повреждены так, будто кто-то скрывал имена.",
  "Последний след подтверждает: лес хранил не отдельную тайну, а часть общей истории, которую четыре народа когда-то скрыли."
 ],
 orc:[
  "Старейшины узнают знак четырёх лучей, но каждый раз замолкают, когда речь заходит о его происхождении.",
  "На горном пути найден камень с древней зарубкой. Она сделана тем же способом, что и знак на оружии предков, но смысл забыт.",
  "В руинах крепости обнаружено имя, которое выскоблено из всех сохранившихся списков. Рядом стоят четыре одинаковых метки.",
  "Последняя улика показывает: запрет старейшин был не тайной одного племени, а частью общего решения четырёх народов."
 ],
 dwarf:[
  "В старой мастерской найден чертёж без названия. В углах стоят четыре одинаковых знака, будто это части одного механизма.",
  "Механизм открывает только один фрагмент схемы. Кто его создал и зачем, мастерская не говорит.",
  "В тайном проходе обнаружен тот же узор и дата, совпадающая с записями из других земель.",
  "Последний чертёж собирает всё воедино: мастерская была частью хранилища общей памяти, которую четыре народа сознательно разделили."
 ]
};
function mysteryFor(s:GameState){return MYSTERY_CLUES[s.race!][Math.min(3,Math.max(0,s.step-1))]}
function addMysteryClue(n:GameState){const clue=mysteryFor(n);if(clue&&!n.mysteryClues.includes(clue))n.mysteryClues.push(clue)}
function story(s:GameState){
 const r=s.race!, scenes=SCENES[r];
 if(s.step>scenes.length){
  const resolved=s.mysteryRevealed;
  const text=resolved
   ? "В древнем зале четыре знака складываются в одну печать. Теперь понятно: все эти находки не были случайностью. Когда-то четыре народа договорились хранить одну общую историю, но потом разделили её на четыре части и спрятали каждую у себя. Каждый герой принёс сюда только кусок этой памяти и долго не понимал, зачем он ему нужен. Карта, серебряный лист, старое имя и чертёж оказались частями одной записи. Самое неожиданное — никто никого не предавал. Все четыре народа сами решили забыть эту историю, потому что боялись повторить старую ошибку. Теперь память снова собрана. На этом история героев заканчивается."
   : "Человек-маг, эльфийка-лучница, гном-вор и орчиха-воин приходят к древней границе с четырёх сторон. В тишине старого зала загораются четыре знака. Их дороги, начавшиеся в разных землях, сходятся здесь, и герои впервые видят друг друга. Перед ними лежат четыре фрагмента одной старой тайны — и каждый узнаёт в ней собственную улику.";
  const thought=resolved
   ? "Здесь не оказалось одного виноватого. Четыре народа сами сделали этот выбор. И только четыре человека смогли вернуть то, что их предки когда-то разделили."
   : "Четыре дороги привели в одно место. Ответ был спрятан не где-то далеко, а прямо в истории их народов.";
  const choices=resolved
   ? '<div class="game-ending-seal"><b>◆ ИСТОРИЯ ЗАВЕРШЕНА</b><small>Четыре пути сошлись. Тайна раскрыта. История завершена.</small></div>'
   : '<button data-game-choice="convergence" type="button"><b>◆</b> Соединить четыре улики и узнать правду</button>';
  return '<section class="game-story game-finale"><div class="game-scene"><div class="scene-stars">✦ · ✦ · · ✦</div><div class="scene-moon">◐</div><div class="scene-fire">♨</div><div class="scene-silhouette">♟ · ♟ · ♟ · ♟</div><small>ЧЕТЫРЕ ПУТИ · ОДНА ТАЙНА</small></div><article class="game-dialog"><span class="game-speaker">ФИНАЛ · ПОСЛЕДНЯЯ ЗАГАДКА</span><p>'+text+'</p><span class="game-speaker">РАЗГАДКА</span><p class="game-thought">'+thought+'</p></article><div class="game-choices">'+choices+'</div></section>';
 }
 const scene=scenes[s.step-1];
 const thought="Я — "+RACES[r].name+". Этот путь принадлежит мне.";
 const choices=scene.choices.map((c,i)=>'<button data-game-choice="'+c.id+'" type="button"><b>'+(i+1)+'</b> '+c.label+'</button>').join("");
 return '<section class="game-story"><div class="game-scene"><div class="scene-stars">✦ · ✦ · · ✦</div><div class="scene-moon">◐</div><div class="scene-fire">♨</div><div class="scene-silhouette">♟</div><small>'+scene.title.toUpperCase()+'</small></div><article class="game-dialog"><span class="game-speaker">'+RACES[r].name.toUpperCase()+' · ГЛАВА '+s.step+'</span><p>'+scene.text+'</p><span class="game-speaker">ВАШ ВЫБОР</span><p class="game-thought">'+thought+'</p></article><div class="game-choices">'+choices+'</div></section>';
}
export function renderGame(s:GameState,t:GameTab):string{if(!s.race)return racePicker();const r=RACES[s.race];let p="";if(t==="story")p=story(s);if(t==="character")p='<section class="game-panel"><div class="game-panel-title"><span>ХАРАКТЕРИСТИКИ</span><small>LVL '+s.level+' · XP '+s.xp+'/'+levelNeed(s.race!,s.level)+'</small></div>'+bars(s)+abilityPanel(s)+'</section>';if(t==="skills")p='<section class="game-panel"><div class="game-panel-title"><span>НАВЫКИ</span><small>'+r.gender+' · '+r.role+'</small></div>'+SKILLS.map(x=>'<div class="game-skill"><span>'+x[2]+' '+x[1]+'</span><b>'+s.skills[x[0]]+'</b><em><u style="width:'+Math.min(100,s.skills[x[0]]*20)+'%"></u></em></div>').join("")+abilityPanel(s)+'</section>';if(t==="achievements")p='<section class="game-panel"><div class="game-panel-title"><span>АЧИВКИ</span><small>'+s.achievements.length+' открыто</small></div>'+((s.achievements.length?s.achievements:["Первый шаг","???","???"]).map(a=>'<div class="game-achievement '+(a==="???"?"locked":"")+'"><span>'+(a==="???"?"?":"◆")+'</span><div><b>'+a+'</b><small>'+(a==="???"?"Скрытое достижение":"Получено по ходу истории")+'</small></div></div>').join(""))+'</section>';if(t==="journal")p='<section class="game-panel"><div class="game-panel-title"><span>ЖУРНАЛ</span><small>Глава '+s.step+' · '+r.name+'</small></div><div class="game-journal"><b>Известно</b>'+((s.known.length?s.known:["История только начинается."]).map(x=>'<p>✓ '+x+'</p>').join(""))+'<b>Обещания</b>'+((s.promises.length?s.promises:["Пока нет."]).map(x=>'<p>○ '+x+'</p>').join(""))+'</div></section>';return '<div class="game-rpg" data-game-root><header class="game-player-head"><div class="game-avatar">'+r.icon+'</div><div><strong>'+r.name+' · '+r.role+'</strong><small>'+r.gender+' · Уровень '+s.level+'</small></div><div class="game-vitals"><span>♥ '+s.health+'</span><span>⚡ '+s.energy+'</span><button class="game-restart" data-game-restart type="button">Новая игра</button></div></header><nav class="game-tabs">'+tabs(t)+'</nav>'+p+'</div>'}
function levelNeed(r:GameRace,level:number){return ({human:90,elf:100,orc:110,dwarf:105}[r])*Math.max(1,level)}
function unlockAbilities(n:GameState){const r=n.race!;const has=(x:string)=>n.abilities.includes(x);const unlock=(x:string)=>{if(!has(x)){n.abilities.push(x);n.abilityPoints++;n.achievements.push("Открыта способность: "+x)}};if(r==="human"){if(n.skills.knowledge>=2||n.skills.will>=2)unlock("Искра маны");if(Object.values(n.skills).filter(v=>v>0).length>=4)unlock("Арканное чутьё")}if(r==="elf"){if(n.skills.observation>=2)unlock("Меткий взгляд");if(n.skills.observation+n.skills.exploration>=6)unlock("Следопыт")}if(r==="orc"){if(n.skills.survival>=2||n.skills.will>=2)unlock("Боевой дух");if(n.skills.survival+n.skills.will>=6)unlock("Несокрушимая воля")}if(r==="dwarf"){if(n.skills.observation>=2||n.skills.exploration>=2)unlock("Тихая рука");if(n.known.length>=3)unlock("Вскрытие тайны")}}
function gainSkill(n:GameState,skill:keyof GameState["skills"]){let amount=1;const r=n.race!;if(r==="human"&&!n.choices.some(id=>id!==n.choices[n.choices.length-1]&&SCENES[r].some(sc=>sc.choices.some(ch=>ch.id===id&&ch.skill===skill))))amount=2;if(r==="human"&&(skill==="knowledge"||skill==="will"))amount=2;if(r==="elf"&&(skill==="observation"||skill==="exploration"))amount=2;if(r==="orc"&&(skill==="survival"||skill==="will"||skill==="exploration"))amount=2;if(r==="dwarf"&&(skill==="knowledge"||skill==="observation"||skill==="exploration"))amount=2;n.skills[skill]+=amount;if(r==="human"&&(skill==="knowledge"||skill==="will"))n.known.push("Магическое знание расширяет путь героя.");if(r==="elf"&&(skill==="observation"||skill==="exploration"))n.known.push("Лучница заметила деталь, скрытую от других.");if(r==="orc"&&(skill==="survival"||skill==="will"))n.energy=Math.min(100,n.energy+4);if(r==="dwarf"&&(skill==="knowledge"||skill==="observation"||skill==="exploration"))n.known.push("Вор обнаружил скрытую деталь.");return amount}
export function applyGameChoice(s:GameState,c:string):GameState{
 const n={...structuredClone(s),choices:[...s.choices,c],known:[...s.known],promises:[...s.promises],achievements:[...s.achievements],abilities:[...s.abilities]};
 if(c==="prologue2"||c==="convergence"){
  if(c==="prologue2"){n.known.push("Пророчество: четыре героя должны встретиться.");n.achievements.push("Финал первой части");}
  if(c==="convergence"){n.known.push("Четыре улики собраны в одну историю.");n.known.push("Разгадка: Первый Союз был разделён самими четырьмя народами, чтобы древняя сила не стала собственностью одного народа.");n.promises.push("Хранить восстановленную память и не повторять старую ошибку разделения.");n.achievements.push("Великая тайна раскрыта");n.mysteryRevealed=true;}
  n.step+=1;saveGameState(n);return n;
 }
 const scene=SCENES[n.race!].flatMap(x=>x.choices).find(x=>x.id===c);if(!scene)return n;
 const gained=gainSkill(n,scene.skill);n.xp+=scene.xp+gained*4;addMysteryClue(n);
 if(n.race==="elf")n.known.push("Точная деталь замечена.");
 if(n.race==="human"&&n.skills.negotiation>0)n.reputation.human=Math.min(100,n.reputation.human+1);
 if(n.race==="orc")n.energy=Math.max(25,n.energy-2);
 if(n.race==="dwarf")n.known.push("Новая закономерность добавлена в журнал.");
 if(n.race==="dwarf"&&scene.skill==="knowledge")n.abilityPoints++;
 unlockAbilities(n);
 const need=levelNeed(n.race!,n.level);
 if(n.xp>=need){n.xp-=need;n.level++;n.achievements.push("Новый уровень · "+RACES[n.race!].name);if(n.race==="human")n.stats.influence++;if(n.race==="elf")n.stats.awareness++;if(n.race==="orc")n.stats.endurance++;if(n.race==="dwarf")n.stats.mind++;}
 n.step+=1;saveGameState(n);return n;
}
