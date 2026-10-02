import type { GameLanguage, GameRace } from "./game-system";

export type LocalizedAction={label:string;object:string;outcome:string};
export type LocalizedScene={title:string;text:string;object:string;actions:Record<string,LocalizedAction>};

export const RACE_LOCALE:Record<GameLanguage,Record<GameRace,{name:string;gender:string;role:string;description:string}>>={
RU:{
 human:{name:"Человек",gender:"Парень",role:"Маг",description:"Маг, который любит разбираться в том, чего ещё никто не объяснил. Сильнее всего растёт через знания и наблюдение."},
 elf:{name:"Эльф",gender:"Девушка",role:"Лучник",description:"Лучница с хорошим глазом на детали. Чем дольше она смотрит и исследует, тем больше замечает."},
 orc:{name:"Орк",gender:"Девушка",role:"Воин",description:"Воительница, которая привыкла не отступать перед трудным делом. Её путь — выдержка, воля и действие."},
 dwarf:{name:"Гном",gender:"Парень",role:"Вор",description:"Вор, который замечает тайники и странности раньше других. Любит разбираться, как всё устроено и где спрятан секрет."}
},
DE:{
 human:{name:"Mensch",gender:"Mann",role:"Magier",description:"Ein Magier, der Dinge verstehen will, die bisher niemand erklären konnte. Wissen und Beobachtung bringen ihn am weitesten."},
 elf:{name:"Elf",gender:"Frau",role:"Bogenschützin",description:"Eine Bogenschützin mit einem scharfen Blick fürs Detail. Je länger sie beobachtet und forscht, desto mehr entdeckt sie."},
 orc:{name:"Ork",gender:"Frau",role:"Kriegerin",description:"Eine Kriegerin, die vor schwierigen Aufgaben nicht zurückweicht. Ihr Weg beruht auf Ausdauer, Willenskraft und entschlossenem Handeln."},
 dwarf:{name:"Zwerg",gender:"Mann",role:"Dieb",description:"Ein Dieb, der verborgene Fächer und Unstimmigkeiten früher als andere bemerkt. Er will verstehen, wie alles funktioniert und wo das Geheimnis verborgen liegt."}
},
EN:{
 human:{name:"Human",gender:"Man",role:"Mage",description:"A mage who likes to understand things no one has explained yet. Knowledge and observation are where he grows strongest."},
 elf:{name:"Elf",gender:"Woman",role:"Archer",description:"An archer with a sharp eye for detail. The longer she watches and investigates, the more she notices."},
 orc:{name:"Orc",gender:"Woman",role:"Warrior",description:"A warrior who refuses to back down from a difficult task. Her path is built on endurance, willpower, and action."},
 dwarf:{name:"Dwarf",gender:"Man",role:"Thief",description:"A thief who spots hidden places and odd details before others do. He likes to understand how things work and where the secret is hidden."}
}
};

export const SKILL_LOCALE:Record<GameLanguage,Record<string,string>>={
 RU:{exploration:"Исследование",negotiation:"Переговоры",survival:"Выживание",knowledge:"Знания",observation:"Наблюдение",will:"Воля"},
 DE:{exploration:"Erkundung",negotiation:"Verhandlung",survival:"Überleben",knowledge:"Wissen",observation:"Beobachtung",will:"Willenskraft"},
 EN:{exploration:"Exploration",negotiation:"Negotiation",survival:"Survival",knowledge:"Knowledge",observation:"Observation",will:"Willpower"}
};

export const ABILITY_LOCALE:Record<GameLanguage,Record<string,{name:string;desc:string}>>={
 RU:{
  "Искра маны":{name:"Искра маны",desc:"Магические решения дают дополнительный опыт и развивают разум."},
  "Арканное чутьё":{name:"Арканное чутьё",desc:"Изучение знаний открывает новые магические возможности."},
  "Меткий взгляд":{name:"Меткий взгляд",desc:"Наблюдение и исследование развиваются быстрее."},
  "Следопыт":{name:"Следопыт",desc:"Последовательные решения лучницы открывают дополнительные знания о мире."},
  "Боевой дух":{name:"Боевой дух",desc:"Испытания быстрее развивают силу и выносливость."},
  "Несокрушимая воля":{name:"Несокрушимая воля",desc:"Последовательные испытания открывают дополнительную стойкость."},
  "Тихая рука":{name:"Тихая рука",desc:"Исследование и наблюдение развиваются быстрее."},
  "Вскрытие тайны":{name:"Вскрытие тайны",desc:"Найденные секреты дают дополнительные очки способности."}
 },
 DE:{
  "Искра маны":{name:"Manakeim",desc:"Magische Entscheidungen bringen zusätzliche Erfahrung und schärfen den Verstand."},
  "Арканное чутьё":{name:"Arkane Intuition",desc:"Neues Wissen eröffnet weitere Möglichkeiten der Magie."},
  "Меткий взгляд":{name:"Scharfer Blick",desc:"Beobachtung und Erkundung entwickeln sich schneller."},
  "Следопыт":{name:"Spurenleserin",desc:"Aufeinander aufbauende Entscheidungen der Bogenschützin enthüllen zusätzliches Wissen über die Welt."},
  "Боевой дух":{name:"Kampfgeist",desc:"Herausforderungen stärken Kraft und Ausdauer schneller."},
  "Несокрушимая воля":{name:"Unbeugsamer Wille",desc:"Aufeinanderfolgende Prüfungen stärken die Widerstandskraft."},
  "Тихая рука":{name:"Ruhige Hand",desc:"Erkundung und Beobachtung entwickeln sich schneller."},
  "Вскрытие тайны":{name:"Geheimnisse öffnen",desc:"Entdeckte Geheimnisse bringen zusätzliche Fähigkeitspunkte."}
 },
 EN:{
  "Искра маны":{name:"Mana Spark",desc:"Magical choices grant extra experience and sharpen the mind."},
  "Арканное чутьё":{name:"Arcane Sense",desc:"Learning more about the world unlocks new magical possibilities."},
  "Меткий взгляд":{name:"Keen Eye",desc:"Observation and exploration develop faster."},
  "Следопыт":{name:"Pathfinder",desc:"A chain of choices reveals additional knowledge about the world."},
  "Боевой дух":{name:"Fighting Spirit",desc:"Trials build strength and endurance faster."},
  "Несокрушимая воля":{name:"Unbreakable Will",desc:"A chain of trials unlocks additional resilience."},
  "Тихая рука":{name:"Steady Hand",desc:"Exploration and observation develop faster."},
  "Вскрытие тайны":{name:"Unlocking Secrets",desc:"Discovered secrets grant additional ability points."}
 }
};

const A=(label:string,object:string,outcome:string):LocalizedAction=>({label,object,outcome});
const S=(title:string,object:string,text:string,actions:Record<string,LocalizedAction>):LocalizedScene=>({title,object,text,actions});

