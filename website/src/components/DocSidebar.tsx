import { useState } from 'react';
import { NavLink } from 'aplos/navigation';
import { getAllDocs, docToUrl, humanize } from '@/lib/docs';
import '@/styles/components/sidebar.css';

interface Link {
  to: string;
  label: string;
}

interface Section {
  title: string;
  links: Link[];
}

// Sidebar folder order. Folders not listed here appear after, alphabetically.
const FOLDER_ORDER = [
  'getting-started',
  'routing',
  'deploy',
  'cli',
  'configuration',
  'api',
];

// Per-folder page order. Pages not listed here fall back to the order discovered.
const PAGE_ORDER: Record<string, string[]> = {
  'getting-started': ['installation', 'quick-start'],
  routing: ['file-based', 'dynamic-routes', 'layouts'],
  deploy: ['github-pages', 'static-host'],
  cli: ['create', 'commands'],
  configuration: ['overview', 'runtime', 'rspack'],
};

// Top-level (root) page order. Items not listed appear after.
const ROOT_ORDER = ['', 'static-rendering', 'comparison'];

function sortByOrder<T>(items: T[], getKey: (item: T) => string, order: string[]): T[] {
  return [...items].sort((a, b) => {
    const aIndex = order.indexOf(getKey(a));
    const bIndex = order.indexOf(getKey(b));
    if (aIndex === -1 && bIndex === -1) return getKey(a).localeCompare(getKey(b));
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function buildSections(): Section[] {
  const rootDocs = [];
  const docsByFolder = new Map<string, typeof rootDocs>();

  for (const doc of getAllDocs()) {
    if (doc.segments.length <= 1) {
      rootDocs.push(doc);
    } else {
      const folder = doc.segments[0];
      if (!docsByFolder.has(folder)) {
        docsByFolder.set(folder, []);
      }
      docsByFolder.get(folder)!.push(doc);
    }
  }

  const sections: Section[] = [];

  if (rootDocs.length > 0) {
    const sorted = sortByOrder(rootDocs, (d) => d.slug, ROOT_ORDER);
    sections.push({
      title: 'Introduction',
      links: sorted.map((doc) => ({ to: docToUrl(doc.slug), label: doc.title })),
    });
  }

  const folders = Array.from(docsByFolder.keys());
  const orderedFolders = sortByOrder(folders, (f) => f, FOLDER_ORDER);

  for (const folder of orderedFolders) {
    const docs = docsByFolder.get(folder)!;
    const pageOrder = PAGE_ORDER[folder] ?? [];
    const sortedDocs = sortByOrder(
      docs,
      (d) => d.segments[d.segments.length - 1],
      pageOrder
    );
    sections.push({
      title: humanize(folder),
      links: sortedDocs.map((doc) => ({ to: docToUrl(doc.slug), label: doc.title })),
    });
  }

  return sections;
}

const sections = buildSections();

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
