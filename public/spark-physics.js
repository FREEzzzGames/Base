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
root.SparkPhysics=Object.freeze({hit:hit,segmentHitsRect:segmentHitsRect});
})(typeof window!=='undefined'?window:globalThis);
