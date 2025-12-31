import { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { useAppStore } from "../../state/store";
import Slider from "../ui/Slider";
import { sizeToPx } from "../../utils/units";
import { getCroppedCanvas } from "../../utils/cropper";
import { applyAdjustmentsToImageData } from "../../utils/image";
import { segmentCanvas } from "../../utils/mediapipe";
import { compositeWithMask } from "../../utils/background";

type PreviewKind = "ORIGINAL" | "REMOVED";

export default function StepBackground() {
  const setStep = useAppStore(s => s.setStep);

  const imageBitmap = useAppStore(s => s.imageBitmap);
  const photo = useAppStore(s => s.photo);
  const crop = useAppStore(s => s.crop);
  const croppedAreaPixels = useAppStore(s => s.croppedAreaPixels);
  const adj = useAppStore(s => s.adj);

  const bg = useAppStore(s => s.bg);
  const setBg = useAppStore(s => s.setBg);

  const outPx = useMemo(() => sizeToPx(photo.width, photo.height, photo.unit, photo.dpi), [photo]);

  const origRef = useRef<HTMLCanvasElement | null>(null);
  const remRef = useRef<HTMLCanvasElement | null>(null);

  const [busy, setBusy] = useState<string | null>(null);

  const buildTileBase = async (): Promise<HTMLCanvasElement> => {
    if (!imageBitmap || !croppedAreaPixels) throw new Error("Missing image/crop");
    const cropped = await getCroppedCanvas(
      imageBitmap,
      croppedAreaPixels,
      crop.rotation,
      outPx.w,
      outPx.h
    );

    const ctx = cropped.getContext("2d", { willReadFrequently: true })!;
    const img = ctx.getImageData(0, 0, cropped.width, cropped.height);
    applyAdjustmentsToImageData(img, adj);
    ctx.putImageData(img, 0, 0);
    return cropped;
  };

  const renderPreviews = async () => {
    if (!origRef.current || !remRef.current) return;
    setBusy("Rendering previews...");
    try {
      const base = await buildTileBase();

      // ORIGINAL preview
      {
        const c = origRef.current;
        c.width = base.width;
        c.height = base.height;
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(base, 0, 0);
      }

      // REMOVED preview (segmentation)
      {
        const mask = await segmentCanvas(base);
        const removed = compositeWithMask(base, mask.data, mask.width, mask.height, bg.color, bg.featherPx, bg.dehalo);

        const c = remRef.current;
        c.width = removed.width;
        c.height = removed.height;
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(removed, 0, 0);
      }
    } finally {
      setBusy(null);
    }
  };


  useEffect(() => {
  if (imageBitmap && croppedAreaPixels) {
    void renderPreviews();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageBitmap, croppedAreaPixels, photo.width, photo.height, photo.dpi, photo.unit]);
  
  const selectMode = (mode: PreviewKind) => {
    setBg({ mode });
  };

  const onColorChange = async (hex: string) => {
    setBg({ color: hex });
    await renderPreviews();
  };

  const onFeatherChange = async (v: number) => {
    setBg({ featherPx: v });
    await renderPreviews();
  };

  const onDehaloChange = async (v: number) => {
    setBg({ dehalo: v / 100 });
    await renderPreviews();
  };

  if (!imageBitmap) return <div className="small">Upload an image in Step 0/1 first.</div>;
  if (!croppedAreaPixels) return <div className="small">Finish crop in Step 2 first.</div>;

  return (
    <div className="col">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="col grow">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Select Background Style</div>

          <div className="row" style={{ gap: 14 }}>
            {/* Original card */}
            <div
              className={`bgCard ${bg.mode === "ORIGINAL" ? "active" : ""}`}
              onClick={() => selectMode("ORIGINAL")}
            >
              <div className="bgCardTitle">Original</div>
              <div className="bgCardBody">
                <canvas ref={origRef} className="bgCanvas" />
              </div>
            </div>

            {/* Removed card */}
            <div
              className={`bgCard ${bg.mode === "REMOVED" ? "active" : ""}`}
              onClick={() => selectMode("REMOVED")}
            >
              <div className="bgCardTitleRow">
                <div className="bgCardTitle">Background</div>
                {bg.mode === "REMOVED" && <div className="bgSelectedTag">Selected</div>}
              </div>

              <div className="bgCardBody">
                <canvas ref={remRef} className="bgCanvas" />
              </div>

              <div className="bgCardFooter" onClick={(e) => e.stopPropagation()}>
                <label style={{ margin: 0 }}>BG Color</label>
                <input
                  type="color"
                  value={bg.color}
                  onChange={(e) => void onColorChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12, alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={bg.writeNameDate}
                onChange={(e) => setBg({ writeNameDate: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Write Name & Date on Image
            </label>

            <button className="btn" onClick={() => void renderPreviews()} disabled={!!busy}>
              Refresh Preview
            </button>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="grid2">
              <div>
                <Slider label="Feather Edge (px)" value={bg.featherPx} min={0} max={3} step={1} onChange={(v) => void onFeatherChange(v)} />
              </div>
              <div>
                <Slider label="Dehalo" value={Math.round(bg.dehalo * 100)} min={0} max={100} step={5} onChange={(v) => void onDehaloChange(v)} />
              </div>
            </div>
            <div className="small" style={{ marginTop: 6 }}>
              Tip: Off-white (#f8f8f8) often looks more natural than pure white.
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setStep(2)}>Back</button>
            <button className="btn primary" onClick={() => setStep(4)}>Save & Next</button>
          </div>

          {busy && <div className="small" style={{ marginTop: 8 }}>{busy}</div>}
        </div>
      </div>
    </div>
  );
}