export const SCENE_LOCALE:Record<GameLanguage,Record<GameRace,LocalizedScene[]>>={
RU:{
 human:[
 S("Глава I · Старая дорога","КАМЕНЬ · КАРТА","У старой дороги расходятся три пути. На обочине стоит камень с четырьмя лучами. Знак совпадает с отметкой на найденной карте.",{
  h1a:A("Коснуться знака","ЗНАК","Камень едва заметно нагрелся, а в памяти всплыла короткая фраза: «Не ищи одного владельца». Ты не знаешь, что это значит, но теперь можешь узнать знак издалека."),
  h1b:A("Сверить карту с камнем","КАРТА","Линии на карте совпали с направлением старой дороги. На полях проявилась стёртая дата — первый след ведёт дальше."),
  h1c:A("Поговорить с путником","ПУТНИК","Путник признаётся, что видел такой знак раньше, но его учили не задавать вопросов. Он показывает тебе старую тропу."),
  h1d:A("Осмотреться и запомнить место","ОКРЕСТНОСТИ","Ты находишь четыре одинаковые царапины на разных камнях. Похоже, знак оставляли не случайно.")
 }),
 S("Глава II · Чужие правила","ПОСЕЛЕНИЕ · АРХИВ","В соседнем поселении старик замечает твой знак и замолкает. Здесь явно знают больше, чем говорят.",{
  h2a:A("Спокойно спросить старика","СТАРИК","Старик не отвечает прямо, но говорит: «Ищи там, где четыре истории перестают быть разными»."),
  h2b:A("Понаблюдать за людьми","ЛЮДИ","Ты замечаешь одну деталь: местные избегают старого архива, хотя ключ от него висит на виду."),
  h2c:A("Изучить записи","ЗАПИСИ","В древнем тексте есть пробел ровно перед последней строкой. Кто-то удалил её намеренно."),
  h2d:A("Проверить карту в архиве","АРХИВ","Одна старая карта повторяет твой знак и указывает на развилку за поселением.")
 }),
 S("Глава III · Слишком много совпадений","РАЗВИЛКА · СЛЕДЫ","На развилке один путь отмечен свежими следами, другой — старым знаком. Теперь совпадений становится слишком много.",{
  h3a:A("Изучить свежие следы","СЛЕДЫ","Следы обрываются у камня. Тот же знак есть на его обратной стороне."),
  h3b:A("Пойти по старому знаку","СТАРЫЙ ПУТЬ","Старая дорога приводит к месту, которого нет на современных картах."),
  h3c:A("Сравнить обе дороги","РАЗВИЛКА","Обе дороги ведут к одной точке, но с разных сторон. Кто-то специально разделил маршруты."),
  h3d:A("Остановиться и подумать","РЕШЕНИЕ","Ты не спешишь. Это позволяет заметить маленький символ на земле — четвёртый луч.")
 }),
 S("Глава IV · Свой путь","ЧЕТВЁРТЫЙ ФРАГМЕНТ","Ты уже понимаешь, что случайностей нет. В тексте не хватает строки, карта ведёт к старому месту, а знак повторяется везде.",{
  h4a:A("Собрать все записи","ЗАПИСИ","Разрозненные заметки складываются в одну мысль: четыре народа когда-то знали одну и ту же историю."),
  h4b:A("Проверить последнюю отметку","ОТМЕТКА","За камнем найден фрагмент записи. На нём тот же знак и дата, что на карте."),
  h4c:A("Поговорить с теми, кому доверяешь","СОЮЗНИКИ","Несколько людей готовы поделиться воспоминаниями. Все помнят одну и ту же фразу: «Четыре части — одна память»."),
  h4d:A("Проверить всё ещё раз","УЛИКИ","Ты находишь последнее совпадение и понимаешь: следующий шаг должен привести к месту встречи.")
 }),
 ],
 elf:[
 S("Глава I · Шёпот листвы","ДЕРЕВО · ЛЕС","В лесу всё спокойно, но птицы вдруг замолкают. На дереве четыре тонкие зарубки.",{
  e1a:A("Осмотреть зарубки","ЗАРУБКИ","Зарубки сделаны в разное время, но одним способом. Последняя ведёт взгляд к северной тропе."),
  e1b:A("Проверить землю","ТРОПА","В траве остаётся едва заметный след серебристой пыли. Он тянется к старому саду."),
  e1c:A("Запомнить рисунок","СИМВОЛ","Ты понимаешь, что четыре луча немного различаются. Один из них похож на знак с древней легенды."),
  e1d:A("Понаблюдать за лесом","ЛЕС","Птицы возвращаются только после того, как ты отходишь от дерева. Будто место охраняет тишина.")
 }),
 S("Глава II · Забытый сад","СЕРЕБРЯНЫЙ ЛИСТ","В заброшенном саду лежит серебряный лист с тем же знаком. Он не похож ни на один известный родовой символ.",{
  e2a:A("Рассмотреть лист","ЛИСТ","На обратной стороне есть тонкая линия, похожая на часть карты."),
  e2b:A("Осмотреть сад","САД","За зарослями находится дорожка, которой нет ни на одной местной схеме."),
  e2c:A("Сравнить символы","СИМВОЛЫ","Знак на листе и знак на дереве совпадают. Их разделяют годы, но не смысл."),
  e2d:A("Искать след того, кто здесь был","СЛЕД","Ты находишь старую ленту с четырьмя маленькими метками. Это явно было частью одного набора.")
 }),
 S("Глава III · Безмолвный выбор","КАМЕННАЯ АРКА","Старая тропа заканчивается у каменной арки. Часть надписи сбита, будто кто-то специально убрал имена.",{
  e3a:A("Изучить повреждённую надпись","НАДПИСЬ","Под стёртым слоем остаётся одно слово: «помнить»."),
  e3b:A("Осмотреть арку","АРКА","На внутренней стороне четыре маленьких знака образуют круг."),
  e3c:A("Проверить старую тропу","ТРОПА","Тропа ведёт к месту, где лес резко меняется и становится похож на сад из твоей прошлой находки."),
  e3d:A("Сопоставить найденное","СВЯЗЬ","Ты понимаешь: кто-то не уничтожил историю, а разделил её на части.")
 }),
 S("Глава IV · Чутьё","ПОСЛЕДНИЙ СЛЕД","Лес, лист, арка и старые метки говорят об одном и том же. Осталось понять, почему об этом молчат.",{
  e4a:A("Пойти по едва заметному следу","СЛЕД","След выводит к древней границе, где сходятся четыре дороги."),
  e4b:A("Записать всё, что заметила","ЖУРНАЛ","В записях появляется общая схема четырёх знаков. Теперь её можно сравнить с другими фрагментами."),
  e4c:A("Понаблюдать перед следующим шагом","ГРАНИЦА","Ты видишь свет на дальней дороге — ещё кто-то идёт к тому же месту."),
  e4d:A("Вернуться к первому знаку","ПЕРВЫЙ ЗНАК","Старый знак уже не кажется отдельной загадкой. Он оказался первой частью общей истории.")
 })
 ],
 orc:[
 S("Глава I · Испытание воли","КАМЕНЬ · ЗНАК","Перед первым испытанием старейшина замечает на камне четыре луча. Он знает этот знак, но вместо ответа велит тебе идти дальше.",{
  o1a:A("Спросить, что означает знак","СТАРЕЙШИНА","Старейшина отвечает только: «Когда увидишь четвёртый знак, поймёшь, почему мы молчим»."),
  o1b:A("Внимательно осмотреть камень","КАМЕНЬ","Под старой царапиной обнаруживается второй слой знака. Его явно меняли позже."),
  o1c:A("Подготовиться к дороге","ДОРОГА","Ты выбираешь не спешить и замечаешь отметку, которую иначе легко пропустить."),
  o1d:A("Сосредоточиться и идти дальше","ВОЛЯ","Старейшина впервые кивает. Похоже, он проверял не силу, а способность самому выбрать путь.")
 }),
 S("Глава II · Каменный подъём","ГОРНЫЙ ПУТЬ","На горном пути находится камень со старой зарубкой. Она похожа на знак предков, но смысл забыт.",{
  o2a:A("Сравнить зарубку с памятью предков","ЗАРУБКА","Вспоминается старая история о четырёх хранителях. Раньше ты считал её легендой."),
  o2b:A("Проверить окрестности","ГОРЫ","В стороне находится безопасная площадка со следами старого лагеря."),
  o2c:A("Разобраться со знаком","ЗНАК","Четыре луча направлены в разные стороны. Они похожи на карту, а не на герб."),
  o2d:A("Не торопиться и запомнить место","ПАМЯТЬ","Ты отмечаешь место для журнала. Позже оно пригодится при сравнении с другими находками.")
 }),
 S("Глава III · Тяжёлое решение","РУИНЫ КРЕПОСТИ","В заброшенной крепости ты находишь имя, выскобленное из старых списков. Рядом стоят четыре одинаковые метки.",{
  o3a:A("Изучить старые списки","СПИСКИ","Имя исчезло из нескольких списков одновременно. Это похоже на сознательное решение, а не случайность."),
  o3b:A("Осмотреть четыре метки","МЕТКИ","Одна метка новее остальных. Кто-то возвращался сюда спустя много лет."),
  o3c:A("Спросить сопровождающих","СОЮЗНИКИ","Они вспоминают старое правило: о четырёх знаках не говорили вне круга старейшин."),
  o3d:A("Собрать силы и продолжить","ПУТЬ","Ты находишь второй вход в зал и понимаешь, что крепость была частью большого маршрута.")
 }),
 S("Глава IV · Внутренний стержень","СТАРЫЙ ЗАПРЕТ","Теперь ясно: старый запрет был не просто правилом одного племени. Кто-то очень хотел, чтобы эта история осталась забытой.",{
  o4a:A("Собрать рассказы старейшин","РАССКАЗЫ","Разные люди повторяют одну деталь: четыре народа когда-то договорились хранить одну тайну вместе."),
  o4b:A("Сопоставить знаки","ЗНАКИ","Каждая метка оказывается частью одного рисунка. Тебе становится ясно, куда идти дальше."),
  o4c:A("Проверить последний маршрут","МАРШРУТ","Старая дорога приводит к границе, где сходятся четыре направления."),
  o4d:A("Поделиться тем, что узнал","ПАМЯТЬ","Ты решаешь не повторять старое молчание. Теперь часть истории знают и другие.")
 })
 ],
 dwarf:[
 S("Глава I · Камень с памятью","СТЕНА · ЧЕТЫРЕ ЛУЧА","В стене старой дороги спрятан знак из четырёх лучей. Возникает простой вопрос: кто это построил?",{
  d1a:A("Разобраться, как сделана конструкция","КОНСТРУКЦИЯ","Камни уложены по схеме, которой нет в местных зданиях. Один фрагмент можно перенести в чертёж."),
  d1b:A("Проверить скрытые места","СТЕНА","За камнем находится маленькая пластина с тем же знаком."),
  d1c:A("Набросать схему находки","ЧЕРТЁЖ","Схема показывает четыре одинаковых узла. Похоже, мастер работал не один."),
  d1d:A("Осмотреть дорогу целиком","ДОРОГА","Такие же следы работы встречаются дальше по дороге, но уже в другом порядке.")
 }),
 S("Глава II · Старая мастерская","ЧЕРТЁЖ · МЕХАНИЗМ","В заброшенной мастерской сохранились записи и странный чертёж. В углах стоят четыре одинаковых знака.",{
  d2a:A("Разобрать старые записи","ЗАПИСИ","В записях нет имени мастера, зато есть дата и четыре одинаковых отметки."),
  d2b:A("Осмотреть механизм","МЕХАНИЗМ","Механизм не запускается, но его детали показывают, что он должен был соединять четыре части."),
  d2c:A("Сравнить схемы","СХЕМЫ","Две схемы совпадают по датам. Значит, мастерская была частью более крупного проекта."),
  d2d:A("Записать свою версию","ГИПОТЕЗА","Ты формулируешь первую рабочую версию: четыре знака обозначают не владельцев, а участников.")
 }),
 S("Глава III · Три тайны","ТАЙНЫЙ ПРОХОД","За стеной находится тайный проход. На его конце тот же узор и дата, которая совпадает с записью из мастерской.",{
  d3a:A("Собрать известные детали","СХЕМА","Три независимых источника дают одну дату. Случайностью это уже не выглядит."),
  d3b:A("Исследовать проход","ПРОХОД","Проход выводит к залу с четырьмя пустыми местами под одинаковые фрагменты."),
  d3c:A("Осмотреть стены","СТЕНЫ","На стене есть следы от четырёх табличек. Самих табличек давно нет."),
  d3d:A("Проверить старую дату","ДАТА","Дата совпадает с записями из других земель. Кто-то поддерживал связь между мастерскими.")
 }),
 S("Глава IV · Мастер","ОБЩАЯ ПАМЯТЬ","Чертёж наконец складывается в понятную картину. Это не одна мастерская — кто-то собирал здесь общую память четырёх народов.",{
  d4a:A("Собрать финальную схему","СХЕМА","Четыре части складываются в одну запись. На ней обозначено место встречи."),
  d4b:A("Проверить последний тайник","ТАЙНИК","В тайнике лежит пустая табличка с четырьмя местами под символы. Она ждала остальные части."),
  d4c:A("Осмотреть механизм ещё раз","МЕХАНИЗМ","Теперь становится ясно, что механизм был способом хранить память, а не просто устройством."),
  d4d:A("Сверить всё с журналом","ЖУРНАЛ","Все даты и знаки сходятся. Следующая точка — древняя граница четырёх народов.")
 })
 ]
},
DE:{
 human:[
 S("Kapitel I · Die alte Straße","STEIN · KARTE","An der alten Straße teilen sich drei Wege. Am Rand steht ein Stein mit vier Strahlen. Das Zeichen stimmt mit der Markierung auf der gefundenen Karte überein.",{
  h1a:A("Das Zeichen berühren","ZEICHEN","Der Stein wird kaum merklich warm, und ein kurzer Satz taucht in deiner Erinnerung auf: „Suche nicht nach einem einzigen Besitzer.“ Du verstehst ihn noch nicht, aber du wirst das Zeichen künftig aus der Ferne erkennen."),
  h1b:A("Karte und Stein vergleichen","KARTE","Die Linien auf der Karte folgen der alten Straße. Am Rand erscheint ein verblasstes Datum – die erste Spur führt weiter."),
  h1c:A("Mit dem Reisenden sprechen","REISENDER","Der Reisende gibt zu, das Zeichen schon einmal gesehen zu haben. Man habe ihm jedoch beigebracht, keine Fragen zu stellen. Er zeigt dir einen alten Pfad."),
  h1d:A("Die Umgebung prüfen und einprägen","UMGEBUNG","Du findest vier gleiche Kratzer an verschiedenen Steinen. Das Zeichen wurde offenbar nicht zufällig hinterlassen.")
 }),
 S("Kapitel II · Fremde Regeln","SIEDLUNG · ARCHIV","In der benachbarten Siedlung bemerkt ein alter Mann dein Zeichen und verstummt. Hier weiß man offensichtlich mehr, als man erzählt.",{
  h2a:A("Den alten Mann ruhig fragen","ALTER MANN","Der alte Mann antwortet nicht direkt. Er sagt nur: „Suche dort, wo vier Geschichten aufhören, verschieden zu sein.“"),
  h2b:A("Die Menschen beobachten","MENSCHEN","Dir fällt etwas auf: Die Einheimischen meiden das alte Archiv, obwohl der Schlüssel offen sichtbar hängt."),
  h2c:A("Die Aufzeichnungen studieren","AUFZEICHNUNGEN","In einem alten Text fehlt genau vor der letzten Zeile ein Abschnitt. Jemand hat ihn absichtlich entfernt."),
  h2d:A("Die Karte im Archiv prüfen","ARCHIV","Eine alte Karte zeigt dasselbe Zeichen und weist auf eine Weggabelung hinter der Siedlung.")
 }),
 S("Kapitel III · Zu viele Zufälle","WEGGABELUNG · SPUREN","An der Weggabelung trägt ein Pfad frische Spuren, der andere ein altes Zeichen. Jetzt gibt es zu viele Zufälle.",{
  h3a:A("Die frischen Spuren untersuchen","SPUREN","Die Spuren enden an einem Stein. Auf seiner Rückseite befindet sich dasselbe Zeichen."),
  h3b:A("Dem alten Zeichen folgen","ALTER WEG","Der alte Weg führt zu einem Ort, der auf heutigen Karten nicht existiert."),
  h3c:A("Beide Wege vergleichen","WEGGABELUNG","Beide Wege führen zum selben Punkt, aber von entgegengesetzten Seiten. Jemand hat die Routen absichtlich getrennt."),
  h3d:A("Anhalten und nachdenken","ENTSCHEIDUNG","Du beeilst dich nicht. So bemerkst du ein kleines Symbol am Boden – den vierten Strahl.")
 }),
 S("Kapitel IV · Der eigene Weg","VIERTER FRAGMENT","Du verstehst bereits, dass es keine Zufälle gibt. Im Text fehlt eine Zeile, die Karte führt zu einem alten Ort, und das Zeichen taucht überall wieder auf.",{
  h4a:A("Alle Aufzeichnungen zusammenführen","AUFZEICHNUNGEN","Die verstreuten Notizen ergeben einen Gedanken: Vier Völker kannten einst dieselbe Geschichte."),
  h4b:A("Die letzte Markierung prüfen","MARKIERUNG","Hinter dem Stein liegt ein Fragment einer Aufzeichnung. Darauf stehen dasselbe Zeichen und dasselbe Datum wie auf der Karte."),
  h4c:A("Mit Menschen sprechen, denen du vertraust","VERBÜNDETE","Einige Menschen sind bereit, Erinnerungen zu teilen. Alle kennen denselben Satz: „Vier Teile – eine Erinnerung.“"),
  h4d:A("Alles noch einmal prüfen","HINWEISE","Du findest die letzte Übereinstimmung und erkennst: Der nächste Schritt muss zum Treffpunkt führen.")
 })
 ],
 elf:[
 S("Kapitel I · Das Flüstern der Blätter","BAUM · WALD","Im Wald ist alles ruhig, doch plötzlich verstummen die Vögel. In den Baum sind vier feine Kerben geschnitten.",{
  e1a:A("Die Kerben untersuchen","KERBEN","Die Kerben stammen aus verschiedenen Zeiten, wurden aber auf dieselbe Weise gemacht. Die letzte lenkt deinen Blick zum nördlichen Pfad."),
  e1b:A("Den Boden prüfen","PFAD","Im Gras bleibt eine kaum sichtbare Spur aus silbernem Staub. Sie führt zu einem alten Garten."),
  e1c:A("Das Muster einprägen","SYMBOL","Du erkennst, dass sich die vier Strahlen leicht unterscheiden. Einer ähnelt einem Zeichen aus einer alten Legende."),
  e1d:A("Den Wald beobachten","WALD","Die Vögel kehren erst zurück, nachdem du dich vom Baum entfernst. Als würde dieser Ort die Stille bewachen.")
 }),
 S("Kapitel II · Der vergessene Garten","SILBERNES BLATT","In einem verlassenen Garten liegt ein silbernes Blatt mit demselben Zeichen. Es gleicht keinem bekannten Wappensymbol.",{
  e2a:A("Das Blatt genauer ansehen","BLATT","Auf der Rückseite verläuft eine feine Linie, die wie ein Teil einer Karte aussieht."),
  e2b:A("Den Garten erkunden","GARTEN","Hinter dem Gestrüpp liegt ein Weg, den keine örtliche Karte verzeichnet."),
  e2c:A("Die Symbole vergleichen","SYMBOLE","Das Zeichen auf dem Blatt und das am Baum stimmen überein. Jahre trennen sie, nicht ihre Bedeutung."),
  e2d:A("Nach einer Spur des Besuchers suchen","SPUR","Du findest ein altes Band mit vier kleinen Markierungen. Es war eindeutig Teil eines gemeinsamen Sets.")
 }),
 S("Kapitel III · Die stille Entscheidung","STEINBOGEN","Der alte Pfad endet an einem Steinbogen. Ein Teil der Inschrift wurde abgeschlagen, als hätte jemand absichtlich Namen entfernt.",{
  e3a:A("Die beschädigte Inschrift untersuchen","INSCHRIFT","Unter der abgeschabten Schicht bleibt ein einziges Wort: „Erinnern“."),
  e3b:A("Den Bogen untersuchen","BOGEN","Auf der Innenseite bilden vier kleine Zeichen einen Kreis."),
  e3c:A("Den alten Pfad prüfen","PFAD","Der Pfad führt zu einem Ort, an dem sich der Wald plötzlich verändert und dem Garten deiner früheren Entdeckung ähnelt."),
  e3d:A("Die Funde miteinander verbinden","VERBINDUNG","Du erkennst: Jemand hat die Geschichte nicht zerstört, sondern in Teile aufgeteilt.")
 }),
 S("Kapitel IV · Gespür","LETZTE SPUR","Wald, Blatt, Bogen und alte Markierungen erzählen dieselbe Geschichte. Jetzt bleibt nur die Frage, warum alle darüber schweigen.",{
  e4a:A("Der kaum sichtbaren Spur folgen","SPUR","Die Spur führt zu einer alten Grenze, an der vier Wege zusammentreffen."),
  e4b:A("Alles Beobachtete aufschreiben","JOURNAL","In deinen Aufzeichnungen entsteht ein gemeinsames Muster der vier Zeichen. Nun kannst du es mit anderen Fragmenten vergleichen."),
  e4c:A("Vor dem nächsten Schritt beobachten","GRENZE","Du siehst Licht auf dem fernen Weg – noch jemand ist auf dem Weg zum selben Ort."),
  e4d:A("Zum ersten Zeichen zurückkehren","ERSTES ZEICHEN","Das alte Zeichen wirkt nicht länger wie ein einzelnes Rätsel. Es war der erste Teil einer gemeinsamen Geschichte.")
 })
 ],
 orc:[
 S("Kapitel I · Die Prüfung des Willens","STEIN · ZEICHEN","Vor der ersten Prüfung bemerkt der Älteste vier Strahlen auf dem Stein. Er kennt das Zeichen, fordert dich aber auf, weiterzugehen.",{
  o1a:A("Fragen, was das Zeichen bedeutet","ÄLTESTER","Der Älteste sagt nur: „Wenn du das vierte Zeichen siehst, wirst du verstehen, warum wir schweigen.“"),
  o1b:A("Den Stein genau untersuchen","STEIN","Unter einem alten Kratzer kommt eine zweite Schicht des Zeichens zum Vorschein. Sie wurde offenbar später verändert."),
  o1c:A("Dich auf den Weg vorbereiten","WEG","Du beschließt, nichts zu überstürzen, und bemerkst eine Markierung, die sonst leicht zu übersehen wäre."),
  o1d:A("Dich sammeln und weitergehen","WILLE","Der Älteste nickt zum ersten Mal. Offenbar prüfte er nicht deine Stärke, sondern ob du deinen eigenen Weg wählen kannst.")
 }),
 S("Kapitel II · Der steinerne Aufstieg","BERGPFAD","Auf dem Bergpfad steht ein Stein mit einer alten Kerbe. Sie ähnelt dem Zeichen der Vorfahren, doch ihre Bedeutung ist vergessen.",{
  o2a:A("Die Kerbe mit den Erinnerungen der Vorfahren vergleichen","KERBE","Du erinnerst dich an eine alte Geschichte über vier Hüter. Früher hieltest du sie für eine Legende."),
  o2b:A("Die Umgebung prüfen","BERGE","Etwas abseits liegt ein sicherer Platz mit Spuren eines alten Lagers."),
  o2c:A("Das Zeichen untersuchen","ZEICHEN","Die vier Strahlen zeigen in verschiedene Richtungen. Sie wirken eher wie eine Karte als wie ein Wappen."),
  o2d:A("Langsam weitergehen und den Ort einprägen","ERINNERUNG","Du merkst dir den Ort für dein Journal. Später wird er beim Vergleich mit anderen Funden wichtig.")
 }),
 S("Kapitel III · Eine schwere Entscheidung","RUINEN DER FESTUNG","In einer verlassenen Festung findest du einen Namen, der aus alten Listen herausgekratzt wurde. Daneben stehen vier gleiche Markierungen.",{
  o3a:A("Die alten Listen studieren","LISTEN","Der Name verschwand gleichzeitig aus mehreren Listen. Das wirkt wie eine bewusste Entscheidung, nicht wie ein Zufall."),
  o3b:A("Die vier Markierungen untersuchen","MARKIERUNGEN","Eine Markierung ist jünger als die anderen. Jemand kehrte viele Jahre später hierher zurück."),
  o3c:A("Die Begleiter fragen","VERBÜNDETE","Sie erinnern sich an eine alte Regel: Über die vier Zeichen wurde außerhalb des Kreises der Ältesten nicht gesprochen."),
  o3d:A("Kräfte sammeln und weitergehen","WEG","Du findest einen zweiten Eingang zum Saal und erkennst, dass die Festung Teil einer größeren Route war.")
 }),
 S("Kapitel IV · Innerer Kern","ALTES VERBOT","Jetzt ist klar: Das alte Verbot war nicht nur die Regel eines Stammes. Jemand wollte unbedingt, dass diese Geschichte vergessen bleibt.",{
  o4a:A("Die Erzählungen der Ältesten sammeln","ERZÄHLUNGEN","Verschiedene Menschen wiederholen dieselbe Einzelheit: Vier Völker vereinbarten einst, ein gemeinsames Geheimnis zu bewahren."),
  o4b:A("Die Zeichen zusammensetzen","ZEICHEN","Jede Markierung erweist sich als Teil eines einzigen Musters. Jetzt weißt du, wohin du weitergehen musst."),
  o4c:A("Die letzte Route prüfen","ROUTE","Die alte Straße führt zu einer Grenze, an der vier Richtungen zusammentreffen."),
  o4d:A("Das Gelernte weitergeben","ERINNERUNG","Du beschließt, das alte Schweigen nicht zu wiederholen. Nun kennen auch andere einen Teil der Geschichte.")
 })
 ],
 dwarf:[
 S("Kapitel I · Stein mit Erinnerung","MAUER · VIER STRAHLEN","In der Mauer an der alten Straße verbirgt sich ein Zeichen aus vier Strahlen. Eine einfache Frage entsteht: Wer hat das gebaut?",{
  d1a:A("Die Konstruktion untersuchen","KONSTRUKTION","Die Steine folgen einem Muster, das es in den örtlichen Gebäuden nicht gibt. Ein Fragment lässt sich in eine Zeichnung übertragen."),
  d1b:A("Verborgene Stellen prüfen","MAUER","Hinter einem Stein liegt eine kleine Platte mit demselben Zeichen."),
  d1c:A("Eine Skizze der Entdeckung anfertigen","ZEICHNUNG","Die Skizze zeigt vier gleiche Knotenpunkte. Offenbar arbeitete der Meister nicht allein."),
  d1d:A("Die ganze Straße untersuchen","STRASSE","Weiter unten finden sich ähnliche Arbeitsspuren, diesmal jedoch in einer anderen Reihenfolge.")
 }),
 S("Kapitel II · Die alte Werkstatt","ZEICHNUNG · MECHANISMUS","In einer verlassenen Werkstatt sind Aufzeichnungen und eine seltsame Zeichnung erhalten. In den Ecken stehen vier gleiche Zeichen.",{
  d2a:A("Die alten Aufzeichnungen entziffern","AUFZEICHNUNGEN","Der Name des Meisters fehlt, aber ein Datum und vier gleiche Markierungen sind erhalten."),
  d2b:A("Den Mechanismus untersuchen","MECHANISMUS","Der Mechanismus startet nicht, doch seine Teile zeigen, dass er vier Teile miteinander verbinden sollte."),
  d2c:A("Die Pläne vergleichen","PLÄNE","Zwei Pläne stimmen bei den Daten überein. Die Werkstatt war also Teil eines größeren Projekts."),
  d2d:A("Deine eigene Theorie notieren","HYPOTHESE","Du formulierst eine erste Arbeitshypothese: Die vier Zeichen stehen nicht für Besitzer, sondern für Beteiligte.")
 }),
 S("Kapitel III · Drei Geheimnisse","GEHEIMGANG","Hinter der Mauer liegt ein Geheimgang. Am Ende befinden sich dasselbe Muster und dasselbe Datum wie in der Werkstatt.",{
  d3a:A("Die bekannten Details zusammenführen","SCHEMA","Drei unabhängige Quellen nennen dasselbe Datum. Zufall ist das kaum noch."),
  d3b:A("Den Gang erforschen","DURCHGANG","Der Gang führt in einen Saal mit vier leeren Plätzen für identische Fragmente."),
  d3c:A("Die Wände untersuchen","WÄNDE","An der Wand sind Spuren von vier Tafeln. Die Tafeln selbst sind längst verschwunden."),
  d3d:A("Das alte Datum prüfen","DATUM","Das Datum stimmt mit Aufzeichnungen aus anderen Ländern überein. Jemand hielt die Werkstätten miteinander in Verbindung.")
 }),
 S("Kapitel IV · Der Meister","GEMEINSAME ERINNERUNG","Die Zeichnung ergibt endlich ein klares Bild. Das war nicht nur eine Werkstatt – hier wurde offenbar die gemeinsame Erinnerung von vier Völkern zusammengetragen.",{
  d4a:A("Das endgültige Schema zusammensetzen","SCHEMA","Vier Teile ergeben einen einzigen Eintrag. Darauf ist der Treffpunkt markiert."),
  d4b:A("Das letzte Versteck prüfen","VERSTECK","Im Versteck liegt eine leere Tafel mit vier Plätzen für Symbole. Sie wartete auf die übrigen Teile."),
  d4c:A("Den Mechanismus noch einmal untersuchen","MECHANISMUS","Jetzt wird klar: Der Mechanismus diente dazu, Erinnerung zu bewahren, nicht nur als Gerät."),
  d4d:A("Alles mit dem Journal abgleichen","JOURNAL","Alle Daten und Zeichen stimmen überein. Der nächste Punkt ist die alte Grenze der vier Völker.")
 })
 ]
},
EN:{
 human:[
 S("Chapter I · The Old Road","STONE · MAP","Three paths split at the old road. A stone marked with four rays stands by the roadside. The sign matches a mark on the map you found.",{
  h1a:A("Touch the sign","SIGN","The stone grows slightly warm, and a short phrase surfaces in your memory: “Do not look for a single owner.” You do not understand it yet, but you will recognize the sign from a distance."),
  h1b:A("Compare the map with the stone","MAP","The lines on the map follow the old road. A faded date appears in the margin—the first clue leads onward."),
  h1c:A("Talk to the traveler","TRAVELER","The traveler admits he has seen the sign before, but was taught not to ask questions. He points you toward an old trail."),
  h1d:A("Study the area and remember it","SURROUNDINGS","You find four identical scratches on different stones. The sign was clearly left there on purpose.")
 }),
 S("Chapter II · Foreign Rules","SETTLEMENT · ARCHIVE","In the neighboring settlement, an old man notices your sign and falls silent. They clearly know more here than they are willing to say.",{
  h2a:A("Calmly ask the old man","OLD MAN","The old man does not answer directly. He only says: “Look where four stories stop being different.”"),
  h2b:A("Watch the people","PEOPLE","You notice one detail: the locals avoid the old archive even though its key hangs in plain sight."),
  h2c:A("Study the records","RECORDS","An ancient text has a gap just before its final line. Someone removed it deliberately."),
  h2d:A("Check the map in the archive","ARCHIVE","An old map repeats your sign and points to a fork beyond the settlement.")
 }),
 S("Chapter III · Too Many Coincidences","FORK · TRACKS","At the fork, one path bears fresh tracks while the other carries an old sign. There are too many coincidences now.",{
  h3a:A("Study the fresh tracks","TRACKS","The tracks end at a stone. The same sign is carved on its far side."),
  h3b:A("Follow the old sign","OLD ROAD","The old road leads to a place that does not appear on modern maps."),
  h3c:A("Compare both roads","FORK","Both roads lead to the same point from opposite sides. Someone deliberately split the routes."),
  h3d:A("Stop and think","DECISION","You do not rush. That lets you notice a small symbol on the ground—the fourth ray.")
 }),
 S("Chapter IV · Your Own Path","FOURTH FRAGMENT","You already know there are no coincidences. A line is missing from the text, the map leads to an old place, and the sign keeps appearing.",{
  h4a:A("Gather all the records","RECORDS","Scattered notes form one idea: four peoples once knew the same story."),
  h4b:A("Check the final mark","MARK","Behind the stone you find a fragment of a record. It bears the same sign and date as the map."),
  h4c:A("Talk to people you trust","ALLIES","Several people are willing to share their memories. They all remember the same phrase: “Four parts, one memory.”"),
  h4d:A("Check everything once more","CLUES","You find the final connection and realize the next step must lead to the meeting place.")
 })
 ],
 elf:[
 S("Chapter I · Whisper of Leaves","TREE · FOREST","Everything is quiet in the forest, then the birds suddenly fall silent. Four fine cuts mark the tree.",{
  e1a:A("Examine the cuts","CUTS","The cuts were made at different times, but in the same way. The last one draws your eye toward the northern trail."),
  e1b:A("Check the ground","TRAIL","A barely visible trace of silver dust remains in the grass. It leads toward an old garden."),
  e1c:A("Remember the pattern","SYMBOL","You notice that the four rays are slightly different. One resembles a sign from an ancient legend."),
  e1d:A("Watch the forest","FOREST","The birds return only after you step away from the tree, as if the place itself guards the silence.")
 }),
 S("Chapter II · The Forgotten Garden","SILVER LEAF","In an abandoned garden lies a silver leaf bearing the same sign. It resembles no known family emblem.",{
  e2a:A("Examine the leaf","LEAF","A fine line on the back looks like part of a map."),
  e2b:A("Explore the garden","GARDEN","Behind the overgrowth is a path missing from every local map."),
  e2c:A("Compare the symbols","SYMBOLS","The sign on the leaf matches the one on the tree. Years separate them, but not their meaning."),
  e2d:A("Look for whoever was here","TRACE","You find an old ribbon with four small marks. It was clearly part of one set.")
 }),
 S("Chapter III · The Silent Choice","STONE ARCH","The old trail ends at a stone arch. Part of the inscription has been chipped away, as if someone deliberately removed names.",{
  e3a:A("Study the damaged inscription","INSCRIPTION","Beneath the erased layer, one word remains: “Remember.”"),
  e3b:A("Examine the arch","ARCH","Four small signs form a circle on the inner side."),
  e3c:A("Check the old trail","TRAIL","The trail leads to a place where the forest changes sharply and begins to resemble the garden from your earlier discovery."),
  e3d:A("Connect the findings","CONNECTION","You realize someone did not destroy the history—they divided it into pieces.")
 }),
 S("Chapter IV · Instinct","LAST TRACE","The forest, leaf, arch and old marks all tell the same story. Now you only need to understand why everyone keeps silent.",{
  e4a:A("Follow the faint trace","TRACE","The trace leads to an ancient border where four roads meet."),
  e4b:A("Write down everything you noticed","JOURNAL","Your notes reveal a shared pattern among the four signs. Now you can compare it with other fragments."),
  e4c:A("Observe before the next step","BORDER","You see a light on the distant road—someone else is heading to the same place."),
  e4d:A("Return to the first sign","FIRST SIGN","The old sign no longer feels like a separate mystery. It was the first piece of a shared story.")
 }),
 ],
 orc:[
 S("Chapter I · Trial of Will","STONE · SIGN","Before the first trial, the elder notices four rays on the stone. He knows the sign, but tells you to keep moving.",{
  o1a:A("Ask what the sign means","ELDER","The elder only says: “When you see the fourth sign, you will understand why we stay silent.”"),
  o1b:A("Study the stone carefully","STONE","A second layer of the sign appears beneath an old scratch. It was clearly altered later."),
  o1c:A("Prepare for the road","ROAD","You choose not to rush and notice a mark that would otherwise be easy to miss."),
  o1d:A("Focus and move on","WILL","The elder nods for the first time. He was testing not your strength, but your ability to choose your own path.")
 }),
 S("Chapter II · The Stone Ascent","MOUNTAIN PATH","A stone with an old cut stands on the mountain path. It resembles the ancestors' sign, but its meaning is forgotten.",{
  o2a:A("Compare the mark with ancestral memory","MARK","You remember an old story about four guardians. You once thought it was only a legend."),
  o2b:A("Check the surroundings","MOUNTAINS","A safe ledge nearby bears traces of an old camp."),
  o2c:A("Study the sign","SIGN","The four rays point in different directions. They look more like a map than a crest."),
  o2d:A("Slow down and remember the place","MEMORY","You mark the location in your journal. It will matter when you compare it with other discoveries.")
 }),
 S("Chapter III · A Heavy Decision","FORTRESS RUINS","In an abandoned fortress, you find a name scraped from old lists. Four identical marks stand beside it.",{
  o3a:A("Study the old lists","LISTS","The name disappeared from several lists at once. That looks like a deliberate decision, not an accident."),
  o3b:A("Examine the four marks","MARKS","One mark is newer than the others. Someone returned here many years later."),
  o3c:A("Ask the companions","ALLIES","They remember an old rule: the four signs were never discussed outside the elders' circle."),
  o3d:A("Gather your strength and continue","PATH","You find a second entrance to the hall and realize the fortress was part of a larger route.")
 }),
 S("Chapter IV · Inner Strength","OLD TABOO","Now it is clear: the old taboo was not merely one tribe's rule. Someone desperately wanted this story to remain forgotten.",{
  o4a:A("Gather the elders' stories","STORIES","Different people repeat the same detail: four peoples once agreed to keep one shared secret."),
  o4b:A("Put the signs together","SIGNS","Each mark turns out to be part of a single pattern. Now you know where to go next."),
  o4c:A("Check the final route","ROUTE","The old road leads to a border where four directions meet."),
  o4d:A("Share what you have learned","MEMORY","You decide not to repeat the old silence. Others now know part of the story too.")
 }),
 ],
 dwarf:[
 S("Chapter I · Stone of Memory","WALL · FOUR RAYS","A sign made of four rays is hidden in the wall beside the old road. One simple question arises: who built this?",{
  d1a:A("Work out how the structure was made","STRUCTURE","The stones follow a pattern found nowhere in local buildings. One fragment can be transferred into a drawing."),
  d1b:A("Check the hidden places","WALL","Behind a stone is a small plate bearing the same sign."),
  d1c:A("Sketch the discovery","DRAWING","The sketch shows four identical nodes. The master was clearly not working alone."),
  d1d:A("Examine the whole road","ROAD","Similar traces of work appear farther along the road, but in a different order.")
 }),
 S("Chapter II · The Old Workshop","DRAWING · MECHANISM","Records and a strange drawing survive in an abandoned workshop. Four identical signs sit in the corners.",{
  d2a:A("Decipher the old records","RECORDS","The master's name is missing, but a date and four identical marks remain."),
  d2b:A("Examine the mechanism","MECHANISM","The mechanism will not start, but its parts show that it was meant to join four pieces."),
  d2c:A("Compare the plans","PLANS","Two plans share the same dates. The workshop was part of a larger project."),
  d2d:A("Write down your theory","HYPOTHESIS","You form a first working theory: the four signs represent participants, not owners.")
 }),
 S("Chapter III · Three Secrets","SECRET PASSAGE","A hidden passage lies behind the wall. At its end is the same pattern and the same date found in the workshop.",{
  d3a:A("Gather the known details","SCHEMA","Three independent sources give the same date. It can hardly be coincidence anymore."),
  d3b:A("Explore the passage","PASSAGE","The passage leads to a hall with four empty places for identical fragments."),
  d3c:A("Examine the walls","WALLS","The wall bears marks left by four plaques. The plaques themselves are long gone."),
  d3d:A("Check the old date","DATE","The date matches records from other lands. Someone kept the workshops connected.")
 }),
 S("Chapter IV · The Master","SHARED MEMORY","The drawing finally forms a clear picture. This was not one workshop—someone was gathering the shared memory of four peoples here.",{
  d4a:A("Assemble the final schema","SCHEMA","Four pieces form one record. It marks the meeting place."),
  d4b:A("Check the final hiding place","HIDING PLACE","A blank plaque lies in the hiding place with four slots for symbols. It was waiting for the other pieces."),
  d4c:A("Examine the mechanism again","MECHANISM","Now it is clear: the mechanism was a way to preserve memory, not merely a device."),
  d4d:A("Cross-check everything with the journal","JOURNAL","All dates and signs align. The next point is the ancient border of the four peoples.")
 })
 ]
}
};

