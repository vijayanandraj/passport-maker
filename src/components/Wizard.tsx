import { useEffect } from "react";
import { useAppStore } from "../state/store";
import StepSize from "./steps/StepSize";
import StepCrop from "./steps/StepCrop";
import StepBackground from "./steps/StepBackground";
import StepDownload from "./steps/StepDownload";

export default function Wizard() {
  const step = useAppStore(s => s.step);
  const setStep = useAppStore(s => s.setStep);
  const hydrateFromUrl = useAppStore(s => s.hydrateFromUrl);

  useEffect(() => {
    hydrateFromUrl();
  }, [hydrateFromUrl]);

  return (
    <div className="card">
      <div className="stepbar">
        <div className={`step ${step === 1 ? "active" : ""}`} onClick={() => setStep(1)}>1) Size</div>
        <div className={`step ${step === 2 ? "active" : ""}`} onClick={() => setStep(2)}>2) Crop</div>
        <div className={`step ${step === 3 ? "active" : ""}`} onClick={() => setStep(3)}>3) Background</div>
        <div className={`step ${step === 4 ? "active" : ""}`} onClick={() => setStep(4)}>4) Download</div>
      </div>

      {step === 1 && <StepSize />}
      {step === 2 && <StepCrop />}
      {step === 3 && <StepBackground />}
      {step === 4 && <StepDownload />}
    </div>
  );
}

// export default function Wizard() {
//   return <div>Wizard OK</div>;
// }
