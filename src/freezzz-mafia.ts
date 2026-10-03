function drawTopDownBackground(){
 const m=topDownMap(),tile=30;
 rect(0,0,m.w,m.h,"#718b5d");

 // Земля: лёгкая неоднородность, без ощущения процедурной сетки.
 for(let y=0;y<m.h;y+=tile)for(let x=0;x<m.w;x+=tile){
  const q=((x/tile)*17+(y/tile)*11+floor*5)%29;
  if(q<4)rect(x+5,y+8,3,3,"#5f794f");
  if(q===9)rect(x+18,y+20,5,2,"#84996d");
  if(q===17)rect(x+12,y+25,2,2,"#557047");
 }

 // Магистрали и внутриквартальные улицы.
 for(const rd of m.roads){
  rect(rd.x,rd.y,rd.w,rd.h,"#c7c8c4");
  rect(rd.x+5,rd.y+5,rd.w-10,rd.h-10,"#777c7b");
  rect(rd.x+10,rd.y+10,rd.w-20,rd.h-20,"#454b4c");
  // Разная фактура асфальта: заплаты, швы, трещины и выцветшие участки.
  for(let p=0;p<Math.floor(rd.w/170)+2;p++){
    const px=rd.x+28+p*137;
    const py=rd.y+24+((p*47)%Math.max(20,rd.h-48));
    rect(px,py,34+(p%3)*12,3,"rgba(95,91,84,.32)");
    rect(px+7,py+3,18,2,"rgba(25,29,30,.28)");
  }
  if(rd.w>rd.h){
    rect(rd.x+12,rd.y+rd.h*.5-2,rd.w-24,4,"#9c925b");
    for(let xx=rd.x+24;xx<rd.x+rd.w-24;xx+=70)rect(xx,rd.y+rd.h*.5-2,34,4,"#d6ca7b");
  }else{
    rect(rd.x+rd.w*.5-2,rd.y+12,4,rd.h-24,"#9c925b");
    for(let yy=rd.y+24;yy<rd.y+rd.h-24;yy+=70)rect(rd.x+rd.w*.5-2,yy,4,34,"#d6ca7b");
  }
 }

 // Тротуары.
 const sidewalks=[
  {x:0,y:385,w:1500,h:15},{x:0,y:516,w:1500,h:15},
  {x:588,y:0,w:15,h:1180},{x:724,y:0,w:15,h:1180},
  {x:0,y:842,w:610,h:15},{x:0,y:954,w:610,h:15},
  {x:105,y:197,w:505,h:13},{x:724,y:197,w:776,h:13},
  {x:724,y:669,w:776,h:13},{x:724,y:748,w:776,h:13},
  {x:170,y:500,w:440,h:12},{x:170,y:577,w:440,h:12}
 ];
 for(const q of sidewalks){
  rect(q.x,q.y,q.w,q.h,"#d7d7d2");
  for(let yy=q.y+2;yy<q.y+q.h;yy+=7)
    for(let xx=q.x+2;xx<q.x+q.w;xx+=27)
      rect(xx,yy,20,3,((xx+yy)/7)%2?"#b9bbb8":"#e5e3dc");
 }

 // Переходы.
 const crossings=[
  {x:540,y:398,w:42,h:116,vertical:true},
  {x:736,y:350,w:118,h:40,vertical:false},
  {x:736,y:850,w:118,h:40,vertical:false},
  {x:1110,y:510,w:118,h:40,vertical:false}
 ];
 for(const z of crossings){
  if(z.vertical)for(let yy=z.y;yy<z.y+z.h;yy+=16)rect(z.x,yy,z.w,8,"#e7e5de");
  else for(let xx=z.x;xx<z.x+z.w;xx+=16)rect(xx,z.y,8,z.h,"#e7e5de");
 }

 // Дворовые проезды.
 const lanes=[
  {x:292,y:225,w:58,h:155},{x:542,y:225,w:34,h:155},
  {x:1060,y:220,w:38,h:165},{x:292,y:748,w:58,h:125},
  {x:545,y:748,w:34,h:130},{x:1038,y:735,w:38,h:135},
  {x:1292,y:735,w:48,h:165},{x:650,y:792,w:78,h:165}
 ];
 for(const q of lanes){rect(q.x,q.y,q.w,q.h,"#9b9e99");rect(q.x+5,q.y+5,q.w-10,q.h-10,"#676b6a");}

 // Дворы, школа и спортзоны.
 rect(835,785,185,150,"#7e9a64");rect(850,800,155,120,"#73915c");rect(865,815,125,90,"#88a66c");
 rect(110,785,235,125,"#789363");rect(122,797,211,101,"#6e8958");
 rect(42,388,220,3,"#6f7a70"); // тонкий зелёный буфер перед магистралью

 // Ограждение школьного участка.
 const fenceX=18,fenceY=278,fenceW=560,fenceH=104;
 rect(fenceX,fenceY,fenceW,4,"#555e60");rect(fenceX,fenceY+fenceH-4,fenceW,4,"#555e60");
 for(let xx=fenceX;xx<=fenceX+fenceW;xx+=18)rect(xx,fenceY,3,fenceH,"#626b6d");
 rect(312,320,176,42,"#789062");rect(318,326,164,30,"#6c855b");line(400,326,400,356,"#d8d2bb",2);line(318,341,482,341,"#d8d2bb",2);rect(326,331,12,6,"#d8d2bb");rect(462,345,12,6,"#d8d2bb");

 // Архитектура — главный слой карты.
 for(let i=0;i<m.buildings.length;i++)drawSovietBuilding(m.buildings[i],i);

 // Дворовые композиции: советские площадки, стихийные тропинки и заросшие края.
 function drawYardPath(x:number,y:number,w:number,h:number){
   rect(x,y,w,h,"#b8a98a");
   rect(x+2,y+2,w-4,h-4,"#8c8977");
   for(let i=8;i<w-6;i+=15) rect(x+i,y+3+(i%7),8,2,"#c3b99f");
 }
 function drawBush(x:number,y:number,s:number){
   ellipse(x,y+10*s,15*s,10*s,"#315d38");
   ellipse(x-9*s,y,12*s,11*s,"#3b7040");
   ellipse(x+9*s,y+1*s,13*s,12*s,"#35673b");
   ellipse(x,y-7*s,12*s,10*s,"#477c45");
 }
 function drawPlayground(cx:number,cy:number,variant:number){
   // Песочная зона.
   rect(cx-68,cy+22,136,54,"#625a4d");
   rect(cx-63,cy+26,126,46,variant%2?"#c5aa72":"#c9b27b");
   rect(cx-58,cy+30,116,38,"#d1bb85");
   // Старая советская горка.
   rect(cx-53,cy-44,4,67,"#3e6265");
   rect(cx-35,cy-44,4,67,"#7a4940");
   rect(cx-53,cy-47,23,4,"#a56b3e");
   rect(cx-49,cy-39,18,3,"#5e7d81");
   for(let yy=cy-28;yy<cy-3;yy+=8)rect(cx-51,yy,19,3,"#4e5f61");
   poly([cx-31,cy-7,cx-4,cy-7,cx+19,cy+32,cx-8,cy+32],"#668a92");
   line(cx-27,cy-3,cx-2,cy-3,"#c2b6a0",2);
   // Качели.
   rect(cx+34,cy-39,4,63,"#466a6c");rect(cx+80,cy-39,4,63,"#466a6c");
   rect(cx+31,cy-42,56,5,"#a15d42");
   line(cx+45,cy-37,cx+45,cy+10,"#6c7775",2);line(cx+70,cy-37,cx+70,cy+10,"#6c7775",2);
   rect(cx+39,cy+10,12,5,"#7a493c");rect(cx+64,cy+10,12,5,"#7a493c");
   // Турник.
   rect(cx-88,cy-38,4,47,"#526d70");rect(cx-62,cy-38,4,47,"#526d70");
   rect(cx-90,cy-42,31,4,"#9b6641");
   for(let xx=cx-84;xx<cx-63;xx+=7)line(xx,cy-38,xx,cy-22,"#597276",2);
   // Карусель.
   ellipse(cx+8,cy+56,29,9,"#454d4d");
   ellipse(cx+8,cy+53,25,7,"#9a7848");
   rect(cx+6,cy+33,4,23,"#4f696c");
   line(cx-15,cy+49,cx+30,cy+49,"#546d70",2);
   line(cx-7,cy+40,cx+23,cy+57,"#546d70",2);
   line(cx+22,cy+40,cx-8,cy+57,"#546d70",2);
   // Лавка.
   rect(cx-88,cy+88,48,5,"#744a31");rect(cx-82,cy+94,5,12,"#4b3b30");rect(cx-47,cy+94,5,12,"#4b3b30");
   // Трещины и вытоптанные места.
   line(cx-62,cy+78,cx-37,cy+84,"#55534b",2);
   line(cx+45,cy+78,cx+70,cy+83,"#55534b",2);
 }
 // Два разных двора: не зеркальные, чтобы квартал не выглядел процедурным.
 drawYardPath(100,756,120,8);drawYardPath(212,756,8,38);drawYardPath(220,790,76,8);
 drawPlayground(185,790,0);
 drawYardPath(820,758,112,8);drawYardPath(925,758,8,34);drawYardPath(932,790,86,8);
 drawPlayground(910,795,1);

 // Заросшие края дворов — кусты и высокая трава.
 const shrubs=[
   [82,760,1.0],[102,810,.8],[118,835,1.15],[286,760,.9],[300,815,1.1],[285,840,.8],
   [780,765,.9],[805,815,1.15],[810,840,.8],[1008,760,1.0],[1018,812,.9],[1005,840,1.2],
   [555,770,.8],[575,815,1.0],[690,770,.9],[705,815,.8]
 ] as [number,number,number][];
 for(const [x,y,s] of shrubs)drawBush(x,y,s);

 // Старые фонари во дворах.
 const yardLamps=[[92,775],[325,780],[785,780],[1045,780],[565,790],[700,790]];
 for(const [x,y] of yardLamps){
   rect(x-2,y-25,4,27,"#343b3c");
   rect(x-7,y-30,14,5,"#252b2d");
   rect(x-4,y-34,8,4,"#d3bd70");
 }

 // Маленькие хозяйственные зоны: контейнеры и металлические ограждения.
 const bins2=[[278,800],[315,835],[1008,800],[1045,835]];
 for(const [x,y] of bins2){
   rect(x,y,13,15,"#384447");rect(x+2,y-3,9,3,"#596365");
 }
 const railings=[[90,842,75],[1010,842,72]];
 for(const [x,y,w] of railings){
   line(x,y,x+w,y,"#657174",2);
   for(let xx=x;xx<=x+w;xx+=14)line(xx,y,xx,y-12,"#657174",2);
 }


 // Парковочные места.
 const parking=[
  // Парковочные карманы вдоль дорог, а не поверх домов.
  [185,238,4],[360,238,4],[835,238,5],[1110,238,5],[1370,238,3],
  [105,525,4],[245,525,4],[760,700,4],[900,700,4],[1080,700,4],[1305,700,4],
  [70,920,4],[225,920,4],[760,920,4],[920,920,4],[1090,920,4],[1305,920,4]
 ];
 for(const [x,y,n] of parking)for(let i=0;i<n;i++){rect(x+i*31,y,2,25,"#b7b8b2");rect(x+i*31+2,y,24,2,"#b7b8b2");}

 // Машины.
 const cars=[
  [205,252,1,"#7a3f3f"],[385,252,-1,"#49606b"],[865,252,1,"#8a7445"],[1140,252,-1,"#52636a"],[1400,252,1,"#6d5448"],
  [125,540,1,"#596c54"],[275,540,-1,"#7a5544"],
  [790,710,1,"#5c6475"],[930,710,-1,"#7b6845"],[1110,710,1,"#56666a"],[1330,710,-1,"#6e5b68"],
  [95,930,1,"#7b4c45"],[250,930,-1,"#6d6349"],[790,930,1,"#4f6269"],[950,930,-1,"#765448"],[1115,930,1,"#596c54"],[1335,930,-1,"#52636a"]
 ] as [number,number,number,string][];
 for(const [x,y,dir,color] of cars){
  ctx!.save();ctx!.translate(x,y);if(dir<0)ctx!.scale(-1,1);
  rect(-25,-11,50,22,"#252d30");rect(-17,-16,29,8,"#34484c");
  rect(-12,-13,11,5,color);rect(2,-13,10,5,"#64858a");
  rect(-20,7,9,7,"#151a1c");rect(12,7,9,7,"#151a1c");
  rect(22,-4,3,6,"#d7c66d");rect(-26,-4,3,6,"#8c4a3e");
  ctx!.restore();
 }

 // Деревья. Кроны не одинаковые.
 const trees=[
  [28,35,1],[345,25,0],[585,85,2],[760,25,1],[1080,25,0],[1460,30,2],
  [30,275,0],[330,275,2],[575,275,1],[785,275,0],[1070,275,2],[1460,275,1],
  [25,545,1],[300,540,0],[570,535,2],[765,535,1],[1055,535,0],[1460,535,2],
  [28,742,2],[65,835,1],[330,770,0],[555,790,2],[748,742,1],[1045,770,0],[1280,840,2],[1460,790,1],
  [28,955,1],[325,940,2],[585,965,0],[750,955,1],[1060,945,2],[1450,940,0],
  [30,1140,2],[620,1120,1],[750,1140,0],[1080,1140,2],[1450,1140,1]
 ] as [number,number,number][];
 for(const [x,y,v] of trees){
  const s=1+v*.12;
  const species=(Math.round(x+y)%5);
  ellipse(x+8,y+39*s,28*s,8*s,"rgba(18,31,20,.28)");
  if(species===0||species===1){
    // Берёза/тополь — высокий силуэт, характерный для дворов.
    rect(x-3,y-1,6,40*s,"#624733");
    rect(x-1,y+8,3,28*s,"#9a8061");
    ellipse(x,y-12*s,15*s,28*s,"#376f3f");
    ellipse(x-10*s,y-2*s,13*s,23*s,"#467f45");
    ellipse(x+10*s,y-3*s,13*s,24*s,"#3d7742");
    ellipse(x,y-28*s,10*s,18*s,"#548a4c");
  }else{
    rect(x-5,y+4,10,36*s,"#67442c");
    rect(x-1,y+7,4,28*s,"#8a6847");
    ellipse(x,y-1*s,29*s,22*s,"#2e6f3b");
    ellipse(x-17*s,y-7*s,18*s,18*s,"#3e8144");
    ellipse(x+17*s,y-7*s,18*s,18*s,"#34783f");
    ellipse(x,y-22*s,19*s,16*s,"#4a8a4b");
  }
 }

 // Городские мелочи.
 const lamps=[[575,375],[770,375],[575,540],[770,540],[575,780],[770,780],[1060,780],[350,935],[920,935]];
 for(const [x,y] of lamps){rect(x-2,y-22,4,25,"#333a3b");rect(x-8,y-27,16,5,"#252b2d");rect(x-5,y-31,10,4,"#dfc96e");}
 const benches=[[405,215],[875,215],[405,765],[1040,765],[375,945],[895,945]];
 for(const [x,y] of benches){rect(x,y,42,5,"#70482e");rect(x+4,y+7,5,12,"#4a3a2d");rect(x+33,y+7,5,12,"#4a3a2d");}
 const bins=[[395,235],[900,235],[395,750],[1020,750],[350,935],[920,935]];
 for(const [x,y] of bins)rect(x,y,10,13,"#394447");

 // Остановка.
 rect(1370,340,72,44,"#4b5658");rect(1376,346,60,30,"#a0aaa5");rect(1380,350,52,22,"#6d8585");
 rect(1372,380,68,5,"#31393a");rect(1390,365,10,4,"#e3d8a3");rect(1412,365,10,4,"#e3d8a3");
 rect(1384,350,3,22,"#53686a");rect(1428,350,3,22,"#53686a");

 tx("ГВАРДЕЙСКИЙ КВАРТАЛ",750,24,18,"#f0eee7","center");
 tx("ЖИЛОЙ МАССИВ · ШКОЛА · ДВОРЫ · ТРАНСПОРТ",750,46,10,"#c4c9c7","center");
}
function drawTopDownBackground(){
 const m=topDownMap();
 rect(0,0,m.w,m.h,"#738b61");

 // Natural grass instead of a uniform green plane.
 for(let i=0;i<1250;i++){
   const x=(i*97+floor*13)%m.w,y=(i*53+floor*7)%m.h;
   const len=2+(i%5), alpha=.10+(i%4)*.035;
   line(x,y,x+(i%3)-1,y-len,"rgba(42,72,42,"+alpha+")",1);
   if(i%17===0)ellipse(x,y,2,1,"rgba(155,150,93,.22)");
 }

 // Asphalt with concrete curbs and imperfect surface.
 for(const rd of m.roads){
   rect(rd.x-3,rd.y-3,rd.w+6,rd.h+6,"#aeb2ae");
   rect(rd.x,rd.y,rd.w,rd.h,"#6f7574");
   rect(rd.x+7,rd.y+7,Math.max(1,rd.w-14),Math.max(1,rd.h-14),"#3e4445");

   const patches=Math.max(3,Math.floor(rd.w/125));
   for(let p=0;p<patches;p++){
     const px=rd.x+18+(p*137)%Math.max(20,rd.w-50);
     const py=rd.y+18+(p*43)%Math.max(20,rd.h-45);
     rect(px,py,24+(p%4)*11,3,"rgba(105,103,96,.30)");
     line(px+4,py+3,px+18,py+7,"rgba(25,29,29,.32)",1);
   }
   if(rd.w>rd.h){
     rect(rd.x+10,rd.y+rd.h*.5-2,rd.w-20,4,"#91895a");
     for(let x=rd.x+20;x<rd.x+rd.w-20;x+=72)rect(x,rd.y+rd.h*.5-2,35,4,"#c8bd72");
   }else{
     rect(rd.x+rd.w*.5-2,rd.y+10,4,rd.h-20,"#91895a");
     for(let y=rd.y+20;y<rd.y+rd.h-20;y+=72)rect(rd.x+rd.w*.5-2,y,4,35,"#c8bd72");
   }
 }

 // Sidewalks: slab seams, curb stones and worn edges.
 const sidewalks=[
  {x:0,y:385,w:1500,h:15},{x:0,y:516,w:1500,h:15},
  {x:588,y:0,w:15,h:1180},{x:724,y:0,w:15,h:1180},
  {x:0,y:842,w:610,h:15},{x:0,y:954,w:610,h:15},
  {x:105,y:197,w:505,h:13},{x:724,y:197,w:776,h:13},
  {x:724,y:669,w:776,h:13},{x:724,y:748,w:776,h:13},
  {x:170,y:500,w:440,h:12},{x:170,y:577,w:440,h:12}
 ];
 for(const q of sidewalks){
   rect(q.x,q.y,q.w,q.h,"#c6c8c3");
   for(let x=q.x+4;x<q.x+q.w;x+=32)rect(x,q.y+2,22,3,"#e1dfd7");
   for(let y=q.y+7;y<q.y+q.h;y+=7)line(q.x,y,q.x+q.w,y,"rgba(120,125,123,.28)",1);
 }

 // Crosswalks.
 const crossings=[
  {x:540,y:398,w:42,h:116,v:1},{x:736,y:350,w:118,h:40,v:0},
  {x:736,y:850,w:118,h:40,v:0},{x:1110,y:510,w:118,h:40,v:0}
 ];
 for(const z of crossings){
   if(z.v)for(let y=z.y;y<z.y+z.h;y+=15)rect(z.x,y,z.w,7,"#e4e1d8");
   else for(let x=z.x;x<z.x+z.w;x+=15)rect(x,z.y,7,z.h,"#e4e1d8");
 }

 // Courtyard grass is brighter and more overgrown.
 rect(110,785,235,125,"#829b68");rect(122,797,211,101,"#789260");
 rect(835,785,185,150,"#849e6a");rect(850,800,155,120,"#799460");
 for(let i=0;i<160;i++){
   const side=i%2,x=(side?850:120)+(i*29)%150,y=(side?800:795)+(i*17)%105;
   line(x,y,x+(i%3)-1,y-3,"rgba(45,76,43,.32)",1);
 }

 // Narrow worn paths.
 const path=(x:number,y:number,w:number,h:number)=>{
   rect(x,y,w,h,"#9a8f76");rect(x+2,y+2,w-4,h-4,"#aaa084");
   for(let i=4;i<w;i+=17)rect(x+i,y+2+(i%5),8,2,"#c1b595");
 };
 path(100,756,120,8);path(212,756,8,38);path(220,790,76,8);
 path(820,758,112,8);path(925,758,8,34);path(932,790,86,8);

 // School yard / sports markings.
 rect(312,320,176,42,"#718b5c");rect(318,326,164,30,"#698355");
 line(400,326,400,356,"#d7d1bd",2);line(318,341,482,341,"#d7d1bd",2);

 // Architecture.
 for(let i=0;i<m.buildings.length;i++)drawSovietBuilding(m.buildings[i],i);

 function bush(x:number,y:number,s:number){
   ellipse(x+3,y+13*s,16*s,7*s,"rgba(25,42,27,.25)");
   ellipse(x,y,13*s,10*s,"#315e37");
   ellipse(x-9*s,y+2*s,10*s,9*s,"#3b6e3e");
   ellipse(x+10*s,y+1*s,11*s,10*s,"#3a6a3c");
   ellipse(x-2*s,y-6*s,9*s,8*s,"#477746");
 }
 function yardTree(x:number,y:number,s:number,top=false){
   ellipse(x+5,y+27*s,19*s,6*s,"rgba(23,38,25,.24)");
   rect(x-2*s,y-2*s,4*s,30*s,"#60432f");
   rect(x,y+4*s,2*s,20*s,"#8a6847");
   // irregular foliage rather than the previous circular blobs
   ellipse(x,y-7*s,16*s,15*s,"#326b3c");
   ellipse(x-11*s,y-2*s,11*s,12*s,"#3d7b42");
   ellipse(x+11*s,y-1*s,12*s,13*s,"#397440");
   ellipse(x-4*s,y-16*s,10*s,12*s,"#4c8548");
   if(top)ellipse(x+5*s,y-18*s,7*s,10*s,"#578d4e");
 }
 function drawPlayground(cx:number,cy:number,variant:number){
   rect(cx-68,cy+22,136,54,"#71634e");
   rect(cx-63,cy+26,126,46,"#c6ad78");
   for(let i=0;i<20;i++){
     const sx=cx-58+(i*31)%116,sy=cy+31+(i*17)%35;
     ellipse(sx,sy,1.5,1,"rgba(100,81,53,.28)");
   }
   // rusty slide
   rect(cx-53,cy-44,4,67,"#5e6260");rect(cx-35,cy-44,4,67,"#8a4e39");
   rect(cx-53,cy-47,23,4,"#a55f3b");
   for(let yy=cy-28;yy<cy-3;yy+=8)rect(cx-51,yy,19,3,"#526568");
   poly([cx-31,cy-7,cx-4,cy-7,cx+19,cy+32,cx-8,cy+32],"#607f86");
   line(cx-27,cy-3,cx-2,cy-3,"#b9ae98",2);
   // swing set
   rect(cx+34,cy-39,4,63,"#52666a");rect(cx+80,cy-39,4,63,"#52666a");
   rect(cx+31,cy-42,56,5,"#9a593f");
   line(cx+45,cy-37,cx+45,cy+10,"#717b79",2);line(cx+70,cy-37,cx+70,cy+10,"#717b79",2);
   rect(cx+39,cy+10,12,5,"#70473a");rect(cx+64,cy+10,12,5,"#70473a");
   // horizontal bars
   rect(cx-88,cy-38,4,47,"#596b6c");rect(cx-62,cy-38,4,47,"#596b6c");
   rect(cx-90,cy-42,31,4,"#8f5d40");
   for(let xx=cx-84;xx<cx-63;xx+=7)line(xx,cy-38,xx,cy-22,"#607477",2);
   // carousel
   ellipse(cx+8,cy+56,29,9,"#4b504e");ellipse(cx+8,cy+53,25,7,"#92764b");
   rect(cx+6,cy+33,4,23,"#53696b");
   line(cx-15,cy+49,cx+30,cy+49,"#53696b",2);line(cx-7,cy+40,cx+23,cy+57,"#53696b",2);line(cx+22,cy+40,cx-8,cy+57,"#53696b",2);
   // bench
   rect(cx-88,cy+88,48,5,"#744a31");rect(cx-82,cy+94,5,12,"#4b3b30");rect(cx-47,cy+94,5,12,"#4b3b30");
 }
 drawPlayground(185,790,0);drawPlayground(910,795,1);

 const shrubs=[
  [82,760,1],[102,810,.8],[118,835,1.15],[286,760,.9],[300,815,1.1],[285,840,.8],
  [780,765,.9],[805,815,1.15],[810,840,.8],[1008,760,1],[1018,812,.9],[1005,840,1.2],
  [555,770,.8],[575,815,1],[690,770,.9],[705,815,.8]
 ] as [number,number,number][];
 for(const [x,y,z] of shrubs)bush(x,y,z);

 // Tree lines and courtyard trees.
 const trees=[
  [28,35,1,1],[345,25,.85,0],[585,85,.9,1],[760,25,1,1],[1080,25,.9,0],[1460,30,.9,1],
  [30,275,.9,0],[330,275,1,1],[575,275,.8,0],[785,275,.9,1],[1070,275,1,0],[1460,275,.9,1],
  [25,545,.9,0],[300,540,.8,1],[570,535,.9,0],[765,535,.9,1],[1055,535,.8,0],[1460,535,.9,1],
  [65,835,.75,0],[330,770,.8,1],[555,790,.75,0],[748,742,.85,1],[1045,770,.8,0],[1280,840,.7,1],
  [28,955,.9,1],[325,940,.8,0],[585,965,.85,1],[750,955,.9,0],[1060,945,.8,1],[1450,940,.9,0],
  [30,1140,.9,1],[620,1120,.8,0],[750,1140,.85,1],[1080,1140,.8,0],[1450,1140,.9,1]
 ] as [number,number,number,number][];
 for(const [x,y,z,t] of trees)yardTree(x,y,z,!!t);

 // Cars: compact old sedans, not oversized blocks.
 const cars=[
  [205,252,1,"#7b413b"],[385,252,-1,"#52666d"],[865,252,1,"#8b7648"],[1140,252,-1,"#56676c"],[1400,252,1,"#705348"],
  [125,540,1,"#5d7059"],[275,540,-1,"#765143"],[790,710,1,"#59656b"],[930,710,-1,"#806d49"],
  [1110,710,1,"#5c6d5d"],[1330,710,-1,"#6c5963"],[95,930,1,"#74463e"],[250,930,-1,"#6b624c"],
  [790,930,1,"#50636b"],[950,930,-1,"#755348"],[1115,930,1,"#5b6c5d"],[1335,930,-1,"#53656b"]
 ] as [number,number,number,string][];
 for(const [x,y,dir,color] of cars){
   ctx!.save();ctx!.translate(x,y);if(dir<0)ctx!.scale(-1,1);
   ellipse(0,9,27,5,"rgba(20,23,23,.35)");
   rect(-25,-9,50,18,"#292f31");rect(-16,-14,28,8,"#35494d");
   rect(-12,-11,10,5,color);rect(1,-11,10,5,"#6c8588");
   rect(-20,6,9,7,"#171b1d");rect(12,6,9,7,"#171b1d");
   rect(22,-3,3,5,"#d2bd72");rect(-26,-3,3,5,"#87443b");
   ctx!.restore();
 }

 // Street furniture and utilitarian details.
 const lamps=[[575,375],[770,375],[575,540],[770,540],[575,780],[770,780],[1060,780],[350,935],[920,935]];
 for(const [x,y] of lamps){rect(x-2,y-22,4,25,"#333a3b");rect(x-7,y-28,14,5,"#242a2b");rect(x-4,y-32,8,4,"#d4bf70");}
 const benches=[[405,215],[875,215],[405,765],[1040,765],[375,945],[895,945]];
 for(const [x,y] of benches){rect(x,y,42,5,"#744a31");rect(x+4,y+7,5,12,"#4a3a2d");rect(x+33,y+7,5,12,"#4a3a2d");}
 const bins=[[395,235],[900,235],[395,750],[1020,750],[350,935],[920,935]];
 for(const [x,y] of bins){rect(x,y,10,13,"#3c4849");rect(x+1,y-2,8,2,"#5b6667");}

 // Bus stop at the eastern edge.
 rect(1370,340,72,44,"#4d595a");rect(1376,346,60,30,"#899694");rect(1380,350,52,22,"#617879");
 rect(1372,380,68,5,"#303738");rect(1390,365,10,4,"#d8ca94");rect(1412,365,10,4,"#d8ca94");

 tx("ГВАРДЕЙСКИЙ КВАРТАЛ",750,24,18,"#ecebe4","center");
 tx("ЖИЛОЙ МАССИВ · ШКОЛА · ДВОРЫ · ГАРАЖИ",750,46,10,"#c4c9c5","center");
}
function drawWorld(m:Mission){
 if(!ctx)return;
 const map=topDownMap(),scale=Math.max(.78,Math.min(1.35,Math.min(viewWidth/430,viewHeight/820)));
 const camX=clamp(player.x-viewWidth/(2*scale),0,map.w-viewWidth/scale);
 const camY=clamp(player.y-viewHeight/(2*scale),0,map.h-viewHeight/scale);
 ctx.save();ctx.scale(scale,scale);ctx.translate(-camX,-camY);
 drawTopDownBackground();
 const [exitX,exitY]=topDownExit();
 rect(exitX-24,exitY-24,48,48,"#151d21");rect(exitX-17,exitY-17,34,34,hero().color);
 tx("ВЫХОД",exitX,exitY-38,14,"#f0eee7","center");
 enemies.forEach(drawEnemy);drawPlayer();
 bullets.forEach(b=>{rect(b.x-3,b.y-3,Math.max(6,portraitScale()*4),Math.max(4,portraitScale()*3),b.from==="player"?hero().color:"#d86c35");});
 ctx.restore();drawHudOverlay(m);drawSpeech();
 if(flash>0){rect(0,0,viewWidth,viewHeight,"rgba(255,255,255,"+Math.min(.18,flash)+")");flash-=.02;}
}
function enemyVisual(type:EnemyType):MafiaVisual{
 const suits:Record<EnemyType,string>={brawler:"#30242a",shooter:"#26323a",heavy:"#40352a",rusher:"#3a2024",guard:"#28342e",sniper:"#302a40",suppressor:"#403323",flanker:"#26313d"};
 const ties:Record<EnemyType,string>={brawler:"#b94f46",shooter:"#6d8790",heavy:"#c58b48",rusher:"#a94c42",guard:"#68776f",sniper:"#75658d",suppressor:"#9b7546",flanker:"#6d7e92"};
 return {face:"#9a6554",tie:ties[type],suit:suits[type]};
}
function drawEnemy(e:Enemy){
 const v=enemyVisual(e.type),sc=Math.max(.32,Math.min(.42,viewWidth/1700));
 drawMafiaMember(v,e.x,e.y,frame,sc);
 if(!e.falling){
   const bw=30*sc;
   rect(e.x-bw/2,e.y-82*sc,bw,3*sc,"#20282c");
   rect(e.x-bw/2,e.y-82*sc,bw*clamp(e.hp/e.maxHp,0,1),3*sc,v.tie);
 }
}
function drawWeaponSprite(kind:number,handX:number,handY:number,angle:number,sc:number){
 if(!ctx)return;
 // Чисто визуальный слой: стилизованный пиксельный силуэт без изменения игровой логики.
 const lengths=[20,23,27,30,28,32];
 const bodies=[7,7,6,7,9,7];
 const length=lengths[kind]||22;
 const body=bodies[kind]||7;
 ctx.save();
 ctx.translate(handX,handY);
 ctx.rotate(angle);
 // Тень/контур
 rect(-5,-body/2-2,length+9,body+4,"#101417");
 // Основной корпус
 const metal=kind===2?"#6e7477":kind===4?"#7d6750":"#596368";
 rect(0,-body/2,length,body,metal);
 // Верхняя линия и передняя часть
 rect(4,-body/2-2,Math.max(8,length-9),2,"#aeb5b6");
 rect(length-4,-body/2-1,5,body+2,"#20272a");
 // Рукоять
 const gripX=Math.max(4,Math.min(length-5,kind===4?9:11));
 poly([gripX,-body/2+1,gripX+7,-body/2+1,gripX+5,body+5,gripX-2,body+3],"#24292b");
 // Небольшая цветовая маркировка выбранного предмета
 rect(5,0,Math.min(8,length-8),2,hero().color);
 // Дульная часть
 rect(length-1,-1,4,2,"#161b1e");
 ctx.restore();
}
function drawPlayer(){
 const x=player.x,y=player.y,sc=Math.max(.38,Math.min(.50,viewWidth/1450));
 drawMafiaMember(heroVisual(),x,y,frame,sc);

 // Оружие рисуется отдельным слоем и всегда привязано к кисти.
 const handX=x+player.facing*29*sc;
 const handY=y-44*sc;
 const angle=aimAngle;
 drawWeaponSprite(save.weapon,handX,handY,angle,sc);

 if(player.ability>0)tx(hero().ability,x,y-104*sc,Math.max(11,7*sc),hero().color,"center");
}
function spawnFloor(){
 floorTimer=0;objectiveProgress=0;bullets=[];enemies=[];
 const types=currentMission().enemies;
 const spots=[[450,410],[500,560],[820,300],[1040,410],[520,760],[1010,720],[250,420],[1180,360]];
 for(let i=0;i<Math.min(spots.length,2+floor+2);i++){
  const type=types[i%types.length],hp=18+(i%3)*12+(save.rank*3),[x,y]=spots[i];
  enemies.push({type,x,y,hp,maxHp:hp,vx:0,vy:0,cool:30+i*9,shootCool:70+i*13,dir:i%2?1:-1});
 }
 player={x:420,y:400,vx:0,vy:0,hp:100+save.armor*5,maxHp:100+save.armor*5,armor:save.armor*5,ammo:weapons[save.weapon].mag,cool:0,ability:0,weaponSwap:0,facing:1,grounded:true};
}
function fire(){
 if(mode!=="play"||player.cool>0)return;
 const w=weapons[save.weapon];
 if(player.ammo<=0){player.ammo=w.mag;player.cool=12;return;}
 player.ammo--;player.cool=w.rate;
 const scale=portraitScale();
 const speed=7*scale;
 const handX=player.x+player.facing*29*scale;
 const handY=player.y-44*scale;
 bullets.push({x:handX,y:handY,vx:Math.cos(aimAngle)*speed,vy:Math.sin(aimAngle)*speed,from:"player",life:100});
}
function switchWeapon(){
 if(mode!=="play"||player.weaponSwap>0)return;
 save.weapon=(save.weapon+1)%weapons.length;
 player.ammo=weapons[save.weapon].mag;
 player.weaponSwap=120;
 storeSave();
}
function useAbility(){
 if(mode!=="play"||player.ability>0)return;
 player.ability=300;
 const h=hero().id;
 if(h==="antonio"){
   enemies.forEach(e=>{e.cool=Math.max(e.cool,110);e.shootCool=Math.max(e.shootCool,110);});
 }else if(h==="massimo"){
   player.vx=player.facing*10;
   player.vy=-6.5*portraitScale();
 }else if(h==="salvatore"){
   enemies.forEach(e=>{e.vx*=.15;e.shootCool=Math.max(e.shootCool,150);});
 }else if(h==="giuseppe"){
   player.armor=Math.max(player.armor,player.maxHp*.35);
 }
}
function hurt(amount:number){
 const blocked=Math.min(player.armor,amount*.5);player.armor-=blocked;player.hp-=amount-blocked;flash=.15;
 if(player.hp<=0){player.hp=player.maxHp;player.armor=save.armor*5;spawnFloor();}
}

