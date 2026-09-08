export type Unit = "mm" | "cm" | "in" | "px";

/** Preset identifier — ISO 3166-1 alpha-3 where there is one (see utils/presets.ts). */
export type PresetId = string;

export type PhotoSpec = {
  presetId?: PresetId;
  width: number;
  height: number;
  unit: Unit;
  dpi: number;
};

export type CropState = {
  cropX: number;   // react-easy-crop: -100..100 roughly
  cropY: number;
  zoom: number;    // 1..3 typically
  rotation: number; // degrees
};

export type Adjustments = {
  brightness: number; // -100..100
  contrast: number;   // -100..100
  saturation: number; // -100..100
  autoEnhanced: boolean;
};

export type BackgroundMode = "ORIGINAL" | "REMOVED";

export type BackgroundSpec = {
  mode: BackgroundMode;
  color: string;
  featherPx: number;
  /** 0..1 — pulls the cut-out edge in to remove a colour fringe, without eroding the mask. */
  edgeTighten: number;
};


export type PaperId = "A4" | "A3" | "P4x6" | "CUSTOM";

export type SheetSpec = {
  paper: PaperId;
  dpi: number;
  customWidth?: number;
  customHeight?: number;
  customUnit?: Unit;
  marginMm: number;
  spacingMm: number;
  requestedCount: number;
  cutLines: boolean;
};

export type WizardStep = 1 | 2 | 3 | 4;
