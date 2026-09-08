import Wizard from "./components/Wizard";
import { GitHubStarLink, REPO_URL } from "./components/ui/GitHubStar";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark">[+]</span>
          Passport Photo Maker
        </div>

        <div className="topbarRight">
          <span className="trustbadge">
            <span className="dot" />
            Runs on your device — nothing is uploaded
          </span>
          <GitHubStarLink />
        </div>
      </header>

      <main className="main">
        <Wizard />
      </main>

      <footer className="footer">
        <div className="footerRow">
          <span>
            Free and open source. No account, no tracking, no photo ever leaves your browser.
          </span>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </div>
        {/* The machine-readable strip from a passport data page. */}
        <div className="mrz mono" aria-hidden="true">
          P&lt;UTOPASSPORT&lt;PHOTO&lt;MAKER&lt;&lt;FREE&lt;&lt;NO&lt;SIGN&lt;IN&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
        </div>
      </footer>
    </div>
  );
}
