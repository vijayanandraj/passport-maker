import { FilesetResolver, ImageSegmenter, FaceDetector } from "@mediapipe/tasks-vision";

let segmenter: ImageSegmenter | null = null;
let faceDetector: FaceDetector | null = null;

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";

export async function getSegmenter(): Promise<ImageSegmenter> {
  if (segmenter) return segmenter;

  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  segmenter = await ImageSegmenter.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite"
  } ,
    runningMode: "IMAGE",
    outputCategoryMask: true,
    outputConfidenceMasks: false
    });


  return segmenter;
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


export async function segmentCanvas(src: HTMLCanvasElement): Promise<{
  width: number;
  height: number;
  data: Uint8ClampedArray; // alpha mask 0..255
}> {
  const seg = await getSegmenter();

  const ctx = src.getContext("2d", { willReadFrequently: true })!;
  const imageData = ctx.getImageData(0, 0, src.width, src.height);

  const result = await seg.segment(imageData);

  // With outputCategoryMask: true, MediaPipe returns a categoryMask.
  const cat = result.categoryMask;
  if (!cat) throw new Error("Segmentation mask not available");

  const w = cat.width;
  const h = cat.height;

  // categoryMask is an MPImage-like wrapper; get raw data
  // In JS tasks, categoryMask.getAsUint8Array() is the common API.
  const catData = cat.getAsUint8Array(); // values are category ids, usually 0=bg, 1=person

  // Convert to alpha mask for compositing (person => 255, background => 0)
  const alpha = new Uint8ClampedArray(w * h);
  for (let i = 0; i < catData.length; i++) {
    //alpha[i] = catData[i] !== 0 ? 255 : 0;
    alpha[i] = catData[i] !== 0 ? 0 : 255;


    //alpha[i] = catData[i] === 1 ? 255 : 0;
  }

  return { width: w, height: h, data: alpha };
}


export async function detectFaceOnCanvas(canvas: HTMLCanvasElement) {
  const fd = await getFaceDetector();
  const res = fd.detect(canvas);
  if (!res.detections || res.detections.length === 0) return null;

  // pick highest score
  const det = res.detections
    .slice()
    .sort((a, b) => (b.categories?.[0]?.score ?? 0) - (a.categories?.[0]?.score ?? 0))[0];

  const bb = det.boundingBox;
  if (!bb) return null;

  return { x: bb.originX, y: bb.originY, w: bb.width, h: bb.height };
}