function update(dt:number){
 frame++;speechCooldown=Math.max(0,speechCooldown-dt);if(speech)speech.timer-=dt;
 if(mode==="play"&&frame%420===0){const lines=heroLines[selected||"antonio"];say(lines[Math.floor(Math.random()*lines.length)],"player",player.x,player.y-45);}
 player.cool=Math.max(0,player.cool-dt);player.ability=Math.max(0,player.ability-dt);player.weaponSwap=Math.max(0,player.weaponSwap-dt);
 const scale=Math.max(.78,Math.min(1.35,Math.min(viewWidth/430,viewHeight/820))),speed=3.2*scale;
 if(Math.abs(moveX)>.12||Math.abs(moveY)>.12){
  const len=Math.hypot(moveX,moveY)||1,moved=moveTopDown(player.x,player.y,(moveX/Math.max(1,len))*speed,(moveY/Math.max(1,len))*speed,18*scale);
  player.x=moved[0];player.y=moved[1];
  if(Math.abs(moveX)>.12)player.facing=moveX<0?-1:1;
 }
 if(mode==="play")fire();if(touch.ability)useAbility();
 for(const b of bullets){b.x+=b.vx;b.y+=b.vy;b.life-=dt;if(b.from==="enemy"&&Math.abs(b.x-player.x)<18*scale&&Math.abs(b.y-player.y)<24*scale){b.life=0;hurt(7);}}
 bullets=bullets.filter(b=>b.life>0&&b.x>-30&&b.x<topDownMap().w+30&&b.y>-30&&b.y<topDownMap().h+30);
 for(const e of enemies){
  if(e.falling){e.vy+=.5*scale*dt;e.y+=e.vy*dt;continue;}
  e.cool-=dt;e.shootCool-=dt;
  const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy)||1;
  if(e.type==="rusher"||e.type==="brawler"||e.type==="flanker"){
   const q=moveTopDown(e.x,e.y,dx/dist*(e.type==="rusher"?1:.55)*scale,dy/dist*(e.type==="rusher"?1:.55)*scale,15*scale);e.x=q[0];e.y=q[1];
  }else if(dist<260*scale){
   const q=moveTopDown(e.x,e.y,dx/dist*.22*scale,dy/dist*.22*scale,15*scale);e.x=q[0];e.y=q[1];
  }
  if((e.type==="shooter"||e.type==="sniper"||e.type==="suppressor")&&e.shootCool<=0){
   e.shootCool=e.type==="suppressor"?28:65;
   bullets.push({x:e.x,y:e.y,vx:dx/dist*3.2*scale,vy:dy/dist*3.2*scale,from:"enemy",life:110});
  }
  if(dist<30*scale&&e.cool<=0){e.cool=55;hurt(e.type==="heavy"?12:7);say(enemyLines[Math.floor(Math.random()*enemyLines.length)],"enemy",e.x,e.y-35);}
 }
 for(const b of bullets)if(b.from==="player")for(const e of enemies)if(!e.falling&&Math.abs(b.x-e.x)<22*scale&&Math.abs(b.y-e.y)<24*scale){
  e.hp-=weapons[save.weapon].damage;b.life=0;if(e.hp<=0){e.falling=true;e.vy=-4.5*scale;save.money+=25;save.xp+=18;}
 }
 enemies=enemies.filter(e=>!e.falling||e.y<topDownMap().h+80);if(enemies.length===0)objectiveProgress=1;
 floorTimer+=dt;
 const [exitX,exitY]=topDownExit(),m=currentMission(),reachedExit=Math.hypot(player.x-exitX,player.y-exitY)<42*scale;
 const objectiveDone=m.objective==="reach"?reachedExit:objectiveProgress>=1||(m.objective==="survive"&&floorTimer>900);
 if(objectiveDone){if(floor<2){floor++;if(selected){save.resumeFloor={...(save.resumeFloor||{}),[selected]:floor};storeSave();}spawnFloor();}else completeMission();}
}
function completeMission(){
 mode="result";const m=currentMission();save.money+=m.reward;save.xp+=m.xp;
 if(!save.completed.includes(m.id))save.completed.push(m.id);
 save.rank=rank();
 const h=selected;
 if(h){const next=missionIndexForHero(h);setResumeMission(next,0);}
 dialogueIndex=0;dialogueOpen=true;storeSave();render();
}
function nextMission(){
 const h=selected!;missionIndex=missionIndexForHero(h);
 if(missionIndex<0)missionIndex=0;
 setResumeMission(missionIndex,0);
 mode="briefing";dialogueIndex=0;dialogueOpen=true;
}
function beginSelected(){
 const h=selected;if(!h)return;
 save.hero=h;save.rank=rank();missionIndex=missionIndexForHero(h);
 if(storySeen(h)){
   floor=Math.max(0,Math.min(2,save.resumeFloor?.[h]??0));
   mode="play";dialogueOpen=false;spawnFloor();saveResumeState();
 }else{
   mode="family";dialogueIndex=0;dialogueOpen=false;
 }
 storeSave();
}
function advanceDialogue(){
 const m=currentMission();
 if(mode==="shop"){mode="play";dialogueOpen=false;return;}
 if(mode==="family"){
   if(selected)markStorySeen(selected);
   floor=Math.max(0,Math.min(2,save.resumeFloor?.[selected!]??0));
   mode="play";dialogueOpen=false;spawnFloor();saveResumeState();return;
 }
 if(mode==="result"){
   dialogueOpen=false;
   if(m.number===1){
     mode="select";selected=null;save.hero=null;storeSave();
   }else{
     nextMission();
   }
   return;
 }
 if(!dialogueOpen){dialogueOpen=true;dialogueIndex=0;return;}
 dialogueIndex++;
 if(dialogueIndex>=m.dialogue.length){dialogueOpen=false;if(mode==="briefing"){mode="play";floor=0;spawnFloor();}else if(mode==="play"){}}
}
function missionForHero():Mission{const m=currentMission();return m;}
function startMissionById(id:string){
 const i=allMissions.findIndex(m=>m.id===id);if(i<0)return;
 missionIndex=i;const m=allMissions[i];
 if(m.hero!=="shared")selected=m.hero;
 save.hero=selected;
 save.storySeen=save.storySeen||{};
 if(selected)save.storySeen[selected]=true;
 floor=0;dialogueIndex=0;dialogueOpen=false;mode="play";
 spawnFloor();saveResumeState();storeSave();render();
}
function returnToMainMenu(){touch={left:false,right:false,jump:false,ability:false};movePointerId=null;moveX=0;moveY=0;aimActive=false;aimPointerId=null;mode="select";dialogueOpen=false;render();}
function activateCheatAll(){save.completed=allMissions.map(m=>m.id);save.money=999999;save.xp=999999;save.rank=rankNames.length-1;save.storySeen={antonio:true,massimo:true,salvatore:true,giuseppe:true};storeSave();mode="levels";dialogueOpen=false;render();}

