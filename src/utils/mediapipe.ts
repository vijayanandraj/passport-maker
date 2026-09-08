import { FilesetResolver, ImageSegmenter, FaceDetector } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";

/**
 * Two segmentation models:
 *
 * - "multiclass" (default): selfie_multiclass_256x256 has a dedicated *hair* class,
 *   so fine hair at the silhouette survives instead of being clipped to the head shape.
 *   Person alpha = 1 - background confidence.
 *
 * - "selfie": the older single-mask selfie segmenter. Kept as a fallback because it is
 *   smaller/faster, and occasionally steadier on very low-contrast photos.
 */
export type SegModel = "multiclass" | "selfie";

const MODEL_URLS: Record<SegModel, string> = {
  multiclass:
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
  selfie:
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite"
};

const segmenters: Partial<Record<SegModel, ImageSegmenter>> = {};
let faceDetector: FaceDetector | null = null;

export async function getSegmenter(model: SegModel = "multiclass"): Promise<ImageSegmenter> {
  const existing = segmenters[model];
  if (existing) return existing;

  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  const seg = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URLS[model] },
    runningMode: "IMAGE",
    outputConfidenceMasks: true,
    outputCategoryMask: false
  });

  segmenters[model] = seg;
  return seg;
}

export async function getFaceDetector(): Promise<FaceDetector> {
  if (faceDetector) return faceDetector;

  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);

  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite"
    },
    runningMode: "IMAGE"
  });

  return faceDetector;
}

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export type Mask = {
  width: number;
  height: number;
  data: Float32Array; // alpha 0..1, where 1 = person
};

/**
 * Returns a soft person alpha mask for the given canvas.
 *
 * The multiclass model emits one confidence mask per class
 * (0 background, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 accessories),
 * so "person" is simply everything that is not background.
 */
export async function segmentCanvas(
  src: HTMLCanvasElement,
  model: SegModel = "multiclass"
): Promise<Mask> {
  const seg = await getSegmenter(model);
  const result = await seg.segment(src);

  const masks = result.confidenceMasks;
  if (!masks || masks.length === 0) throw new Error("Segmentation confidence mask not available");

  if (model === "multiclass" && masks.length > 1) {
    const background = masks[0];
    const bgData = background.getAsFloat32Array();

    const out = new Float32Array(bgData.length);
    for (let i = 0; i < bgData.length; i++) out[i] = clamp01(1 - bgData[i]);

    const size = { width: background.width, height: background.height };
    result.close();
    return { ...size, data: out };
  }

  // Single-mask selfie segmenter: [0] = background, [1] = person (when both are present).
  const cm = masks[1] ?? masks[0];
  const raw = cm.getAsFloat32Array();

  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = clamp01(raw[i]);

  const size = { width: cm.width, height: cm.height };
  result.close();
  return { ...size, data: out };
}

export type FaceBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Normalised (0..1) eye positions when the detector reports keypoints. */
  leftEye?: { x: number; y: number };
  rightEye?: { x: number; y: number };
};

/**
 * Face detection helper used by auto-framing.
 * Coordinates are in pixels of the canvas that was passed in.
 */
export async function detectFaceOnCanvas(canvas: HTMLCanvasElement): Promise<FaceBox | null> {
  const fd = await getFaceDetector();
  const res = fd.detect(canvas);
  if (!res.detections || res.detections.length === 0) return null;

  // Prefer the largest face, falling back to detector confidence for ties.
  const det = res.detections
    .slice()
    .sort((a, b) => {
      const areaA = (a.boundingBox?.width ?? 0) * (a.boundingBox?.height ?? 0);
      const areaB = (b.boundingBox?.width ?? 0) * (b.boundingBox?.height ?? 0);
      if (areaB !== areaA) return areaB - areaA;
      return (b.categories?.[0]?.score ?? 0) - (a.categories?.[0]?.score ?? 0);
    })[0];

  const bb = det.boundingBox;
  if (!bb) return null;

  // BlazeFace keypoint order: right eye, left eye, nose tip, mouth, right ear, left ear.
  const kp = det.keypoints;
  const rightEye = kp?.[0] ? { x: kp[0].x, y: kp[0].y } : undefined;
  const leftEye = kp?.[1] ? { x: kp[1].x, y: kp[1].y } : undefined;

  return { x: bb.originX, y: bb.originY, w: bb.width, h: bb.height, rightEye, leftEye };
}
