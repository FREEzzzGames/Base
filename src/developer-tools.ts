export interface DeveloperBlockInfo{
  readonly key:string;
  readonly label:string;
  readonly view:string;
  readonly width:number;
  readonly height:number;
  readonly x:number;
  readonly y:number;
  readonly order:number;
}
export interface DeveloperDiagnosticsSnapshot{
  readonly version:string; readonly build:string; readonly view:string; readonly language:string;
  readonly telegram:boolean; readonly online:boolean; readonly modules:readonly string[];
  readonly developerMode:boolean; readonly selectedBlock:string; readonly blocks:readonly DeveloperBlockInfo[];
}
const blockIcons:Record<string,string>={hero:"✦",live:"◉",chat:"☁",game:"◆",radio:"♫",library:"▦",header:"⌂",streams:"▶",messages:"☷",composer:"✎",controls:"⌘",carousel:"◫",nowplaying:"♫",search:"⌕",genres:"◇",content:"▤"};
function blockIcon(key:string):string{return blockIcons[key.split(":").pop()||""]||"□";}
export function renderDeveloperDiagnostics(snapshot:DeveloperDiagnosticsSnapshot,lang:"RU"|"DE"|"EN"="RU"):string{
  const tr={RU:{title:"Конструктор",close:"Закрыть",hint:"Перетаскивай выбранный блок пальцем",empty:"Нет блоков",selected:"ВЫБРАН",reset:"Сбросить",precision:"Точная настройка",all:"${tr.all}",system:"Состояние системы"},DE:{title:"Konstruktor",close:"Schließen",hint:"Ausgewählten Block mit dem Finger ziehen",empty:"Keine Blöcke",selected:"AUSGEWÄHLT",reset:"Zurücksetzen",precision:"Feineinstellung",all:"↺ ALLES",system:"Systemstatus"},EN:{title:"Constructor",close:"Close",hint:"Drag the selected block with your finger",empty:"No blocks",selected:"SELECTED",reset:"Reset",precision:"Fine tuning",all:"↺ ALL",system:"System status"}}[lang];
  const selected=snapshot.blocks.find(b=>b.key===snapshot.selectedBlock)||snapshot.blocks[0];
  return `
    <aside class="dev-tools-overlay" data-developer-overlay>
      <section class="dev-tools-panel dev-layout-panel" role="dialog" aria-modal="true" aria-label="FREEzzz developer tools">
        <header class="dev-tools-head">
          <div class="dev-title-visual"><div class="dev-orb">⌘</div><div><span class="radio-kicker">DEV MODE</span><h2>${tr.title}</h2></div></div>
          <button class="icon-button" data-developer-close type="button" aria-label="${tr.close}">×</button>
        </header>
        <div class="dev-mode-switch">
          <button class="dev-mode-pill" data-dev-mode-toggle type="button"><span class="dev-mode-dot"></span>${snapshot.developerMode?"DEV":"USER"}</button>
          <span class="dev-view-badge">${escapeHtml(snapshot.view.toUpperCase())}</span>
          <span class="dev-gesture-hint" title="${tr.hint}">✣</span>
        </div>
        <div class="dev-block-list">
          ${snapshot.blocks.length?snapshot.blocks.map(block=>`<button class="dev-block-chip ${selected?.key===block.key?"active":""}" data-dev-block="${escapeAttr(block.key)}" type="button"><span class="dev-block-icon">${blockIcon(block.key)}</span><span>${escapeHtml(block.label)}</span></button>`).join(""):`<span class="dev-empty">${tr.empty}</span>`}
        </div>
        ${selected?`
        <div class="dev-selected-block">
          <div class="dev-selected-top"><span class="dev-selected-icon">${blockIcon(selected.key)}</span><div><small>${tr.selected}</small><strong>${escapeHtml(selected.label)}</strong></div><button class="dev-mini-action" data-dev-reset type="button" title="${tr.reset}">↺</button></div>
          <div class="dev-visual-controls">
            <div class="dev-size-control"><span>SIZE</span><div class="dev-stepper"><button data-dev-size="-5" type="button">−</button><output data-dev-output="width">${selected.width}%</output><button data-dev-size="5" type="button">+</button></div></div>
            <div class="dev-pad"><button data-dev-nudge="up" type="button">▲</button><button data-dev-nudge="left" type="button">◀</button><button data-dev-nudge="center" type="button">●</button><button data-dev-nudge="right" type="button">▶</button><button data-dev-nudge="down" type="button">▼</button></div>
            <div class="dev-position-readout"><span>X <b data-dev-output="x">${selected.x}px</b></span><span>Y <b data-dev-output="y">${selected.y}px</b></span></div>
          </div>
          <details class="dev-precision"><summary>${tr.precision}</summary>
            <div class="dev-precision-grid">
              <label><span>↔</span><output data-dev-output="width">${selected.width}%</output><input data-dev-control="width" type="range" min="20" max="100" value="${selected.width}"></label>
              <label><span>↕</span><output data-dev-output="height">${selected.height?selected.height+"px":"AUTO"}</output><input data-dev-control="height" type="range" min="0" max="900" step="4" value="${selected.height}"></label>
              <label><span>⇆</span><output data-dev-output="x">${selected.x}px</output><input data-dev-control="x" type="range" min="-240" max="240" step="2" value="${selected.x}"></label>
              <label><span>⇅</span><output data-dev-output="y">${selected.y}px</output><input data-dev-control="y" type="range" min="-400" max="400" step="2" value="${selected.y}"></label>
              <label><span>☷</span><output data-dev-output="order">${selected.order}</output><input data-dev-control="order" type="range" min="-10" max="10" value="${selected.order}"></label>
            </div>
          </details>
        </div>`:""}
        <div class="dev-editor-actions"><button class="tg-button" data-dev-preview type="button">USER</button><button class="tg-button secondary" data-dev-reset-all type="button">↺ ВСЁ</button></div>
        <details class="dev-diagnostics"><summary>${tr.system}</summary>
          <div class="dev-tools-grid">
            <div class="dev-tools-row"><span>BUILD</span><b>${escapeHtml(snapshot.build)}</b></div><div class="dev-tools-row"><span>VERSION</span><b>${escapeHtml(snapshot.version)}</b></div>
            <div class="dev-tools-row"><span>LANG</span><b>${escapeHtml(snapshot.language)}</b></div><div class="dev-tools-row"><span>TELEGRAM</span><b>${snapshot.telegram?"●":"○"}</b></div>
            <div class="dev-tools-row"><span>NETWORK</span><b>${snapshot.online?"● ONLINE":"○ OFFLINE"}</b></div><div class="dev-tools-row"><span>MODULES</span><b>${snapshot.modules.length}</b></div>
          </div>
        </details>
      </section>
    </aside>`;
}
function escapeHtml(value:string):string{return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));}
function escapeAttr(value:string):string{return escapeHtml(value);}
