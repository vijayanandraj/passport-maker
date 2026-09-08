import type { Unit } from "../types";

/**
 * Photo specifications by country.
 *
 * Two things vary between countries, and both matter:
 *
 *  - the print size (35x45mm across most of the world, but 2x2in in the US,
 *    50x70mm in Canada, 33x48mm in China, 26x32mm in Spain...)
 *  - how big the head has to be inside that frame, which is the part most tools ignore.
 *    Canada wants the face to fill under half the frame; Australia and Japan want three
 *    quarters. Cropping every country to the same proportions produces a photo that is the
 *    right size and still gets rejected.
 *
 * `head` is the chin-to-crown height as a fraction of the photo height, taken from the
 * published requirement where there is a clear one. Where a country doesn't publish a
 * figure, `head` is left out and a neutral ICAO-style default is used instead.
 *
 * Requirements do change — the app says as much next to the picker, and every value here
 * stays adjustable by hand.
 */

export type Region = "Africa" | "Americas" | "Asia & Pacific" | "Europe" | "Middle East";

export type Preset = {
  /** ISO 3166-1 alpha-3 where there is one; otherwise a short slug. */
  id: string;
  /** Three-letter badge shown in the picker. Defaults to the first three of `id`. */
  code?: string;
  /** Country or document name, as a traveller would look for it. */
  name: string;
  region: Region;
  width: number;
  height: number;
  unit: Unit;
  /** Chin-to-crown height as a fraction of photo height. */
  head?: { min: number; max: number };
  /** Background the authority asks for, in plain words. */
  background?: string;
  /** Anything else worth knowing before printing. */
  note?: string;
  /** Shown in the "Common" row at the top of the picker. */
  common?: boolean;
};

/** Used when a country publishes no chin-to-crown figure. Mid-range for ICAO photos. */
export const DEFAULT_HEAD = { min: 0.6, max: 0.7 };