export function sceneFor(lang:GameLanguage,race:GameRace,index:number):LocalizedScene{
 return SCENE_LOCALE[lang]?.[race]?.[index]||SCENE_LOCALE.RU[race][index];
}


export const GAME_EXTRA:Record<GameLanguage,{
  stats:string[]; tabs:Record<string,string>; actions:{what:string;noAnswer:string;continue:string;consequence:string;remembered:string;final:string;finalSubtitle:string;finalRiddle:string;solution:string;chapter:string;newGame:string;hidden:string;earned:string;clues:string;promises:string;none:string;progress:string;claim:string;coins:string;miniQuests:string;shop:string;abilities:string;points:string;achievements:string;openCount:string;journal:string;skills:string;hero:string;level:string;story:string};
  quest:{titles:string[];descriptions:string[]};
  shop:{names:string[];descriptions:string[];note:string};
  mystery:string[];
}>={
RU:{
 stats:["Сила","Выносливость","Разум","Внимание","Влияние"],
 tabs:{story:"История",character:"Герой",skills:"Навыки",quests:"Мини-квесты",shop:"Магазин",achievements:"Ачивки",journal:"Журнал"},
 actions:{what:"Что ты сделаешь?",noAnswer:"Нет правильного ответа. Мир запомнит способ, которым ты поступил.",continue:"Продолжить путь",consequence:"Последствие",remembered:"Мир запомнил",final:"История завершена",finalSubtitle:"Четыре пути сошлись. Тайна раскрыта. История завершена.",finalRiddle:"Последняя загадка",solution:"Разгадка",chapter:"Глава",newGame:"Новая игра",hidden:"Скрытое достижение",earned:"Получено по ходу истории",clues:"Улики",promises:"Обещания",none:"Пока нет.",progress:"В ПРОЦЕССЕ",claim:"Забрать",coins:"Монеты",miniQuests:"МИНИ-КВЕСТЫ",shop:"МАГАЗИН",abilities:"СПОСОБНОСТИ",points:"Очки",achievements:"АЧИВКИ",openCount:"открыто",journal:"ЖУРНАЛ",skills:"НАВЫКИ",hero:"Герой",level:"Уровень",story:"История"},
 quest:{titles:["Внимательный взгляд","Добрый разговор","След старой дороги","Фрагмент знания"],descriptions:["Найди и изучи одну необычную деталь в текущем мире.","Выбери действие, связанное с переговорами.","Сделай выбор, связанный с исследованием.","Сделай выбор, связанный со знаниями."]},
 shop:{names:["Зелье восстановления","Зелье энергии","Зелье концентрации","Зелье опыта"],descriptions:["Восстанавливает 20 здоровья.","Восстанавливает 20 энергии.","Даёт +1 к текущему ключевому навыку героя.","Даёт 18 XP. Не повышает уровень мгновенно."],note:"Цены рассчитаны так, чтобы зелья помогали в трудных местах, но не позволяли быстро перескочить несколько уровней."},
 mystery:["На полях старой карты повторяется знак четырёх лучей. Рядом нет объяснения, только стёртая дата.","Один из древних текстов откликается на магию, но в нём намеренно отсутствует последняя строка.","На камне у дальней дороги найден тот же знак. Он старше местных поселений, хотя никто не помнит, кто его оставил.","Четвёртый фрагмент показывает: твои странные находки были частями одной записи, разделённой между четырьмя народами."]
},
DE:{
 stats:["Stärke","Ausdauer","Verstand","Aufmerksamkeit","Einfluss"],
 tabs:{story:"Geschichte",character:"Held",skills:"Fähigkeiten",quests:"Nebenaufgaben",shop:"Laden",achievements:"Erfolge",journal:"Journal"},
 actions:{what:"Was wirst du tun?",noAnswer:"Es gibt keine richtige Antwort. Die Welt wird sich daran erinnern, wie du gehandelt hast.",continue:"Weg fortsetzen",consequence:"Folge",remembered:"Die Welt erinnert sich",final:"Geschichte abgeschlossen",finalSubtitle:"Vier Wege treffen zusammen. Das Geheimnis ist gelüftet.",finalRiddle:"Das letzte Rätsel",solution:"Lösung",chapter:"Kapitel",newGame:"Neues Spiel",hidden:"Verborgener Erfolg",earned:"Im Verlauf der Geschichte erhalten",clues:"Hinweise",promises:"Versprechen",none:"Noch keine.",progress:"IN ARBEIT",claim:"Abholen",coins:"Münzen",miniQuests:"NEBENAUFGABEN",shop:"LADEN",abilities:"FÄHIGKEITEN",points:"Punkte",achievements:"ERFOLGE",openCount:"freigeschaltet",journal:"JOURNAL",skills:"FÄHIGKEITEN",hero:"Held",level:"Stufe",story:"Geschichte"},
 quest:{titles:["Wachsamer Blick","Gutes Gespräch","Spur der alten Straße","Wissensfragment"],descriptions:["Finde und untersuche ein ungewöhnliches Detail in der aktuellen Welt.","Wähle eine Handlung, die mit Verhandlungen zu tun hat.","Triff eine Entscheidung, die mit Erkundung zu tun hat.","Triff eine Entscheidung, die mit Wissen zu tun hat."]},
 shop:{names:["Heiltrank","Energietrank","Konzentrationstrank","Erfahrungstrank"],descriptions:["Stellt 20 Gesundheit wieder her.","Stellt 20 Energie wieder her.","Gibt +1 auf das aktuelle Schlüsselattribut des Helden.","Gibt 18 EP. Erhöht die Stufe nicht sofort."],note:"Die Preise sollen in schwierigen Momenten helfen, aber keinen schnellen Sprung über mehrere Stufen ermöglichen."},
 mystery:["Auf der alten Karte wiederholt sich das Zeichen mit vier Strahlen. Daneben steht keine Erklärung, nur ein verblasstes Datum.","Einer der alten Texte reagiert auf Magie, doch die letzte Zeile fehlt absichtlich.","Auf einem Stein an der fernen Straße wurde dasselbe Zeichen gefunden. Es ist älter als die Siedlungen, doch niemand erinnert sich an seinen Ursprung.","Das vierte Fragment zeigt: Deine seltsamen Funde waren Teile eines einzigen Eintrags, den vier Völker untereinander aufgeteilt hatten."]
},
EN:{
 stats:["Strength","Endurance","Mind","Awareness","Influence"],
 tabs:{story:"Story",character:"Hero",skills:"Skills",quests:"Side Quests",shop:"Shop",achievements:"Achievements",journal:"Journal"},
 actions:{what:"What will you do?",noAnswer:"There is no right answer. The world will remember how you chose to act.",continue:"Continue the journey",consequence:"Consequence",remembered:"The world remembers",final:"Story complete",finalSubtitle:"Four paths have converged. The mystery is revealed. The story is complete.",finalRiddle:"The final riddle",solution:"Solution",chapter:"Chapter",newGame:"New Game",hidden:"Hidden achievement",earned:"Earned during the story",clues:"Clues",promises:"Promises",none:"None yet.",progress:"IN PROGRESS",claim:"Claim",coins:"Coins",miniQuests:"SIDE QUESTS",shop:"SHOP",abilities:"ABILITIES",points:"Points",achievements:"ACHIEVEMENTS",openCount:"unlocked",journal:"JOURNAL",skills:"SKILLS",hero:"Hero",level:"Level",story:"Story"},
 quest:{titles:["Keen Eye","A Good Conversation","Trail of the Old Road","Fragment of Knowledge"],descriptions:["Find and examine one unusual detail in the current world.","Choose an action connected with negotiation.","Make a choice connected with exploration.","Make a choice connected with knowledge."]},
 shop:{names:["Healing Potion","Energy Potion","Focus Potion","Insight Potion"],descriptions:["Restores 20 health.","Restores 20 energy.","Adds +1 to the hero's current key skill.","Grants 18 XP. It does not level you up immediately."],note:"Prices are designed to help in difficult moments without letting potions skip several levels at once."},
 mystery:["The old map repeats the four-ray sign. There is no explanation beside it, only a faded date.","One ancient text responds to magic, but its final line is deliberately missing.","The same sign appears on a stone by the distant road. It is older than the local settlements, yet no one remembers who left it there.","The fourth fragment reveals that your strange discoveries were pieces of one record, divided among four peoples."]
}
};

