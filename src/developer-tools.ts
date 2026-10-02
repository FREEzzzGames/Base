export interface DeveloperDiagnosticsSnapshot{
  readonly version:string;
  readonly build:string;
  readonly view:string;
  readonly language:string;
  readonly telegram:boolean;
  readonly online:boolean;
  readonly modules:readonly string[];
}

export function renderDeveloperDiagnostics(snapshot:DeveloperDiagnosticsSnapshot):string{
  const rows=[
    ["BUILD",snapshot.build],
    ["VERSION",snapshot.version],
    ["VIEW",snapshot.view],
    ["LANG",snapshot.language],
    ["TELEGRAM",snapshot.telegram?"YES":"NO"],
    ["NETWORK",snapshot.online?"ONLINE":"OFFLINE"]
  ];
  return `
    <aside class="dev-tools-overlay" data-developer-overlay>
      <section class="dev-tools-panel" role="dialog" aria-modal="true" aria-label="FREEzzz developer diagnostics">
        <header class="dev-tools-head">
          <div><span class="radio-kicker">FREEzzz LOCAL DEV</span><h2>Диагностика</h2><p>Только локальная developer-сборка. Пользовательский интерфейс не изменяется.</p></div>
          <button class="icon-button" data-developer-close type="button" aria-label="Закрыть">×</button>
        </header>
        <div class="dev-tools-grid">
          ${rows.map(([k,v])=>`<div class="dev-tools-row"><span>${k}</span><b>${v}</b></div>`).join("")}
        </div>
        <div class="dev-tools-section">
          <span class="radio-kicker">MODULES</span>
          <div class="dev-tools-modules">${snapshot.modules.map(name=>`<span class="dev-tools-module"><i></i>${name}</span>`).join("")}</div>
        </div>
        <div class="dev-tools-section">
          <span class="radio-kicker">RELEASE CHECK</span>
          <ul class="dev-tools-checks">
            <li>Source of Truth: FREEzzzGames/Base</li>
            <li>Portal economy: EXCLUDED</li>
            <li>Constructor: REMOVED</li>
            <li>Runtime UI and developer tools: SEPARATED</li>
          </ul>
        </div>
      </section>
    </aside>`;
}
