import Head from 'aplos/head';
import { Link } from 'aplos/navigation';

export default function Home() {
  return (
    <>
      <Head>
        <title>Welcome — {{NAME}}</title>
      </Head>

      <main className="container">
        <h1>Welcome to Aplos</h1>
        <p>
          Your project is up and running. Edit <code>src/pages/index.tsx</code>{' '}
          to start building.
        </p>

        <ul className="links">
          <li>
            <Link to="/about">About page example</Link>
          </li>
          <li>
            <a href="https://aplos.alpacode.io" target="_blank" rel="noreferrer">
              Documentation
            </a>
          </li>
          <li>
            <a
              href="https://github.com/alpac0de/aplos"
              target="_blank"
              rel="noreferrer"
            >
              GitHub repository
            </a>
          </li>
        </ul>
      </main>
    </>
  );
}
