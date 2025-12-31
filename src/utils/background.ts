// src/utils/background.ts

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "#ffffff").replace("#", "").trim();
  const v = parseInt(
    h.length === 3 ? h.split("").map(c => c + c).join("") : h,
    16
  );
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  return [r, g, b];
}

// Convert 0..255 mask to 0..1 alpha
function u8ToAlpha(mask: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = mask[i] / 255;
  return out;
}

// Box blur for tiny radii (0..3)
function blurMask(alpha: Float32Array, w: number, h: number, radius: number): Float32Array {
  if (radius <= 0) return alpha;

  const r = Math.min(3, Math.max(1, Math.round(radius)));
  const out = new Float32Array(alpha.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;

      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += alpha[yy * w + xx];
          count++;
        }
      }

      out[y * w + x] = count > 0 ? (sum / count) : 0;
    }
  }
  return out;
}

// Simple erosion (shrinks foreground a bit) to reduce halo.
// amount: 0..1 where 0 = none, 1 = strong
function erodeMask(alpha: Float32Array, w: number, h: number, amount: number): Float32Array {
  if (amount <= 0) return alpha;

  // Map amount -> radius 0..2 (keep it small)
  const r = Math.max(0, Math.min(2, Math.round(amount * 2)));
  if (r === 0) return alpha;

  const out = new Float32Array(alpha.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 1;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const a = alpha[yy * w + xx];
          if (a < m) m = a;
        }
      }
      out[y * w + x] = m;
    }
  }

  return out;
}

/**
 * Composite src over a solid background using a mask.
 * mask: Uint8ClampedArray 0..255 (255 = keep src, 0 = background)
 * featherPx: 0..3 (blur radius)
 * dehalo: 0..1 (we erode mask slightly)
 */
export function compositeWithMask(
  src: HTMLCanvasElement,
  mask: Uint8ClampedArray,
  mw: number,
  mh: number,
  bgColor: string,
  featherPx: number,
  dehalo: number
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;

  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  const octx = out.getContext("2d", { willReadFrequently: true })!;

  const srcImg = sctx.getImageData(0, 0, src.width, src.height);
  const dstImg = octx.createImageData(out.width, out.height);

  const [br, bg, bb] = hexToRgb(bgColor);

  // Safety: clamp mw/mh
  const safeMw = Math.max(1, mw | 0);
  const safeMh = Math.max(1, mh | 0);

  // Convert to float alpha and apply feather/dehalo in mask space
  let alpha = u8ToAlpha(mask);
  alpha = blurMask(alpha, safeMw, safeMh, featherPx);
  alpha = erodeMask(alpha, safeMw, safeMh, dehalo);

  for (let y = 0; y < out.height; y++) {
    const my = Math.min(safeMh - 1, Math.floor((y / out.height) * safeMh));

    for (let x = 0; x < out.width; x++) {
      const mx = Math.min(safeMw - 1, Math.floor((x / out.width) * safeMw));
      const mi = my * safeMw + mx;

      let a = alpha[mi];
      if (!Number.isFinite(a)) a = 0;
      if (a < 0) a = 0;
      if (a > 1) a = 1;

      const i = (y * out.width + x) * 4;

      const sr = srcImg.data[i + 0];
      const sg = srcImg.data[i + 1];
      const sb = srcImg.data[i + 2];

      dstImg.data[i + 0] = Math.round(sr * a + br * (1 - a));
      dstImg.data[i + 1] = Math.round(sg * a + bg * (1 - a));
      dstImg.data[i + 2] = Math.round(sb * a + bb * (1 - a));
      dstImg.data[i + 3] = 255;
    }
  }

  octx.putImageData(dstImg, 0, 0);
  return out;
}
