export interface Operator3DFrame {
  ctx: CanvasRenderingContext2D;
  baseX: number; baseY: number; facing: number; scale: number;
  moving: number; walkPhase: number; aiming: boolean; firing: number;
  color: string; project: (x:number,y:number,z:number)=>{x:number;y:number};
}
type Part={size:[number,number,number];pos:[number,number,number];front:string;side:string;top:string;accent?:string;kind?:"arm"|"leg"|"head"|"weapon"};
type Face={p:{x:number;y:number}[];depth:number;front:string;stroke:string;accent?:string};
const MODEL:Part[]=[
{size:[14,22,11],pos:[-9,2,5],front:"#172126",side:"#0b1216",top:"#48565a"},
{size:[14,22,11],pos:[9,2,5],front:"#172126",side:"#0b1216",top:"#48565a"},
{size:[11,13,27],pos:[-9,0,23],front:"#344248",side:"#172126",top:"#5a686d",kind:"leg"},
{size:[11,13,27],pos:[9,0,23],front:"#2d3b40",side:"#172126",top:"#526167",kind:"leg"},
{size:[13,14,13],pos:[-9,-1,40],front:"#46565c",side:"#202b30",top:"#718086"},
{size:[13,14,13],pos:[9,-1,40],front:"#405056",side:"#1c282d",top:"#68777c"},
{size:[28,20,20],pos:[0,1,48],front:"#263338",side:"#151f24",top:"#59676b"},
{size:[42,25,34],pos:[0,0,69],front:"#354349",side:"#1b272c",top:"#788488"},
{size:[34,27,10],pos:[0,-1,85],front:"#4b5a5f",side:"#202c31",top:"#899497",accent:"#54d6d8"},
{size:[14,16,38],pos:[-25,0,69],front:"#334248",side:"#18242a",top:"#617076",kind:"arm"},
{size:[13,15,34],pos:[-27,-4,45],front:"#46555a",side:"#1d292e",top:"#738084",kind:"arm"},
{size:[14,16,38],pos:[25,0,69],front:"#303e44",side:"#172328",top:"#5d6b71",kind:"arm"},
{size:[13,15,34],pos:[27,-4,45],front:"#425157",side:"#1b272c",top:"#6d7a7e",kind:"arm"},
{size:[30,28,28],pos:[0,2,104],front:"#4a585d",side:"#202c31",top:"#899497",kind:"head"},
{size:[25,5,9],pos:[0,-14,105],front:"#061116",side:"#02080b",top:"#19343a",accent:"#54d6d8",kind:"head"},
{size:[17,15,36],pos:[0,11,69],front:"#26353a",side:"#10191e",top:"#59696e"},
{size:[9,52,9],pos:[0,-30,66],front:"#26343a",side:"#10181c",top:"#65757a",kind:"weapon"},
{size:[7,16,7],pos:[0,-63,66],front:"#10181c",side:"#080e12",top:"#6c797d",kind:"weapon"}];
function localToWorld(bx:number,by:number,x:number,y:number,a:number){const c=Math.cos(a),s=Math.sin(a);return{x:bx+x*c-y*s,y:by+x*s+y*c}}
function boxFaces(part:Part,f:Operator3DFrame,ox=0,oy=0,oz=0):Face[]{
 const [w,d,h]=part.size,[px,py,pz]=part.pos,c=Math.cos(0),s=Math.sin(0),pts:number[][]=[];
 for(const zz of [0,h])for(const yy of [-d/2,d/2])for(const xx of [-w/2,w/2]){
  const lx=(px+ox+xx*c-yy*s)*f.scale,ly=(py+oy+xx*s+yy*c)*f.scale;
  const q=localToWorld(f.baseX,f.baseY,lx,ly,f.facing);pts.push([q.x,q.y,(pz+oz+zz)*f.scale]);
 }
 const q=pts.map(v=>f.project(v[0],v[1],v[2]));
 const mk=(ids:number[],color:string):Face=>({p:ids.map(i=>q[i]),depth:ids.reduce((a,i)=>a+q[i].y,0)/ids.length,front:color,stroke:"#10171b",accent:part.accent});
 return[mk([0,1,5,4],part.front),mk([1,3,7,5],part.side),mk([4,5,7,6],part.top)];
}
export function renderOperator3D(f:Operator3DFrame):void{
 const faces:Face[]=[],g=Math.sin(f.walkPhase)*f.moving;
 for(const part of MODEL){let ox=0,oy=0;
  if(part.kind==="leg"){ox=part.pos[0]<0?g*4:-g*4;oy=Math.abs(g)*2}
  if(part.kind==="arm"){ox=part.pos[0]<0?-g*3:g*3;oy=f.aiming?-3:0}
  if(part.kind==="weapon")oy=f.aiming?-7:0;
  if(part.kind==="head")oy=f.aiming?-1.5:0;
  faces.push(...boxFaces(part,f,ox,oy));
 }
 faces.sort((a,b)=>a.depth-b.depth);const s=Math.max(.75,f.scale);f.ctx.save();
 for(const face of faces){const c=f.ctx;c.beginPath();c.moveTo(face.p[0].x,face.p[0].y);for(let i=1;i<face.p.length;i++)c.lineTo(face.p[i].x,face.p[i].y);c.closePath();c.fillStyle=face.front;c.strokeStyle=face.stroke;c.lineWidth=.8*s;c.fill();c.stroke();if(face.accent){c.strokeStyle=face.accent;c.globalAlpha=.72;c.lineWidth=Math.max(.7,s);c.beginPath();c.moveTo(face.p[0].x,face.p[0].y);c.lineTo(face.p[1].x,face.p[1].y);c.stroke();c.globalAlpha=1}}
 if(f.firing>0){const m=localToWorld(f.baseX,f.baseY,0,-76,f.facing),p=f.project(m.x,m.y,72*f.scale),c=f.ctx;c.save();c.globalAlpha=Math.min(1,f.firing);c.fillStyle=f.color;c.shadowColor=f.color;c.shadowBlur=10*s;c.beginPath();c.arc(p.x,p.y,3.5*s,0,Math.PI*2);c.fill();c.restore()}
 f.ctx.restore();
}
export const OPERATOR_MODEL_INFO={name:"CARGO DECK Operator",heightMeters:1.82,headHeightMeters:.255,parts:MODEL.length};