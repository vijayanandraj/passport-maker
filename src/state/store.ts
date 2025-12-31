import { create } from "zustand";
import type { Adjustments, BackgroundSpec, CropState, PhotoSpec, SheetSpec, WizardStep } from "../types";
import { decodeStateFromUrl, encodeStateToUrl } from "../utils/share";
import { DEFAULT_PRESETS } from "../utils/presets";

type AppState = {
  step: WizardStep;

  // source
  imageFile?: File;
  imageUrl?: string; // Object URL
  imageBitmap?: ImageBitmap;

  // spec
  photo: PhotoSpec;

  // crop + adjustments
  crop: CropState;
  croppedAreaPixels?: { x: number; y: number; width: number; height: number };

  adj: Adjustments;

  // background
  bg: BackgroundSpec;

  // sheet
  sheet: SheetSpec;

  // cached render
  lastRenderUrl?: string;

  setStep: (s: WizardStep) => void;

  setImageFile: (file?: File) => Promise<void>;
  setPhoto: (p: Partial<PhotoSpec>) => void;
  setCrop: (c: Partial<CropState>) => void;
  setCroppedAreaPixels: (r: { x: number; y: number; width: number; height: number }) => void;
  setAdj: (a: Partial<Adjustments>) => void;
  setBg: (b: Partial<BackgroundSpec>) => void;
  setSheet: (s: Partial<SheetSpec>) => void;

  syncToUrl: () => void;
  hydrateFromUrl: () => void;
};

const defaultPhoto: PhotoSpec = {
  presetId: "IN_35x45",
  width: 35,
  height: 45,
  unit: "mm",
  dpi: 300
};

const defaultCrop: CropState = { cropX: 0, cropY: 0, zoom: 1, rotation: 0 };

const defaultAdj: Adjustments = { brightness: 0, contrast: 0, saturation: 0, autoEnhanced: false };

const defaultBg: BackgroundSpec = {
  mode: "REMOVED",
  color: "#ffffff",
  featherPx: 2,
  dehalo: 0.35,
  writeNameDate: false
};

const defaultSheet: SheetSpec = {
  paper: "A4",
  dpi: 300,
  marginMm: 5,
  spacingMm: 2,
  requestedCount: 8,
  cutLines: false
};

export const useAppStore = create<AppState>((set, get) => ({
  step: 1,

  photo: { ...defaultPhoto },
  crop: { ...defaultCrop },
  adj: { ...defaultAdj },
  bg: { ...defaultBg },
  sheet: { ...defaultSheet },

  setStep: (s) => set({ step: s }),

  setImageFile: async (file?: File) => {
    const prevUrl = get().imageUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);

    if (!file) {
      set({ imageFile: undefined, imageUrl: undefined, imageBitmap: undefined });
      return;
    }

    const url = URL.createObjectURL(file);
    const bitmap = await createImageBitmap(file);
    set({
      imageFile: file,
      imageUrl: url,
      imageBitmap: bitmap,
      step: 2
    });
  },

  setPhoto: (p) => {
    const next = { ...get().photo, ...p };
    if (p.presetId) {
      const preset = DEFAULT_PRESETS.find(x => x.id === p.presetId);
      if (preset) {
        next.width = preset.width;
        next.height = preset.height;
        next.unit = preset.unit;
      }
    }
    set({ photo: next });
  },

  setCrop: (partial) =>
  set((st) => ({
    crop: { ...st.crop, ...partial }
  })),
  setCroppedAreaPixels: (r) => set({ croppedAreaPixels: r }),
  setAdj: (a) => set({ adj: { ...get().adj, ...a } }),
  setBg: (b) => set({ bg: { ...get().bg, ...b } }),
  setSheet: (s) => set({ sheet: { ...get().sheet, ...s } }),

  syncToUrl: () => {
    const st = get();
    encodeStateToUrl({
      photo: st.photo,
      sheet: st.sheet
    });
  },

  hydrateFromUrl: () => {
    const decoded = decodeStateFromUrl();
    if (!decoded) return;
    const st = get();
    set({
      photo: { ...st.photo, ...decoded.photo },
      sheet: { ...st.sheet, ...decoded.sheet }
    });
  }
}));
