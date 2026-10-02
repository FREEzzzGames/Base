export type GameLanguage="RU"|"DE"|"EN";
export type GameRace="human"|"elf"|"orc"|"dwarf";
export type GameTab="story"|"character"|"skills"|"achievements"|"journal"|"quests"|"shop";
type MiniQuest={id:string;title:string;description:string;goal:number;progress:number;reward:number;kind:"observe"|"talk"|"explore"|"knowledge"};
export interface GameState{race:GameRace|null;level:number;xp:number;step:number;health:number;energy:number;mysteryClues:string[];mysteryRevealed:boolean;outcome:string|null;lastAction:string|null;worldFlags:string[];coins:number;miniQuests:MiniQuest[];completedQuests:number;stats:{strength:number;endurance:number;mind:number;awareness:number;influence:number};skills:{exploration:number;negotiation:number;survival:number;knowledge:number;observation:number;will:number};reputation:{human:number;elf:number;orc:number;dwarf:number};achievements:string[];abilities:string[];abilityPoints:number;known:string[];promises:string[];choices:string[]}
const KEY="freezzz:game-state:v3";
const GAME_UI:Record<GameLanguage,Record<string,string>>={
RU:{story:"История",character:"Герой",skills:"Навыки",achievements:"Ачивки",journal:"Журнал",quests:"Квесты",shop:"Магазин",level:"Уровень",newGame:"Новая игра",stats:"Характеристики",abilities:"Способности",coins:"Монеты",open:"открыто",hidden:"Скрытое достижение",earned:"Получено по ходу истории",clues:"Улики",remember:"Мир помнит",promises:"Обещания",none:"Пока нет.",progress:"В процессе",claim:"Забрать",continue:"Продолжить путь",what:"Что ты сделаешь?",noAnswer:"Нет правильного ответа. Мир запомнит способ, которым ты поступил.",consequence:"Последствие",worldRemembered:"Мир запомнил",final:"История завершена",finalSubtitle:"Четыре пути сошлись. Тайна раскрыта. История завершена.",finalRiddle:"Последняя загадка",solution:"Разгадка",chapter:"Глава"},
DE:{story:"Geschichte",character:"Held",skills:"Fähigkeiten",achievements:"Erfolge",journal:"Tagebuch",quests:"Aufgaben",shop:"Laden",level:"Stufe",newGame:"Neues Spiel",stats:"Attribute",abilities:"Fähigkeiten",coins:"Münzen",open:"freigeschaltet",hidden:"Verborgener Erfolg",earned:"Im Verlauf der Geschichte erhalten",clues:"Hinweise",remember:"Die Welt erinnert sich",promises:"Versprechen",none:"Noch keine.",progress:"In Arbeit",claim:"Abholen",continue:"Weg fortsetzen",what:"Was wirst du tun?",noAnswer:"Es gibt keine richtige Antwort. Die Welt wird sich daran erinnern, wie du gehandelt hast.",consequence:"Folge",worldRemembered:"Die Welt erinnert sich",final:"Geschichte abgeschlossen",finalSubtitle:"Vier Wege treffen zusammen. Das Geheimnis ist gelüftet.",finalRiddle:"Das letzte Rätsel",solution:"Lösung",chapter:"Kapitel"},
EN:{story:"Story",character:"Hero",skills:"Skills",achievements:"Achievements",journal:"Journal",quests:"Quests",shop:"Shop",level:"Level",newGame:"New Game",stats:"Attributes",abilities:"Abilities",coins:"Coins",open:"unlocked",hidden:"Hidden achievement",earned:"Earned during the story",clues:"Clues",remember:"The world remembers",promises:"Promises",none:"None yet.",progress:"In progress",claim:"Claim",continue:"Continue the journey",what:"What will you do?",noAnswer:"There is no right answer. The world will remember how you chose to act.",consequence:"Consequence",worldRemembered:"The world remembers",final:"Story complete",finalSubtitle:"Four paths have converged. The mystery is revealed. The story is complete.",finalRiddle:"The final riddle",solution:"Solution",chapter:"Chapter"}
};
function gt(lang:GameLanguage,key:string){return GAME_UI[lang][key]||GAME_UI.RU[key]||key}

