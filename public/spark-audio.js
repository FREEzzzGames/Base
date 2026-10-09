/* SPARK audio feedback. AudioContext is lazy and owned by this module. */
(function(root){
'use strict';
var context=null;
function beep(enabled,frequency,duration,type){
 if(!enabled)return;
 try{
  var AudioCtor=root.AudioContext||root.webkitAudioContext;
  if(!AudioCtor)return;
  if(!context)context=new AudioCtor();
  if(context.state==='suspended')context.resume();
  var oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
  oscillator.type=type||'square';
  oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(.03,now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now+duration);
 }catch(_){}
}
root.SparkAudio=Object.freeze({beep:beep});
})(typeof window!=='undefined'?window:globalThis);
