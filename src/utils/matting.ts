// src/utils/matting.ts
//
// Alpha matting refinement.
//
// The segmentation model returns a 256x256 confidence mask. Scaled up to a passport photo
// that is roughly one mask pixel per two output pixels, which is far coarser than a strand of
// hair — so a fuzzy hairline or a ribbon comes out as a soft blob and reads as "cut off",
// no matter how the mask is thresholded or feathered.
//
// This module throws away the mask's edge and re-derives it from the image itself:
//
//   1. widen the mask's boundary into an "unknown" band that generously covers stray hair
//   2. inside that band, estimate the local foreground and background colours
//   3. solve the compositing equation  I = aF + (1-a)B  for `a` per pixel
//   4. clean the result up with a guided filter, which follows image edges, not mask edges
//   5. unmix the old background colour back out of the semi-transparent pixels
//
// Steps 2-4 run at full output resolution, so single strands that are visible against the
// backdrop come back even though the model never resolved them.

export type MatteOptions = {
  /** 0..1 — pulls faint fringe out of the matte. 0 keeps everything the matting found. */
  tighten: number;
  /** Extra blur on the finished alpha, in output pixels. */
  featherPx: number;
};

/**
 * How far out from the mask's edge stray hair is hunted for, in units of ~1% of the photo's
 * short side. Tuned on frizzy-hair portraits: below ~8 the outermost strands are missed,
 * above ~12 a textured backdrop starts to show through as haze.
 */
const BAND_SCALE = 12;

export type Matte = {
  /** Refined alpha, one float per output pixel. */
  alpha: Float32Array;
  /** Foreground colour with the old background unmixed out, RGB interleaved. */
  fg: Float32Array;
};

/** Mask value at or above which a pixel is taken as solid foreground and left untouched. */
const CONFIDENT_FG = 0.9;

function clamp01(a: number) {
  return a < 0 ? 0 : a > 1 ? 1 : a;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Mean over a (2r+1)² window, normalised by the actual window area so edges don't darken.
 * Uses an integral image, so cost is independent of the radius.
 */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h);
  if (r <= 0) {
    out.set(src);
    return out;
  }

  const stride = w + 1;
  const integral = new Float64Array(stride * (h + 1));

  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    const rowIn = y * w;
    const rowAbove = y * stride;
    const rowCur = (y + 1) * stride;
    for (let x = 0; x < w; x++) {
      rowSum += src[rowIn + x];
      integral[rowCur + x + 1] = integral[rowAbove + x + 1] + rowSum;
    }
  }

  for (let y = 0; y < h; y++) {
    const y0 = y - r > 0 ? y - r : 0;
    const y1 = y + r < h - 1 ? y + r : h - 1;
    const top = y0 * stride;
    const bottom = (y1 + 1) * stride;
    const rowOut = y * w;

    for (let x = 0; x < w; x++) {
      const x0 = x - r > 0 ? x - r : 0;
      const x1 = x + r < w - 1 ? x + r : w - 1;

      const sum =
        integral[bottom + x1 + 1] - integral[bottom + x0] - integral[top + x1 + 1] + integral[top + x0];
      const area = (y1 - y0 + 1) * (x1 - x0 + 1);
      out[rowOut + x] = sum / area;
    }
  }

  return out;
}

/** Bilinear sample of the coarse mask, in mask coordinates. */
function sampleBilinear(alpha: Float32Array, w: number, h: number, fx: number, fy: number): number {
  if (fx < 0) fx = 0;
  if (fy < 0) fy = 0;
  if (fx > w - 1) fx = w - 1;
  if (fy > h - 1) fy = h - 1;

  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);

  const tx = fx - x0;
  const ty = fy - y0;

  const a0 = alpha[y0 * w + x0] * (1 - tx) + alpha[y0 * w + x1] * tx;
  const a1 = alpha[y1 * w + x0] * (1 - tx) + alpha[y1 * w + x1] * tx;
  return a0 * (1 - ty) + a1 * ty;
}

/** Coarse mask, scaled up to the output grid. */
function upsampleMask(
  mask: Float32Array,
  mw: number,
  mh: number,
  w: number,
  h: number
): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = ((y + 0.5) / h) * mh - 0.5;
    for (let x = 0; x < w; x++) {
      const fx = ((x + 0.5) / w) * mw - 0.5;
      out[y * w + x] = clamp01(sampleBilinear(mask, mw, mh, fx, fy));
    }
  }
  return out;
}

/**
 * Average colour of the pixels selected by `weight`, over progressively larger windows.
 *
 * Hair sits in a band where neither pure foreground nor pure background is nearby, so a
 * single radius either misses (no samples) or over-smooths (colour from the wrong region).
 * Growing the radius only where coverage is too thin keeps the estimate local where it can be.
 */
