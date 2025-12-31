import type { SheetSpec } from "../types";
import { mmToPx, paperToMm, sizeToPx } from "./units";

export function computeSheetPx(sheet: SheetSpec) {
  if (sheet.paper === "CUSTOM") {
    const unit = sheet.customUnit ?? "mm";
    const w = sheet.customWidth ?? 210;
    const h = sheet.customHeight ?? 297;
    return sizeToPx(w, h, unit, sheet.dpi);
  }
  const mm = paperToMm(sheet.paper === "P4x6" ? "P4x6" : sheet.paper);
  return { w: mmToPx(mm.wMm, sheet.dpi), h: mmToPx(mm.hMm, sheet.dpi) };
}

export function packTiles(
  sheetW: number,
  sheetH: number,
  tileW: number,
  tileH: number,
  marginPx: number,
  spacingPx: number
) {
  const usableW = sheetW - 2 * marginPx;
  const usableH = sheetH - 2 * marginPx;
  const cols = Math.max(0, Math.floor((usableW + spacingPx) / (tileW + spacingPx)));
  const rows = Math.max(0, Math.floor((usableH + spacingPx) / (tileH + spacingPx)));
  const maxCount = cols * rows;

  const gridW = cols > 0 ? cols * tileW + (cols - 1) * spacingPx : 0;
  const gridH = rows > 0 ? rows * tileH + (rows - 1) * spacingPx : 0;

  const startX = Math.floor(marginPx + (usableW - gridW) / 2);
  const startY = Math.floor(marginPx + (usableH - gridH) / 2);

  return { cols, rows, maxCount, startX, startY };
}

export function renderSheet(
  tileCanvas: HTMLCanvasElement,
  sheet: SheetSpec
): { sheetCanvas: HTMLCanvasElement; maxCount: number } {
  const { w: sheetW, h: sheetH } = computeSheetPx(sheet);
  const marginPx = mmToPx(sheet.marginMm, sheet.dpi);
  const spacingPx = mmToPx(sheet.spacingMm, sheet.dpi);

  const tileW = tileCanvas.width;
  const tileH = tileCanvas.height;

  const { cols, rows, maxCount, startX, startY } = packTiles(sheetW, sheetH, tileW, tileH, marginPx, spacingPx);
  const count = Math.min(sheet.requestedCount, maxCount);

  const c = document.createElement("canvas");
  c.width = sheetW;
  c.height = sheetH;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sheetW, sheetH);

  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const col = i % cols;
    const x = startX + col * (tileW + spacingPx);
    const y = startY + r * (tileH + spacingPx);
    ctx.drawImage(tileCanvas, x, y, tileW, tileH);
  }

  if (sheet.cutLines && cols > 0 && rows > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;

    const gridW = cols * tileW + (cols - 1) * spacingPx;
    const gridH = rows * tileH + (rows - 1) * spacingPx;
    // vertical cut lines
    for (let cidx = 1; cidx < cols; cidx++) {
      const x = startX + cidx * tileW + (cidx - 0.5) * spacingPx;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + rows * tileH + (rows - 1) * spacingPx);
      ctx.stroke();
    }
    // horizontal cut lines
    for (let ridx = 1; ridx < rows; ridx++) {
      const y = startY + ridx * tileH + (ridx - 0.5) * spacingPx;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + cols * tileW + (cols - 1) * spacingPx, y);
      ctx.stroke();
    }
    ctx.strokeRect(startX + 0.5, startY + 0.5, gridW - 1, gridH - 1);

    ctx.restore();
  }

  return { sheetCanvas: c, maxCount };
}
