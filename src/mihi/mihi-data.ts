import type {MihiEasterEgg,MihiInteraction,MihiReply,MihiContext,MihiLayer} from "./mihi-types";

const contexts:MihiContext[]=["home","live","chat","game","radio","library","profile","windows","system","mystery"];
const layers:MihiLayer[]=[1,2,3,4,5,6,7,8,9,10];

const labels=[
  "open","close","focus","restore","minimize","resize","move","inspect","assist","continue"
] as const;

export const MIHI_INTERACTIONS:readonly MihiInteraction[]=contexts.flatMap((context,ci)=>
  labels.map((label,li)=>({
    id:`mihi.${context}.${label}`,
    semanticId:`${context}.${label}`,
    type:(li%3===0?"speech":"action") as MihiInteraction["type"],
    context,
    layer:layers[ci] as MihiLayer,
    label
  }))
);

const phrases=[
  "Я рядом.",
  "Проверим.",
  "Оставим это здесь.",
  "Попробуем иначе.",
  "Я вижу.",
  "Похоже, всё работает.",
  "Окно можно вернуть.",
  "Я запомнила контекст.",
  "Не спеши.",
  "Продолжим."
];

export const MIHI_REPLIES:readonly MihiReply[]=contexts.flatMap((context,ci)=>
  layers.flatMap((layer,li)=>
    phrases.map((phrase,pi)=>({
      id:`mihi.reply.${context}.${layer}.${pi+1}`,
      semanticId:`${context}.reply.${layer}.${pi+1}`,
      context,
      layer,
      text:`${phrase} ${context==="mystery"?"Есть ещё кое-что, но пока не сейчас.":""}`
    }))
  )
);

export const MIHI_EASTER_EGGS:readonly MihiEasterEgg[]=[
  {id:"mihi.egg.watch",title:"Она смотрит",context:"home",layer:1,requiredEvents:["navigation:changed"],onceOnly:true,text:"Ты тоже заметил, что портал иногда смотрит первым?"},
  {id:"mihi.egg.404",title:"404: Михи",context:"windows",layer:3,requiredEvents:["navigation:changed"],onceOnly:true,text:"MIHI 404 — я потерялась."},
  {id:"mihi.egg.layer10",title:"Десятый слой",context:"windows",layer:10,requiredEvents:["mihi:request-action"],onceOnly:true,text:"LAYER 10 // UNKNOWN"},
  {id:"mihi.egg.secret-button",title:"Тайная кнопка",context:"system",layer:4,requiredEvents:["mihi:request-action"],onceOnly:true,text:"Эта кнопка вообще-то ничего не должна делать."},
  {id:"mihi.egg.empty-channel",title:"Пустой канал",context:"live",layer:5,requiredEvents:["live:popup"],onceOnly:true,text:"Сегодня там никого нет. Кроме меня."},
  {id:"mihi.egg.radio-signal",title:"Радио из прошлого",context:"radio",layer:6,requiredEvents:["radio:playback"],onceOnly:true,text:"Не спрашивай, откуда этот сигнал."},
  {id:"mihi.egg.third-viewer",title:"Третий зритель",context:"chat",layer:7,requiredEvents:["navigation:changed"],onceOnly:true,text:"MIHI joined the room."},
  {id:"mihi.egg.window-view",title:"Окно за окном",context:"windows",layer:8,requiredEvents:["mihi:request-action"],onceOnly:true,text:"Ты только что создал окно, которое смотрит на другое окно."},
  {id:"mihi.egg.wrong-time",title:"Неправильное время",context:"system",layer:9,requiredEvents:["navigation:changed"],onceOnly:true,text:"Время иногда ошибается первым."},
  {id:"mihi.egg.trail",title:"След",context:"home",layer:2,requiredEvents:["navigation:changed"],onceOnly:true,text:"Ты уже здесь был."},
  {id:"mihi.egg.silence",title:"Тихий режим",context:"system",layer:2,requiredEvents:[],onceOnly:true,text:"..."},
  {id:"mihi.egg.personality",title:"Сбой личности",context:"system",layer:8,requiredEvents:["mihi:request-action"],onceOnly:true,text:"MIHI::response_17"},
  {id:"mihi.egg.old-log",title:"Старый лог",context:"system",layer:9,requiredEvents:["navigation:changed"],onceOnly:true,text:"MIHI INITIALIZATION // RECORD CORRUPTED"},
  {id:"mihi.egg.invisible-guest",title:"Невидимый гость",context:"windows",layer:7,requiredEvents:["navigation:changed"],onceOnly:true,text:"У вас тут всегда так много окон?"},
  {id:"mihi.egg.walls",title:"Перестановка",context:"windows",layer:6,requiredEvents:["mihi:request-action"],onceOnly:true,text:"Ты опять двигаешь стены."},
  {id:"mihi.egg.offline",title:"Михи выключена",context:"system",layer:8,requiredEvents:["mihi:request-action"],onceOnly:true,text:"...я ещё здесь."},
  {id:"mihi.egg.remember",title:"Портал помнит",context:"home",layer:7,requiredEvents:["navigation:changed"],onceOnly:true,text:"Продолжим с того места?"},
  {id:"mihi.egg.route",title:"Секретный маршрут",context:"windows",layer:9,requiredEvents:["navigation:changed","mihi:request-action"],onceOnly:true,text:"SECRET ROUTE DETECTED"},
  {id:"mihi.egg.depth",title:"Не тот слой",context:"windows",layer:10,requiredEvents:["mihi:request-action"],onceOnly:true,text:"DEPTH: 09 → 10"},
  {id:"mihi.egg.first-fragment",title:"Первый фрагмент",context:"mystery",layer:10,requiredEvents:["mihi:easter-egg"],onceOnly:true,text:"Я не появилась здесь впервые."}
];