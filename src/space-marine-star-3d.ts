// Space Marine Star runtime mesh extracted from the supplied spaceMarineStar.3mf.
// Real sculpt retained; quantized to 1127 faces for Canvas/Android performance.
const DATA="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";
const VCOUNT=409,FCOUNT=1127,VB=2454,FB=6762,NB=3381;
function b64(s:string){const x=atob(s),o=new Uint8Array(x.length);for(let i=0;i<x.length;i++)o[i]=x.charCodeAt(i);return o}
let V=new Int16Array(0),F=new Uint16Array(0),N=new Int8Array(0),READY=false;
async function load(){try{const raw=await new Response(new Blob([b64(DATA)]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();V=new Int16Array(raw,0,VB/2);F=new Uint16Array(raw,VB,FB/2);N=new Int8Array(raw,VB+FB,NB);READY=true}catch{READY=false}}
void load();
export interface SpaceMarineFrame{ctx:CanvasRenderingContext2D;baseX:number;baseY:number;facing:number;scale:number;moving:number;walkPhase:number;aiming:boolean;firing:number;color:string;project:(x:number,y:number,z:number)=>{x:number;y:number}}
const shade=(l:number)=>{const b=0x737a79,r=Math.round(((b>>16)&255)*l),g=Math.round(((b>>8)&255)*l),bb=Math.round((b&255)*l);return`rgb(${r},${g},${bb})`};
import {HumanJointRig} from "./cargo-deck-biomech";
export const SPACE_MARINE_MODEL_INFO={name:"Space Marine Star",source:"spaceMarineStar.3mf",sourceTriangles:1586022,runtimeVertices:VCOUNT,runtimeTriangles:FCOUNT,format:"gzip-quantized-canvas-mesh",rigged:true,rig:"procedural-human-joint-limits"} as const;
const rig=new HumanJointRig();
// Model presentation transform: the source mesh is stored upside-down; flip it onto its feet.
const MODEL_HEIGHT=21.2;
const MODEL_SCALE=1.5;
const PX=new Float32Array(VCOUNT),PY=new Float32Array(VCOUNT),PD=new Float32Array(FCOUNT),PO=new Uint16Array(FCOUNT);
function poseVertex(i:number,walk:number,aim:number,recoil:number){
  let x=V[i*3]*.01,y=V[i*3+1]*.01;
  const rawZ=V[i*3+2]*.01+18;
  let z=MODEL_HEIGHT-rawZ;
  const zn=z/21.2,side=x>=0?1:-1,ax=Math.abs(x);
  const limbWeight=Math.max(0,Math.min(1,(ax-.065)/.13));
  const upperWeight=Math.max(0,Math.min(1,(ax-.075)/.12));
  if(zn<.48 && limbWeight>0){
    const hip=side>0?rig.pose.hipR:rig.pose.hipL;
    const knee=side>0?rig.pose.kneeR:rig.pose.kneeL;
    const a=(hip+walk*.22*side)*limbWeight;
    const px=side*.075,pz=.30;
    const dx=x-px,dz=z-pz;
    const rx=px+dx*Math.cos(a)-dz*Math.sin(a);
    const rz=pz+dx*Math.sin(a)+dz*Math.cos(a);
    x=x+(rx-x)*limbWeight;z=z+(rz-z)*limbWeight;
    z-=knee*.035*Math.max(0,Math.min(1,(.48-zn)/.22))*limbWeight;
  }else if(zn<.72){
    const spine=rig.pose.spine;
    const w=Math.max(0,Math.min(1,(.72-zn)/.30));
    x+=Math.sin(spine)*.08*w;
    y+=Math.cos(spine)*.035*w;
  }else if(upperWeight>0){
    const shoulder=side>0?rig.pose.shoulderR:rig.pose.shoulderL;
    const elbow=side>0?rig.pose.elbowR:rig.pose.elbowL;
    const a=(shoulder+aim*.12+walk*.14*side)*upperWeight;
    const px=side*.15,pz=.76;
    const dx=x-px,dz=z-pz;
    const rx=px+dx*Math.cos(a)-dz*Math.sin(a);
    const rz=pz+dx*Math.sin(a)+dz*Math.cos(a);
    x=x+(rx-x)*upperWeight;z=z+(rz-z)*upperWeight;
    z-=elbow*.018*upperWeight;
  }
  y+=recoil*.018;
  return {x,y,z};
}
export function renderSpaceMarineStar(f:SpaceMarineFrame){
  if(!READY)return;
  const ctx=f.ctx,s=Math.max(.04,f.scale)*MODEL_SCALE,c=Math.cos(f.facing),sn=Math.sin(f.facing);
  const g=Math.sin(f.walkPhase)*Math.max(0,Math.min(1,f.moving));
  const bob=Math.abs(Math.sin(f.walkPhase))*.5*Math.max(0,Math.min(1,f.moving));
  const r=f.firing>0?Math.min(1,f.firing):0;
  const aim=f.aiming?-.22:0;
  rig.solve({
    hipL:-g*.22,hipR:g*.22,
    kneeL:Math.max(0,g*.18),kneeR:Math.max(0,-g*.18),
    ankleL:-g*.08,ankleR:g*.08,
    shoulderL:g*.12,shoulderR:-g*.12,
    elbowL:.35+Math.abs(g)*.12,elbowR:.35+Math.abs(g)*.12,
    spine:aim*.55,neck:aim*.35
  },1/60);
  for(let i=0;i<VCOUNT;i++){
    const p=poseVertex(i,g,aim,r);
    p.z+=bob;
    const x=p.x*s,y=p.y*s,z=p.z*s;
    const q=f.project(f.baseX+x*c-y*sn,f.baseY+x*sn+y*c,z);
    PX[i]=q.x;PY[i]=q.y;
  }
  for(let i=0,j=0;i<FCOUNT;i++,j+=3){
    const a=F[j],b=F[j+1],cc=F[j+2];
    PD[i]=(PY[a]+PY[b]+PY[cc])/3;PO[i]=i;
  }
  for(let i=1;i<FCOUNT;i++){
    const k=PO[i],q=PD[k];let j=i-1;
    while(j>=0&&PD[PO[j]]>q){PO[j+1]=PO[j];j--}
    PO[j+1]=k;
  }
  ctx.save();
  for(let i=0;i<FCOUNT;i++){
    const j=PO[i]*3,a=F[j],b=F[j+1],cc=F[j+2];
    const l=Math.max(.35,Math.min(1.08,.70+N[j+2]/127*.26-N[j+1]/127*.10));
    ctx.fillStyle=shade(l);ctx.beginPath();
    ctx.moveTo(PX[a],PY[a]);ctx.lineTo(PX[b],PY[b]);ctx.lineTo(PX[cc],PY[cc]);
    ctx.closePath();ctx.fill();
  }
  if(r>0){
    const q=f.project(f.baseX,f.baseY-30*s,22*s);
    ctx.globalAlpha=r;ctx.fillStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=10*s;
    ctx.beginPath();ctx.arc(q.x,q.y,2.2*s,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
