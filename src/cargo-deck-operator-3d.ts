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
