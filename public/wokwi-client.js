// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2025 CodeMagic LTD
// Adapted from wokwi/wokwi-embed-example.
import { byteArrayToBase64, base64ToByteArray } from './wokwi-base64.js';
export class WokwiClient extends EventTarget {
  lastId=0; pendingCommands=new Map();
  constructor(transport){super();this.transport=transport;this.transport.onMessage=message=>this.processMessage(message);}
  async fileUpload(name,content){return typeof content==='string'?this.sendCommand('file:upload',{name,text:content}):this.sendCommand('file:upload',{name,binary:byteArrayToBase64(content)});}
  async fileDownload(name){const result=await this.sendCommand('file:download',{name});return typeof result.text==='string'?result.text:base64ToByteArray(result.binary);}
  async simStart(params){return this.sendCommand('sim:start',params);}
  async serialMonitorListen(){return this.sendCommand('serial-monitor:listen');}
  async sendCommand(command,params){return new Promise((resolve,reject)=>{const id=String(this.lastId++);this.pendingCommands.set(id,[resolve,reject]);this.transport.send({type:'command',command,params,id});});}
  processMessage(message){if(message.type==='hello')this.dispatchEvent(new CustomEvent('wokwi:connected',{detail:message}));else if(message.type==='event')this.dispatchEvent(new CustomEvent(message.event,{detail:message.payload}));else if(message.type==='response'){const [resolve,reject]=this.pendingCommands.get(message.id??'')??[];if(!resolve||!reject){console.error('Unknown Wokwi response',message);return;}this.pendingCommands.delete(message.id);if(message.error)reject(new Error('Wokwi '+message.result?.code+': '+message.result?.message));else resolve(message.result);}}
}
