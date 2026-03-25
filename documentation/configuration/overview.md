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

See [Dynamic Routes](../routing/dynamic-routes.md#route-configuration-with-requirements) for more details on route requirements.
