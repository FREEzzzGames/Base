import objText from "./assets/CARGO_DECK_OPERATOR.obj?raw";

const LOOP_ONCE=2200;
export type SoldierAnimationState="IDLE"|"RUN"|"SIT_DOWN"|"STAND_UP"|"AIM"|"SHOOT";
export interface SoldierModelAdapter{
  rotation?:{y:number};
  position?:{x:number;y:number;z?:number};
}
export interface SoldierAnimationAction{
  reset?:()=>SoldierAnimationAction;
  fadeOut?:(duration:number)=>SoldierAnimationAction;
  fadeIn?:(duration:number)=>SoldierAnimationAction;
  play?:()=>SoldierAnimationAction;
  setLoop?:(mode:number,repetitions?:number)=>SoldierAnimationAction;
}
export class SoldierBehaviorController{
  model:SoldierModelAdapter;
  mixer:any;
  currentState:SoldierAnimationState="IDLE";
  actions:Record<string,SoldierAnimationAction>={};
  currentAction:SoldierAnimationAction|null=null;
  transitionDuration=.3;
  movementSpeed=.05;
  isMoving=false;
  isAiming=false;
  bodyAngle=0;
  targetAngle=0;
  walkPhase=0;
  shotPulse=0;
  stateTime=0;

  constructor(model:SoldierModelAdapter={},animationMixer:any=null){
    this.model=model;this.mixer=animationMixer;
    this.bodyAngle=model.rotation?.y??0;this.targetAngle=this.bodyAngle;
  }
  registerAnimation(name:string,action:SoldierAnimationAction){this.actions[name]=action}
  transitionTo(stateName:SoldierAnimationState,force=false){
    if(this.currentState===stateName&&!force)return;
    const next=this.actions[stateName];
    if(next){
      const prev=this.currentAction;
      if(prev?.fadeOut)prev.fadeOut(this.transitionDuration);
      if(next.reset)next.reset();
      if(next.fadeIn)next.fadeIn(this.transitionDuration);
      if(next.play)next.play();
      this.currentAction=next;
    }
    this.currentState=stateName;this.stateTime=0;
  }
  rotateTowards(targetAngle:number,deltaTime:number){
    this.targetAngle=targetAngle;
    const d=Math.atan2(Math.sin(targetAngle-this.bodyAngle),Math.cos(targetAngle-this.bodyAngle));
    this.bodyAngle+=d*(1-Math.exp(-deltaTime*10));
    if(this.model.rotation)this.model.rotation.y=this.bodyAngle;
  }
  setMovement(moving:boolean,moveAngle:number,deltaTime:number){
    this.isMoving=moving;
    if(moving){
      this.rotateTowards(moveAngle,deltaTime);
      this.transitionTo("RUN");
    }else if(this.currentState==="RUN"){
      this.transitionTo(this.isAiming?"AIM":"IDLE");
    }
  }
  setAim(targetAngle:number,deltaTime:number){
    this.isAiming=true;
    this.rotateTowards(targetAngle,deltaTime);
    if(!this.isMoving)this.transitionTo("AIM");
  }
  clearAim(){this.isAiming=false;if(!this.isMoving)this.transitionTo("IDLE")}
  shoot(){
    this.shotPulse=1;
    const action=this.actions.SHOOT;
    if(action){
      if(action.reset)action.reset();
      if(action.setLoop)action.setLoop(LOOP_ONCE,1);
      if(action.play)action.play();
    }
    this.transitionTo("SHOOT",true);
  }
  sitDown(){this.isMoving=false;this.isAiming=false;this.transitionTo("SIT_DOWN")}
  standUp(){
    this.isMoving=false;this.transitionTo("STAND_UP");
    if(!this.actions.STAND_UP){
      this.stateTime=0;
    }
  }
  update(deltaTime:number){
    this.stateTime+=deltaTime;
    this.shotPulse=Math.max(0,this.shotPulse-deltaTime*4);
    if(this.mixer?.update)this.mixer.update(deltaTime);
    if(this.currentState==="SHOOT"&&this.shotPulse<=0){
      this.transitionTo(this.isMoving?"RUN":this.isAiming?"AIM":"IDLE");
    }
    if(this.currentState==="STAND_UP"&&this.stateTime>.5)this.transitionTo(this.isMoving?"RUN":"IDLE");
  }
}

