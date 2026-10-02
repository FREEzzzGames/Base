export interface TelegramThemeParams{
  bg_color?:string;
  secondary_bg_color?:string;
  section_bg_color?:string;
  text_color?:string;
  hint_color?:string;
  link_color?:string;
  button_color?:string;
  button_text_color?:string;
  header_bg_color?:string;
  accent_text_color?:string;
  section_separator_color?:string;
  bottom_bar_bg_color?:string;
  destructive_text_color?:string;
}

export interface TelegramWebAppBridge{
  ready?:()=>void;
  expand?:()=>void;
  openLink?:(url:string,options?:{try_instant_view?:boolean})=>void;
  openTelegramLink?:(url:string)=>void;
  disableVerticalSwipes?:()=>void;
  setHeaderColor?:(color:string)=>void;
  setBackgroundColor?:(color:string)=>void;
  setBottomBarColor?:(color:string)=>void;
  requestFullscreen?:()=>void;
  exitFullscreen?:()=>void;
  lockOrientation?:()=>void;
  unlockOrientation?:()=>void;
  isFullscreen?:boolean;
  isExpanded?:boolean;
  isActive?:boolean;
  viewportHeight?:number;
  viewportStableHeight?:number;
  safeAreaInset?:{top?:number;bottom?:number;left?:number;right?:number};
  contentSafeAreaInset?:{top?:number;bottom?:number;left?:number;right?:number};
  themeParams?:TelegramThemeParams;
  colorScheme?:"light"|"dark";
  version?:string;
  platform?:string;
  initData?:string;
  initDataUnsafe?:{
    user?:{
      language_code?:string;
      first_name?:string;
      last_name?:string;
      username?:string;
      photo_url?:string;
    };
  };
  BackButton?:{
    show?:()=>void;
    hide?:()=>void;
    onClick?:(callback:()=>void)=>void;
    offClick?:(callback:()=>void)=>void;
  };
  MainButton?:{
    show?:()=>void;
    hide?:()=>void;
    setText?:(text:string)=>void;
    onClick?:(callback:()=>void)=>void;
    offClick?:(callback:()=>void)=>void;
    enable?:()=>void;
    disable?:()=>void;
    showProgress?:(leaveActive?:boolean)=>void;
    hideProgress?:()=>void;
    isVisible?:boolean;
  };
  onEvent?:(event:string,callback:()=>void)=>void;
  offEvent?:(event:string,callback:()=>void)=>void;
}

export function getTelegramWebApp():TelegramWebAppBridge|null{
  const candidate=(window as Window&{Telegram?:{WebApp?:TelegramWebAppBridge}}).Telegram?.WebApp;
  return candidate||null;
}

function setTelegramCssVariable(name:string,value?:string):void{
  if(value)document.documentElement.style.setProperty(name,value);
}

export function applyTelegramTheme(tg:TelegramWebAppBridge):void{
  const p=tg.themeParams||{};
  setTelegramCssVariable("--tg-theme-bg-color",p.bg_color);
  setTelegramCssVariable("--tg-theme-secondary-bg-color",p.secondary_bg_color);
  setTelegramCssVariable("--tg-theme-section-bg-color",p.section_bg_color);
  setTelegramCssVariable("--tg-theme-text-color",p.text_color);
  setTelegramCssVariable("--tg-theme-hint-color",p.hint_color);
  setTelegramCssVariable("--tg-theme-link-color",p.link_color);
  setTelegramCssVariable("--tg-theme-button-color",p.button_color);
  setTelegramCssVariable("--tg-theme-button-text-color",p.button_text_color);
  setTelegramCssVariable("--tg-theme-header-bg-color",p.header_bg_color);
  setTelegramCssVariable("--tg-theme-bottom-bar-bg-color",p.bottom_bar_bg_color);
  setTelegramCssVariable("--tg-theme-section-separator-color",p.section_separator_color);
  const root=document.documentElement;
  root.dataset.telegramTheme=tg.colorScheme||"dark";
  if(tg.safeAreaInset){
    for(const [key,value] of Object.entries(tg.safeAreaInset)){
      if(typeof value==="number")root.style.setProperty("--tg-safe-"+key, value+"px");
    }
  }
  if(tg.contentSafeAreaInset){
    for(const [key,value] of Object.entries(tg.contentSafeAreaInset)){
      if(typeof value==="number")root.style.setProperty("--tg-content-safe-area-inset-"+key, value+"px");
    }
  }
}

