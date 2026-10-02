export function drawDuckBlast(canvas:HTMLCanvasElement,player:number):void{
  const rect=canvas.getBoundingClientRect();
  canvas.width=Math.max(320,rect.width);
  canvas.height=Math.max(420,rect.height);
  const ctx=canvas.getContext("2d");
  if(!ctx)return;
  ctx.fillStyle="#080d12";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#ffd166";
  ctx.beginPath();
  ctx.arc(canvas.width*.5,canvas.height*.2,20,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle="#35e0a1";
  ctx.beginPath();
  ctx.moveTo(canvas.width*player,canvas.height*.8);
  ctx.lineTo(canvas.width*player-28,canvas.height*.9);
  ctx.lineTo(canvas.width*player+28,canvas.height*.9);
  ctx.closePath();
  ctx.fill();
}
