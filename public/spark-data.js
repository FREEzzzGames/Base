/* SPARK data/configuration: immutable character and weapon definitions. */
(function(root){
'use strict';
var CHARACTERS=[
{id:'naru',name:'NARU',color:'#ffad32',skin:'#f4b18b',hair:'#ffc75a',coat:'#ff7c42',pants:'#26364b',shot:'#ffb52e',desc:'янтарные импульсы'},
{id:'kai',name:'KAI',color:'#ff5365',skin:'#f2b18d',hair:'#f5e8cf',coat:'#c4a77b',pants:'#27354b',shot:'#ff5365',desc:'алые энергетические заряды'},
{id:'itachi',name:'KAGE',color:'#d45bff',skin:'#f1b28d',hair:'#182237',coat:'#151b2a',pants:'#151b2a',shot:'#d45bff',desc:'фиолетовые теневые снаряды'},
{id:'sando',name:'SANDO',color:'#35c9ff',skin:'#a95f56',hair:'#d85d68',coat:'#c64d5b',pants:'#202c40',shot:'#35c9ff',desc:'голубые импульсы'},
{id:'hina',name:'HINA',color:'#43e6a0',skin:'#f5b49a',hair:'#5a454b',coat:'#df6c76',pants:'#9b4b5a',shot:'#43e6a0',desc:'мятные плазменные заряды'},
{id:'shin',name:'SHIN',color:'#ffc94d',skin:'#f4b08b',hair:'#4b3e42',coat:'#a7a18a',pants:'#263a4c',shot:'#ffc94d',desc:'золотая очередь'},
{id:'roku',name:'ROKU',color:'#54b8ff',skin:'#efb18e',hair:'#202a3d',coat:'#202b40',pants:'#29364b',shot:'#54b8ff',desc:'ледяные синие выстрелы'},
{id:'miko',name:'MIKO',color:'#ff76c9',skin:'#fff0d4',hair:'#5e929a',coat:'#528e9a',pants:'#27354a',shot:'#ff76c9',desc:'розовые импульсы с рассеиванием'}
];
var WEAPONS={pistol:{name:'PISTOL',cd:.18,cost:2,dmg:14,spd:400,count:1,spread:0,size:3,color:'#ff6a36',icon:'▬'},shotgun:{name:'SHOTGUN',cd:.55,cost:28,dmg:8,spd:360,count:5,spread:.24,size:3,color:'#ffb14d',icon:'⊞'},smg:{name:'SMG',cd:.08,cost:5,dmg:6,spd:480,count:1,spread:.07,size:2,color:'#55d9ef',icon:'⁝'},plasma:{name:'PLASMA',cd:.68,cost:34,dmg:48,spd:320,count:1,spread:0,size:5,color:'#ff4a3d',icon:'◉'}};
function createPlayer(ground){return {x:30,y:ground-38,w:24,h:38,vx:0,vy:0,onGround:false,coyote:0,jbuf:0,face:1,hp:100,en:100,scrap:0,inv:0,atk:0,cd:0,dashCd:0,dash:0,shield:0,shieldCd:0,dead:false,anim:0,weapon:'pistol'};}
root.SparkData=Object.freeze({CHARACTERS:CHARACTERS,WEAPONS:WEAPONS,createPlayer:createPlayer});
})(typeof window!=='undefined'?window:globalThis);
