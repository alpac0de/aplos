# Configuration

Aplos can be configured using an `aplos.config.js` file in your project root.

## Configuration File

```javascript
// aplos.config.js
module.exports = {
  // React configuration
  reactStrictMode: true,

  // Server configuration
  server: {
    port: 3000,
  },

  // Head/Meta defaults
  head: {
    defaultTitle: 'My App',
    titleTemplate: '%s | My App',
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
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

## Environment Variables

Aplos automatically loads environment variables from `.env` files in your project root. Variables are available via `process.env` in your `aplos.config.js` and at build time.

### Loaded files

| File | Purpose |
|------|---------|
| `.env` | Default environment variables |
| `.env.local` | Local overrides (add this to `.gitignore`) |

`.env.local` takes priority over `.env`.

### Example

```bash
# .env
API_BASE_URL=https://api.example.com
```

```javascript
// aplos.config.js
export default {
  publicRuntimeConfig: {
    api_base_url: process.env.API_BASE_URL,
  },
}
```

!!! tip
    Add `.env.local` to your `.gitignore` to keep local secrets out of version control.

## React Strict Mode

Enable React's Strict Mode for additional development checks:

```javascript
module.exports = {
  reactStrictMode: true
}
```

## Server Configuration

### Development Server Port

The development server port can be configured in order of priority:

1. **Environment variable**: `APLOS_SERVER_PORT=4000`
2. **Configuration file**: `server: { port: 4000 }`
3. **Default value**: 3000

Example:

```javascript
module.exports = {
  server: {
    port: 4000
  }
}
```

Or using environment variable:

```bash
APLOS_SERVER_PORT=4000 npx aplos server
```

### Busy ports

By default a busy port falls back to the next free one, and the dev server prints
which port it settled on:

```
⚠ Port 3000 is in use, using port 3001 instead.
```

Set `strictPort` when the port is a constraint rather than a preference:

```javascript
module.exports = {
  server: {
    port: 3000,
    strictPort: true
  }
}
```

Aplos then fails instead of falling back:

```
✗ Port 3000 is already in use.
```

Use this whenever something outside the dev server has memorised the port: a
reverse proxy registration, a docker port mapping, an OAuth redirect URI. Falling
back in those cases points the other side at nothing.

`strictPort` is a policy, and `APLOS_SERVER_PORT` only carries a value: setting
the environment variable changes which port is used, never whether Aplos falls
back.

## Head Configuration

The `head` option sets default meta tags, title, and links injected into every page.

```javascript
export default {
  head: {
    defaultTitle: 'My App',
    titleTemplate: '%s | My App',
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'My awesome application' },
    ],
    link: [
      { rel: 'icon', href: '/favicon.ico' },
    ],
    script: [
      { src: 'https://example.com/analytics.js', async: true },
    ],
  }
}
```

| Option | Description |
|--------|-------------|
| `defaultTitle` | Fallback title when no page defines one |
| `titleTemplate` | Template for page titles (`%s` is replaced by the page title) |
| `meta` | Array of meta tag attributes |
| `link` | Array of link tag attributes |
| `script` | Array of script tag attributes |

You can override head tags per-page using the `Head` component. See [API Reference](/documentation/api/components#head) for details.

## Routes Configuration

Define custom routes with specific requirements:

```javascript
module.exports = {
  routes: {
    '/blog/:id': {
      path: '/blog/:id',
      component: 'BlogPost',
      file: 'pages/blog/[id]',
      requirements: {
        id: '\\d+'  // Numbers only
      }
    }
  }
}
```

See [Dynamic Routes](/documentation/routing/dynamic-routes#route-configuration-with-requirements) for more details on route requirements.
