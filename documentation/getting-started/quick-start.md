# Quick Start

## Create Your First Page

Create a `src/pages` directory in your project and add an `index.tsx` file:

```tsx
// src/pages/index.tsx
export default function Home() {
  return (
    <div>
      <h1>Welcome to Aplos!</h1>
      <p>Your first page is ready.</p>
    </div>
  );
}
```

## Start Development Server

```bash
npx aplos server
```

The development server will start on port 3000 by default. Open [http://localhost:3000](http://localhost:3000) to see your application.

## Add More Pages

Create additional pages by adding files to `src/pages`:

```tsx
// src/pages/about.tsx
export default function About() {
  return <h1>About Page</h1>;
}
```

This page will automatically be available at `/about`.

## Build for Production

When you're ready to deploy:

```bash
npx aplos build
```

This generates optimized production assets in the `public/dist` directory.
