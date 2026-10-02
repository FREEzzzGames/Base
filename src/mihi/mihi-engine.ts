import type {PortalEventBus,PortalEventMap} from "../core/portal-core";
import {MIHI_EASTER_EGGS,MIHI_INTERACTIONS,MIHI_REPLIES} from "./mihi-data";
import type {MihiContext,MihiLayer,MihiState} from "./mihi-types";

const HISTORY_LIMIT=10;
const STORAGE_KEY="freezzz:mihi:v1";

const contextByView:Record<string,MihiContext>={
  home:"home",live:"live",chat:"chat",game:"game",radio:"radio",library:"library"
};

export class MihiEngine{
  private state:MihiState;
  private unsubscribe:()=>void;

  constructor(private readonly events:PortalEventBus){
    this.state=this.load();
    this.unsubscribe=this.bind();
  }

  private load():MihiState{
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(raw){
        const value=JSON.parse(raw) as Partial<MihiState>;
        return {
          layer:(value.layer&&value.layer>=1&&value.layer<=10?value.layer:1) as MihiLayer,
          context:value.context??"home",
          attention:Math.max(0,Math.min(100,value.attention??0)),
          visible:value.visible??true,
          recentInteractionIds:Array.isArray(value.recentInteractionIds)?value.recentInteractionIds.slice(-HISTORY_LIMIT):[],
          discoveredEggs:Array.isArray(value.discoveredEggs)?value.discoveredEggs:[]};
      }
    }catch{}
    return {layer:1,context:"home",attention:0,visible:true,recentInteractionIds:[],discoveredEggs:[]};
  }

  private save(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(this.state));}catch{}
  }

  private bind():()=>void{
    const offs=[
      this.events.on("navigation:changed",p=>this.onContext(contextByView[p.view]??"system")),
      this.events.on("profile:toggled",p=>this.touch("profile.toggle",p.open?"open":"close")),
      this.events.on("live:popup",p=>this.touch("live.popup."+p.source,p.open?"open":"close")),
      this.events.on("radio:playback",p=>this.touch("radio.playback."+p.status,p.status))
    ];
    return ()=>offs.forEach(off=>off());
  }

  private onContext(context:MihiContext){
    this.state.context=context;
    this.state.attention=Math.min(100,this.state.attention+2);
    this.maybeEgg("navigation:changed");
    this.publish();
    this.save();
  }

  private touch(semanticId:string,source:string){
    if(!semanticId)return;
    this.state.recentInteractionIds.push(semanticId);
    this.state.recentInteractionIds=this.state.recentInteractionIds.slice(-HISTORY_LIMIT);
    this.state.attention=Math.min(100,this.state.attention+(source==="mihi"?1:3));
    this.maybeEgg("mihi:request-action");
    this.publish();
    this.save();
  }

  private maybeEgg(eventId:string){
    const eligible=MIHI_EASTER_EGGS.find(egg=>
      !this.state.discoveredEggs.includes(egg.id)&&
      egg.requiredEvents.includes(eventId)&&
      (egg.context===this.state.context||egg.context==="system"||egg.context==="mystery")&&
      egg.requiredEvents.every(required=>required===eventId||this.state.recentInteractionIds.includes(required))
    );
    if(!eligible)return;
    this.state.discoveredEggs=[...this.state.discoveredEggs,eligible.id];
    this.events.emit("mihi:easter-egg",{id:eligible.id,title:eligible.title});
  }

  private publish(){
    this.events.emit("mihi:state",{layer:this.state.layer,context:this.state.context,attention:this.state.attention,visible:this.state.visible});
  }

  getState():MihiState{return {...this.state,recentInteractionIds:[...this.state.recentInteractionIds],discoveredEggs:[...this.state.discoveredEggs]};}

  nextReply():string{
    const recent=new Set(this.state.recentInteractionIds);
    const candidates=MIHI_REPLIES.filter(reply=>!recent.has(reply.semanticId)&&(reply.context===this.state.context||reply.context==="system"));
    const reply=(candidates[0]??MIHI_REPLIES.find(x=>!recent.has(x.semanticId))??MIHI_REPLIES[0]);
    this.state.recentInteractionIds=[...this.state.recentInteractionIds,reply.semanticId].slice(-HISTORY_LIMIT);
    this.save();
    return reply.text;
  }

  request(actionId:string){
    if(!MIHI_INTERACTIONS.some(x=>x.semanticId===actionId))return false;
    if(this.state.recentInteractionIds.includes(actionId))return false;
    this.events.emit("mihi:request-action",{actionId,source:"mihi"});
    return true;
  }

  dispose(){this.unsubscribe();}
}