const RACES:Record<GameRace,{name:string;gender:string;role:string;icon:string;description:string;stats:GameState["stats"]}>={
 human:{name:"Человек",gender:"Парень",role:"Маг",icon:"○",description:"Маг, который любит разбираться в том, чего ещё никто не объяснил. Сильнее всего растёт через знания и наблюдение.",stats:{strength:4,endurance:5,mind:8,awareness:5,influence:6}},
 elf:{name:"Эльф",gender:"Девушка",role:"Лучник",icon:"✧",description:"Лучница с хорошим глазом на детали. Чем дольше она смотрит и исследует, тем больше замечает.",stats:{strength:5,endurance:4,mind:6,awareness:9,influence:5}},
 orc:{name:"Орк",gender:"Девушка",role:"Воин",icon:"◇",description:"Воительница, которая привыкла не отступать перед трудным делом. Её путь — выдержка, воля и действие.",stats:{strength:9,endurance:9,mind:3,awareness:5,influence:3}},
 dwarf:{name:"Гном",gender:"Парень",role:"Вор",icon:"△",description:"Вор, который замечает тайники и странности раньше других. Любит разбираться, как всё устроено и где спрятан секрет.",stats:{strength:5,endurance:6,mind:7,awareness:8,influence:4}}
};
const DEFAULT_STATE:GameState={race:null,level:1,xp:0,step:1,health:72,energy:60,mysteryClues:[],mysteryRevealed:false,outcome:null,lastAction:null,worldFlags:[],coins:0,miniQuests:[],completedQuests:0,stats:{strength:5,endurance:5,mind:5,awareness:5,influence:5},skills:{exploration:0,negotiation:0,survival:0,knowledge:0,observation:0,will:0},reputation:{human:50,elf:0,orc:0,dwarf:0},achievements:[],abilities:[],abilityPoints:0,known:[],promises:[],choices:[]};
export function loadGameState():GameState{try{const raw=localStorage.getItem(KEY);if(!raw)return structuredClone(DEFAULT_STATE);const p=JSON.parse(raw) as Partial<GameState>;return {...structuredClone(DEFAULT_STATE),...p,outcome:p.outcome??null,lastAction:p.lastAction??null,worldFlags:[...(p.worldFlags||[])],coins:Math.max(0,Number(p.coins||0)),miniQuests:Array.isArray(p.miniQuests)?p.miniQuests:[],completedQuests:Math.max(0,Number(p.completedQuests||0)),mysteryClues:[...(p.mysteryClues||[])],mysteryRevealed:Boolean(p.mysteryRevealed),stats:{...DEFAULT_STATE.stats,...p.stats},skills:{...DEFAULT_STATE.skills,...p.skills},reputation:{...DEFAULT_STATE.reputation,...p.reputation},abilities:[...(p.abilities||[])],abilityPoints:p.abilityPoints||0}}catch{return structuredClone(DEFAULT_STATE)}}
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
type Action={id:string;label:string;skill:keyof GameState["skills"];xp:number;object:string;outcome:string};
type Scene={title:string;text:string;object:string;actions:Action[]};

