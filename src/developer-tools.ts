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
  readonly version:string;
  readonly build:string;
  readonly view:string;
  readonly language:string;
  readonly telegram:boolean;
  readonly online:boolean;
  readonly modules:readonly string[];
  readonly developerMode:boolean;
  readonly selectedBlock:string;
  readonly blocks:readonly DeveloperBlockInfo[];
}

export function renderDeveloperDiagnostics(snapshot:DeveloperDiagnosticsSnapshot):string{
  const rows=[
    ["BUILD",snapshot.build],
    ["VERSION",snapshot.version],
    ["VIEW",snapshot.view.toUpperCase()],
    ["LANG",snapshot.language],
    ["TELEGRAM",snapshot.telegram?"YES":"NO"],
    ["NETWORK",snapshot.online?"ONLINE":"OFFLINE"]
  ];
  const selected=snapshot.blocks.find(b=>b.key===snapshot.selectedBlock)||snapshot.blocks[0];
  return `
    <aside class="dev-tools-overlay" data-developer-overlay>
      <section class="dev-tools-panel dev-layout-panel" role="dialog" aria-modal="true" aria-label="FREEzzz developer tools">
        <header class="dev-tools-head">
          <div>
            <span class="radio-kicker">FREEzzz LOCAL DEV</span>
            <h2>Конструктор портала</h2>
            <p>Настройка размеров и положения блоков. Изменения сохраняются локально и не меняют пользовательский режим.</p>
          </div>
          <button class="icon-button" data-developer-close type="button" aria-label="Закрыть">×</button>
        </header>

        <div class="dev-mode-switch">
          <span>РЕЖИМ</span>
          <button class="dev-mode-pill" data-dev-mode-toggle type="button">${snapshot.developerMode?"РАЗРАБОТЧИК":"ПОЛЬЗОВАТЕЛЬ"}</button>
        </div>

        <div class="dev-tools-grid">
          ${rows.map(([k,v])=>`<div class="dev-tools-row"><span>${k}</span><b>${v}</b></div>`).join("")}
        </div>

        <div class="dev-editor">
          <div class="dev-editor-title">
            <div><span class="radio-kicker">LAYOUT EDITOR</span><h3>Блоки вкладки</h3></div>
            <button class="tg-button secondary dev-reset" data-dev-reset type="button">Сбросить</button>
          </div>
          <div class="dev-block-list">
            ${snapshot.blocks.length
              ? snapshot.blocks.map(block=>`<button class="dev-block-chip ${selected?.key===block.key?"active":""}" data-dev-block="${escapeAttr(block.key)}" type="button">${escapeHtml(block.label)}</button>`).join("")
              : `<span class="dev-empty">На этой вкладке нет редактируемых блоков.</span>`}
          </div>

          ${selected? `
          <div class="dev-selected-block">
            <div class="dev-selected-name"><span>ВЫБРАН</span><strong>${escapeHtml(selected.label)}</strong></div>
            <label>ШИРИНА <output data-dev-output="width">100%</output>
              <input data-dev-control="width" type="range" min="20" max="100" step="1" value="${selected.width}">
            </label>
            <label>ВЫСОТА <output data-dev-output="height">${selected.height?selected.height+"px":"AUTO"}</output>
              <input data-dev-control="height" type="range" min="0" max="900" step="4" value="${selected.height}">
            </label>
            <label>ПОЗИЦИЯ X <output data-dev-output="x">${selected.x}px</output>
              <input data-dev-control="x" type="range" min="-240" max="240" step="2" value="${selected.x}">
            </label>
            <label>ПОЗИЦИЯ Y <output data-dev-output="y">${selected.y}px</output>
              <input data-dev-control="y" type="range" min="-400" max="400" step="2" value="${selected.y}">
            </label>
            <label>ПОРЯДОК <output data-dev-output="order">${selected.order}</output>
              <input data-dev-control="order" type="range" min="-10" max="10" step="1" value="${selected.order}">
            </label>
          </div>`:""}

          <div class="dev-editor-actions">
            <button class="tg-button" data-dev-preview type="button">Показать USER</button>
            <button class="tg-button secondary" data-dev-reset-all type="button">Сбросить всё</button>
          </div>
        </div>

        <div class="dev-tools-section">
          <span class="radio-kicker">MODULES</span>
          <div class="dev-tools-modules">${snapshot.modules.map(name=>`<span class="dev-tools-module"><i></i>${escapeHtml(name)}</span>`).join("")}</div>
        </div>
      </section>
    </aside>`;
}

function escapeHtml(value:string):string{
  return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));
}
function escapeAttr(value:string):string{return escapeHtml(value);}
