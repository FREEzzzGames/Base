/* SPARK session-scoped timer ownership. */
(function(root){
'use strict';
var timers=[];
function later(fn,ms){var id=root.setTimeout(function(){timers=timers.filter(function(v){return v!==id;});if(typeof fn==='function')fn();},ms);timers.push(id);return id;}
function clear(){for(var i=0;i<timers.length;i++)root.clearTimeout(timers[i]);timers.length=0;}
root.SparkSession=Object.freeze({later:later,clearTimers:clear});
})(typeof window!=='undefined'?window:globalThis);