const SCENES:Record<GameRace,Scene[]>={
 human:[
  {title:"Глава I · Старая дорога",object:"КАМЕНЬ · КАРТА",text:"У старой дороги расходятся три пути. На обочине стоит камень с четырьмя лучами. Знак совпадает с отметкой на найденной карте.",actions:[
   {id:"h1a",label:"Коснуться знака",skill:"knowledge",xp:24,object:"ЗНАК",outcome:"Камень едва заметно нагрелся, а в памяти всплыла короткая фраза: «Не ищи одного владельца». Ты не знаешь, что это значит, но теперь можешь узнать знак издалека."},
   {id:"h1b",label:"Сверить карту с камнем",skill:"observation",xp:26,object:"КАРТА",outcome:"Линии на карте совпали с направлением старой дороги. На полях проявилась стёртая дата — первый след ведёт дальше."},
   {id:"h1c",label:"Поговорить с путником",skill:"negotiation",xp:24,object:"ПУТНИК",outcome:"Путник признаётся, что видел такой знак раньше, но его учили не задавать вопросов. Он показывает тебе старую тропу."},
   {id:"h1d",label:"Осмотреться и запомнить место",skill:"exploration",xp:25,object:"ОКРЕСТНОСТИ",outcome:"Ты находишь четыре одинаковые царапины на разных камнях. Похоже, знак оставляли не случайно."}
  ]},
  {title:"Глава II · Чужие правила",object:"ПОСЕЛЕНИЕ · АРХИВ",text:"В соседнем поселении старик замечает твой знак и замолкает. Здесь явно знают больше, чем говорят.",actions:[
   {id:"h2a",label:"Спокойно спросить старика",skill:"negotiation",xp:28,object:"СТАРИК",outcome:"Старик не отвечает прямо, но говорит: «Ищи там, где четыре истории перестают быть разными»."},
   {id:"h2b",label:"Понаблюдать за людьми",skill:"observation",xp:26,object:"ЛЮДИ",outcome:"Ты замечаешь одну деталь: местные избегают старого архива, хотя ключ от него висит на виду."},
   {id:"h2c",label:"Изучить записи",skill:"knowledge",xp:30,object:"ЗАПИСИ",outcome:"В древнем тексте есть пробел ровно перед последней строкой. Кто-то удалил её намеренно."},
   {id:"h2d",label:"Проверить карту в архиве",skill:"exploration",xp:27,object:"АРХИВ",outcome:"Одна старая карта повторяет твой знак и указывает на развилку за поселением."}
  ]},
  {title:"Глава III · Слишком много совпадений",object:"РАЗВИЛКА · СЛЕДЫ",text:"На развилке один путь отмечен свежими следами, другой — старым знаком. Теперь совпадений становится слишком много.",actions:[
   {id:"h3a",label:"Изучить свежие следы",skill:"observation",xp:30,object:"СЛЕДЫ",outcome:"Следы обрываются у камня. Тот же знак есть на его обратной стороне."},
   {id:"h3b",label:"Пойти по старому знаку",skill:"exploration",xp:32,object:"СТАРЫЙ ПУТЬ",outcome:"Старая дорога приводит к месту, которого нет на современных картах."},
   {id:"h3c",label:"Сравнить обе дороги",skill:"knowledge",xp:31,object:"РАЗВИЛКА",outcome:"Обе дороги ведут к одной точке, но с разных сторон. Кто-то специально разделил маршруты."},
   {id:"h3d",label:"Остановиться и подумать",skill:"will",xp:28,object:"РЕШЕНИЕ",outcome:"Ты не спешишь. Это позволяет заметить маленький символ на земле — четвёртый луч."}
  ]},
  {title:"Глава IV · Свой путь",object:"ЧЕТВЁРТЫЙ ФРАГМЕНТ",text:"Ты уже понимаешь, что случайностей нет. В тексте не хватает строки, карта ведёт к старому месту, а знак повторяется везде.",actions:[
   {id:"h4a",label:"Собрать все записи",skill:"knowledge",xp:38,object:"ЗАПИСИ",outcome:"Разрозненные заметки складываются в одну мысль: четыре народа когда-то знали одну и ту же историю."},
   {id:"h4b",label:"Проверить последнюю отметку",skill:"exploration",xp:36,object:"ОТМЕТКА",outcome:"За камнем найден фрагмент записи. На нём тот же знак и дата, что на карте."},
   {id:"h4c",label:"Поговорить с теми, кому доверяешь",skill:"negotiation",xp:36,object:"СОЮЗНИКИ",outcome:"Несколько людей готовы поделиться воспоминаниями. Все помнят одну и ту же фразу: «Четыре части — одна память»."},
   {id:"h4d",label:"Проверить всё ещё раз",skill:"observation",xp:40,object:"УЛИКИ",outcome:"Ты находишь последнее совпадение и понимаешь: следующий шаг должен привести к месту встречи."}
  ]}
 ],
 elf:[
  {title:"Глава I · Шёпот листвы",object:"ДЕРЕВО · ЛЕС",text:"В лесу всё спокойно, но птицы вдруг замолкают. На дереве четыре тонкие зарубки.",actions:[
   {id:"e1a",label:"Осмотреть зарубки",skill:"observation",xp:28,object:"ЗАРУБКИ",outcome:"Зарубки сделаны в разное время, но одним способом. Последняя ведёт взгляд к северной тропе."},
   {id:"e1b",label:"Проверить землю",skill:"exploration",xp:28,object:"ТРОПА",outcome:"В траве остаётся едва заметный след серебристой пыли. Он тянется к старому саду."},
   {id:"e1c",label:"Запомнить рисунок",skill:"knowledge",xp:25,object:"СИМВОЛ",outcome:"Ты понимаешь, что четыре луча немного различаются. Один из них похож на знак с древней легенды."},
   {id:"e1d",label:"Понаблюдать за лесом",skill:"observation",xp:30,object:"ЛЕС",outcome:"Птицы возвращаются только после того, как ты отходишь от дерева. Будто место охраняет тишина."}
  ]},
  {title:"Глава II · Забытый сад",object:"СЕРЕБРЯНЫЙ ЛИСТ",text:"В заброшенном саду лежит серебряный лист с тем же знаком. Он не похож ни на один известный родовой символ.",actions:[
   {id:"e2a",label:"Рассмотреть лист",skill:"observation",xp:30,object:"ЛИСТ",outcome:"На обратной стороне есть тонкая линия, похожая на часть карты."},
   {id:"e2b",label:"Осмотреть сад",skill:"exploration",xp:32,object:"САД",outcome:"За зарослями находится дорожка, которой нет ни на одной местной схеме."},
   {id:"e2c",label:"Сравнить символы",skill:"knowledge",xp:30,object:"СИМВОЛЫ",outcome:"Знак на листе и знак на дереве совпадают. Их разделяют годы, но не смысл."},
   {id:"e2d",label:"Искать след того, кто здесь был",skill:"observation",xp:29,object:"СЛЕД",outcome:"Ты находишь старую ленту с четырьмя маленькими метками. Это явно было частью одного набора."}
  ]},
  {title:"Глава III · Безмолвный выбор",object:"КАМЕННАЯ АРКА",text:"Старая тропа заканчивается у каменной арки. Часть надписи сбита, будто кто-то специально убрал имена.",actions:[
   {id:"e3a",label:"Изучить повреждённую надпись",skill:"knowledge",xp:34,object:"НАДПИСЬ",outcome:"Под стёртым слоем остаётся одно слово: «помнить»."},
   {id:"e3b",label:"Осмотреть арку",skill:"observation",xp:34,object:"АРКА",outcome:"На внутренней стороне четыре маленьких знака образуют круг."},
   {id:"e3c",label:"Проверить старую тропу",skill:"exploration",xp:34,object:"ТРОПА",outcome:"Тропа ведёт к месту, где лес резко меняется и становится похож на сад из твоей прошлой находки."},
   {id:"e3d",label:"Сопоставить найденное",skill:"knowledge",xp:36,object:"СВЯЗЬ",outcome:"Ты понимаешь: кто-то не уничтожил историю, а разделил её на части."}
  ]},
  {title:"Глава IV · Чутьё",object:"ПОСЛЕДНИЙ СЛЕД",text:"Лес, лист, арка и старые метки говорят об одном и том же. Осталось понять, почему об этом молчат.",actions:[
   {id:"e4a",label:"Пойти по едва заметному следу",skill:"exploration",xp:40,object:"СЛЕД",outcome:"След выводит к древней границе, где сходятся четыре дороги."},
   {id:"e4b",label:"Записать всё, что заметила",skill:"knowledge",xp:40,object:"ЖУРНАЛ",outcome:"В записях появляется общая схема четырёх знаков. Теперь её можно сравнить с другими фрагментами."},
   {id:"e4c",label:"Понаблюдать перед следующим шагом",skill:"observation",xp:42,object:"ГРАНИЦА",outcome:"Ты видишь свет на дальней дороге — ещё кто-то идёт к тому же месту."},
   {id:"e4d",label:"Вернуться к первому знаку",skill:"observation",xp:38,object:"ПЕРВЫЙ ЗНАК",outcome:"Старый знак уже не кажется отдельной загадкой. Он оказался первой частью общей истории."}
  ]}
 ],
 orc:[
  {title:"Глава I · Испытание воли",object:"КАМЕНЬ · ЗНАК",text:"Перед первым испытанием старейшина замечает на камне четыре луча. Он знает этот знак, но вместо ответа велит тебе идти дальше.",actions:[
   {id:"o1a",label:"Спросить, что означает знак",skill:"negotiation",xp:27,object:"СТАРЕЙШИНА",outcome:"Старейшина отвечает только: «Когда увидишь четвёртый знак, поймёшь, почему мы молчим»."},
   {id:"o1b",label:"Внимательно осмотреть камень",skill:"observation",xp:26,object:"КАМЕНЬ",outcome:"Под старой царапиной обнаруживается второй слой знака. Его явно меняли позже."},
   {id:"o1c",label:"Подготовиться к дороге",skill:"survival",xp:28,object:"ДОРОГА",outcome:"Ты выбираешь не спешить и замечаешь отметку, которую иначе легко пропустить."},
   {id:"o1d",label:"Сосредоточиться и идти дальше",skill:"will",xp:30,object:"ВОЛЯ",outcome:"Старейшина впервые кивает. Похоже, он проверял не силу, а способность самому выбрать путь."}
  ]},
  {title:"Глава II · Каменный подъём",object:"ГОРНЫЙ ПУТЬ",text:"На горном пути находится камень со старой зарубкой. Она похожа на знак предков, но смысл забыт.",actions:[
   {id:"o2a",label:"Сравнить зарубку с памятью предков",skill:"knowledge",xp:30,object:"ЗАРУБКА",outcome:"Вспоминается старая история о четырёх хранителях. Раньше ты считал её легендой."},
   {id:"o2b",label:"Проверить окрестности",skill:"survival",xp:31,object:"ГОРЫ",outcome:"В стороне находится безопасная площадка со следами старого лагеря."},
   {id:"o2c",label:"Разобраться со знаком",skill:"observation",xp:32,object:"ЗНАК",outcome:"Четыре луча направлены в разные стороны. Они похожи на карту, а не на герб."},
   {id:"o2d",label:"Не торопиться и запомнить место",skill:"will",xp:30,object:"ПАМЯТЬ",outcome:"Ты отмечаешь место для журнала. Позже оно пригодится при сравнении с другими находками."}
  ]},
  {title:"Глава III · Тяжёлое решение",object:"РУИНЫ КРЕПОСТИ",text:"В заброшенной крепости ты находишь имя, выскобленное из старых списков. Рядом стоят четыре одинаковые метки.",actions:[
   {id:"o3a",label:"Изучить старые списки",skill:"knowledge",xp:36,object:"СПИСКИ",outcome:"Имя исчезло из нескольких списков одновременно. Это похоже на сознательное решение, а не случайность."},
   {id:"o3b",label:"Осмотреть четыре метки",skill:"observation",xp:35,object:"МЕТКИ",outcome:"Одна метка новее остальных. Кто-то возвращался сюда спустя много лет."},
   {id:"o3c",label:"Спросить сопровождающих",skill:"negotiation",xp:34,object:"СОЮЗНИКИ",outcome:"Они вспоминают старое правило: о четырёх знаках не говорили вне круга старейшин."},
   {id:"o3d",label:"Собрать силы и продолжить",skill:"survival",xp:36,object:"ПУТЬ",outcome:"Ты находишь второй вход в зал и понимаешь, что крепость была частью большого маршрута."}
  ]},
  {title:"Глава IV · Внутренний стержень",object:"СТАРЫЙ ЗАПРЕТ",text:"Теперь ясно: старый запрет был не просто правилом одного племени. Кто-то очень хотел, чтобы эта история осталась забытой.",actions:[
   {id:"o4a",label:"Собрать рассказы старейшин",skill:"negotiation",xp:42,object:"РАССКАЗЫ",outcome:"Разные люди повторяют одну деталь: четыре народа когда-то договорились хранить одну тайну вместе."},
   {id:"o4b",label:"Сопоставить знаки",skill:"knowledge",xp:42,object:"ЗНАКИ",outcome:"Каждая метка оказывается частью одного рисунка. Тебе становится ясно, куда идти дальше."},
   {id:"o4c",label:"Проверить последний маршрут",skill:"survival",xp:44,object:"МАРШРУТ",outcome:"Старая дорога приводит к границе, где сходятся четыре направления."},
   {id:"o4d",label:"Поделиться тем, что узнал",skill:"will",xp:40,object:"ПАМЯТЬ",outcome:"Ты решаешь не повторять старое молчание. Теперь часть истории знают и другие."}
  ]}
 ],
 dwarf:[
  {title:"Глава I · Камень с памятью",object:"СТЕНА · ЧЕТЫРЕ ЛУЧА",text:"В стене старой дороги спрятан знак из четырёх лучей. Возникает простой вопрос: кто это построил?",actions:[
   {id:"d1a",label:"Разобраться, как сделана конструкция",skill:"knowledge",xp:28,object:"КОНСТРУКЦИЯ",outcome:"Камни уложены по схеме, которой нет в местных зданиях. Один фрагмент можно перенести в чертёж."},
   {id:"d1b",label:"Проверить скрытые места",skill:"observation",xp:30,object:"СТЕНА",outcome:"За камнем находится маленькая пластина с тем же знаком."},
   {id:"d1c",label:"Набросать схему находки",skill:"knowledge",xp:30,object:"ЧЕРТЁЖ",outcome:"Схема показывает четыре одинаковых узла. Похоже, мастер работал не один."},
   {id:"d1d",label:"Осмотреть дорогу целиком",skill:"exploration",xp:27,object:"ДОРОГА",outcome:"Такие же следы работы встречаются дальше по дороге, но уже в другом порядке."}
  ]},
  {title:"Глава II · Старая мастерская",object:"ЧЕРТЁЖ · МЕХАНИЗМ",text:"В заброшенной мастерской сохранились записи и странный чертёж. В углах стоят четыре одинаковых знака.",actions:[
   {id:"d2a",label:"Разобрать старые записи",skill:"knowledge",xp:34,object:"ЗАПИСИ",outcome:"В записях нет имени мастера, зато есть дата и четыре одинаковых отметки."},
   {id:"d2b",label:"Осмотреть механизм",skill:"observation",xp:32,object:"МЕХАНИЗМ",outcome:"Механизм не запускается, но его детали показывают, что он должен был соединять четыре части."},
   {id:"d2c",label:"Сравнить схемы",skill:"exploration",xp:32,object:"СХЕМЫ",outcome:"Две схемы совпадают по датам. Значит, мастерская была частью более крупного проекта."},
   {id:"d2d",label:"Записать свою версию",skill:"knowledge",xp:35,object:"ГИПОТЕЗА",outcome:"Ты формулируешь первую рабочую версию: четыре знака обозначают не владельцев, а участников."}
  ]},
  {title:"Глава III · Три тайны",object:"ТАЙНЫЙ ПРОХОД",text:"За стеной находится тайный проход. На его конце тот же узор и дата, которая совпадает с записью из мастерской.",actions:[
   {id:"d3a",label:"Собрать известные детали",skill:"knowledge",xp:38,object:"СХЕМА",outcome:"Три независимых источника дают одну дату. Случайностью это уже не выглядит."},
   {id:"d3b",label:"Исследовать проход",skill:"exploration",xp:38,object:"ПРОХОД",outcome:"Проход выводит к залу с четырьмя пустыми местами под одинаковые фрагменты."},
   {id:"d3c",label:"Осмотреть стены",skill:"observation",xp:36,object:"СТЕНЫ",outcome:"На стене есть следы от четырёх табличек. Самих табличек давно нет."},
   {id:"d3d",label:"Проверить старую дату",skill:"knowledge",xp:40,object:"ДАТА",outcome:"Дата совпадает с записями из других земель. Кто-то поддерживал связь между мастерскими."}
  ]},
  {title:"Глава IV · Мастер",object:"ОБЩАЯ ПАМЯТЬ",text:"Чертёж наконец складывается в понятную картину. Это не одна мастерская — кто-то собирал здесь общую память четырёх народов.",actions:[
   {id:"d4a",label:"Собрать финальную схему",skill:"knowledge",xp:44,object:"СХЕМА",outcome:"Четыре части складываются в одну запись. На ней обозначено место встречи."},
   {id:"d4b",label:"Проверить последний тайник",skill:"exploration",xp:44,object:"ТАЙНИК",outcome:"В тайнике лежит пустая табличка с четырьмя местами под символы. Она ждала остальные части."},
   {id:"d4c",label:"Осмотреть механизм ещё раз",skill:"observation",xp:42,object:"МЕХАНИЗМ",outcome:"Теперь становится ясно, что механизм был способом хранить память, а не просто устройством."},
   {id:"d4d",label:"Сверить всё с журналом",skill:"knowledge",xp:46,object:"ЖУРНАЛ",outcome:"Все даты и знаки сходятся. Следующая точка — древняя граница четырёх народов."}
  ]}
]};

