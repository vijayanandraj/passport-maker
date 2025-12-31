type Props = {
  onPick: (file?: File) => void;
};

export default function FilePicker({ onPick }: Props) {
  return (
    <div className="stack">
      <label>Upload Photo</label>
      <input
        className="input"
        type="file"
        accept="image/*"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <div className="small">
        Tip: Use a well-lit photo facing the camera. Background removal works best when you have clear contrast.
      </div>
    </div>
  );
}
