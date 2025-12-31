import { useMemo } from "react";
import { useAppStore } from "../../state/store";
import { DEFAULT_PRESETS } from "../../utils/presets";
import { sizeToPx } from "../../utils/units";
import FilePicker from "../ui/FilePicker";

export default function StepSize() {
  const photo = useAppStore(s => s.photo);
  const setPhoto = useAppStore(s => s.setPhoto);
  const setImageFile = useAppStore(s => s.setImageFile);
  const syncToUrl = useAppStore(s => s.syncToUrl);

  const px = useMemo(() => sizeToPx(photo.width, photo.height, photo.unit, photo.dpi), [photo]);

  return (
    <div className="row">
      <div className="col grow">
        <div className="grid2">
          <div>
            <label>Preset</label>
            <div className="pills">
              {DEFAULT_PRESETS.map(p => (
                <div
                  key={p.id}
                  className={`pill ${photo.presetId === p.id ? "active" : ""}`}
                  onClick={() => { setPhoto({ presetId: p.id }); syncToUrl(); }}
                >
                  {p.label}
                </div>
              ))}
              <div
                className={`pill ${!photo.presetId ? "active" : ""}`}
                onClick={() => { setPhoto({ presetId: undefined }); syncToUrl(); }}
              >
                Custom
              </div>
            </div>
          </div>

          <div>
            <label>DPI</label>
            <input
              className="input"
              type="number"
              value={photo.dpi}
              min={72}
              max={600}
              onChange={(e) => { setPhoto({ dpi: Number(e.target.value) }); syncToUrl(); }}
            />
          </div>

          <div>
            <label>Width</label>
            <input
              className="input"
              type="number"
              value={photo.width}
              onChange={(e) => { setPhoto({ width: Number(e.target.value), presetId: undefined }); syncToUrl(); }}
            />
          </div>

          <div>
            <label>Height</label>
            <input
              className="input"
              type="number"
              value={photo.height}
              onChange={(e) => { setPhoto({ height: Number(e.target.value), presetId: undefined }); syncToUrl(); }}
            />
          </div>

          <div>
            <label>Unit</label>
            <select
              value={photo.unit}
              onChange={(e) => { setPhoto({ unit: e.target.value as any, presetId: undefined }); syncToUrl(); }}
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="in">inch</option>
              <option value="px">px</option>
            </select>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Computed Output</div>
            <div className="small">
              Output pixels: <b>{px.w}</b> x <b>{px.h}</b><br />
              Aspect ratio: <b>{(px.w / px.h).toFixed(4)}</b><br />
              Shareable URL tracks size/preset/DPI.
            </div>
          </div>
        </div>

        <div className="hr" />

        <FilePicker onPick={(f) => void setImageFile(f)} />
      </div>

      <div className="col" style={{ width: 320 }}>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>What happens next</div>
          <div className="small">
            1) Crop with face guide + auto center<br />
            2) Enhance (optional)<br />
            3) Remove background and set BG color<br />
            4) Download single or print sheet (A4/A3/4x6/custom)
          </div>
        </div>
      </div>
    </div>
  );
}