function renderCanvas(){
 if(!ctx)return;
 resizeCanvas();
 const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,viewWidth,viewHeight);
 ctx.imageSmoothingEnabled=false;
 const m=currentMission();
 if(mode==="play"){
   // Игровой мир уже полностью рассчитывается в реальных portrait-координатах
   // текущего viewport. Старый масштаб 640x448 здесь больше не применяется.
   drawWorld(m);return;
 }
 if(mode==="select"){drawSelect();return;}
 if(mode==="levels"){drawLevels();return;}
 if(mode==="family"){drawFamily();return;}
 if(mode==="briefing"){drawBriefing();return;}
 if(mode==="shop"){drawShop();return;}
 if(mode==="result"){drawResult();return;}
}
function panel(x:number,y:number,w:number,h:number){rect(x,y,w,h,"rgba(8,11,13,.94)");rect(x,y,w,2,hero().color);rect(x,y+h-2,w,2,"#252e33");}
function menuTextSize(base:number,min:number,max:number){return Math.max(min,Math.min(max,viewWidth*base));}
function drawWrapped(text:string,x:number,y:number,maxChars:number,lineHeight:number,size:number,color:string,align:CanvasTextAlign="left"){
 const words=text.split(/\s+/);let line="";let row=0;
 for(const word of words){const next=line?line+" "+word:word;if(next.length>maxChars){tx(line,x,y+row*lineHeight,size,color,align);line=word;row++;}else line=next;}
 if(line)tx(line,x,y+row*lineHeight,size,color,align);
 return row+1;
}
function drawSelect(){
 const c=ctx;if(!c)return;
 const ids:HeroId[]=["antonio","massimo","salvatore","giuseppe"];
 const padX=viewWidth*.06,gapX=viewWidth*.04;
 const top=viewHeight*.17,gridH=viewHeight*.55,gapY=viewHeight*.018;
 const cardW=(viewWidth-padX*2-gapX)/2;
 const cardH=(gridH-gapY)/2;
 tx("ЧЕТЫРЕ СЫРА, МАЦЕРАРИЙ",viewWidth/2,viewHeight*.045,menuTextSize(.038,24,36),"#f0eee7","center");
 tx("ВЫБЕРИТЕ ПЕРСОНАЖА",viewWidth/2,viewHeight*.105,menuTextSize(.022,15,20),"#8e999d","center");
 ids.forEach((id,i)=>{
   const h=heroes[id],col=i%2,row=Math.floor(i/2);
   const x=padX+col*(cardW+gapX),y=top+row*(cardH+gapY),a=id===selected;
   rect(x,y,cardW,cardH,a?"#151d21":"#0b1013");
   rect(x,y,cardW,4,a?h.color:"#263137");

   // Карточка имеет жёсткие независимые зоны: заголовок → имя → персонаж → описание → способность.
   tx(h.family.toUpperCase(),x+cardW/2,y+18,menuTextSize(.014,11,16),a?"#f0eee7":"#aeb5b7","center");
   tx(h.name,x+cardW/2,y+44,menuTextSize(.018,13,20),h.color,"center");

   // Полная фигура живёт в собственной зоне: голова не режется клипом, ноги не уходят в описание.
   const avatarTop=y+cardH*.25;
   const avatarBottom=y+cardH*.76;
   const avatarZoneH=avatarBottom-avatarTop;
   const artScale=Math.max(.90,Math.min(1.08,cardW/270));
   const spin=performance.now()/1000*.42+i*.8;
   const spinX=.72+.28*Math.abs(Math.cos(spin));
   c.save();
   c.beginPath();
   c.rect(x+8,avatarTop,cardW-16,avatarZoneH);
   c.clip();
   c.translate(x+cardW/2,avatarBottom);
   c.scale(spinX,1);
   drawMafiaMember({face:h.face,tie:h.color,suit:"#20262b"},0,0,frame+i*4,artScale);
   c.restore();

   tx(familyText[h.family].desc,x+cardW/2,y+cardH*.84,menuTextSize(.011,8,13),h.color,"center");
   tx(h.ability,x+cardW/2,y+cardH*.92,menuTextSize(.010,8,12),"#aab1b4","center");
 });
}
function drawLevels(){
 rect(0,0,viewWidth,viewHeight,"#07090b");
 tx("ВЫБОР УРОВНЯ",viewWidth/2,viewHeight*.045,menuTextSize(.04,26,38),"#f0eee7","center");
 tx("ИСТОРИЯ · ЦЕЛЬ · ЭТАЖИ · НАГРАДА",viewWidth/2,viewHeight*.085,menuTextSize(.015,11,17),"#7e898d","center");
}
function drawFamily(){
 const h=hero();
 rect(0,0,viewWidth,viewHeight,"#07090b");
 const title=menuTextSize(.04,28,38);
 const familySize=menuTextSize(.052,34,52);
 const nameSize=menuTextSize(.028,20,30);
 tx("ИСТОРИЯ СЕМЬИ",viewWidth/2,viewHeight*.055,title,h.color,"center");
 tx(h.family.toUpperCase(),viewWidth/2,viewHeight*.135,familySize,"#f0eee7","center");
 tx(h.name,viewWidth/2,viewHeight*.205,nameSize,"#aab1b4","center");

 const maxChars=Math.max(25,Math.floor(viewWidth/14.5));
 const bodySize=menuTextSize(.025,18,26);
 const bodyLine=bodySize*1.38;
 const smallSize=menuTextSize(.022,16,23);
 const smallLine=smallSize*1.38;
 let y=viewHeight*.285;

 const introRows=drawWrapped(familyText[h.family].intro,viewWidth/2,y,maxChars,bodyLine,bodySize,"#f0eee7","center");
 y+=introRows*bodyLine+viewHeight*.055;

 const bioRows=drawWrapped(h.bio,viewWidth/2,y,maxChars,smallLine,smallSize,"#c2c7c8","center");
 y+=bioRows*smallLine+viewHeight*.06;

 tx("СПОСОБНОСТЬ · "+h.ability,viewWidth/2,y,menuTextSize(.025,18,26),h.color,"center");
 y+=menuTextSize(.025,18,26)*1.8;
 drawWrapped(h.abilityDesc,viewWidth/2,y,maxChars,smallLine,smallSize,"#aab1b4","center");
}
function drawBriefing(){
 const m=currentMission();rect(0,0,viewWidth,viewHeight,"#07090b");
 tx("МИССИЯ "+String(m.number).padStart(2,"0"),viewWidth*.07,viewHeight*.07,menuTextSize(.025,18,26),hero().color);
 tx(m.ru,viewWidth*.07,viewHeight*.15,menuTextSize(.042,28,44),"#f0eee7");
 tx("ЦЕЛЬ · "+objectiveRu(m.objective),viewWidth*.07,viewHeight*.28,menuTextSize(.024,17,25),hero().color);
 m.floors.forEach((f,i)=>{tx("ЭТАЖ "+(i+1),viewWidth*.07,viewHeight*(.36+i*.07),menuTextSize(.018,13,20),"#59656b");tx(floorRu(f),viewWidth*.20,viewHeight*(.355+i*.07),menuTextSize(.024,16,25),"#f0eee7");});
 tx("НАГРАДА  $"+m.reward+"   ОПЫТ "+m.xp,viewWidth*.07,viewHeight*.72,menuTextSize(.021,15,22),"#d9b86c");
 if(dialogueOpen)drawDialogue();
}
function drawDialogue(){
 const m=currentMission(),d=m.dialogue[Math.min(dialogueIndex,m.dialogue.length-1)];if(!d)return;
 const bubbleW=viewWidth*.86,bubbleH=Math.min(viewHeight*.25,260),bx=(viewWidth-bubbleW)/2,by=viewHeight*.68;
 const speaker=speakerRu(d.speaker),accent=hero().color;
 rect(bx,by,bubbleW,bubbleH,"#f0eee7");
 rect(bx+4,by+4,bubbleW-8,bubbleH-8,"#101518");
 // Хвост комикса.
 const tailX=d.speaker===hero().name?bx+bubbleW*.72:bx+bubbleW*.24;
 poly([tailX-18,by+bubbleH,tailX,by+bubbleH+Math.min(34,viewHeight*.025),tailX+12,by+bubbleH],"#101518");
 rect(bx,by,bubbleW,5,accent);
 tx(speaker,bx+22,by+30,menuTextSize(.024,17,27),accent,"left");
 drawWrapped(d.text,bx+22,by+72,Math.max(25,Math.floor(viewWidth/17)),menuTextSize(.026,19,30),menuTextSize(.028,20,32),"#f0eee7","left");
 tx("ТАП",bx+bubbleW-22,by+bubbleH-18,menuTextSize(.016,11,17),"#8e999d","right");
}
function drawShop(){
 rect(0,0,viewWidth,viewHeight,"#07090b");tx("АРСЕНАЛ",viewWidth*.07,viewHeight*.08,menuTextSize(.04,26,38),hero().color);tx("ДЕНЬГИ $"+save.money,viewWidth*.93,viewHeight*.08,menuTextSize(.022,15,24),"#d9b86c","right");
 weapons.forEach((w,i)=>{const y=viewHeight*(.18+i*.075);const owned=save.weapon>=i;tx(String(i+1),viewWidth*.07,y,menuTextSize(.02,14,20),"#59656b");tx(weaponRu(w.name),viewWidth*.13,y,menuTextSize(.023,16,24),"#f0eee7");tx("$"+w.cost,viewWidth*.58,y,menuTextSize(.021,15,22),"#d9b86c");tx(owned?"ЕСТЬ":"КУПИТЬ",viewWidth*.78,y,menuTextSize(.021,15,22),owned?hero().color:"#aab1b4");});
}
function drawResult(){
 const m=currentMission();rect(0,0,viewWidth,viewHeight,"#07090b");tx("МИССИЯ ЗАВЕРШЕНА",viewWidth/2,viewHeight*.18,menuTextSize(.045,28,40),hero().color,"center");tx(m.ru,viewWidth/2,viewHeight*.27,menuTextSize(.032,21,32),"#f0eee7","center");
 tx("+$"+m.reward,viewWidth/2,viewHeight*.39,menuTextSize(.04,26,38),"#d9b86c","center");tx("+"+m.xp+" XP",viewWidth/2,viewHeight*.46,menuTextSize(.026,18,26),"#aab1b4","center");
 tx("РАНГ · "+rankRu(rankNames[rank()]),viewWidth/2,viewHeight*.54,menuTextSize(.023,16,24),hero().color,"center");tx("ВСЕГО ДЕНЕГ · $"+save.money,viewWidth/2,viewHeight*.59,menuTextSize(.021,15,22),"#f0eee7","center");
 if(m.number===10)tx("ЧЕТЫРЕ СЕМЬИ ТЕПЕРЬ СВЯЗАНЫ.",viewWidth/2,viewHeight*.68,menuTextSize(.02,14,22),"#aab1b4","center");
 if(m.number===13)tx("ГЛАВА I ЗАВЕРШЕНА",viewWidth/2,viewHeight*.68,menuTextSize(.026,18,26),hero().color,"center");
}

