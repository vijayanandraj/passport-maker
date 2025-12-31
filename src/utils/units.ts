import type { Unit } from "../types";

export function toInches(value: number, unit: Unit): number {
  if (unit === "in") return value;
  if (unit === "cm") return value / 2.54;
  if (unit === "mm") return value / 25.4;
  // px: not convertible without DPI; treat as inches = px / dpi elsewhere
  return value;
}

export function mmToPx(mm: number, dpi: number): number {
  const inches = mm / 25.4;
  return Math.round(inches * dpi);
}

export function inToPx(inches: number, dpi: number): number {
  return Math.round(inches * dpi);
}

export function cmToPx(cm: number, dpi: number): number {
  return Math.round((cm / 2.54) * dpi);
}

export function sizeToPx(width: number, height: number, unit: Unit, dpi: number): { w: number; h: number } {
  if (unit === "px") return { w: Math.round(width), h: Math.round(height) };
  if (unit === "mm") return { w: mmToPx(width, dpi), h: mmToPx(height, dpi) };
  if (unit === "cm") return { w: cmToPx(width, dpi), h: cmToPx(height, dpi) };
  return { w: inToPx(width, dpi), h: inToPx(height, dpi) };
}

export function paperToMm(paper: "A4" | "A3" | "P4x6"): { wMm: number; hMm: number } {
  if (paper === "A4") return { wMm: 210, hMm: 297 };
  if (paper === "A3") return { wMm: 297, hMm: 420 };
  // 4x6 inch paper: 101.6mm x 152.4mm
  return { wMm: 101.6, hMm: 152.4 };
}
