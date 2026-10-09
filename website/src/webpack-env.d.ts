interface RequireContext {
  keys(): string[];
  (id: string): unknown;
  <T>(id: string): T;
  resolve(id: string): string;
  id: string;
}

// Only the bundler's `require.context` is used, so `require` is declared here
// rather than pulled in from @types/node.
declare const require: {
  context(
    directory: string,
    useSubdirectories?: boolean,
    regExp?: RegExp,
    mode?: 'sync' | 'lazy' | 'lazy-once' | 'eager' | 'weak'
  ): RequireContext;
};

declare module '*.md' {
  const content: string;
  export default content;
}

// Stylesheets are bundled by Aplos, so TypeScript only needs to know they exist.
declare module '*.css';