export const PRESETS: Preset[] = [
  // ---------------------------------------------------------------- Americas
  {
    id: "USA",
    name: "United States",
    region: "Americas",
    width: 2,
    height: 2,
    unit: "in",
    head: { min: 0.5, max: 0.69 },
    background: "Plain white or off-white",
    note: "Also used for US visas, Green Card and the DV lottery.",
    common: true
  },
  {
    id: "CAN",
    name: "Canada",
    region: "Americas",
    width: 50,
    height: 70,
    unit: "mm",
    head: { min: 0.44, max: 0.51 },
    background: "Plain white or light grey",
    note: "The face must measure 31–36mm chin to crown, so the head sits smaller in frame than most countries.",
    common: true
  },
  { id: "MEX", name: "Mexico", region: "Americas", width: 35, height: 45, unit: "mm", background: "Plain white" },
  {
    id: "BRA",
    name: "Brazil",
    region: "Americas",
    width: 50,
    height: 70,
    unit: "mm",
    background: "Plain white"
  },
  { id: "ARG", name: "Argentina", region: "Americas", width: 40, height: 40, unit: "mm", background: "Plain white" },
  { id: "CHL", name: "Chile", region: "Americas", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "COL", name: "Colombia", region: "Americas", width: 30, height: 40, unit: "mm", background: "Plain white or blue" },
  { id: "PER", name: "Peru", region: "Americas", width: 35, height: 45, unit: "mm", background: "Plain white" },

  // ------------------------------------------------------------ Asia & Pacific
  {
    id: "IND",
    name: "India",
    region: "Asia & Pacific",
    width: 35,
    height: 45,
    unit: "mm",
    head: { min: 0.7, max: 0.8 },
    background: "Plain white",
    note: "The face should fill roughly 70–80% of the frame.",
    common: true
  },
  {
    id: "IND-OCI",
    code: "OCI",
    name: "India — OCI / visa",
    region: "Asia & Pacific",
    width: 51,
    height: 51,
    unit: "mm",
    head: { min: 0.6, max: 0.7 },
    background: "Plain white",
    note: "Square 2x2in format, same as the US."
  },
  {
    id: "CHN",
    name: "China",
    region: "Asia & Pacific",
    width: 33,
    height: 48,
    unit: "mm",
    head: { min: 0.58, max: 0.69 },
    background: "Plain white",
    common: true
  },
  {
    id: "JPN",
    name: "Japan",
    region: "Asia & Pacific",
    width: 35,
    height: 45,
    unit: "mm",
    head: { min: 0.71, max: 0.8 },
    background: "Plain, light and uniform",
    note: "Chin to crown must be 34mm ±2mm."
  },
  {
    id: "AUS",
    name: "Australia",
    region: "Asia & Pacific",
    width: 35,
    height: 45,
    unit: "mm",
    head: { min: 0.71, max: 0.8 },
    background: "Plain, light and uniform",
    note: "The face must measure 32–36mm chin to crown.",
    common: true
  },
  { id: "NZL", name: "New Zealand", region: "Asia & Pacific", width: 35, height: 45, unit: "mm", head: { min: 0.71, max: 0.8 }, background: "Plain, light grey or cream" },
  { id: "KOR", name: "South Korea", region: "Asia & Pacific", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "SGP", name: "Singapore", region: "Asia & Pacific", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "MYS", name: "Malaysia", region: "Asia & Pacific", width: 35, height: 50, unit: "mm", background: "Plain white" },
  { id: "IDN", name: "Indonesia", region: "Asia & Pacific", width: 40, height: 60, unit: "mm", background: "Plain white or red" },
  { id: "THA", name: "Thailand", region: "Asia & Pacific", width: 35, height: 45, unit: "mm", background: "Plain white or light blue" },
  { id: "VNM", name: "Vietnam", region: "Asia & Pacific", width: 40, height: 60, unit: "mm", background: "Plain white" },
  { id: "PHL", name: "Philippines", region: "Asia & Pacific", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "PAK", name: "Pakistan", region: "Asia & Pacific", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "BGD", name: "Bangladesh", region: "Asia & Pacific", width: 45, height: 55, unit: "mm", background: "Plain white" },
  { id: "LKA", name: "Sri Lanka", region: "Asia & Pacific", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "NPL", name: "Nepal", region: "Asia & Pacific", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "TWN", name: "Taiwan", region: "Asia & Pacific", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "HKG", name: "Hong Kong", region: "Asia & Pacific", width: 40, height: 50, unit: "mm", background: "Plain white" },

  // ------------------------------------------------------------------- Europe
  {
    id: "SCHENGEN",
    name: "Schengen area",
    region: "Europe",
    width: 35,
    height: 45,
    unit: "mm",
    head: { min: 0.64, max: 0.76 },
    background: "Plain light grey or cream",
    note: "The shared standard for Schengen visas and most EU passports.",
    common: true
  },
  {
    id: "GBR",
    name: "United Kingdom",
    region: "Europe",
    width: 35,
    height: 45,
    unit: "mm",
    head: { min: 0.64, max: 0.76 },
    background: "Plain light grey or cream",
    note: "Chin to crown must be 29–34mm.",
    common: true
  },
  { id: "DEU", name: "Germany", region: "Europe", width: 35, height: 45, unit: "mm", head: { min: 0.71, max: 0.8 }, background: "Plain light grey", note: "The face must measure 32–36mm chin to crown." },
  { id: "FRA", name: "France", region: "Europe", width: 35, height: 45, unit: "mm", head: { min: 0.64, max: 0.76 }, background: "Plain light grey" },
  { id: "ITA", name: "Italy", region: "Europe", width: 35, height: 45, unit: "mm", head: { min: 0.64, max: 0.76 }, background: "Plain light grey" },
  { id: "ESP", name: "Spain", region: "Europe", width: 26, height: 32, unit: "mm", background: "Plain white", note: "Spain uses an unusually small 26x32mm photo." },
  { id: "NLD", name: "Netherlands", region: "Europe", width: 35, height: 45, unit: "mm", head: { min: 0.64, max: 0.76 }, background: "Plain light grey" },
  { id: "POL", name: "Poland", region: "Europe", width: 35, height: 45, unit: "mm", head: { min: 0.64, max: 0.76 }, background: "Plain light" },
  { id: "PRT", name: "Portugal", region: "Europe", width: 35, height: 45, unit: "mm", head: { min: 0.64, max: 0.76 }, background: "Plain light grey" },
  { id: "IRL", name: "Ireland", region: "Europe", width: 35, height: 45, unit: "mm", head: { min: 0.64, max: 0.76 }, background: "Plain light grey or cream" },
  { id: "CHE", name: "Switzerland", region: "Europe", width: 35, height: 45, unit: "mm", head: { min: 0.64, max: 0.76 }, background: "Plain light grey" },
  { id: "SWE", name: "Sweden", region: "Europe", width: 35, height: 45, unit: "mm", head: { min: 0.64, max: 0.76 }, background: "Plain light grey" },
  { id: "GRC", name: "Greece", region: "Europe", width: 40, height: 60, unit: "mm", background: "Plain white" },
  { id: "RUS", name: "Russia", region: "Europe", width: 35, height: 45, unit: "mm", background: "Plain white or light grey" },
  { id: "UKR", name: "Ukraine", region: "Europe", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "TUR", name: "Türkiye", region: "Europe", width: 50, height: 60, unit: "mm", background: "Plain white" },

  // -------------------------------------------------------------- Middle East
  { id: "ARE", name: "United Arab Emirates", region: "Middle East", width: 43, height: 55, unit: "mm", background: "Plain white" },
  { id: "SAU", name: "Saudi Arabia", region: "Middle East", width: 40, height: 60, unit: "mm", background: "Plain white" },
  { id: "ISR", name: "Israel", region: "Middle East", width: 35, height: 45, unit: "mm", background: "Plain white" },

  // ------------------------------------------------------------------- Africa
  { id: "ZAF", name: "South Africa", region: "Africa", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "NGA", name: "Nigeria", region: "Africa", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "KEN", name: "Kenya", region: "Africa", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "GHA", name: "Ghana", region: "Africa", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "EGY", name: "Egypt", region: "Africa", width: 40, height: 60, unit: "mm", background: "Plain white" },
  { id: "ETH", name: "Ethiopia", region: "Africa", width: 35, height: 45, unit: "mm", background: "Plain white" },
  { id: "MAR", name: "Morocco", region: "Africa", width: 35, height: 45, unit: "mm", background: "Plain white" }
];

export const REGIONS: Region[] = ["Americas", "Asia & Pacific", "Europe", "Middle East", "Africa"];

export function presetCode(p: Preset): string {
  return p.code ?? p.id.slice(0, 3);
}

export function findPreset(id?: string): Preset | undefined {
  if (!id) return undefined;
  return PRESETS.find(p => p.id === id);
}

/** Target chin-to-crown fraction for a preset — the midpoint of the allowed range. */
export function headTargetFor(preset?: Preset): number {
  const range = preset?.head ?? DEFAULT_HEAD;
  return (range.min + range.max) / 2;
}

export function formatSize(p: { width: number; height: number; unit: Unit }): string {
  const w = Number.isInteger(p.width) ? p.width : p.width.toFixed(1);
  const h = Number.isInteger(p.height) ? p.height : p.height.toFixed(1);
  return `${w} × ${h} ${p.unit}`;
}

/** Case- and accent-insensitive match on country name or code. */
export function searchPresets(query: string): Preset[] {
  const q = query.trim().toLowerCase();
  if (!q) return PRESETS;
  return PRESETS.filter(
    p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
  );
}