function buyOrSelectWeapon(n:number){
 if(n<0||n>=weapons.length)return;
 const w=weapons[n];
 if(save.weapon>=n){save.weapon=n;storeSave();return;}
 if(save.money>=w.cost){save.money-=w.cost;save.weapon=n;storeSave();}
}

function handleKey(e:KeyboardEvent){
 if(["ArrowLeft","ArrowRight","ArrowUp"," ","Enter"].includes(e.key))e.preventDefault();
 if(mode==="select"){
   if(e.key==="ArrowRight"){const ids=["antonio","massimo","salvatore","giuseppe"] as HeroId[];const i=selected?ids.indexOf(selected):-1;selected=ids[(i+1+4)%4];}
   if(e.key==="ArrowLeft"){const ids=["antonio","massimo","salvatore","giuseppe"] as HeroId[];const i=selected?ids.indexOf(selected):0;selected=ids[(i-1+4)%4];}
   if(e.key==="Enter"&&selected)beginSelected();
   return;
 }
 if(mode==="shop"){if(e.key>="1"&&e.key<="6")buyOrSelectWeapon(Number(e.key)-1);if(e.key==="Escape")mode="briefing";return;}
 if(e.key==="Escape"){mode="select";dialogueOpen=false;renderCanvas();return;}
 if(e.key==="Enter"||e.key===" "){if(mode!=="play")advanceDialogue();else fire();return;}
 keys.add(e.key);
}
function keyup(e:KeyboardEvent){keys.delete(e.key);}
function exitToPortal(){
 saveResumeState();
 mode="select";dialogueOpen=false;
 window.dispatchEvent(new CustomEvent("freezzz:navigate",{detail:{view:"home"}}));
}
function bindButtons(){
 root?.querySelectorAll<HTMLElement>("[data-hero]").forEach(el=>el.onclick=()=>{selected=el.dataset.hero as HeroId;render();});
 root?.querySelectorAll<HTMLElement>("[data-action]").forEach(el=>el.onclick=()=>{
   const a=el.dataset.action;
   if(a==="play"&&selected){beginSelected();render();}
   if(a==="exit")exitToPortal();
   if(a==="menu"){returnToMainMenu();}
   if(a==="levels"){mode="levels";dialogueOpen=false;render();}
   if(a==="cheat"){activateCheatAll();}
   if(a==="level"){startMissionById(el.dataset.level||"");}
   if(a==="advance"){advanceDialogue();render();}
   if(a==="shop"){mode="shop";render();}
   if(a==="swap")switchWeapon();
   if(a==="special")useAbility();
 });
 root?.querySelectorAll<HTMLElement>("[data-touch]").forEach(el=>{const k=el.dataset.touch as keyof typeof touch;const on=(v:boolean)=>{touch[k]=v;};el.addEventListener("pointerdown",e=>{e.preventDefault();on(true)});["pointerup","pointercancel","pointerleave"].forEach(ev=>el.addEventListener(ev,()=>on(false)));});
 const moveSensor=root?.querySelector<HTMLElement>(".mafia-touch-move");
 if(moveSensor){
   const updateMove=(e:PointerEvent)=>{
     const r=moveSensor.getBoundingClientRect();
     const dx=(e.clientX-(r.left+r.width/2))/(r.width*.42);
     const dy=(e.clientY-(r.top+r.height/2))/(r.height*.42);
     moveX=Math.max(-1,Math.min(1,dx));moveY=Math.max(-1,Math.min(1,dy));
     const stick=moveSensor.querySelector<HTMLElement>(".mafia-touch-stick");
     if(stick)stick.style.transform='translate('+Math.max(-34,Math.min(34,dx*34))+'px,'+Math.max(-34,Math.min(34,dy*34))+'px)';
   };
   const stopMove=(e:PointerEvent)=>{if(e.pointerId===movePointerId){movePointerId=null;moveX=0;moveY=0;touch.jump=false;const stick=moveSensor.querySelector<HTMLElement>(".mafia-touch-stick");if(stick)stick.style.transform='translate(0,0)';}};
   moveSensor.addEventListener("pointerdown",e=>{e.preventDefault();movePointerId=e.pointerId;moveSensor.setPointerCapture(e.pointerId);updateMove(e);});
   moveSensor.addEventListener("pointermove",e=>{if(e.pointerId===movePointerId)updateMove(e);});
   moveSensor.addEventListener("pointerup",stopMove);moveSensor.addEventListener("pointercancel",stopMove);
 }
 const sensor=root?.querySelector<HTMLElement>(".mafia-aim-sensor");
 if(sensor){
   const setAim=(e:PointerEvent)=>{const r=sensor.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);if(Math.hypot(dx,dy)<10)return;aimAngle=Math.atan2(dy,dx);aimActive=true;};
   sensor.addEventListener("pointerdown",e=>{e.preventDefault();aimPointerId=e.pointerId;sensor.setPointerCapture(e.pointerId);setAim(e);});
   sensor.addEventListener("pointermove",e=>{if(e.pointerId===aimPointerId)setAim(e);});
   const stop=(e:PointerEvent)=>{if(e.pointerId===aimPointerId){aimPointerId=null;aimActive=false;}};
   sensor.addEventListener("pointerup",stop);sensor.addEventListener("pointercancel",stop);
 }
}
function resizeCanvas(){
 if(!root||!canvas||!ctx)return;
 const w=Math.max(320,root.clientWidth||window.innerWidth);
 const h=Math.max(480,root.clientHeight||window.innerHeight);
 const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
 const pw=Math.round(w*dpr),ph=Math.round(h*dpr);
 if(canvas.width!==pw||canvas.height!==ph){
   canvas.width=pw;canvas.height=ph;
   canvas.style.width=w+"px";canvas.style.height=h+"px";
 }
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.imageSmoothingEnabled=false;
 viewWidth=w;viewHeight=h;
}
function render(){
 if(!root)return;
 root.innerHTML='<div class="freezzz-mafia-frame">'+(mode==="select"?'<video class="mafia-menu-live-bg" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>':mode==="play"?'<video class="mafia-level-bg" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>':"")+'<canvas class="freezzz-mafia-canvas"></canvas><div class="freezzz-mafia-ui"></div></div>';
 if(mode==="select"){
   const bg=root.querySelector<HTMLVideoElement>(".mafia-menu-live-bg");
   if(bg){bg.src=portalVideoUrl("live");bg.play().catch(()=>{});}
 }else if(mode==="play"){
   const bg=root.querySelector<HTMLVideoElement>(".mafia-level-bg");
   if(bg){bg.src=portalVideoUrl("library");bg.play().catch(()=>{});}
 }
 canvas=root.querySelector("canvas");ctx=canvas?.getContext("2d")||null;
 resizeCanvas();
 const ui=root.querySelector<HTMLElement>(".freezzz-mafia-ui")!;
 if(mode==="select"){
   ui.innerHTML='<div class="mafia-select-grid">'+(["antonio","massimo","salvatore","giuseppe"] as HeroId[]).map(id=>'<button class="'+(id===selected?"selected":"")+'" aria-label="Выбрать '+heroes[id].name+'" data-hero="'+id+'"></button>').join("")+'</div><div class="mafia-menu-actions"><button data-action="play" '+(selected?"":"disabled")+'>ИГРАТЬ</button><button data-action="exit">ВЫХОД</button><button data-action="levels">УРОВНИ</button><button data-action="cheat">ЧИТ: ВСЁ</button></div>';
 }else if(mode==="family"){
   ui.innerHTML='<div class="mafia-action"><button data-action="menu">ГЛАВНОЕ МЕНЮ</button><button data-action="advance">ПРОПУСТИТЬ</button></div>';
 }else if(mode==="levels"){
   const cards=allMissions.map((m)=>{
     const accent=m.hero==="shared"?"#f0eee7":heroes[m.hero].color;
     const owner=m.hero==="shared"?"ОБЩАЯ МИССИЯ":heroes[m.hero].family.toUpperCase()+" · "+heroes[m.hero].name;
     const done=save.completed.includes(m.id);
     const floors=m.floors.map((f,n)=>'<span><b>'+String(n+1)+'</b> '+floorRu(f)+'</span>').join("");
     return '<button class="mafia-level-card '+(done?"completed":"")+'" data-action="level" data-level="'+m.id+'" style="--level-accent:'+accent+'">'+
       '<div class="mafia-level-head"><strong>'+String(m.number).padStart(2,"0")+'</strong><div><b>'+esc(m.ru)+'</b><small>'+esc(owner)+'</small></div><i>'+(done?"✓":"")+'</i></div>'+
       '<div class="mafia-level-meta"><span>ЦЕЛЬ</span><b>'+esc(objectiveRu(m.objective))+'</b></div>'+
       '<div class="mafia-level-floors">'+floors+'</div>'+
       '<div class="mafia-level-footer"><span>НАГРАДА $'+m.reward+'</span><span>'+m.xp+' XP</span><span>3 ЭТАЖА</span></div>'+
       '</button>';
   }).join("");
   ui.innerHTML='<div class="mafia-levels-panel">'+cards+'</div><div class="mafia-levels-bottom"><button data-action="menu">ГЛАВНОЕ МЕНЮ</button><button data-action="cheat">ЧИТ: ВСЁ</button></div>';
 }else if(mode==="play"){
   ui.innerHTML='<div class="mafia-touch-move" aria-label="Сенсор движения"><span class="mafia-touch-stick"></span></div><div class="mafia-combat-buttons"><button data-action="swap">СМЕНА</button><button data-action="special">СПЕЦ</button></div><div class="mafia-aim-sensor" aria-label="Сенсор стрельбы"><span class="mafia-aim-ring"></span><span class="mafia-aim-dot"></span></div><div class="mafia-game-menu"><button data-action="shop">МАГАЗИН</button><button data-action="menu">МЕНЮ</button></div>';
 }else{
   ui.innerHTML='<div class="mafia-action"><button data-action="menu">ГЛАВНОЕ МЕНЮ</button><button data-action="advance">'+(dialogueOpen?"ПРОДОЛЖИТЬ":mode==="shop"?"НАЗАД":"НАЧАТЬ / ПРОДОЛЖИТЬ")+'</button></div>';
 }
 bindButtons();renderCanvas();
}
function updateCombatButtonLabels(){
 if(!root||mode!=="play")return;
 const swap=root.querySelector<HTMLElement>('[data-action="swap"]');
 const special=root.querySelector<HTMLElement>('[data-action="special"]');
 if(swap)swap.textContent=player.weaponSwap>0?"СМЕНА "+(player.weaponSwap/60).toFixed(1):"СМЕНА";
 if(special)special.textContent=player.ability>0?"СПЕЦ "+(player.ability/60).toFixed(1):"СПЕЦ";
}
function loop(t:number){const dt=Math.min(2,(t-last)/16.67||1);last=t;if(mode==="play"){update(dt);updateCombatButtonLabels();}renderCanvas();raf=requestAnimationFrame(loop);}
function setup(){
 loadSave();selected=save.hero;
 render();raf=requestAnimationFrame(loop);
 cleanup=()=>{cancelAnimationFrame(raf);};
}
export function mountFreezzzMafia(host:HTMLElement){cleanup();root=host;mode="select";dialogueOpen=false;setup();return ()=>{saveResumeState();cleanup();root=null;canvas=null;ctx=null;};}function floorRu(s:string){
 const map:Record<string,string>={OFFICE:"ОФИС","UPPER OFFICE":"ВЕРХНИЙ ОФИС",ESCAPE:"ОТХОД","FRONT OFFICE":"ПЕРЕДНИЙ ОФИС","RECORD ROOM":"АРХИВ",ROOFTOP:"КРЫША",STREET:"УЛИЦА",BLOCK:"КВАРТАЛ","BACK STREET":"ЗАДНЯЯ УЛИЦА",GARAGE:"ГАРАЖ",ENTRANCE:"ВХОД",STORAGE:"СКЛАД",BAR:"БАР","BACK ROOM":"ЗАДНЯЯ КОМНАТА",ALLEY:"ПЕРЕУЛОК",WAREHOUSE:"СКЛАД",DEPOT:"ДЕПО","LOADING BAY":"ПОГРУЗОЧНАЯ ЗОНА","UPPER CATWALK":"ВЕРХНЯЯ ПЛОЩАДКА","CONTROL ROOM":"ЦЕНТР УПРАВЛЕНИЯ","SERVICE FLOOR":"СЛУЖЕБНЫЙ ЭТАЖ","UPPER FLOOR":"ВЕРХНИЙ ЭТАЖ","LOCKED FLOOR":"ЗАКРЫТЫЙ ЭТАЖ","ROOF ACCESS":"ВЫХОД НА КРЫШУ","MEETING FLOOR":"ЭТАЖ ВСТРЕЧИ","ROSSI HQ":"ШТАБ РОССИ","MORETTI HQ":"ШТАБ МОРЕТТИ","VALENTI OFFICE":"ОФИС ВАЛЕНТИ","PORT":"ПОРТ","CONTAINER YARD":"КОНТЕЙНЕРНЫЙ ДВОР","CONTROL FLOOR":"ЭТАЖ УПРАВЛЕНИЯ","SERVICE HALL":"СЛУЖЕБНЫЙ КОРИДОР","MEETING ROOM":"КОМНАТА ВСТРЕЧИ","SERVICE TUNNEL":"СЛУЖЕБНЫЙ ТОННЕЛЬ","NIGHT DOCK":"НОЧНОЙ ПРИЧАЛ","CRANE FLOOR":"ЭТАЖ КРАНА","NIGHT STREET":"НОЧНАЯ УЛИЦА","DISTRICT":"РАЙОН","CROSSING":"ПЕРЕКРЁСТОК","ARCHIVE":"АРХИВ","HIDDEN ROOM":"СКРЫТАЯ КОМНАТА","SECURE ARCHIVE":"ЗАКРЫТЫЙ АРХИВ","FINAL FLOOR":"ФИНАЛЬНЫЙ ЭТАЖ","ENTRY":"ВХОД","CROSSROADS":"ПЕРЕКРЁСТОК","SPLIT LEVEL":"РАЗДЕЛЁННЫЙ ЭТАЖ","OUTER BLOCK":"ВНЕШНИЙ КВАРТАЛ"};
 return map[s]||s;
}
function speakerRu(s:string){
 const map:Record<string,string>={CONTACT:"СВЯЗНОЙ",ACCOUNTANT:"БУХГАЛТЕР",SENIOR:"СТАРШИЙ",GUARD:"ОХРАННИК","OLD CONTACT":"СТАРЫЙ КОНТАКТ",UNKNOWN:"НЕИЗВЕСТНЫЙ","OLD FRIEND":"СТАРЫЙ ЗНАКОМЫЙ",STRANGER:"НЕЗНАКОМЕЦ"};
 return map[s]||s;
}
function enemyRu(s:string){
 const map:Record<string,string>={guard:"ОХРАНА",brawler:"БОРЕЦ",rusher:"ШТУРМОВИК",shooter:"СТРЕЛОК",flanker:"ОБХОДЧИК",heavy:"ТЯЖЁЛЫЙ",suppressor:"ПОДАВИТЕЛЬ",sniper:"СНАЙПЕР"};
 return map[s]||s;
}
function weaponRu(s:string){
 const map:Record<string,string>={"POCKET 9":"КАРМАННЫЙ","SERVICE":"СЛУЖЕБНЫЙ","REVOLVER":"РЕВОЛЬВЕР","SMG":"АВТОМАТ","SHOTGUN":"ДРОБОВИК","CARBINE":"КАРАБИН"};
 return map[s]||s;
}