export const FINAL_LOCALE:Record<GameLanguage,{resolved:string;unresolved:string;thoughtResolved:string;thoughtUnresolved:string;seal:string;sceneLabel:string;lastRiddle:string;solution:string;keepMemory:string}>={
RU:{resolved:"В древнем зале четыре знака складываются в одну печать. Теперь понятно: четыре народа когда-то договорились хранить одну общую историю, но разделили её на четыре части и спрятали каждую у себя. Карта, серебряный лист, старое имя и чертёж оказались частями одной записи. Никто никого не предавал: все четыре народа сами решили забыть эту историю, потому что боялись повторить старую ошибку. Теперь память снова собрана.",unresolved:"Четыре дороги приводят к древней границе. В зале загораются четыре знака, и каждый герой узнаёт в них собственную улику. Осталось соединить найденные фрагменты.",thoughtResolved:"Здесь не оказалось одного виноватого. Четыре народа сами сделали этот выбор. И только четыре человека смогли вернуть то, что их предки разделили.",thoughtUnresolved:"Все четыре истории сходятся в одной точке. Первый Союз был разделён на части, чтобы его память не исчезла совсем.",seal:"◆ ИСТОРИЯ ЗАВЕРШЕНА",sceneLabel:"ЧЕТЫРЕ ПУТИ · ОДНА ТАЙНА",lastRiddle:"ФИНАЛ · ПОСЛЕДНЯЯ ЗАГАДКА",solution:"РАЗГАДКА",keepMemory:"Четыре пути сошлись. Тайна раскрыта. История завершена."},
DE:{resolved:"Im alten Saal fügen sich die vier Zeichen zu einem einzigen Siegel. Jetzt wird klar: Vier Völker vereinbarten einst, eine gemeinsame Geschichte zu bewahren. Sie teilten sie jedoch in vier Teile und versteckten jeden Teil bei sich. Die Karte, das silberne Blatt, der ausgelöschte Name und die Zeichnung waren Fragmente derselben Aufzeichnung. Niemand hat jemanden verraten: Alle vier Völker entschieden sich selbst dafür, die Geschichte zu vergessen, weil sie einen alten Fehler nicht wiederholen wollten. Nun ist die Erinnerung wieder vereint.",unresolved:"Vier Wege führen zur alten Grenze. Im Saal leuchten vier Zeichen auf, und jeder Held erkennt darin seinen eigenen Hinweis. Jetzt müssen nur noch die gefundenen Fragmente zusammengefügt werden.",thoughtResolved:"Hier gab es keinen einzelnen Schuldigen. Die vier Völker trafen diese Entscheidung gemeinsam. Erst vier Menschen konnten zurückholen, was ihre Vorfahren einst getrennt hatten.",thoughtUnresolved:"Alle vier Geschichten treffen an einem Punkt zusammen. Der Erste Bund wurde in Teile geteilt, damit seine Erinnerung nicht vollständig verloren ging.",seal:"◆ GESCHICHTE ABGESCHLOSSEN",sceneLabel:"VIER WEGE · EIN GEHEIMNIS",lastRiddle:"FINALE · DAS LETZTE RÄTSEL",solution:"LÖSUNG",keepMemory:"Vier Wege treffen zusammen. Das Geheimnis ist gelüftet. Die Geschichte ist abgeschlossen."},
EN:{resolved:"In the ancient hall, the four signs join into a single seal. Now it becomes clear: four peoples once agreed to preserve one shared history, but divided it into four parts and hid each part among themselves. The map, the silver leaf, the erased name and the drawing were fragments of the same record. No one betrayed anyone: all four peoples chose to forget the history because they feared repeating an old mistake. Now the memory is whole again.",unresolved:"Four roads lead to the ancient border. Four signs light up in the hall, and each hero recognizes their own clue in them. Only the final fragments need to be joined.",thoughtResolved:"There was no single culprit here. The four peoples made this choice together. Only four people were able to restore what their ancestors had divided.",thoughtUnresolved:"All four stories converge at one point. The First Alliance was divided into pieces so its memory would not disappear completely.",seal:"◆ STORY COMPLETE",sceneLabel:"FOUR PATHS · ONE MYSTERY",lastRiddle:"FINALE · THE FINAL RIDDLE",solution:"SOLUTION",keepMemory:"Four paths have converged. The mystery is revealed. The story is complete."}
};
