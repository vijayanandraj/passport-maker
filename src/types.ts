export type Unit = "mm" | "cm" | "in" | "px";

export type PresetId = "IN_35x45" | "US_2x2" | "CA_50x70";

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
  dehalo: number;
  writeNameDate: boolean;
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
