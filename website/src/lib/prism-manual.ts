// Imported before prismjs. Left to itself, Prism highlights the whole page as
// soon as it loads, rewriting the pre-rendered <pre> elements before React
// hydrates them, which React then reports as a mismatch. CodeBlock highlights
// each block from an effect instead, after hydration.
if (typeof window !== 'undefined') {
  const w = window as Window & { Prism?: { manual?: boolean } };
  w.Prism = { ...w.Prism, manual: true };
}

export {};
