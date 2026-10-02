export type PortalLanguage="RU"|"DE"|"EN";
export const PORTAL_I18N:Record<PortalLanguage,Record<string,string>>={
RU:{
 welcome:"Добро пожаловать в FREEzzz.",
 fontSize:"Размер текста",fontSizeGame:"Размер текста в игре",normal:"Обычный",large:"Большой",largest:"Самый большой",
 soundOn:"Включить звук",soundOff:"Выключить звук",pauseVideo:"Остановить видео",resumeVideo:"Продолжить видео",
 fireVideo:"Лесной костёр — атмосфера игры",close:"Закрыть",sessions:"Сессий",gameLaunches:"Запусков GAME",gameTime:"Время GAME",liveTime:"Просмотр LIVE",radioTime:"Радио",chatMessages:"Сообщений CHAT",playTime:"Игровое время",launches:"Запуски",noViews:"Пока нет просмотров.",noRadio:"Пока нет прослушиваний.",
 liveCard:"LIVE — Стримеры и каналы",chatCard:"CHAT — Общение",gameCard:"GAME — Игровая зона",radioCard:"RADIO — Музыка",libraryCard:"LIBRARY — Библиотека",
 liveSub:"Стримеры · Twitch + YouTube",chatSub:"Общение FREEzzz",gameSub:"FREEzzz STORY · FOUR RACES",radioSub:"Internet Radio · FREEzzz Audio Lab",
 message:"Сообщение…",send:"Отправить",radioChoose:"Выбери станцию по логотипу и запусти её прямо внутри портала.",radioLoading:"Загрузка станций…",radioReady:"RADIO готово",
 chooseStation:"Выбери станцию",playing:"Играет",play:"Воспроизвести",pause:"Пауза",stop:"Стоп",searchStation:"Поиск станции",search:"Поиск",
 libraryLocal:"Локальная библиотека портала.",save:"Сохранить",clear:"Очистить",constructor:"Конструктор",developer:"РАЗРАБ",user:"ПОЛЬЗ.",
 showMenu:"Показать меню",swipeHint:"Провести вверх от нижнего края или нажать",noMessages:"Нет сообщений",
 savedGames:"сохранённых игр",localLibrary:"Локальная библиотека",historyContinues:"история продолжается",chooseHero:"Выбери героя и начни приключение",
 gameStory:"FREEzzz STORY",fourRaces:"4 RACES",radioLoadingShort:"Загрузка станции…",stream:"стрим",radio:"радио",thanks:"спасибо",
 playError:"Не удалось воспроизвести поток этой станции.",autoplayError:"Нажми Play ещё раз — браузер заблокировал автозапуск.",
 profile:"Профиль",language:"Язык",home:"HOME",live:"LIVE",chat:"CHAT",game:"GAME",library:"LIBRARY",edit:"EDIT",homeDescription:"Твой интерактивный мир внутри одного портала.",platforms:"Twitch + YouTube",internetRadio:"Internet Radio",
 visits:"виз.",plays:"прослуш.",telegramProfile:"Профиль Telegram",telegramIdentityUnavailable:"Идентификатор Telegram недоступен"
},
DE:{
 welcome:"Willkommen bei FREEzzz.",fontSize:"Textgröße",fontSizeGame:"Textgröße im Spiel",normal:"Normal",large:"Groß",largest:"Am größten",
 soundOn:"Ton einschalten",soundOff:"Ton ausschalten",pauseVideo:"Video anhalten",resumeVideo:"Video fortsetzen",
 fireVideo:"Waldfeuer – Spielatmosphäre",close:"Schließen",sessions:"Sitzungen",gameLaunches:"GAME-Starts",gameTime:"GAME-Zeit",liveTime:"LIVE-Zeit",radioTime:"Radio-Zeit",chatMessages:"CHAT-Nachrichten",playTime:"Spielzeit",launches:"Starts",noViews:"Noch keine Aufrufe.",noRadio:"Noch keine Wiedergaben.",
 liveCard:"LIVE — Streamer & Kanäle",chatCard:"CHAT — Unterhaltung",gameCard:"GAME — Spielbereich",radioCard:"RADIO — Musik",libraryCard:"LIBRARY — Bibliothek",
 liveSub:"Streamer · Twitch + YouTube",chatSub:"FREEzzz-Chat",gameSub:"FREEzzz STORY · VIER VÖLKER",radioSub:"Internetradio · FREEzzz Audio Lab",
 message:"Nachricht…",send:"Senden",radioChoose:"Wähle eine Station über ihr Logo und starte sie direkt im Portal.",radioLoading:"Sender werden geladen…",radioReady:"RADIO bereit",
 chooseStation:"Sender auswählen",playing:"Wiedergabe",play:"Abspielen",pause:"Pause",stop:"Stopp",searchStation:"Sender suchen",search:"Suchen",
 libraryLocal:"Lokale Bibliothek des Portals.",save:"Speichern",clear:"Löschen",constructor:"Konstruktor",developer:"ENTW.",user:"NUTZER",
 showMenu:"Menü anzeigen",swipeHint:"Vom unteren Rand nach oben wischen oder tippen",noMessages:"Keine Nachrichten",
 savedGames:"gespeicherte Spiele",localLibrary:"Lokale Bibliothek",historyContinues:"Geschichte geht weiter",chooseHero:"Wähle deinen Helden und beginne das Abenteuer",
 gameStory:"FREEzzz STORY",fourRaces:"4 VÖLKER",radioLoadingShort:"Sender wird geladen…",stream:"Stream",radio:"Radio",thanks:"Danke",
 playError:"Der Stream dieses Senders konnte nicht wiedergegeben werden.",autoplayError:"Tippe erneut auf Play – der Browser hat den Autostart blockiert.",
 profile:"Profil",language:"Sprache",home:"HOME",live:"LIVE",chat:"CHAT",game:"GAME",library:"LIBRARY",edit:"EDIT",homeDescription:"Deine interaktive Welt in einem einzigen Portal.",platforms:"Twitch + YouTube",internetRadio:"Internetradio",
 visits:"Besuche",plays:"Wiedergaben",telegramProfile:"Telegram-Profil",telegramIdentityUnavailable:"Telegram-Identität nicht verfügbar"
},
EN:{
 welcome:"Welcome to FREEzzz.",fontSize:"Text size",fontSizeGame:"Text size in game",normal:"Normal",large:"Large",largest:"Largest",
 soundOn:"Turn sound on",soundOff:"Turn sound off",pauseVideo:"Pause video",resumeVideo:"Resume video",
 fireVideo:"Forest fire — game atmosphere",close:"Close",sessions:"Sessions",gameLaunches:"GAME launches",gameTime:"GAME time",liveTime:"LIVE time",radioTime:"Radio time",chatMessages:"CHAT messages",playTime:"Play time",launches:"Launches",noViews:"No views yet.",noRadio:"No listening history yet.",
 liveCard:"LIVE — Streamers & Channels",chatCard:"CHAT — Community",gameCard:"GAME — Game Zone",radioCard:"RADIO — Music",libraryCard:"LIBRARY — Library",
 liveSub:"Streamers · Twitch + YouTube",chatSub:"FREEzzz Community",gameSub:"FREEzzz STORY · FOUR RACES",radioSub:"Internet Radio · FREEzzz Audio Lab",
 message:"Message…",send:"Send",radioChoose:"Choose a station by its logo and start it directly inside the portal.",radioLoading:"Loading stations…",radioReady:"RADIO ready",
 chooseStation:"Choose a station",playing:"Playing",play:"Play",pause:"Pause",stop:"Stop",searchStation:"Search station",search:"Search",
 libraryLocal:"Local portal library.",save:"Save",clear:"Clear",constructor:"Constructor",developer:"DEV",user:"USER",
 showMenu:"Show menu",swipeHint:"Swipe up from the bottom edge or tap",noMessages:"No messages",
 savedGames:"saved games",localLibrary:"Local Library",historyContinues:"story continues",chooseHero:"Choose your hero and begin the adventure",
 gameStory:"FREEzzz STORY",fourRaces:"4 RACES",radioLoadingShort:"Loading station…",stream:"stream",radio:"radio",thanks:"thanks",
 playError:"This station's stream could not be played.",autoplayError:"Press Play again — the browser blocked autoplay.",
 profile:"Profile",language:"Language",home:"HOME",live:"LIVE",chat:"CHAT",game:"GAME",library:"LIBRARY",edit:"EDIT",homeDescription:"Your interactive world inside one portal.",platforms:"Twitch + YouTube",internetRadio:"Internet Radio",
 visits:"visits",plays:"listens",telegramProfile:"Telegram profile",telegramIdentityUnavailable:"Telegram identity unavailable"
}
};
export function pt(lang:PortalLanguage,key:string){return PORTAL_I18N[lang][key]||PORTAL_I18N.RU[key]||key;}