export interface Operator3DFrame {
  ctx: CanvasRenderingContext2D;
  baseX:number;baseY:number;facing:number;scale:number;
  moving:number;walkPhase:number;aiming:boolean;firing:number;
  color:string;project:(x:number,y:number,z:number)=>{x:number;y:number};
}
type Tri={a:number;b:number;c:number;group:string;material:string;};
type V={x:number;y:number;z:number};
const vertices:V[]=[];const tris:Tri[]=[];let group="body",material="OperatorArmor";
for(const line of objText.split(/\r?\n/)){
  const p=line.trim().split(/\s+/);if(!p[0])continue;
  if(p[0]==="v")vertices.push({x:+p[1],y:+p[2],z:+p[3]});
  else if(p[0]==="g")group=p[1]||"body";
  else if(p[0]==="usemtl")material=p[1]||"OperatorArmor";
  else if(p[0]==="f"){
    const ids=p.slice(1).map(x=>parseInt(x.split("/")[0],10)-1);
    for(let i=1;i<ids.length-1;i++)tris.push({a:ids[0],b:ids[i],c:ids[i+1],group,material});
  }
}
const palette:Record<string,string>={
  OperatorArmor:"#4b5557",Visor:"#182f35"
};
function transform(v:V,frame:Operator3DFrame,t:Tri){
  let x=v.x,y=v.y,z=v.z;
  const walk=Math.sin(frame.walkPhase)*frame.moving;
  if(t.group==="thigh_L"||t.group==="shin_L")x+=walk*1.0;
  if(t.group==="thigh_R"||t.group==="shin_R")x-=walk*1.0;
  if(t.group==="upperarm_L"||t.group==="forearm_L")x-=walk*.65;
  if(t.group==="upperarm_R"||t.group==="forearm_R")x+=walk*.65;
  if(frame.aiming&&t.group==="rifle")y-=1.8;
  const c=Math.cos(frame.facing),s=Math.sin(frame.facing);
  return{x:frame.baseX+(x*frame.scale)*c-(y*frame.scale)*s,
    y:frame.baseY+(x*frame.scale)*s+(y*frame.scale)*c,
    z:z*frame.scale};
}
export function renderOperator3D(frame:Operator3DFrame){
  const projected:{p:{x:number;y:number}[];depth:number;color:string}[]=[];
  for(const tri of tris){
    const a=transform(vertices[tri.a],frame,tri),b=transform(vertices[tri.b],frame,tri),c=transform(vertices[tri.c],frame,tri);
    const pa=frame.project(a.x,a.y,a.z),pb=frame.project(b.x,b.y,b.z),pc=frame.project(c.x,c.y,c.z);
    projected.push({p:[pa,pb,pc],depth:(pa.y+pb.y+pc.y)/3,color:palette[tri.material]||palette.OperatorArmor});
  }
  projected.sort((a,b)=>a.depth-b.depth);
  const ctx=frame.ctx;ctx.save();
  for(const f of projected){
    ctx.beginPath();ctx.moveTo(f.p[0].x,f.p[0].y);ctx.lineTo(f.p[1].x,f.p[1].y);ctx.lineTo(f.p[2].x,f.p[2].y);ctx.closePath();
    ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle="rgba(8,12,14,.9)";ctx.lineWidth=Math.max(.55,frame.scale*.055);ctx.stroke();
  }
  if(frame.firing>0){
    const q=frame.project(frame.baseX,frame.baseY-100*frame.scale,70*frame.scale);
    ctx.save();ctx.globalAlpha=Math.min(1,frame.firing);ctx.fillStyle=frame.color;ctx.shadowColor=frame.color;ctx.shadowBlur=12;
    ctx.beginPath();ctx.arc(q.x,q.y,3.5,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  ctx.restore();
}



export interface OperatorAssetFrame{ctx:CanvasRenderingContext2D;baseX:number;baseY:number;facing:number;scale:number;moving:number;walkPhase:number;aiming:boolean;firing:number;color:string;project:(x:number,y:number,z:number)=>{x:number;y:number}}
type AssetFace={v:number[];group:string;mat:string};type AssetModel={v:number[][];f:AssetFace[]};
let assetModel:AssetModel|null=null;let assetLoading:Promise<boolean>|null=null;
function parseBundledOperatorAsset():AssetModel{
  const v:number[][]=[],f:AssetFace[]=[];let group="Model",mat="OperatorArmor";
  for(const raw of objText.split(/\r?\n/)){
    const s=raw.trim();if(!s||s[0]==="#")continue;
    const p=s.split(/\s+/);
    if(p[0]==="v")v.push([+p[1],+p[2],+p[3]]);
    else if(p[0]==="g")group=p[1]||group;
    else if(p[0]==="usemtl")mat=p[1]||mat;
    else if(p[0]==="f")f.push({v:p.slice(1).map(x=>parseInt(x.split("/")[0],10)-1),group,mat});
  }
  return {v,f};
}
export function loadOperatorAsset3D():Promise<boolean>{
  if(assetModel)return Promise.resolve(true);
  if(!assetLoading){
    assetLoading=Promise.resolve().then(()=>{assetModel=parseBundledOperatorAsset();return assetModel.v.length>0&&assetModel.f.length>0}).catch(()=>false);
  }
  return assetLoading;
}

const ASSET_MAT:Record<string,string>={Armor:"#3f494a",ArmorDark:"#20282a",Plate:"#6b7473",Visor:"#0a3035",Accent:"#6bd7d7",Weapon:"#252b2c"};
function groupMaterial(group:string,mat:string){
  if(mat==="Visor"||group==="visor")return ASSET_MAT.Visor;
  if(group==="helmet"||group==="head")return "#596362";
  if(["chest_plate","shoulder_L","shoulder_R","knee_L","knee_R"].includes(group))return ASSET_MAT.Plate;
  if(group==="backpack")return "#2b3435";
  if(group==="rifle"||group==="Weapon")return ASSET_MAT.Weapon;
  if(group==="boots_L"||group==="boots_R")return "#252d2e";
  return ASSET_MAT.Armor;
}
function transformAssetVertex(v:number[],group:string,f:OperatorAssetFrame){
  let x=v[0],y=v[1],z=v[2];const gait=Math.sin(f.walkPhase)*f.moving;
  const side=group.endsWith("_L")?-1:group.endsWith("_R")?1:1;
  if(["upperarm_L","forearm_L","upperarm_R","forearm_R"].includes(group)){
    const a=(f.aiming?-.30:.04)+gait*.16*side,px=side*8,pz=12,dx=x-px,dz=z-pz;
    x=px+dx*Math.cos(a)-dz*Math.sin(a);z=pz+dx*Math.sin(a)+dz*Math.cos(a);
  }else if(["thigh_L","thigh_R","shin_L","shin_R"].includes(group)){
    const a=gait*.13*side,px=side*2,pz=6,dx=x-px,dz=z-pz;
    x=px+dx*Math.cos(a)-dz*Math.sin(a);z=pz+dx*Math.sin(a)+dz*Math.cos(a);
  }else if(group==="rifle"||group==="Weapon"){if(f.aiming)y-=1.1}
  const s=70*f.scale;x*=s;y*=s;z*=s;const c=Math.cos(f.facing),sn=Math.sin(f.facing);
  return{x:f.baseX+x*c-y*sn,y:f.baseY+x*sn+y*c,z};
}
function shadeFace(face:AssetFace){
  const base=groupMaterial(face.group,face.mat);if(face.group==="visor")return base;
  const m=/^#([0-9a-f]{6})$/i.exec(base);if(!m)return base;
  const n=parseInt(m[1],16),light=0.82;
  const rr=Math.min(255,Math.round(((n>>16)&255)*light)),gg=Math.min(255,Math.round(((n>>8)&255)*light)),bb=Math.min(255,Math.round((n&255)*light));
  return `rgb(${rr},${gg},${bb})`;
}
export function renderOperatorAsset3D(f:OperatorAssetFrame):boolean{
  if(!assetModel)return false;
  const faces:{p:{x:number;y:number}[];d:number;color:string;group:string}[]=[];
  for(const face of assetModel.f){
    const pts=face.v.map(i=>transformAssetVertex(assetModel!.v[i],face.group,f)).map(q=>f.project(q.x,q.y,q.z));
    faces.push({p:pts,d:pts.reduce((a,b)=>a+b.y,0)/pts.length,color:shadeFace(face),group:face.group});
  }
  faces.sort((a,b)=>a.d-b.d);const ctx=f.ctx;ctx.save();
  for(const face of faces){
    ctx.beginPath();ctx.moveTo(face.p[0].x,face.p[0].y);
    for(let i=1;i<face.p.length;i++)ctx.lineTo(face.p[i].x,face.p[i].y);
    ctx.closePath();ctx.fillStyle=face.color;ctx.fill();
    if(face.group==="visor"){ctx.strokeStyle=f.color;ctx.globalAlpha=.45;ctx.lineWidth=Math.max(.6,f.scale*.25);ctx.stroke();ctx.globalAlpha=1}
  }
  if(f.firing>0){const q=f.project(f.baseX,f.baseY-42,70*f.scale);ctx.globalAlpha=Math.min(1,f.firing);ctx.fillStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(q.x,q.y,3.2*f.scale,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
  ctx.restore();return true;
}
export const OPERATOR_MODEL_INFO={name:"CARGO DECK Operator",format:"OBJ",heightUnits:21.2,heightMeters:1.82,vertices:vertices.length,triangles:tris.length};
