export type FloatingWindowId="live"|"chat"|"radio";

export interface FloatingWindowState{
  id:FloatingWindowId;
  open:boolean;
  x:number;
  y:number;
  width:number;
  height:number;
  z:number;
}

export interface FloatingWindowSnapshot{
  windows:Record<FloatingWindowId,FloatingWindowState>;
  nextZ:number;
}

const STORAGE_KEY="freezzz:floating-windows:v1";

const DEFAULTS:Record<FloatingWindowId,FloatingWindowState>={
  live:{id:"live",open:false,x:76,y:72,width:300,height:205,z:30},
  chat:{id:"chat",open:false,x:94,y:292,width:286,height:245,z:40},
  radio:{id:"radio",open:false,x:76,y:548,width:330,height:72,z:50}
};

function cloneDefaults():FloatingWindowSnapshot{
  return {
    windows:{
      live:{...DEFAULTS.live},
      chat:{...DEFAULTS.chat},
      radio:{...DEFAULTS.radio}
    },
    nextZ:60
  };
}

export function loadFloatingWindows():FloatingWindowSnapshot{
  const fallback=cloneDefaults();
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return fallback;
    const parsed=JSON.parse(raw) as Partial<FloatingWindowSnapshot>;
    if(!parsed||typeof parsed!=="object")return fallback;
    for(const id of ["live","chat","radio"] as const){
      const value=parsed.windows?.[id];
      if(!value||typeof value!=="object")continue;
      fallback.windows[id]={
        ...fallback.windows[id],
        ...value,
        id
      };
    }
    if(typeof parsed.nextZ==="number"&&Number.isFinite(parsed.nextZ))fallback.nextZ=Math.max(60,parsed.nextZ);
  }catch{}
  return fallback;
}

export function saveFloatingWindows(state:FloatingWindowSnapshot):void{
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
}

export function openFloatingWindow(state:FloatingWindowSnapshot,id:FloatingWindowId):void{
  state.windows[id].open=true;
  state.windows[id].z=state.nextZ++;
  saveFloatingWindows(state);
}

export function closeFloatingWindow(state:FloatingWindowSnapshot,id:FloatingWindowId):void{
  state.windows[id].open=false;
  saveFloatingWindows(state);
}

export function focusFloatingWindow(state:FloatingWindowSnapshot,id:FloatingWindowId):void{
  if(!state.windows[id].open)return;
  state.windows[id].z=state.nextZ++;
  saveFloatingWindows(state);
}

export function moveFloatingWindow(state:FloatingWindowSnapshot,id:FloatingWindowId,x:number,y:number):void{
  const w=state.windows[id];
  w.x=Math.max(0,Math.round(x));
  w.y=Math.max(0,Math.round(y));
  saveFloatingWindows(state);
}

export function toggleFloatingWindow(state:FloatingWindowSnapshot,id:FloatingWindowId):void{
  if(state.windows[id].open)closeFloatingWindow(state,id);
  else openFloatingWindow(state,id);
}

export function isFloatingWindowOpen(state:FloatingWindowSnapshot,id:FloatingWindowId):boolean{
  return state.windows[id].open;
}
