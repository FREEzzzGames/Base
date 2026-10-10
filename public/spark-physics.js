/* SPARK physics primitives — allocation-free geometry helpers. */
(function(root){
'use strict';
function hit(a,b){
 return a.x < b.x+b.w && a.x+a.w > b.x &&
        a.y < b.y+b.h && a.y+a.h > b.y;
}
function segmentHitsRect(x1,y1,x2,y2,r){
 // Liang–Barsky clipping against the rectangle expanded by 3 logical pixels.
 var left=r.x-3,right=r.x+r.w+3,top=r.y-3,bottom=r.y+r.h+3;
 var dx=x2-x1,dy=y2-y1,t0=0,t1=1,p,q,t;
 p=-dx;q=x1-left;
 if(Math.abs(p)<1e-8){if(q<0)return false;}
 else{t=q/p;if(p<0){if(t>t1)return false;if(t>t0)t0=t;}else{if(t<t0)return false;if(t<t1)t1=t;}}
 p=dx;q=right-x1;
 if(Math.abs(p)<1e-8){if(q<0)return false;}
 else{t=q/p;if(p<0){if(t>t1)return false;if(t>t0)t0=t;}else{if(t<t0)return false;if(t<t1)t1=t;}}
 p=-dy;q=y1-top;
 if(Math.abs(p)<1e-8){if(q<0)return false;}
 else{t=q/p;if(p<0){if(t>t1)return false;if(t>t0)t0=t;}else{if(t<t0)return false;if(t<t1)t1=t;}}
 p=dy;q=bottom-y1;
 if(Math.abs(p)<1e-8){if(q<0)return false;}
 else{t=q/p;if(p<0){if(t>t1)return false;if(t>t0)t0=t;}else{if(t<t0)return false;if(t<t1)t1=t;}}
 return true;
}
function moveAndCollide(entity,dt,platforms,worldWidth){
 var oldX=entity.x,oldY=entity.y,oldBottom=oldY+entity.h;
 entity.onGround=false;
 entity.y+=entity.vy*dt;
 for(var i=0;i<platforms.length;i++){
  var vertical=platforms[i];
  if(entity.x<vertical.x+vertical.w&&entity.x+entity.w>vertical.x&&entity.y<vertical.y+vertical.h&&entity.y+entity.h>vertical.y){
   if(entity.vy>=0&&oldBottom<=vertical.y+10){entity.y=vertical.y-entity.h;entity.vy=0;entity.onGround=true;}
   else if(entity.vy<0&&oldY>=vertical.y+vertical.h-3){entity.y=vertical.y+vertical.h;entity.vy=0;}
  }
 }
 entity.x+=entity.vx*dt;
 for(var j=0;j<platforms.length;j++){
  var horizontal=platforms[j];
  if(hit(entity,horizontal)){
   if(entity.vx>0&&oldX+entity.w<=horizontal.x+3)entity.x=horizontal.x-entity.w;
   else if(entity.vx<0&&oldX>=horizontal.x+horizontal.w-3)entity.x=horizontal.x+horizontal.w;
   entity.vx=0;
  }
 }
 entity.x=Math.max(0,Math.min(worldWidth-entity.w,entity.x));
}
root.SparkPhysics=Object.freeze({hit:hit,segmentHitsRect:segmentHitsRect,moveAndCollide:moveAndCollide});
})(typeof window!=='undefined'?window:globalThis);
