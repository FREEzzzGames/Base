import type {PortalEventBus} from "../core/portal-core";
import {MihiEngine} from "./mihi-engine";
import {MIHI_EASTER_EGGS} from "./mihi-data";
import {Mihi3DView} from "./mihi-3d";
import "./mihi.css";

let singleton:MihiModule|undefined;

export class MihiModule{
  readonly engine:MihiEngine;
  private root?:HTMLElement;
  private model?:Mihi3DView;
  private offs:(()=>void)[]=[];
  private geometryObserver?:ResizeObserver;
  private mutationObserver?:MutationObserver;

  constructor(private readonly events:PortalEventBus){
    this.engine=new MihiEngine(events);
    this.mount();
  }

  private mount(){
    if(document.querySelector("[data-mihi-root]"))return;
    const root=document.createElement("section");
    root.className="mihi-module";
    root.dataset.mihiRoot="1";
    root.innerHTML=`
      <div class="mihi-3d-anchor" data-mihi-3d-anchor aria-label="Михи"></div>
      <button class="mihi-orb" data-mihi-toggle type="button" aria-label="Михи">M</button>
      <div class="mihi-panel" data-mihi-panel hidden>
        <header class="mihi-head"><strong>MIHI</strong><button type="button" data-mihi-close aria-label="Закрыть">×</button></header>
        <div class="mihi-body"><div class="mihi-message" data-mihi-message>Я рядом.</div><small data-mihi-depth>Layer 1 · 10</small></div>
        <div class="mihi-actions"><button type="button" data-mihi-help>Помощь</button></div>
      </div>`;
    document.body.append(root);
    this.root=root;
    this.model=new Mihi3DView(this.events);
    this.model.mount(root.querySelector<HTMLElement>("[data-mihi-3d-anchor]")!);
    this.syncGeometry();
    const workspace=document.querySelector<HTMLElement>(".portal-workspace");
    if(workspace){this.geometryObserver=new ResizeObserver(()=>this.syncGeometry());this.geometryObserver.observe(workspace);}
    this.mutationObserver=new MutationObserver(()=>this.syncGeometry());
    this.mutationObserver.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("resize",this.syncGeometry);
    root.querySelector("[data-mihi-toggle]")?.addEventListener("click",()=>this.toggle());
    root.querySelector("[data-mihi-close]")?.addEventListener("click",()=>this.close());
    root.querySelector("[data-mihi-help]")?.addEventListener("click",()=>{
      const text=this.engine.nextReply();
      const message=root.querySelector<HTMLElement>("[data-mihi-message]");
      if(message)message.textContent=text;
      this.events.emit("mihi:state",{...this.engine.getState(),visible:true});
    });
    this.offs=[
      this.events.on("mihi:state",state=>this.renderState(state)),
      this.events.on("mihi:easter-egg",egg=>{
        const message=root.querySelector<HTMLElement>("[data-mihi-message]");
        if(message)message.textContent=egg.title+" — "+(this.findEggText(egg.id)??"");
        this.open();
      })
    ];
  }

  private syncGeometry(){
    if(!this.root)return;
    const main=document.querySelector<HTMLElement>(".portal-workspace > main");
    if(!main)return;
    const rect=main.getBoundingClientRect();
    const width=Math.max(120,Math.min(170,rect.width*0.18));
    const height=Math.min(380,Math.max(320,width*2.15));
    this.root.style.width=width+"px";
    this.root.style.height=height+"px";
    this.root.style.left=(rect.left+rect.width/2)+"px";
    this.root.style.bottom=Math.max(3,window.innerHeight-rect.bottom+3)+"px";
  }

  private findEggText(id:string){
    return MIHI_EASTER_EGGS.find(egg=>egg.id===id)?.text??"Что-то изменилось.";
  }

  private renderState(state:{visible:boolean;layer:number}){
    if(!this.root)return;
    this.root.classList.toggle("mihi-hidden",!state.visible);
    const depth=this.root.querySelector<HTMLElement>("[data-mihi-depth]");
    if(depth)depth.textContent=`Layer ${state.layer} · 10`;
  }

  private toggle(){
    const panel=this.root?.querySelector<HTMLElement>("[data-mihi-panel]");
    if(panel)panel.hidden=!panel.hidden;
  }

  private open(){
    const panel=this.root?.querySelector<HTMLElement>("[data-mihi-panel]");
    if(panel)panel.hidden=false;
  }

  private close(){
    const panel=this.root?.querySelector<HTMLElement>("[data-mihi-panel]");
    if(panel)panel.hidden=true;
  }

  dispose(){
    this.offs.forEach(off=>off());
    this.offs=[];
    this.geometryObserver?.disconnect();
    this.geometryObserver=undefined;
    this.mutationObserver?.disconnect();
    this.mutationObserver=undefined;
    window.removeEventListener("resize",this.syncGeometry);
    this.model?.dispose();
    this.model=undefined;
    this.engine.dispose();
    this.root?.remove();
    this.root=undefined;
  }
}

export function createMihiModule(events:PortalEventBus):MihiModule{
  singleton?.dispose();
  singleton=new MihiModule(events);
  return singleton;
}