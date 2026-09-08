import { useMemo, useState } from "react";
import { PRESETS, REGIONS, formatSize, presetCode, searchPresets, type Preset } from "../../utils/presets";

type Props = {
  selectedId?: string;
  isCustom: boolean;
  onSelect: (preset: Preset) => void;
  onCustom: () => void;
};

function headLabel(p: Preset): string | null {
  if (!p.head) return null;
  return `head ${Math.round(p.head.min * 100)}–${Math.round(p.head.max * 100)}%`;
}

function Row({
  preset,
  selected,
  onSelect
}: {
  preset: Preset;
  selected: boolean;
  onSelect: (p: Preset) => void;
}) {
  const head = headLabel(preset);
  return (
    <button
      type="button"
      className={`countryRow ${selected ? "selected" : ""}`}
      onClick={() => onSelect(preset)}
      aria-pressed={selected}
    >
      <span className="code mono">{presetCode(preset)}</span>
      <span className="countryName">{preset.name}</span>
      <span className="countrySize mono">{formatSize(preset)}</span>
      {head && <span className="countryHead mono">{head}</span>}
    </button>
  );
}

export default function CountryPicker({ selectedId, isCustom, onSelect, onCustom }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchPresets(query), [query]);
  const searching = query.trim().length > 0;
  const common = useMemo(() => PRESETS.filter(p => p.common), []);

  return (
    <div className="picker">
      <input
        className="input"
        type="search"
        value={query}
        placeholder={`Search ${PRESETS.length} countries and documents`}
        onChange={e => setQuery(e.target.value)}
        aria-label="Search countries"
      />

      {!searching && (
        <div className="commonRow">
          {common.map(p => (
            <button
              key={p.id}
              type="button"
              className={`pill ${selectedId === p.id ? "active" : ""}`}
              onClick={() => onSelect(p)}
            >
              <span className="mono">{presetCode(p)}</span> {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="countryList">
        {searching ? (
          results.length > 0 ? (
            results.map(p => (
              <Row key={p.id} preset={p} selected={selectedId === p.id} onSelect={onSelect} />
            ))
          ) : (
            <div className="small" style={{ padding: "14px 4px" }}>
              No match for “{query}”. Any size can still be entered by hand below.
            </div>
          )
        ) : (
          REGIONS.map(region => {
            const inRegion = PRESETS.filter(p => p.region === region);
            if (inRegion.length === 0) return null;
            return (
              <div key={region}>
                <div className="regionHeading">{region}</div>
                {inRegion.map(p => (
                  <Row key={p.id} preset={p} selected={selectedId === p.id} onSelect={onSelect} />
                ))}
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        className={`countryRow customRow ${isCustom ? "selected" : ""}`}
        onClick={onCustom}
        aria-pressed={isCustom}
      >
        <span className="code mono">•••</span>
        <span className="countryName">Custom size</span>
        <span className="countrySize mono">set it yourself</span>
      </button>
    </div>
  );
}
