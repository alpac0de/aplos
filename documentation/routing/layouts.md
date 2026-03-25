# Layouts

Aplos supports nested layouts using `_layout.tsx` files. These special files define shared UI components that wrap pages within their directory hierarchy.

## Basic Layout Structure

```
src/pages/
  ├── _layout.tsx          -> Root layout (wraps all pages)
  ├── index.tsx            -> / (wrapped by root layout)
  ├── about.tsx            -> /about (wrapped by root layout)
  └── blog/
      ├── _layout.tsx      -> Blog layout (wraps blog pages)
      ├── index.tsx        -> /blog (wrapped by root + blog layouts)
      └── [slug].tsx       -> /blog/my-post (wrapped by root + blog layouts)
```

## Layout Component Example

### Root Layout

```tsx
// src/pages/_layout.tsx
import { Outlet } from 'react-router-dom';

export default function RootLayout() {
  return (
    <div className="app">
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/blog">Blog</a>
      </nav>
      <main>
        <Outlet /> {/* Child pages render here */}
      </main>
      <footer>
        <p>&copy; 2024 My App</p>
      </footer>
    </div>
  );
}
```

### Nested Layout

```tsx
// src/pages/blog/_layout.tsx
import { Outlet } from 'react-router-dom';

export default function BlogLayout() {
  return (
    <div className="blog">
      <aside>
        <h3>Blog Categories</h3>
        <ul>
          <li><a href="/blog/tech">Tech</a></li>
          <li><a href="/blog/design">Design</a></li>
        </ul>
      </aside>
      <div className="blog-content">
        <Outlet /> {/* Blog pages render here */}
      </div>
    </div>
  );
}
```

## How Layouts Work

- **Automatic Discovery**: Aplos automatically finds `_layout.tsx` files in your pages directory
- **Nested Wrapping**: Pages are wrapped by the most specific layout in their directory hierarchy
- **Component Naming**: Layout components are automatically named (e.g., `RootLayout`, `BlogLayout`)
- **React Router Integration**: Uses `<Outlet />` component to render child pages

## Layout Hierarchy

For a page at `/blog/my-post`, the wrapping order would be:

1. `AppLayout` (from `_app.tsx` if exists, or default)
2. `RootLayout` (from `src/pages/_layout.tsx`)
3. `BlogLayout` (from `src/pages/blog/_layout.tsx`)
4. Page component (from `src/pages/blog/[slug].tsx`)

## App Layout

You can create a global `_app.tsx` file in `src/pages/` to define the outermost layout that wraps your entire application:

```tsx
// src/pages/_app.tsx
import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div id="app">
      <Outlet />
    </div>
  );
}
```

This is useful for:

- Adding global providers (theme, auth, etc.)
- Setting up error boundaries
- Defining app-wide layouts
