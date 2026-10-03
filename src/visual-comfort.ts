const STORAGE_KEY="freezzz:visual-comfort:v1";
const ROOT_ID="freezzz-visual-comfort";
const STYLE_CLASS="visual-comfort-enabled";
const LEVELS={
  comfort:{rate:.85,brightness:.84,contrast:.92,saturation:.72,overlay:.045},
  deep:{rate:.72,brightness:.76,contrast:.88,saturation:.60,overlay:.07}
} as const;
type ComfortLevel=keyof typeof LEVELS;
type State={enabled:boolean;level:ComfortLevel};

let state:State=loadState();
let mediaBound=false;

function loadState():State{
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed=JSON.parse(raw) as Partial<State>;
      if(typeof parsed.enabled==="boolean"&&(parsed.level==="comfort"||parsed.level==="deep")){
        return {enabled:parsed.enabled,level:parsed.level};
      }
    }
  }catch{}
  const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;
  return {enabled:reduced,level:"comfort"};
}

function saveState(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
}

function root():HTMLElement|null{return document.getElementById(ROOT_ID);}

function applyVideo(video:HTMLVideoElement){
  const rate=state.enabled?LEVELS[state.level].rate:1;
  video.defaultPlaybackRate=rate;
  video.playbackRate=rate;
  video.dataset.visualComfortManaged="true";
}

function applyMedia(){
  document.querySelectorAll<HTMLVideoElement>("video").forEach(applyVideo);
}

function apply(){
  const r=root();
  if(!r)return;
  const level=state.enabled?LEVELS[state.level]:null;
  document.documentElement.classList.toggle(STYLE_CLASS,state.enabled);
  r.dataset.enabled=String(state.enabled);
  r.dataset.level=state.level;
  r.setAttribute("aria-pressed",String(state.enabled));
  r.title=state.enabled
    ? "Visual Comfort: "+(state.level==="deep"?"Deep":"Comfort")
    : "Visual Comfort: Off";
  const label=r.querySelector<HTMLElement>("[data-visual-comfort-label]");
  if(label)label.textContent=state.enabled?(state.level==="deep"?"DEEP":"COMFORT"):"OFF";
  if(level){
    document.documentElement.style.setProperty("--visual-comfort-brightness",String(level.brightness));
    document.documentElement.style.setProperty("--visual-comfort-contrast",String(level.contrast));
    document.documentElement.style.setProperty("--visual-comfort-saturation",String(level.saturation));
    document.documentElement.style.setProperty("--visual-comfort-overlay",String(level.overlay));
  }else{
    document.documentElement.style.removeProperty("--visual-comfort-brightness");
    document.documentElement.style.removeProperty("--visual-comfort-contrast");
    document.documentElement.style.removeProperty("--visual-comfort-saturation");
    document.documentElement.style.removeProperty("--visual-comfort-overlay");
  }
  applyMedia();
}

function cycleLevel(){
  state=state.enabled
    ? {enabled:true,level:state.level==="comfort"?"deep":"comfort"}
    : {enabled:true,level:"comfort"};
  saveState();
  apply();
}

function toggle(){
  state={...state,enabled:!state.enabled};
  saveState();
  apply();
}

function mount(){
  if(root())return;
  const element=document.createElement("button");
  element.id=ROOT_ID;
  element.type="button";
  element.className="visual-comfort-control";
  element.setAttribute("aria-label","Visual Comfort");
  element.innerHTML='<span class="visual-comfort-mark" aria-hidden="true"></span><span data-visual-comfort-label>OFF</span>';
  element.addEventListener("click",e=>{
    if(e.shiftKey||e.altKey){cycleLevel();return;}
    toggle();
  });
  document.body.append(element);
  apply();
}

function bindMedia(){
  if(mediaBound)return;
  mediaBound=true;
  window.addEventListener("freezzz:portal-render",()=>window.setTimeout(applyMedia,0));
  document.addEventListener("play",e=>{
    const target=e.target;
    if(target instanceof HTMLVideoElement)applyVideo(target);
  },true);
}

export function initVisualComfort(){
  bindMedia();
  mount();
}

export function setVisualComfort(enabled:boolean,level:ComfortLevel="comfort"){
  state={enabled,level};
  saveState();
  apply();
}
