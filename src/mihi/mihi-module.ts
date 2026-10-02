import type {PortalEventBus} from "../core/portal-core";
import {MihiEngine} from "./mihi-engine";
import {MIHI_EASTER_EGGS} from "./mihi-data";
import "./mihi.css";

let singleton:MihiModule|undefined;

export class MihiModule{
  readonly engine:MihiEngine;
  private root?:HTMLElement;
  private offs:(()=>void)[]=[];

  constructor(private readonly events:PortalEventBus){
    this.engine=new MihiEngine(events);
    this.mount();
  }

  private mount(){
    if(document.querySelector("[data-mihi-root]"))return;
    const root=document.createElement("section");
    root.className="mihi-module";
    root.dataset.mihiRoot="1";
    root.innerHTML=`<button class="mihi-orb" data-mihi-toggle type="button" aria-label="Михи">M</button>
      <div class="mihi-panel" data-mihi-panel hidden>
        <header class="mihi-head"><strong>MIHI</strong><button type="button" data-mihi-close aria-label="Закрыть">×</button></header>
        <div class="mihi-body" data-mihi-message>Я рядом.</div>
        <div class="mihi-actions"><button type="button" data-mihi-help>Помощь</button></div>
      </div>`;
    document.body.append(root);
    this.root=root;
    root.querySelector("[data-mihi-toggle]")?.addEventListener("click",()=>this.toggle());
    root.querySelector("[data-mihi-close]")?.addEventListener("click",()=>this.close());
    root.querySelector("[data-mihi-help]")?.addEventListener("click",()=>{
      const text=this.engine.nextReply();
      const message=root.querySelector<HTMLElement>("[data-mihi-message]");
      if(message)message.textContent=text;
      this.events.emit("mihi:state",{...this.engine.getState()});
    });
    this.offs=[
      this.events.on("mihi:state",state=>this.renderState(state.visible)),
      this.events.on("mihi:easter-egg",egg=>{
        const message=root.querySelector<HTMLElement>("[data-mihi-message]");
        if(message)message.textContent=egg.title+" — "+(this.findEggText(egg.id)??"");
        this.open();
      })
    ];
  }

  private findEggText(id:string){
    return MIHI_EASTER_EGGS.find(egg=>egg.id===id)?.text??"Что-то изменилось.";
  }

  private renderState(visible:boolean){
    if(this.root)this.root.classList.toggle("mihi-hidden",!visible);
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