export type PortalView = "home"|"live"|"chat"|"game"|"radio"|"library"|"echo9";

export interface PortalModuleDefinition{
  readonly id:"LIVE"|"CHAT"|"GAME"|"RADIO"|"LIBRARY"|"ECHO9";
  readonly view:Exclude<PortalView,"home">;
  readonly independent:boolean;
}

export const PORTAL_MODULES:readonly PortalModuleDefinition[]=[
  {id:"LIVE",view:"live",independent:true},
  {id:"CHAT",view:"chat",independent:true},
  {id:"GAME",view:"game",independent:true},
  {id:"RADIO",view:"radio",independent:true},
  {id:"LIBRARY",view:"library",independent:true},
  {id:"ECHO9",view:"echo9",independent:true}
];

export type PortalEventMap={
  "navigation:changed":{view:PortalView};
  "profile:toggled":{open:boolean};
  "live:popup":{open:boolean;source:"twitch"|"youtube"};
  "radio:playback":{status:string};
};

type Handler<T>=(payload:T)=>void;
export type PortalModuleAdapter={
  onActivate?:()=>void;
  onDeactivate?:()=>void;
};

export class PortalEventBus{
  private readonly handlers=new Map<keyof PortalEventMap,Set<Handler<any>>>();
  on<K extends keyof PortalEventMap>(event:K,handler:Handler<PortalEventMap[K]>):()=>void{
    const set=this.handlers.get(event)??new Set<Handler<any>>();
    set.add(handler);
    this.handlers.set(event,set);
    return ()=>{
      set.delete(handler);
      if(set.size===0)this.handlers.delete(event);
    };
  }
  emit<K extends keyof PortalEventMap>(event:K,payload:PortalEventMap[K]):void{
    const listeners=[...(this.handlers.get(event)??[])];
    for(const handler of listeners){
      try{handler(payload);}catch(error){
        // One module listener must never prevent the remaining listeners from running.
        console.error("[FREEzzz event handler]",event,error);
      }
    }
  }
}

export interface PlatformState{
  view:PortalView;
  language:"RU"|"DE"|"EN";
  telegram:boolean;
  online:boolean;
}

export function createPlatformState(initial:Partial<PlatformState>={}):PlatformState{
  const online=typeof navigator==="undefined"?true:navigator.onLine;
  return {
    view:initial.view??"home",
    language:initial.language??"RU",
    telegram:initial.telegram??false,
    online:initial.online??online
  };
}

export class PortalModuleManager{
  private readonly definitions:readonly PortalModuleDefinition[];
  private readonly adapters=new Map<Exclude<PortalView,"home">,PortalModuleAdapter>();
  private active:PortalView="home";
  private errorHandler:(view:PortalView,phase:"activate"|"deactivate"|"render",error:unknown)=>void=()=>{};

  constructor(definitions:readonly PortalModuleDefinition[]=PORTAL_MODULES){
    this.definitions=definitions.slice();
  }

  get activeView():PortalView{return this.active;}
  has(view:PortalView):boolean{return view==="home"||this.definitions.some(module=>module.view===view);}
  get(view:Exclude<PortalView,"home">):PortalModuleDefinition|undefined{return this.definitions.find(module=>module.view===view);}

  setErrorHandler(handler:(view:PortalView,phase:"activate"|"deactivate"|"render",error:unknown)=>void):void{
    this.errorHandler=handler;
  }

  registerAdapter(view:Exclude<PortalView,"home">,adapter:PortalModuleAdapter):()=>void{
    if(!this.has(view))throw new Error("Cannot register an unknown portal module: "+view);
    const previous=this.adapters.get(view);
    if(previous===adapter)return ()=>{};
    if(this.active===view&&previous)this.invokeAdapter(view,"deactivate",previous);
    this.adapters.set(view,adapter);
    if(this.active===view)this.invokeAdapter(view,"activate",adapter);
    return ()=>{
      if(this.adapters.get(view)!==adapter)return;
      if(this.active===view)this.invokeAdapter(view,"deactivate",adapter);
      this.adapters.delete(view);
    };
  }