function syncTelegramViewport(tg:TelegramWebAppBridge):void{
  const stable=tg.viewportStableHeight;
  const current=tg.viewportHeight;
  if(typeof stable==="number"&&stable>0){
    document.documentElement.style.setProperty("--tg-viewport-stable-height",stable+"px");
  }
  if(typeof current==="number"&&current>0){
    document.documentElement.style.setProperty("--tg-viewport-height",current+"px");
  }
  document.documentElement.dataset.telegramExpanded=tg.isExpanded?"true":"false";
  document.documentElement.dataset.telegramActive=tg.isActive===false?"false":"true";
}


export function initTelegramBridge():void{
  const tg=getTelegramWebApp();
  if(!tg)return;
  applyTelegramTheme(tg);
  syncTelegramViewport(tg);
  tg.ready?.();
  tg.expand?.();
  tg.disableVerticalSwipes?.();
  tg.setHeaderColor?.(tg.themeParams?.bg_color||"bg_color");
  tg.setBackgroundColor?.(tg.themeParams?.bg_color||"bg_color");
  tg.setBottomBarColor?.(tg.themeParams?.bottom_bar_bg_color||tg.themeParams?.secondary_bg_color||"secondary_bg_color");
  document.documentElement.dataset.telegram="true";
  if(tg.platform)document.documentElement.dataset.telegramPlatform=tg.platform;
  tg.onEvent?.("themeChanged",()=>applyTelegramTheme(tg));
  tg.onEvent?.("viewportChanged",()=>syncTelegramViewport(tg));
  tg.onEvent?.("safeAreaChanged",()=>applyTelegramTheme(tg));
  tg.onEvent?.("contentSafeAreaChanged",()=>applyTelegramTheme(tg));
  tg.onEvent?.("activated",()=>{document.documentElement.dataset.telegramActive="true";});
  tg.onEvent?.("deactivated",()=>{document.documentElement.dataset.telegramActive="false";});
  tg.onEvent?.("fullscreenChanged",()=>{document.documentElement.dataset.telegramFullscreen=tg.isFullscreen?"true":"false";});
  tg.onEvent?.("fullscreenFailed",()=>{document.documentElement.dataset.telegramFullscreen="false";});
}

export function bindTelegramBackButton(enabled:boolean,onBack:()=>void):void{
  const tg=getTelegramWebApp();
  const button=tg?.BackButton;
  if(!button)return;
  const handler=()=>onBack();
  const key="__freezzz_back_handler__";
  const w=window as Window&{[key]?:()=>void};
  if(w[key]&&button.offClick)button.offClick(w[key]!);
  if(enabled){
    button.onClick?.(handler);
    button.show?.();
    w[key]=handler;
  }else{
    button.hide?.();
    delete w[key];
  }
}

export function hideTelegramMainButton():void{
  getTelegramWebApp()?.MainButton?.hide?.();
}

export function showTelegramMainButton(text:string,onClick:()=>void):void{
  const tg=getTelegramWebApp();
  const button=tg?.MainButton;
  if(!button)return;
  const key="__freezzz_main_handler__";
  const w=window as Window&{[key]?:()=>void};
  if(w[key]&&button.offClick)button.offClick(w[key]!);
  const handler=()=>onClick();
  button.setText?.(text);
  button.onClick?.(handler);
  button.show?.();
  w[key]=handler;
}

export function openExternalUrl(url:string):void{
  const tg=getTelegramWebApp();
  if(tg?.openLink)tg.openLink(url,{try_instant_view:false});
  else window.open(url,"_blank","noopener,noreferrer");
}
