# Aplos Framework Documentation

## File-based Routing

This framework uses automatic routing based on the file structure in the `src/pages` directory.

### Basic Structure

Files with extensions `.tsx`, `.jsx`, `.ts`, and `.js` in `src/pages` automatically define your application's routes.

### Installation

```bash
npm install https://github.com/alpac0de/aplos.git
```

### Route Examples

#### Static Pages
```
src/pages/
  ├── index.tsx    -> /
  ├── about.jsx    -> /about
  ├── contact.js   -> /contact
  └── profile.ts   -> /profile
```

#### Dynamic Routes
Dynamic route segments are defined using brackets `[param]`:

```
src/pages/
  ├── blog/
  │   └── [slug].tsx   -> /blog/my-post
  └── articles/
      └── [id].tsx     -> /articles/123
```

### Using Dynamic Parameters

```tsx
// src/pages/blog/[slug].tsx
function BlogPost() {
  const { slug } = useParams();
  return <h1>Post: {slug}</h1>;
}

// src/pages/articles/[id].tsx
function Article() {
  const { id } = useParams();
  return <h1>Article #{id}</h1>;
}
```

### Naming Conventions

- Use lowercase filenames
- For dynamic routes, use `[paramName]` syntax
- Files starting with `_` (underscore) are not routable and can be used for shared components or utilities
  ```
  src/pages/
    ├── blog/
    │   ├── [slug].tsx         -> /blog/post-1
    │   └── _BlogLayout.tsx    -> Not routable
    └── _components/           -> Not routable directory
        └── Header.tsx
  ```

## Configuration (aplos.config.js)

```javascript
module.exports = {
    // React configuration
    reactStrictMode: true,
    
    // Server configuration
    server: {
        port: 3000,
    },
    
    // Client-side runtime configuration
    publicRuntimeConfig: {
        api_base_url: process.env.API_BASE_URL,
    },
    
    // Routes configuration
    routes: {
        '/custom': {
            path: '/custom',
            component: 'CustomPage',
            file: 'pages/custom-page'
        }
    }
}
```

### Server Configuration
Development server port can be configured in order of priority:
1. Environment variable: `APLOS_SERVER_PORT=4000`
2. Configuration in aplos.config.js: `server: { port: 4000 }`
3. Default value: 3000

### Using Runtime Configuration

```javascript
import getConfig from 'aplos/config';

function MyComponent() {
    const { api_base_url } = getConfig();
    return <div>API URL: {api_base_url}</div>;
}
```

### Route Configuration with Requirements

Routes can be defined with parameter constraints using regular expressions:

```javascript
routes: {
    '/blog/:id': {
        path: '/blog/:id',
        component: 'BlogPost',
        file: 'pages/blog/[id]',
        requirements: {
            id: '\\d+'  // Numbers only
        }
    },
    '/users/:username': {
        path: '/users/:username',
        component: 'UserProfile',
        file: 'pages/users/[username]',
        requirements: {
            username: '[a-zA-Z0-9_-]+'  // Alphanumeric with dashes and underscores
        }
    }
}
```

Common requirement patterns:
- `\\d+`: Numbers only
- `[a-zA-Z]+`: Letters only
- `[a-zA-Z0-9_-]+`: Alphanumeric with dashes and underscores
- `.*`: Any character (use with caution)

## CLI Commands

```bash
# Start development server
npx aplos serve

# Build for production
npx aplos build

# Display all routes
npx aplos router:debug
```

### `serve` Command
Launches development server on configured port (default: 3000)
- Hot reloading enabled
- Environment variables support
- On-the-fly compilation

### `build` Command
Generates optimized production build
- Asset minification
- Tree shaking
- Static route generation

### `router:debug` Command
Displays application routes table:

```
┌───────────┬────────┬──────┬────────────────┐
│ Component │ Scheme │ Host │ Path           │
├───────────┼────────┼──────┼────────────────┤
│ B         │ Any    │ Any  │ /b             │
├───────────┼────────┼──────┼────────────────┤
│ BlogEdit  │ Any    │ Any  │ /blog/:id/edit │
├───────────┼────────┼──────┼────────────────┤
│ BlogShow  │ Any    │ Any  │ /blog/:id/show │
├───────────┼────────┼──────┼────────────────┤
│ Index     │ Any    │ Any  │ /              │
└───────────┴────────┴──────┴────────────────┘
```

### `router:match` Command
Tests if a URL matches a route:

```bash
npx aplos router:match /article/123
```

Output:
```
+--------------+----------------------------------+
| Property     | Value                            |
+--------------+----------------------------------+
| Route Name   | ArticleShow                      |
| Path         | /article/:id                     |
| Path Regex   | {^/article/(?P<id>[^/]++)$}     |
| Host         | ANY                              |
| Scheme       | ANY                              |
| Requirements | NO CUSTOM                        |
+--------------+----------------------------------+
```

The command helps debug routing by showing which route (if any) matches a given URL pattern.