  transition(next:PortalView):boolean{
    if(!this.has(next))return false;
    if(next===this.active)return true;
    const previous=this.active;
    if(previous!=="home")this.invoke(previous,"deactivate");
    this.active=next;
    if(next!=="home")this.invoke(next,"activate");
    return true;
  }

  runIsolated<T>(view:Exclude<PortalView,"home">,operation:()=>T,fallback:T):T{
    try{return operation();}catch(error){
      try{this.errorHandler(view,"render",error);}
      catch(handlerError){console.error("[FREEzzz module error handler]",view,"render",handlerError);}
      return fallback;
    }
  }

  private invoke(view:Exclude<PortalView,"home">,phase:"activate"|"deactivate"):void{
    const adapter=this.adapters.get(view);
    if(adapter)this.invokeAdapter(view,phase,adapter);
  }

  private invokeAdapter(view:Exclude<PortalView,"home">,phase:"activate"|"deactivate",adapter:PortalModuleAdapter):void{
    const callback=phase==="activate"?adapter.onActivate:adapter.onDeactivate;
    if(!callback)return;
    try{callback();}catch(error){
      try{this.errorHandler(view,phase,error);}
      catch(handlerError){console.error("[FREEzzz module error handler]",view,phase,handlerError);}
    }
  }
}


/**
 * ZENITH OS kernel state. The kernel owns navigation history and shared
 * system settings; app modules keep their existing domain state and behavior.
 */
export type ZenithSystemState = {
  view: PortalView;
  language: "RU" | "DE" | "EN";
  profileOpen: boolean;
  hudHidden: boolean;
  online: boolean;
  telegram: boolean;
};

export type ZenithNavigationReason = "user" | "back" | "system";
export type ZenithNavigationResult = {
  accepted: boolean;
  previous: PortalView;
  current: PortalView;
  reason: ZenithNavigationReason;
};

export class ZenithOSKernel {
  private readonly modules: PortalModuleManager;
  private readonly history: PortalView[] = [];
  private readonly maxHistory: number;
  private state: ZenithSystemState;

  constructor(options: {
    modules?: PortalModuleManager;
    initial?: Partial<ZenithSystemState>;
    maxHistory?: number;
  } = {}) {
    this.modules = options.modules ?? new PortalModuleManager();
    this.maxHistory = Math.max(1, Math.floor(options.maxHistory ?? 24));
    this.state = {
      view: "home",
      language: "RU",
      profileOpen: false,
      hudHidden: false,
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      telegram: false,
      ...options.initial
    };
    if (!this.modules.has(this.state.view)) this.state.view = "home";
    this.modules.transition(this.state.view);
  }

  get snapshot(): Readonly<ZenithSystemState> {
    return { ...this.state };
  }

  get navigationHistory(): readonly PortalView[] {
    return this.history.slice();
  }

  navigate(next: PortalView, reason: ZenithNavigationReason = "user"): ZenithNavigationResult {
    const previous = this.state.view;
    if (!this.modules.has(next)) {
      return { accepted: false, previous, current: previous, reason };
    }
    if (next === previous) {
      return { accepted: true, previous, current: previous, reason };
    }
    if (reason === "user" && next === "home") {
      // HOME is the root workspace; explicit HOME navigation resets app history.
      this.history.length = 0;
    } else if (reason === "user" && previous !== "home") {
      this.history.push(previous);
      if (this.history.length > this.maxHistory) this.history.splice(0, this.history.length - this.maxHistory);
    }
    if (!this.modules.transition(next)) {
      return { accepted: false, previous, current: previous, reason };
    }
    this.state.view = next;
    return { accepted: true, previous, current: next, reason };
  }

  back(): ZenithNavigationResult {
    const previous = this.state.view;
    const target = this.history.pop() ?? "home";
    return this.navigate(target, "back");
  }

  setLanguage(language: ZenithSystemState["language"]): void {
    this.state.language = language;
  }

  patchSystemState(patch: Partial<Pick<ZenithSystemState, "profileOpen" | "hudHidden" | "online" | "telegram">>): void {
    this.state = { ...this.state, ...patch };
  }

  clearHistory(): void {
    this.history.length = 0;
  }
}
