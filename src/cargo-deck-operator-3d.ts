import objText from "./assets/CARGO_DECK_OPERATOR.obj?raw";

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
export const OPERATOR_MODEL_INFO={name:"CARGO DECK Operator",format:"OBJ",heightUnits:21.2,heightMeters:1.82,vertices:vertices.length,triangles:tris.length};


export interface OperatorAssetFrame{ctx:CanvasRenderingContext2D;baseX:number;baseY:number;facing:number;scale:number;moving:number;walkPhase:number;aiming:boolean;firing:number;color:string;project:(x:number,y:number,z:number)=>{x:number;y:number}}
type AssetFace={v:number[];group:string;mat:string};type AssetModel={v:number[][];f:AssetFace[]};
let assetModel:AssetModel|null=null;let assetLoading:Promise<boolean>|null=null;
const ASSET_MAT:Record<string,string>={Armor:"#202b30",ArmorDark:"#10191e",Plate:"#4b5b60",Visor:"#08272c",Accent:"#54d6d8",Weapon:"#151b1d"};
export function loadOperatorAsset3D(url="/assets/cargo-deck-operator.obj"):Promise<boolean>{if(assetModel)return Promise.resolve(true);if(assetLoading)return assetLoading;assetLoading=fetch(url).then(r=>r.ok?r.text():Promise.reject()).then(t=>{const v:number[][]=[],f:AssetFace[]=[];let group="Model",mat="Armor";for(const raw of t.split(/\r?\n/)){const s=raw.trim();if(!s||s[0]==="#")continue;const p=s.split(/\s+/);if(p[0]==="v")v.push([+p[1],+p[2],+p[3]]);else if(p[0]==="g")group=p[1]||group;else if(p[0]==="usemtl")mat=p[1]||mat;else if(p[0]==="f")f.push({v:p.slice(1).map(x=>parseInt(x.split("/")[0],10)-1),group,mat})}assetModel={v,f};return true}).catch(()=>false);return assetLoading}
function transformAssetVertex(v:number[],group:string,f:OperatorAssetFrame){let x=v[0],y=v[1],z=v[2];const gait=Math.sin(f.walkPhase)*f.moving;const side=group.startsWith("L")?-1:1;if(group==="LArm"||group==="RArm"){const a=(f.aiming?-.30:.04)+gait*.18*side,px=side*.36,pz=1.20,dx=x-px,dz=z-pz;x=px+dx*Math.cos(a)-dz*Math.sin(a);z=pz+dx*Math.sin(a)+dz*Math.cos(a)}else if(group==="LLeg"||group==="RLeg"||group==="LBoot"||group==="RBoot"){const a=gait*.22*side,px=side*.12,pz=.72,dx=x-px,dz=z-pz;x=px+dx*Math.cos(a)-dz*Math.sin(a);z=pz+dx*Math.sin(a)+dz*Math.cos(a)}else if(group==="Weapon"){if(f.aiming)y-=.08;z+=f.aiming?.05:0}const s=70*f.scale;x*=s;y*=s;z*=s;const c=Math.cos(f.facing),sn=Math.sin(f.facing);return{x:f.baseX+x*c-y*sn,y:f.baseY+x*sn+y*c,z}}
export function renderOperatorAsset3D(f:OperatorAssetFrame):boolean{if(!assetModel)return false;const faces:{p:{x:number;y:number}[];d:number;color:string;group:string}[]=[];for(const face of assetModel.f){const pts=face.v.map(i=>transformAssetVertex(assetModel!.v[i],face.group,f)).map(q=>f.project(q.x,q.y,q.z));faces.push({p:pts,d:pts.reduce((a,b)=>a+b.y,0)/pts.length,color:ASSET_MAT[face.mat]||ASSET_MAT.Armor,group:face.group})}faces.sort((a,b)=>a.d-b.d);const ctx=f.ctx;ctx.save();for(const face of faces){ctx.beginPath();ctx.moveTo(face.p[0].x,face.p[0].y);for(let i=1;i<face.p.length;i++)ctx.lineTo(face.p[i].x,face.p[i].y);ctx.closePath();ctx.fillStyle=face.color;ctx.strokeStyle="#0a1115";ctx.lineWidth=Math.max(.7,f.scale*.8);ctx.fill();ctx.stroke();if(face.group==="Visor"){ctx.strokeStyle=f.color;ctx.globalAlpha=.72;ctx.lineWidth=Math.max(.8,f.scale);ctx.stroke();ctx.globalAlpha=1}}if(f.firing>0){const q=f.project(f.baseX,f.baseY-42,70*f.scale);ctx.globalAlpha=Math.min(1,f.firing);ctx.fillStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(q.x,q.y,3.2*f.scale,0,Math.PI*2);ctx.fill()}ctx.restore();return true}
