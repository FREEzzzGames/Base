export interface TelegramWebAppBridge{
  ready?:()=>void;
  expand?:()=>void;
  openLink?:(url:string,options?:{try_instant_view?:boolean})=>void;
  openTelegramLink?:(url:string)=>void;
  disableVerticalSwipes?:()=>void;
  platform?:string;
}

export function getTelegramWebApp():TelegramWebAppBridge|null{
  const candidate=(window as Window&{Telegram?:{WebApp?:TelegramWebAppBridge}}).Telegram?.WebApp;
  return candidate||null;
}

export function initTelegramBridge():void{
  const tg=getTelegramWebApp();
  if(!tg)return;
  tg.ready?.();
  tg.expand?.();
  tg.disableVerticalSwipes?.();
  document.documentElement.dataset.telegram="true";
  if(tg.platform)document.documentElement.dataset.telegramPlatform=tg.platform;
}

export function openExternalUrl(url:string):void{
  const tg=getTelegramWebApp();
  if(tg?.openLink)tg.openLink(url,{try_instant_view:false});
  else window.open(url,"_blank","noopener,noreferrer");
}
