import type { PresetId, Unit } from "../types";

export const DEFAULT_PRESETS: Array<{ id: PresetId; label: string; width: number; height: number; unit: Unit }> = [
  { id: "IN_35x45", label: "India 35x45 mm", width: 35, height: 45, unit: "mm" },
  { id: "US_2x2", label: "USA 2x2 in", width: 2, height: 2, unit: "in" },
  { id: "CA_50x70", label: "Canada 50x70 mm", width: 50, height: 70, unit: "mm" }
];
