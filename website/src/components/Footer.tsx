import { Link } from 'aplos/navigation';
import '@/styles/components/footer.css';

export default function Footer() {
  // Read on every render on purpose: a tab left open across New Year shows the
  // new year on its next navigation. The site does not enable the React
  // Compiler, so nothing memoizes this render.
  // eslint-disable-next-line @eslint-react/purity
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span>&copy; {year} Aplos by <a href="https://alpacode.fr" target="_blank" rel="noopener noreferrer">alpacode</a>. MIT License.</span>
        <div className="footer-links">
          <Link to="/documentation">Documentation</Link>
          <Link to="/help">Help</Link>
          <a
            href="https://github.com/alpac0de/aplos"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://github.com/alpac0de/aplos/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
          >
            License
          </a>
        </div>
      </div>
    </footer>
  );
}
