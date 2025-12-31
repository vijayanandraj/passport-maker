import type { Adjustments } from "../types";

export function clamp255(v: number) {
  return Math.max(0, Math.min(255, v));
}

export function applyAdjustmentsToImageData(img: ImageData, adj: Adjustments) {
  const data = img.data;
  const b = adj.brightness / 100;   // -1..1
  const c = adj.contrast / 100;     // -1..1
  const s = adj.saturation / 100;   // -1..1

  // contrast factor
  const cf = (1 + c);
  const br = b * 255;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let bb = data[i + 2];

    // brightness + contrast
    r = (r - 128) * cf + 128 + br;
    g = (g - 128) * cf + 128 + br;
    bb = (bb - 128) * cf + 128 + br;

    // saturation (simple luma blend)
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * bb;
    r = l + (r - l) * (1 + s);
    g = l + (g - l) * (1 + s);
    bb = l + (bb - l) * (1 + s);

    data[i] = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(bb);
  }
}

export function autoEnhanceParamsFromCanvas(canvas: HTMLCanvasElement): Partial<Adjustments> {
  // Gentle auto-enhance: histogram on luminance and stretch levels lightly.
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return {};
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;

  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const l = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    hist[Math.max(0, Math.min(255, l))]++;
  }

  const total = (canvas.width * canvas.height);
  const lowTarget = Math.floor(total * 0.02);
  const highTarget = Math.floor(total * 0.98);

  let cum = 0;
  let low = 0;
  for (; low < 256; low++) { cum += hist[low]; if (cum >= lowTarget) break; }

  cum = 0;
  let high = 255;
  for (; high >= 0; high--) { cum += hist[high]; if (cum >= (total - highTarget)) break; }

  // Translate into mild brightness/contrast
  // If low is high, contrast is low; if low is too low, brighten a bit.
  const mid = (low + high) / 2;
  const contrast = Math.max(-10, Math.min(18, (128 - (high - low)) * 0.06));
  const brightness = Math.max(-8, Math.min(12, (128 - mid) * 0.05));
  const saturation = 6; // gentle bump

  return { brightness, contrast, saturation, autoEnhanced: true };
}

export function canvasFromBitmap(bitmap: ImageBitmap): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = bitmap.width;
  c.height = bitmap.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  return c;
}
