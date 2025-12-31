type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
};

export default function Slider({ label, value, min, max, step = 1, onChange }: Props) {
  return (
    <div>
      <label>{label}: <span style={{ color: "var(--text)" }}>{value}</span></label>
      <input
        className="input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