function localColor(
  rgb: Float32Array,
  weight: Float32Array,
  w: number,
  h: number,
  radii: number[]
): Float32Array {
  const n = w * h;
  const wr = new Float32Array(n);
  const wg = new Float32Array(n);
  const wb = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const k = weight[i];
    wr[i] = rgb[i * 3] * k;
    wg[i] = rgb[i * 3 + 1] * k;
    wb[i] = rgb[i * 3 + 2] * k;
  }

  const out = new Float32Array(n * 3);
  const filled = new Uint8Array(n);
  const MIN_COVERAGE = 0.02;

  let globalR = 0;
  let globalG = 0;
  let globalB = 0;
  let globalW = 0;
  for (let i = 0; i < n; i++) {
    globalR += wr[i];
    globalG += wg[i];
    globalB += wb[i];
    globalW += weight[i];
  }
  if (globalW > 0) {
    globalR /= globalW;
    globalG /= globalW;
    globalB /= globalW;
  }

  for (const r of radii) {
    const cov = boxBlur(weight, w, h, r);
    const sr = boxBlur(wr, w, h, r);
    const sg = boxBlur(wg, w, h, r);
    const sb = boxBlur(wb, w, h, r);

    let remaining = false;
    for (let i = 0; i < n; i++) {
      if (filled[i]) continue;
      const c = cov[i];
      if (c >= MIN_COVERAGE) {
        out[i * 3] = sr[i] / c;
        out[i * 3 + 1] = sg[i] / c;
        out[i * 3 + 2] = sb[i] / c;
        filled[i] = 1;
      } else {
        remaining = true;
      }
    }
    if (!remaining) return out;
  }

  for (let i = 0; i < n; i++) {
    if (filled[i]) continue;
    out[i * 3] = globalR;
    out[i * 3 + 1] = globalG;
    out[i * 3 + 2] = globalB;
  }

  return out;
}

/**
 * Edge-aware smoothing of `p`, guided by luminance `guide` (He et al.).
 * Noise in the estimated alpha is removed while real image edges stay put.
 */
function guidedFilter(
  guide: Float32Array,
  p: Float32Array,
  w: number,
  h: number,
  r: number,
  eps: number
): Float32Array {
  const n = w * h;

  const meanI = boxBlur(guide, w, h, r);
  const meanP = boxBlur(p, w, h, r);

  const ip = new Float32Array(n);
  const ii = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    ip[i] = guide[i] * p[i];
    ii[i] = guide[i] * guide[i];
  }

  const meanIP = boxBlur(ip, w, h, r);
  const meanII = boxBlur(ii, w, h, r);

  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const varI = meanII[i] - meanI[i] * meanI[i];
    const covIP = meanIP[i] - meanI[i] * meanP[i];
    const ai = covIP / (varI + eps);
    a[i] = ai;
    b[i] = meanP[i] - ai * meanI[i];
  }

  const meanA = boxBlur(a, w, h, r);
  const meanB = boxBlur(b, w, h, r);

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = meanA[i] * guide[i] + meanB[i];
  return out;
}

/**
 * Refine a coarse segmentation mask into a real alpha matte for `img`.
 */
