import '@/styles/components/footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span>&copy; {new Date().getFullYear()} Aplos by Kemeter. MIT License.</span>
        <div className="footer-links">
          <a href="/documentation">Documentation</a>
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
