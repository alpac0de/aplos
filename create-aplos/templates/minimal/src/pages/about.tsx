import Head from 'aplos/head';
import { Link } from 'aplos/navigation';

export default function About() {
  return (
    <>
      <Head>
        <title>About</title>
      </Head>

      <main className="container">
        <h1>About</h1>
        <p>
          This is an example page. Aplos uses file-based routing — this page
          lives at <code>src/pages/about.tsx</code> and is served at{' '}
          <code>/about</code>.
        </p>
        <p>
          <Link to="/">← Back home</Link>
        </p>
      </main>
    </>
  );
}
