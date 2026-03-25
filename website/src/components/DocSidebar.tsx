import { useState } from 'react';
import { NavLink } from 'aplos/navigation';
import '@/styles/components/sidebar.css';

const sections = [
  {
    title: 'Getting Started',
    links: [
      { to: '/documentation', label: 'Overview' },
      { to: '/documentation/installation', label: 'Installation' },
      { to: '/documentation/quick-start', label: 'Quick Start' },
    ],
  },
  {
    title: 'Routing',
    links: [
      { to: '/documentation/routing/file-based', label: 'File-based Routing' },
      { to: '/documentation/routing/layouts', label: 'Layouts' },
      { to: '/documentation/routing/dynamic-routes', label: 'Dynamic Routes' },
    ],
  },
  {
    title: 'Configuration',
    links: [
      { to: '/documentation/configuration', label: 'Overview' },
    ],
  },
  {
    title: 'CLI',
    links: [
      { to: '/documentation/cli', label: 'Commands' },
    ],
  },
  {
    title: 'API',
    links: [
      { to: '/documentation/api', label: 'Components & Hooks' },
    ],
  },
];

export default function DocSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <aside className="doc-sidebar">
      <button
        type="button"
        className="sidebar-mobile-toggle"
        onClick={() => setOpen(!open)}
      >
        <span>Documentation</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
        </svg>
      </button>
      <nav className={`sidebar-nav ${open ? 'open' : ''}`}>
        {sections.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-title">{section.title}</div>
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/documentation'}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