function bars(s:GameState){return [["Сила","✦",s.stats.strength],["Выносливость","○",s.stats.endurance],["Разум","◇",s.stats.mind],["Внимание","◉",s.stats.awareness],["Влияние","●",s.stats.influence]].map(x=>'<div class="game-stat"><span><i>'+x[1]+'</i>'+x[0]+'</span><b>'+x[2]+'</b><em><u style="width:'+Math.min(100,(x[2] as number)*10)+'%"></u></em></div>').join("")}
function tabs(t:GameTab){return [["story","▤","История"],["character","○","Герой"],["skills","✦","Навыки"],["quests","◇","Мини-квесты"],["shop","□","Магазин"],["achievements","◆","Ачивки"],["journal","▤","Журнал"]].map(x=>'<button class="'+(t===x[0]?"active":"")+'" data-game-tab="'+x[0]+'" type="button" aria-label="'+x[2]+'" title="'+x[2]+'"><span aria-hidden="true">'+x[1]+'</span><small>'+x[2]+'</small></button>').join("")}
function racePicker(){return '<div class="game-rpg game-race-picker"><div class="game-intro"><span>FREEzzz STORY · FOUR PATHS</span><h2>КТО ТЫ?</h2><p>У каждого персонажа своя история, система развития навыков и способы открытия способностей.</p></div><div class="race-grid">'+(Object.keys(RACES) as GameRace[]).map(r=>{const x=RACES[r];return '<button class="race-card" data-game-race="'+r+'" type="button"><span>'+x.icon+'</span><strong>'+x.name+'</strong><small>'+x.description+'</small><em>Сила '+x.stats.strength+' · Разум '+x.stats.mind+' · Внимание '+x.stats.awareness+'</em></button>'}).join("")+'</div></div>'}

