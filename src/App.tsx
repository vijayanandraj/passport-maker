import Wizard from "./components/Wizard";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Passport Photo Builder</div>
        <div className="hint">Browser-only. No uploads.</div>
      </header>

      <main className="main">
        <Wizard />
      </main>

      <footer className="footer">
        <span>V1.2 starter</span>
      </footer>
    </div>
  );
}
