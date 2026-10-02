export type PortalView = "home"|"live"|"chat"|"game"|"radio"|"library";

export interface PortalModuleDefinition{
  readonly id:"LIVE"|"CHAT"|"GAME"|"RADIO"|"LIBRARY";
  readonly view:Exclude<PortalView,"home">;
  readonly independent:boolean;
}

export const PORTAL_MODULES:readonly PortalModuleDefinition[]=[
  {id:"LIVE",view:"live",independent:true},
  {id:"CHAT",view:"chat",independent:true},
  {id:"GAME",view:"game",independent:true},
  {id:"RADIO",view:"radio",independent:true},
  {id:"LIBRARY",view:"library",independent:true}
];

export type PortalEventMap={
  "navigation:changed":{view:PortalView};
  "profile:toggled":{open:boolean};
  "live:popup":{open:boolean;source:"twitch"|"youtube"};
  "radio:playback":{status:string};
  "mihi:state":{layer:number;context:string;attention:number;visible:boolean};
  "mihi:request-action":{actionId:string;source:"mihi"};
  "mihi:easter-egg":{id:string;title:string};
};

type Handler<T>=(payload:T)=>void;

export class PortalEventBus{
  private readonly handlers=new Map<keyof PortalEventMap,Set<Handler<any>>>();
  on<K extends keyof PortalEventMap>(event:K,handler:Handler<PortalEventMap[K]>):()=>void{
    const set=this.handlers.get(event)??new Set<Handler<any>>();
    set.add(handler);
    this.handlers.set(event,set);
    return ()=>set.delete(handler);
  }
  emit<K extends keyof PortalEventMap>(event:K,payload:PortalEventMap[K]):void{
    this.handlers.get(event)?.forEach(handler=>handler(payload));
  }
}

export interface PlatformState{
  view:PortalView;
  language:"RU"|"DE"|"EN";
  telegram:boolean;
  online:boolean;
}

export function createPlatformState(initial:Partial<PlatformState>={}):PlatformState{
  return {
    view:initial.view??"home",
    language:initial.language??"RU",
    telegram:initial.telegram??false,
    online:initial.online??navigator.onLine
  };
}


export class PortalModuleManager{
  constructor(private readonly definitions:readonly PortalModuleDefinition[]=PORTAL_MODULES){}
  has(view:PortalView):boolean{return view==="home"||this.definitions.some(module=>module.view===view);}
  get(view:Exclude<PortalView,"home">):PortalModuleDefinition|undefined{return this.definitions.find(module=>module.view===view);}
}