const SHOP_ITEMS=[
 {id:"heal",name:"Зелье восстановления",desc:"Восстанавливает 20 здоровья.",price:32},
 {id:"energy",name:"Зелье энергии",desc:"Восстанавливает 20 энергии.",price:28},
 {id:"focus",name:"Зелье концентрации",desc:"Даёт +1 к текущему ключевому навыку героя.",price:55},
 {id:"insight",name:"Зелье опыта",desc:"Даёт 18 XP. Не повышает уровень мгновенно.",price:75}
] as const;
const QUEST_TEMPLATES=[
 {title:"Внимательный взгляд",description:"Найди и изучи одну необычную деталь в текущем мире.",kind:"observe" as const},
 {title:"Добрый разговор",description:"Выбери действие, связанное с переговорами.",kind:"talk" as const},
 {title:"След старой дороги",description:"Сделай выбор, связанный с исследованием.",kind:"explore" as const},
 {title:"Фрагмент знания",description:"Сделай выбор, связанный со знаниями.",kind:"knowledge" as const}
];
function createMiniQuests(n:GameState):MiniQuest[]{
 const seed=(n.completedQuests*17+n.level*31+(n.race==="human"?3:n.race==="elf"?7:n.race==="orc"?11:19));
 const out:MiniQuest[]=[];
 for(let i=0;i<3;i++){
  const q=QUEST_TEMPLATES[(seed+i*3)%QUEST_TEMPLATES.length];
  out.push({id:"q"+n.completedQuests+"-"+i,title:q.title,description:q.description,goal:1,progress:0,reward:10+(seed+i*5)%7,kind:q.kind});
 }
 return out;
}
function ensureQuests(n:GameState){if(!n.miniQuests.length)n.miniQuests=createMiniQuests(n)}
function questSkill(kind:MiniQuest["kind"]):keyof GameState["skills"]{
 return kind==="observe"?"observation":kind==="talk"?"negotiation":kind==="explore"?"exploration":"knowledge";
}
function questPanel(s:GameState){
 ensureQuests(s);
 return '<section class="game-panel"><div class="game-panel-title"><span>МИНИ-КВЕСТЫ</span><small>Монеты '+s.coins+' · выполнено '+s.completedQuests+'</small></div><p class="game-thought">Случайные короткие задания появляются по ходу игры. Награда небольшая, чтобы монеты ускоряли развитие, но не заменяли его.</p>'+s.miniQuests.map(q=>'<div class="game-quest '+(q.progress>=q.goal?"done":"")+'"><div><b>'+q.title+'</b><small>'+q.description+'</small><em>'+q.progress+'/'+q.goal+' · награда '+q.reward+' монет</em></div>'+ (q.progress>=q.goal?'<button type="button" data-game-quest-claim="'+q.id+'">Забрать</button>':'<span>В ПРОЦЕССЕ</span>')+'</div>').join("")+'</section>';
}
function shopPanel(s:GameState){
 return '<section class="game-panel"><div class="game-panel-title"><span>МАГАЗИН</span><small>Монеты '+s.coins+'</small></div><p class="game-thought">Цены рассчитаны так, чтобы зелья помогали в трудных местах, но не позволяли быстро перескочить несколько уровней.</p>'+SHOP_ITEMS.map(x=>'<div class="game-shop-item"><div><b>'+x.name+'</b><small>'+x.desc+'</small></div><button type="button" data-game-buy="'+x.id+'" '+(s.coins<x.price?"disabled":"")+'>'+x.price+' ◈</button></div>').join("")+'</section>';
}
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
 const r=s.race!,scenes=SCENES[r];
 if(s.step>scenes.length){
  const resolved=s.mysteryRevealed;
  const text=resolved
   ? "В древнем зале четыре знака складываются в одну печать. Теперь понятно: четыре народа когда-то договорились хранить одну общую историю, но разделили её на четыре части и спрятали каждую у себя. Карта, серебряный лист, старое имя и чертёж оказались частями одной записи. Никто никого не предавал: все четыре народа сами решили забыть эту историю, потому что боялись повторить старую ошибку. Теперь память снова собрана."
   : "Четыре дороги приводят к древней границе. В зале загораются четыре знака, и каждый герой узнаёт в них собственную улику. Осталось соединить найденные фрагменты.";
  const thought=resolved
   ? "Здесь не оказалось одного виноватого. Четыре народа сами сделали этот выбор. И только четыре человека смогли вернуть то, что их предки разделили."
   : "Все четыре истории сходятся в одной точке. Первый Союз был разделён на части, чтобы его память не исчезла совсем.";
  const choices=resolved
   ? '<div class="game-ending-seal"><b>◆ ИСТОРИЯ ЗАВЕРШЕНА</b><small>Четыре пути сошлись. Тайна раскрыта. История завершена.</small></div>'
   : '<button data-game-choice="convergence" type="button"><b>◆</b> Соединить четыре улики и узнать правду</button>';
  return '<section class="game-story game-finale"><div class="game-scene game-ambient-scene" data-game-ambient-host><small>ЧЕТЫРЕ ПУТИ · ОДНА ТАЙНА</small></div><article class="game-dialog"><span class="game-speaker">ФИНАЛ · ПОСЛЕДНЯЯ ЗАГАДКА</span><p>'+text+'</p><span class="game-speaker">РАЗГАДКА</span><p class="game-thought">'+thought+'</p></article><div class="game-choices">'+choices+'</div></section>';
 }
 const scene=scenes[s.step-1];
 if(s.outcome){
  return '<section class="game-story game-consequence"><div class="game-scene game-ambient-scene" data-game-ambient-host><small>'+scene.object+'</small></div><article class="game-dialog"><span class="game-speaker">ПОСЛЕДСТВИЕ · '+RACES[r].name.toUpperCase()+'</span><p>'+s.outcome+'</p><span class="game-speaker">МИР ЗАПОМНИЛ</span><p class="game-thought">'+(s.worldFlags[s.worldFlags.length-1]||"Это решение останется частью твоего пути.")+'</p></article><div class="game-choices"><button data-game-choice="continue" type="button"><b>→</b> Продолжить путь</button></div></section>';
 }
 const choices=scene.actions.map((a,i)=>'<button data-game-choice="'+a.id+'" type="button"><b>'+(i+1)+'</b><span><strong>'+a.label+'</strong><small>'+a.object+' · '+a.skill.toUpperCase()+'</small></span></button>').join("");
 return '<section class="game-story"><div class="game-scene game-ambient-scene" data-game-ambient-host><small>'+scene.object+'</small></div><article class="game-dialog"><span class="game-speaker">'+RACES[r].name.toUpperCase()+' · ГЛАВА '+s.step+'</span><p>'+scene.text+'</p><span class="game-speaker">ЧТО ТЫ СДЕЛАЕШЬ?</span><p class="game-thought">Нет правильного ответа. Мир запомнит способ, которым ты поступил.</p></article><div class="game-choices">'+choices+'</div></section>';
}
export function renderGame(s:GameState,t:GameTab,lang:GameLanguage="RU"):string{if(!s.race)return racePicker();const r=RACES[s.race];let p="";if(t==="story")p=story(s);if(t==="character")p='<section class="game-panel"><div class="game-panel-title"><span>ХАРАКТЕРИСТИКИ</span><small>LVL '+s.level+' · XP '+s.xp+'/'+levelNeed(s.race!,s.level)+'</small></div>'+bars(s)+abilityPanel(s)+'</section>';if(t==="quests")p=questPanel(s);if(t==="shop")p=shopPanel(s);if(t==="skills")p='<section class="game-panel"><div class="game-panel-title"><span>НАВЫКИ</span><small>'+r.gender+' · '+r.role+'</small></div>'+SKILLS.map(x=>'<div class="game-skill"><span>'+x[2]+' '+x[1]+'</span><b>'+s.skills[x[0]]+'</b><em><u style="width:'+Math.min(100,s.skills[x[0]]*20)+'%"></u></em></div>').join("")+abilityPanel(s)+'</section>';if(t==="achievements")p='<section class="game-panel"><div class="game-panel-title"><span>АЧИВКИ</span><small>'+s.achievements.length+' открыто</small></div>'+((s.achievements.length?s.achievements:["Первый шаг","???","???"]).map(a=>'<div class="game-achievement '+(a==="???"?"locked":"")+'"><span>'+(a==="???"?"?":"◆")+'</span><div><b>'+a+'</b><small>'+(a==="???"?"Скрытое достижение":"Получено по ходу истории")+'</small></div></div>').join(""))+'</section>';if(t==="journal")p='<section class="game-panel"><div class="game-panel-title"><span>ЖУРНАЛ</span><small>Глава '+s.step+' · '+r.name+'</small></div><div class="game-journal"><b>Улики</b>'+((s.mysteryClues.length?s.mysteryClues:["Пока нет найденных фрагментов."]).map(x=>'<p>✓ '+x+'</p>').join(""))+'<b>Мир помнит</b>'+((s.worldFlags.length?s.worldFlags:["Пока решений нет."]).map(x=>'<p>◆ '+x+'</p>').join(""))+'<b>Обещания</b>'+((s.promises.length?s.promises:["Пока нет."]).map(x=>'<p>○ '+x+'</p>').join(""))+'</div></section>';return '<div class="game-rpg game-race-'+s.race+' game-tab-'+t+'" data-game-root data-race="'+s.race+'" data-game-tab="'+t+'"><header class="game-player-head"><div class="game-avatar">'+r.icon+'</div><div><strong>'+r.name+' · '+r.role+'</strong><small>'+r.gender+' · Уровень '+s.level+'</small></div><div class="game-vitals"><span>♥ '+s.health+'</span><span>⚡ '+s.energy+'</span><button class="game-restart" data-game-restart type="button">Новая игра</button></div></header><nav class="game-tabs">'+tabs(t)+'</nav>'+p+'</div>'}
function levelNeed(r:GameRace,level:number){return ({human:90,elf:100,orc:110,dwarf:105}[r])*Math.max(1,level)}
function unlockAbilities(n:GameState){const r=n.race!;const has=(x:string)=>n.abilities.includes(x);const unlock=(x:string)=>{if(!has(x)){n.abilities.push(x);n.abilityPoints++;n.achievements.push("Открыта способность: "+x)}};if(r==="human"){if(n.skills.knowledge>=2||n.skills.will>=2)unlock("Искра маны");if(Object.values(n.skills).filter(v=>v>0).length>=4)unlock("Арканное чутьё")}if(r==="elf"){if(n.skills.observation>=2)unlock("Меткий взгляд");if(n.skills.observation+n.skills.exploration>=6)unlock("Следопыт")}if(r==="orc"){if(n.skills.survival>=2||n.skills.will>=2)unlock("Боевой дух");if(n.skills.survival+n.skills.will>=6)unlock("Несокрушимая воля")}if(r==="dwarf"){if(n.skills.observation>=2||n.skills.exploration>=2)unlock("Тихая рука");if(n.known.length>=3)unlock("Вскрытие тайны")}}
function gainSkill(n:GameState,skill:keyof GameState["skills"]){let amount=1;const r=n.race!;if(r==="human"&&(skill==="knowledge"||skill==="will"))amount=2;if(r==="elf"&&(skill==="observation"||skill==="exploration"))amount=2;if(r==="orc"&&(skill==="survival"||skill==="will"||skill==="exploration"))amount=2;if(r==="dwarf"&&(skill==="knowledge"||skill==="observation"||skill==="exploration"))amount=2;n.skills[skill]+=amount;if(r==="human"&&(skill==="knowledge"||skill==="will"))n.known.push("Магическое знание расширяет путь героя.");if(r==="elf"&&(skill==="observation"||skill==="exploration"))n.known.push("Лучница заметила деталь, скрытую от других.");if(r==="orc"&&(skill==="survival"||skill==="will"))n.energy=Math.min(100,n.energy+4);if(r==="dwarf"&&(skill==="knowledge"||skill==="observation"||skill==="exploration"))n.known.push("Вор обнаружил скрытую деталь.");return amount}

