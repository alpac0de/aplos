import Head from 'aplos/head';
import Hero from '@/components/Hero';
import FeatureSection from '@/components/FeatureSection';
import { Link } from 'aplos/navigation';

const FILE_ROUTING_CODE = `// Just create files in src/pages/
// Routes are generated automatically

src/pages/
  index.tsx        →  /
  about.tsx        →  /about
  blog/
    index.tsx      →  /blog
    [slug].tsx     →  /blog/:slug`;

const LAYOUT_CODE = `// src/pages/_layout.tsx
import { Outlet } from 'aplos/navigation';

export default function Layout() {
  return (
    <div className="app">
      <nav>...</nav>
      <Outlet />
      <footer>...</footer>
    </div>
  );
}`;

const RSPACK_CODE = `// Lightning-fast builds with Rspack
// React Compiler enabled by default

$ aplos build

  Built in 320ms
  Output: public/dist/
  Chunks: 3 (vendor, common, app)
  CSS: extracted & minified`;

const TYPESCRIPT_CODE = `// src/pages/blog/[slug].tsx
import { useParams } from 'aplos/navigation';
import Head from 'aplos/head';

export default function BlogPost() {
  const { slug } = useParams();

  return (
    <>
      <Head>
        <title>{slug}</title>
      </Head>
      <article>...</article>
    </>
  );
}`;

const STATIC_CODE = `// src/pages/about.tsx
"use static";

export default function About() {
  return (
    <div>
      <h1>About us</h1>
      <p>Pre-rendered at build time.</p>
    </div>
  );
}`;

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Aplos - The Fast React Framework</title>
      </Head>

      <Hero />

      <FeatureSection
        badge="Routing"
        title="File-based routing"
        description="Create a file, get a route. No configuration needed. Dynamic parameters, nested directories, and catch-all routes work out of the box."
        code={FILE_ROUTING_CODE}
        language="bash"
        filename="src/pages/"
      />

      <FeatureSection
        badge="Layouts"
        title="Nested layouts"
        description="Share UI across pages with nested layouts. Add a _layout.tsx file to any directory and it wraps all pages within it automatically."
        code={LAYOUT_CODE}
        filename="src/pages/_layout.tsx"
        reversed
      />

      <FeatureSection
        badge="Performance"
        title="Lightning-fast builds"
        description="Powered by Rspack, a Rust-based bundler. Hot Module Replacement in dev, optimized production builds with code splitting, tree shaking, and the React Compiler."
        code={RSPACK_CODE}
        language="bash"
        filename="Terminal"
      />

      <FeatureSection
        badge="Developer Experience"
        title="TypeScript & React 19"
        description="First-class TypeScript support. Built on React 19 with the React Compiler enabled by default. Use the latest hooks, patterns, and best practices."
        code={TYPESCRIPT_CODE}
        filename="src/pages/blog/[slug].tsx"
        reversed
      />

      <FeatureSection
        badge="Static"
        title={'"use static" pre-rendering'}
        description='Pre-render any page at build time with a single directive. Add "use static" at the top of a page and it gets rendered to HTML during the build.'
        code={STATIC_CODE}
        filename="src/pages/about.tsx"
      />

      <section className="section" style={{ textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ marginBottom: '1rem' }}>Ready to build?</h2>
          <p style={{ marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
            Get started in seconds. Build your next React app with Aplos.
          </p>
          <Link to="/documentation" className="btn-primary" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: '#22c55e',
            color: '#000',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRadius: '8px',
            textDecoration: 'none',
          }}>
            Get started
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
