import { Link } from 'aplos/navigation';
import '@/styles/components/footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span>&copy; {new Date().getFullYear()} Aplos by <a href="https://alpacode.fr" target="_blank" rel="noopener noreferrer">alpacode</a>. MIT License.</span>
        <div className="footer-links">
          <Link to="/documentation">Documentation</Link>
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
