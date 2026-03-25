# File-based Routing

Aplos uses automatic routing based on the file structure in the `src/pages` directory.

## Basic Structure

Files with extensions `.tsx`, `.jsx`, `.ts`, and `.js` in `src/pages` automatically define your application's routes.

## Route Examples

### Static Pages

```
src/pages/
  ├── index.tsx    -> /
  ├── about.jsx    -> /about
  ├── contact.js   -> /contact
  └── profile.ts   -> /profile
```

### Nested Routes

```
src/pages/
  ├── blog/
  │   ├── index.tsx    -> /blog
  │   └── about.tsx    -> /blog/about
  └── users/
      └── profile.tsx  -> /users/profile
```

## Naming Conventions

- Use lowercase filenames
- For dynamic routes, use `[paramName]` syntax
- Files starting with `_` (underscore) are not routable and can be used for shared components or utilities

### Non-routable Files

```
src/pages/
  ├── blog/
  │   ├── [slug].tsx         -> /blog/post-1
  │   └── _BlogLayout.tsx    -> Not routable
  └── _components/           -> Not routable directory
      └── Header.tsx
```

Files and directories prefixed with `_` are ignored by the router. Use them for:

- Layout components
- Shared utilities
- Helper functions
- Component libraries
