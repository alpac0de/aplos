# Runtime Configuration

Runtime configuration allows you to access configuration values from your client-side code.

## Public Runtime Config

Define public configuration values that should be available in the browser:

```javascript
// aplos.config.js
module.exports = {
  publicRuntimeConfig: {
    api_base_url: process.env.API_BASE_URL,
    app_name: 'My Aplos App',
    version: '1.0.0'
  }
}
```

## Using Runtime Configuration

Import the `getConfig` function from `aplos/config`:

```tsx
import getConfig from 'aplos/config';

export default function MyComponent() {
  const { api_base_url, app_name } = getConfig();

  return (
    <div>
      <h1>{app_name}</h1>
      <p>API URL: {api_base_url}</p>
    </div>
  );
}
```

## Environment Variables

You can use environment variables in your configuration:

```javascript
// aplos.config.js
module.exports = {
  publicRuntimeConfig: {
    api_base_url: process.env.API_BASE_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development'
  }
}
```

!!! warning "Security Note"
    Only add values to `publicRuntimeConfig` that are safe to expose in the browser. Never include sensitive information like API keys or secrets.

## Type Safety

For TypeScript projects, you can create a type definition for your config:

```typescript
// types/config.d.ts
declare module 'aplos/config' {
  export default function getConfig(): {
    api_base_url: string;
    app_name: string;
    version: string;
  };
}
```
