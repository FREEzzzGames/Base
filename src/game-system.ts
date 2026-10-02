export type GameRace="human"|"elf"|"orc"|"dwarf";
export type GameTab="story"|"character"|"skills"|"achievements"|"journal";
export interface GameState{race:GameRace|null;level:number;xp:number;step:number;health:number;energy:number;mysteryClues:string[];mysteryRevealed:boolean;stats:{strength:number;endurance:number;mind:number;awareness:number;influence:number};skills:{exploration:number;negotiation:number;survival:number;knowledge:number;observation:number;will:number};reputation:{human:number;elf:number;orc:number;dwarf:number};achievements:string[];abilities:string[];abilityPoints:number;known:string[];promises:string[];choices:string[]}
const KEY="freezzz:game-state:v3";
const RACES:Record<GameRace,{name:string;gender:string;role:string;icon:string;description:string;stats:GameState["stats"]}>={
 human:{name:"Человек",gender:"Парень",role:"Маг",icon:"○",description:"Маг-исследователь. Развивает разум, знания и силу заклинаний через изучение мира.",stats:{strength:4,endurance:5,mind:8,awareness:5,influence:6}},
 elf:{name:"Эльф",gender:"Девушка",role:"Лучник",icon:"✧",description:"Лучница-наблюдатель. Развивает внимание, исследование и точность через наблюдение.",stats:{strength:5,endurance:4,mind:6,awareness:9,influence:5}},
 orc:{name:"Орк",gender:"Девушка",role:"Воин",icon:"◇",description:"Воительница испытаний. Развивает выносливость, волю и боевые навыки через испытания.",stats:{strength:9,endurance:9,mind:3,awareness:5,influence:3}},
 dwarf:{name:"Гном",gender:"Парень",role:"Вор",icon:"△",description:"Вор и мастер скрытности. Развивает наблюдение, исследование и знания через поиск секретов.",stats:{strength:5,endurance:6,mind:7,awareness:8,influence:4}}
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
  {title:"Глава I · Перекрёсток",text:"У старой дороги три пути. Человек не получает готового ответа — его преимущество в том, что любой опыт становится уроком.",choices:[{id:"h1",label:"Изучить карту и местность",skill:"exploration",xp:24},{id:"h2",label:"Расспросить путника",skill:"negotiation",xp:24},{id:"h3",label:"Подготовить лагерь",skill:"survival",xp:24}]},
  {title:"Глава II · Чужие правила",text:"В соседнем поселении живут по своим обычаям. Здесь решает не сила, а способность понять новую систему.",choices:[{id:"h4",label:"Наблюдать и запомнить детали",skill:"observation",xp:26},{id:"h5",label:"Предложить мирный обмен знаниями",skill:"negotiation",xp:28},{id:"h6",label:"Самостоятельно разобраться в устройстве места",skill:"knowledge",xp:26}]},
  {title:"Глава III · Испытание выбора",text:"Два решения дают разные уроки. Универсальный путь требует пробовать то, чего раньше не делал.",choices:[{id:"h7",label:"Исследовать неизвестный маршрут",skill:"exploration",xp:30},{id:"h8",label:"Выслушать обе стороны",skill:"negotiation",xp:30},{id:"h9",label:"Проверить решение на практике",skill:"survival",xp:30}]},
  {title:"Глава IV · Свой путь",text:"Ты уже собрал набор разных навыков. Теперь можно соединить их и определить собственный стиль героя.",choices:[{id:"h10",label:"Соединить знания и наблюдение",skill:"knowledge",xp:35},{id:"h11",label:"Соединить опыт и влияние",skill:"negotiation",xp:35},{id:"h12",label:"Соединить исследование и практику",skill:"exploration",xp:35}]}
 ],
 elf:[
  {title:"Глава I · Шёпот листвы",text:"Эльф слышит больше, чем говорит. Следы почти незаметны, но внимательный взгляд превращает тишину в карту.",choices:[{id:"e1",label:"Наблюдать за движением ветвей",skill:"observation",xp:28},{id:"e2",label:"Изучить следы на тропе",skill:"exploration",xp:28},{id:"e3",label:"Запомнить знаки вокруг",skill:"knowledge",xp:24}]},
  {title:"Глава II · Забытый сад",text:"Старый сад хранит закономерность. Здесь способности растут не от спешки, а от точности.",choices:[{id:"e4",label:"Найти закономерность",skill:"observation",xp:30},{id:"e5",label:"Исследовать дальнюю часть сада",skill:"exploration",xp:32},{id:"e6",label:"Сопоставить символы",skill:"knowledge",xp:30}]},
  {title:"Глава III · Безмолвный выбор",text:"Перед тобой несколько признаков одной тайны. Чем точнее наблюдение, тем больше открывается.",choices:[{id:"e7",label:"Сначала наблюдать",skill:"observation",xp:34},{id:"e8",label:"Проверить путь",skill:"exploration",xp:34},{id:"e9",label:"Восстановить смысл знаков",skill:"knowledge",xp:34}]},
  {title:"Глава IV · Чутьё",text:"Ты научился видеть связи там, где другие видят только детали. Следующий шаг — доверять собственному восприятию.",choices:[{id:"e10",label:"Следовать самому тонкому следу",skill:"observation",xp:40},{id:"e11",label:"Открыть скрытую тропу",skill:"exploration",xp:40},{id:"e12",label:"Записать найденное знание",skill:"knowledge",xp:40}]}
 ],
 orc:[
  {title:"Глава I · Испытание воли",text:"Путь орка начинается с дисциплины. Не самый быстрый выбор оказывается самым надёжным.",choices:[{id:"o1",label:"Довести тренировку до конца",skill:"will",xp:26},{id:"o2",label:"Подготовиться к долгому пути",skill:"survival",xp:28},{id:"o3",label:"Проверить пределы выносливости",skill:"survival",xp:30}]},
  {title:"Глава II · Каменный подъём",text:"Дорога требует выдержки. Каждый пройденный этап укрепляет внутренний стержень.",choices:[{id:"o4",label:"Идти ровным темпом",skill:"survival",xp:30},{id:"o5",label:"Сохранить силы для финала",skill:"survival",xp:32},{id:"o6",label:"Не отказаться от сложного задания",skill:"will",xp:32}]},
  {title:"Глава III · Тяжёлое решение",text:"Настоящая сила проявляется в умении держать выбранный курс и не терять контроль.",choices:[{id:"o7",label:"Сдержать импульс и продолжить",skill:"will",xp:36},{id:"o8",label:"Помочь группе сохранить темп",skill:"survival",xp:36},{id:"o9",label:"Принять дополнительную нагрузку",skill:"will",xp:38}]},
  {title:"Глава IV · Внутренний стержень",text:"Ты уже знаешь цену выдержки. Теперь твоя способность — превращать испытание в устойчивость.",choices:[{id:"o10",label:"Закрепить привычку дисциплины",skill:"will",xp:42},{id:"o11",label:"Подготовить себя к следующему пути",skill:"survival",xp:42},{id:"o12",label:"Передать опыт другим",skill:"negotiation",xp:42}]}
 ],
 dwarf:[
  {title:"Глава I · Камень с памятью",text:"Гном замечает следы работы мастеров там, где другие видят обычный камень. Тайна начинается с вопроса «как это сделано?»",choices:[{id:"d1",label:"Изучить конструкцию",skill:"knowledge",xp:28},{id:"d2",label:"Найти практическое применение",skill:"survival",xp:26},{id:"d3",label:"Составить схему находки",skill:"knowledge",xp:30}]},
  {title:"Глава II · Старая мастерская",text:"В заброшенной мастерской сохранились записи. Каждая найденная деталь становится частью твоей системы знаний.",choices:[{id:"d4",label:"Разобраться в записях",skill:"knowledge",xp:34},{id:"d5",label:"Проверить устройство на практике",skill:"survival",xp:32},{id:"d6",label:"Сравнить разные схемы",skill:"exploration",xp:32}]},
  {title:"Глава III · Три тайны",text:"Ты находишь несколько скрытых закономерностей. Гномий путь награждает не скоростью, а количеством понятых деталей.",choices:[{id:"d7",label:"Собрать все сведения",skill:"knowledge",xp:38},{id:"d8",label:"Исследовать происхождение находки",skill:"exploration",xp:38},{id:"d9",label:"Проверить решение на практике",skill:"survival",xp:38}]},
  {title:"Глава IV · Мастер",text:"Знания перестали быть набором фактов. Ты умеешь соединять их в работающую систему.",choices:[{id:"d10",label:"Создать собственную схему",skill:"knowledge",xp:44},{id:"d11",label:"Исследовать следующий секрет",skill:"exploration",xp:44},{id:"d12",label:"Закрепить решение практикой",skill:"survival",xp:44}]}
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
   ? "В древнем зале четыре знака складываются в единую печать. Теперь становится ясно, что загадки каждой дороги не были случайностью. Четыре народа когда-то заключили Первый Союз, а затем сами разделили его память на четыре части, чтобы ни один народ не смог завладеть древним источником силы в одиночку. Каждый из героев нёс ключ к одной части, не зная об этом. Старые следы, замолчанные имена, серебряный лист и незаконченный чертёж были не зовом извне, а следами давно принятого решения их предков. Великая интрига раскрыта: легенды о вражде скрывали не предательство одного народа, а добровольное забвение всех четырёх. Герои возвращают память целиком — и на этом их первая история завершена."
   : "Человек-маг, эльфийка-лучница, гном-вор и орчиха-воин приходят к древней границе с четырёх сторон. В тишине старого зала загораются четыре знака. Их дороги, начавшиеся в разных землях, сходятся здесь, и герои впервые видят друг друга. Перед ними лежат четыре фрагмента одной старой тайны — и каждый узнаёт в ней собственную улику.";
  const thought=resolved
   ? "Не было избранного одного. Не было тайного врага одного. Была память, которую четыре народа однажды решили разделить — и которую теперь четыре человека смогли собрать обратно."
   : "Четыре дороги, четыре дара и одна тайна. Последняя разгадка ждёт не в будущем странствии, а здесь, в памяти четырёх народов.";
  const choices=resolved
   ? '<div class="game-ending-seal"><b>◆ ИСТОРИЯ ЗАВЕРШЕНА</b><small>Четыре пути сошлись. Тайна раскрыта. Эта часть имеет окончательный финал.</small></div>'
   : '<button data-game-choice="convergence" type="button"><b>◆</b> Соединить четыре улики и раскрыть тайну</button>';
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
