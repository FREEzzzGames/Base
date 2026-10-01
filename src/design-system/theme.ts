export type PortalPalette = "radio";

const PALETTE_KEY = "freezzz-palette";

export function setPortalPalette(palette: PortalPalette): void {
  document.documentElement.dataset.palette = palette;
  localStorage.setItem(PALETTE_KEY, palette);
}

export function getPortalPalette(): PortalPalette {
  return document.documentElement.dataset.palette === "radio" ? "radio" : "radio";
}

export function initPortalPalette(): PortalPalette {
  const saved = localStorage.getItem(PALETTE_KEY);
  const palette: PortalPalette = saved === "radio" ? "radio" : "radio";
  setPortalPalette(palette);
  return palette;
}