function completeQuestForAction(n:GameState,skill:keyof GameState["skills"]){
 const q=n.miniQuests.find(x=>x.progress<x.goal&&questSkill(x.kind)===skill);
 if(q){q.progress=q.goal;return;}
}
function buyItem(n:GameState,id:string):GameState{
 const item=SHOP_ITEMS.find(x=>x.id===id);if(!item||n.coins<item.price)return n;
 n.coins-=item.price;
 if(id==="heal")n.health=Math.min(100,n.health+20);
 if(id==="energy")n.energy=Math.min(100,n.energy+20);
 if(id==="focus"){
  const key:nkey = n.race==="human"?"knowledge":n.race==="elf"?"observation":n.race==="orc"?"survival":"exploration";
  n.skills[key]++;
 }
 if(id==="insight")n.xp+=18;
 n.known.push("Куплено: "+item.name);
 return n;
}
type nkey=keyof GameState["skills"];
export function applyGameChoice(s:GameState,c:string):GameState{
 const n={...structuredClone(s),choices:[...s.choices],known:[...s.known],promises:[...s.promises],achievements:[...s.achievements],abilities:[...s.abilities],worldFlags:[...s.worldFlags]};
 if(c.startsWith("buy:")){buyItem(n,c.slice(4));saveGameState(n);return n;}
 if(c.startsWith("claim:")){
  const q=n.miniQuests.find(x=>x.id===c.slice(6)&&x.progress>=x.goal);
  if(q){n.coins+=q.reward;n.completedQuests++;n.miniQuests=createMiniQuests(n);n.known.push("Мини-квест выполнен: "+q.title);}
  saveGameState(n);return n;
 }
 if(c==="convergence"){
  n.known.push("Четыре улики собраны в одну историю.");
  n.known.push("Разгадка: Первый Союз был разделён самими четырьмя народами, чтобы древняя сила не стала собственностью одного народа.");
  n.promises.push("Хранить восстановленную память и не повторять старую ошибку разделения.");
  n.achievements.push("Великая тайна раскрыта");
  n.mysteryRevealed=true;
  n.outcome=null;n.lastAction=null;
  n.step+=1;saveGameState(n);return n;
 }
 if(c==="continue"){
  addMysteryClue(n);
  n.step+=1;n.outcome=null;n.lastAction=null;
  saveGameState(n);return n;
 }
 const action=SCENES[n.race!].flatMap(x=>x.actions).find(x=>x.id===c);
 if(!action)return n;
 n.choices.push(c);
 const gained=gainSkill(n,action.skill);
 n.xp+=action.xp+gained*4;completeQuestForAction(n,action.skill);
 n.outcome=action.outcome;
 n.lastAction=c;
 n.worldFlags.push(action.object+" · "+action.label);
 if(n.worldFlags.length>12)n.worldFlags=n.worldFlags.slice(-12);
 if(n.race==="human"&&action.skill==="negotiation")n.reputation.human=Math.min(100,n.reputation.human+2);
 if(n.race==="elf"&&(action.skill==="observation"||action.skill==="exploration"))n.known.push("Лучница заметила деталь, скрытую от других.");
 if(n.race==="orc"&&action.skill==="survival")n.energy=Math.min(100,n.energy+4);
 if(n.race==="dwarf"&&action.skill==="knowledge")n.abilityPoints++;
 unlockAbilities(n);
 const need=levelNeed(n.race!,n.level);
 if(n.xp>=need){
  n.xp-=need;n.level++;n.achievements.push("Новый уровень · "+RACES[n.race!].name);
  if(n.race==="human")n.stats.influence++;
  if(n.race==="elf")n.stats.awareness++;
  if(n.race==="orc")n.stats.endurance++;
  if(n.race==="dwarf")n.stats.mind++;
 }
 saveGameState(n);return n;
}
