import Cropper from "react-easy-crop";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../state/store";
import Slider from "../ui/Slider";
import { sizeToPx } from "../../utils/units";
import { autoEnhanceParamsFromCanvas, applyAdjustmentsToImageData, canvasFromBitmap } from "../../utils/image";
import { detectFaceOnCanvas } from "../../utils/mediapipe";

export default function StepCrop() {
  const imageUrl = useAppStore(s => s.imageUrl);
  const imageBitmap = useAppStore(s => s.imageBitmap);
  const setStep = useAppStore(s => s.setStep);

  const photo = useAppStore(s => s.photo);
  const crop = useAppStore(s => s.crop);
  const setCrop = useAppStore(s => s.setCrop);
  const setCroppedAreaPixels = useAppStore(s => s.setCroppedAreaPixels);
  const adj = useAppStore(s => s.adj);
  const setAdj = useAppStore(s => s.setAdj);

  const px = useMemo(() => sizeToPx(photo.width, photo.height, photo.unit, photo.dpi), [photo]);
  const aspect = useMemo(() => px.w / px.h, [px]);

  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
    // console.log("croppedAreaPixels", croppedAreaPixels);
  }, [setCroppedAreaPixels]);

  const renderPreview = useCallback(() => {
    if (!imageBitmap || !previewRef.current) return;

    // Quick preview: draw full image and apply adjustments (no crop)
    const c = previewRef.current;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    c.width = 360;
    c.height = Math.round(360 / aspect);

    // fit image
    const scale = Math.min(c.width / imageBitmap.width, c.height / imageBitmap.height);
    const dw = Math.round(imageBitmap.width * scale);
    const dh = Math.round(imageBitmap.height * scale);
    const dx = Math.round((c.width - dw) / 2);
    const dy = Math.round((c.height - dh) / 2);

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(imageBitmap, dx, dy, dw, dh);

    const img = ctx.getImageData(0, 0, c.width, c.height);
    applyAdjustmentsToImageData(img, adj);
    ctx.putImageData(img, 0, 0);
  }, [imageBitmap, aspect, adj]);

  // Render preview when sliders change
  useMemo(() => { renderPreview(); }, [renderPreview]);

  const doAutoEnhance = async () => {
    if (!imageBitmap) return;
    setBusy("Auto enhancing...");
    try {
      const src = canvasFromBitmap(imageBitmap);
      const params = autoEnhanceParamsFromCanvas(src);
      setAdj({ ...params });
    } finally {
      setBusy(null);
    }
  };

  const doAutoCenterFace = async () => {
    if (!imageBitmap) return;
    setBusy("Detecting face...");
    try {
      // use a downscaled canvas for face detection to be faster
      const maxW = 640;
      const scale = Math.min(1, maxW / imageBitmap.width);
      const c = document.createElement("canvas");
      c.width = Math.round(imageBitmap.width * scale);
      c.height = Math.round(imageBitmap.height * scale);
      const ctx = c.getContext("2d")!;
      ctx.drawImage(imageBitmap, 0, 0, c.width, c.height);

      const face = await detectFaceOnCanvas(c);
      if (!face) {
        alert("No face detected. Try a clearer, front-facing photo.");
        return;
      }

      const faceCx = (face.x + face.w / 2) / c.width;
      const faceCy = (face.y + face.h / 2) / c.height;

      // Head sizing: smaller number => zoom out => more shoulders
      const desiredFaceFrac = 0.40; // try 0.38..0.42
      const faceFrac = face.h / c.height;
      const zoom = Math.max(1, Math.min(3, faceFrac > 0 ? desiredFaceFrac / faceFrac : 1));

      // Framing bias: move face slightly up in the final frame
      const shoulderBias = 0.08; // try 0.06..0.12

      // react-easy-crop crop coords are "percent-ish"; these constants are just scaling knobs
      const dx = (0.5 - faceCx) * 160;
      const dy = (0.5 - (faceCy - shoulderBias)) * 160;

      setCrop({ cropX: dx, cropY: dy, zoom });
    } finally {
      setBusy(null);
    }
  };

  if (!imageUrl) {
    return (
      <div className="small">
        Upload an image in Step 1 first.
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col grow">
        <div className="cropArea">
          <Cropper
            image={imageUrl}
            crop={{ x: crop.cropX, y: crop.cropY }}
            zoom={crop.zoom}
            rotation={crop.rotation}
            aspect={aspect}
            onCropChange={(c) => setCrop({ cropX: c.x, cropY: c.y })}
            onZoomChange={(z) => setCrop({ zoom: z })}
            onRotationChange={(r) => setCrop({ rotation: r })}
            onCropComplete={onCropComplete}
            showGrid={false}
            cropShape="rect"
          />
        </div>

        {/* changed: row -> row wrap */}
        <div className="row wrap" style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => setStep(1)}>Back</button>
          <button className="btn good" onClick={doAutoCenterFace} disabled={!!busy}>Auto Center Face</button>
          <button className="btn good" onClick={doAutoEnhance} disabled={!!busy}>Auto Enhance</button>

          <button
            className="btn primary"
            onClick={() => {
              // If user never moved the crop, onCropComplete might not have fired yet.
              // So we nudge zoom slightly to force Cropper to compute pixels, then go next.
              setCrop({ zoom: crop.zoom + 0.0001 });
              setTimeout(() => setStep(3), 0);
            }}
          >
            Save & Next
          </button>
        </div>

        {busy && <div className="small" style={{ marginTop: 8 }}>{busy}</div>}
      </div>

      {/* changed: add rightPane class */}
      <div className="col rightPane" style={{ width: 340 }}>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Adjustments</div>
          <Slider label="Brightness" value={adj.brightness} min={-100} max={100} onChange={(v) => setAdj({ brightness: v, autoEnhanced: false })} />
          <Slider label="Contrast" value={adj.contrast} min={-100} max={100} onChange={(v) => setAdj({ contrast: v, autoEnhanced: false })} />
          <Slider label="Saturation" value={adj.saturation} min={-100} max={100} onChange={(v) => setAdj({ saturation: v, autoEnhanced: false })} />

          <div className="hr" />
          <div className="small">
            Output: {px.w} x {px.h}px at {photo.dpi} DPI.
          </div>
        </div>

        <div className="card previewBox">
          <canvas ref={previewRef} className="previewCanvas" />
        </div>
      </div>
    </div>
  );
}