export function refineMatte(
  img: ImageData,
  mask: Float32Array,
  mw: number,
  mh: number,
  opts: MatteOptions
): Matte {
  const w = img.width;
  const h = img.height;
  const n = w * h;

  // Everything works in 0..1 floats.
  const rgb = new Float32Array(n * 3);
  const luma = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = img.data[i * 4] / 255;
    const g = img.data[i * 4 + 1] / 255;
    const b = img.data[i * 4 + 2] / 255;
    rgb[i * 3] = r;
    rgb[i * 3 + 1] = g;
    rgb[i * 3 + 2] = b;
    luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const raw = upsampleMask(mask, mw, mh, w, h);

  // Firm up what the model did see, before extending past it.
  //
  // The model reports middling confidence for anything it half-recognises — a translucent
  // hair ribbon, a pale collar — and leaving those at face value composites them as
  // half-transparent, which drains their colour into the new background. Anything it is even
  // moderately sure about becomes solid; the silhouette itself is re-derived below anyway.
  const coarse = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) coarse[i] = smoothstep(0.1, 0.5, raw[i]);

  // Scale the working radii with the photo so behaviour is resolution independent.
  const unit = Math.max(1, Math.round(Math.min(w, h) / 100)); // ~4px on a 413x531 photo
  const bandRadius = Math.max(2, Math.round(unit * BAND_SCALE));
  const guideRadius = Math.max(2, unit);

  // Confident regions. These seed the colour estimates, so keep them strict.
  const fgSeed = new Float32Array(n);
  const bgSeed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    fgSeed[i] = coarse[i] > 0.9 ? 1 : 0;
    bgSeed[i] = coarse[i] < 0.1 ? 1 : 0;
  }

  const F = localColor(rgb, fgSeed, w, h, [bandRadius * 2, bandRadius * 4, bandRadius * 8]);
  const B = localColor(rgb, bgSeed, w, h, [bandRadius * 2, bandRadius * 4, bandRadius * 8]);

  // The band where the matte is actually re-derived: everything within `bandRadius` of the
  // mask's own transition. Blurring the mask and testing for "not saturated" gives exactly
  // that region without a separate morphology pass.
  const spread = boxBlur(coarse, w, h, bandRadius);

  // Solve I = aF + (1-a)B for a, by projecting I onto the F-B colour line.
  const estimated = new Float32Array(n);
  const confidence = new Float32Array(n);
  const notBackground = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const dr = F[i * 3] - B[i * 3];
    const dg = F[i * 3 + 1] - B[i * 3 + 1];
    const db = F[i * 3 + 2] - B[i * 3 + 2];
    const denom = dr * dr + dg * dg + db * db;

    const ir = rgb[i * 3] - B[i * 3];
    const ig = rgb[i * 3 + 1] - B[i * 3 + 1];
    const ib = rgb[i * 3 + 2] - B[i * 3 + 2];

    const a = denom > 1e-6 ? clamp01((ir * dr + ig * dg + ib * db) / denom) : coarse[i];
    estimated[i] = a;

    // Where foreground and background look alike the projection is meaningless, so lean on
    // the model's mask instead. 0.02 ~ colours differing by about 15% of the range.
    const separation = denom / (denom + 0.02);

    // How well `a` actually explains this pixel. A wrinkle or shadow in the backdrop is not
    // a mixture of the local hair and backdrop colours, so it leaves a large residual and
    // gets ignored — which is what makes a wide search band safe.
    const pr = ir - a * dr;
    const pg = ig - a * dg;
    const pb = ib - a * db;
    const residual = pr * pr + pg * pg + pb * pb;
    const explained = 0.004 / (0.004 + residual);

    confidence[i] = separation * explained;

    // Independently: how unlike the backdrop is this pixel? A blue hair ribbon is neither
    // hair nor backdrop, so the mixture model above cannot place it — but it is obviously
    // not the wall behind her. Backdrop texture and shadow move colour by a few percent;
    // an actual object moves it far more.
    notBackground[i] = smoothstep(0.18, 0.35, Math.sqrt(ir * ir + ig * ig + ib * ib));
  }

  // The band reaches *outward* only. Anything the model is already confident is foreground —
  // a hair ribbon, a collar, skin — is left alone: its true colour is nothing like the local
  // hair/backdrop pair, so the colour-line estimate would read it as half-transparent and
  // wash it out. Widening is only ever about recovering strands the model missed.
  const merged = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (coarse[i] >= CONFIDENT_FG) {
      merged[i] = 1;
      continue;
    }
    if (spread[i] <= 0.004) {
      merged[i] = 0;
      continue;
    }
    // Where the mixture model holds, use its soft alpha — that is what keeps single hairs
    // looking like hair. Where it does not, fall back on whether the pixel even resembles
    // the backdrop, which is what rescues ribbons, clips and other objects the model missed.
    const trust = confidence[i];
    merged[i] = estimated[i] * trust + Math.max(coarse[i], notBackground[i]) * (1 - trust);
  }

  let alpha = guidedFilter(luma, merged, w, h, guideRadius, 1e-4);

  // Re-assert the confident regions: the guided filter would otherwise bleed the band's
  // softness back into solid areas.
  for (let i = 0; i < n; i++) {
    let a = clamp01(alpha[i]);
    if (coarse[i] >= CONFIDENT_FG) a = 1;
    if (spread[i] <= 0.004) a = 0;
    alpha[i] = a;
  }

  if (opts.tighten > 0) {
    // Linear pull-down: shaves faint fringe without eating anything solid.
    const cut = 0.35 * clamp01(opts.tighten);
    for (let i = 0; i < n; i++) alpha[i] = clamp01((alpha[i] - cut) / (1 - cut));
  }

  if (opts.featherPx > 0) {
    alpha = boxBlur(alpha, w, h, Math.round(opts.featherPx));
  }

  // Unmix the old background out of partly transparent pixels, so pale hair doesn't keep a
  // rim of the room it was photographed in.
  const fg = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = alpha[i];
    if (a >= 0.995) {
      fg[i * 3] = rgb[i * 3];
      fg[i * 3 + 1] = rgb[i * 3 + 1];
      fg[i * 3 + 2] = rgb[i * 3 + 2];
      continue;
    }

    const safe = Math.max(a, 0.15);
    for (let c = 0; c < 3; c++) {
      const unmixed = (rgb[i * 3 + c] - (1 - a) * B[i * 3 + c]) / safe;
      // Blend back towards the raw pixel where alpha is low and the estimate is unstable.
      const trust = clamp01((a - 0.05) / 0.45);
      fg[i * 3 + c] = clamp01(unmixed * trust + rgb[i * 3 + c] * (1 - trust));
    }
  }

  return { alpha, fg };
}
