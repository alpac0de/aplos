# Custom Rspack Configuration

Aplos allows you to extend the framework's default rspack configuration by providing your own `rspack.config.js` at the project root.

## Usage

Create a `rspack.config.js` file in your project directory:

```javascript
// rspack.config.js
export default {
  module: {
    rules: [
      {
        test: /\.md$/,
        type: 'asset/source',
      },
    ],
  },
};
```

Your configuration is automatically merged with the framework defaults using [webpack-merge](https://github.com/survivejs/webpack-merge).

## Merge Behavior

| Config type | Behavior |
|-------------|----------|
| Arrays (rules, plugins) | Concatenated — your entries are added after framework defaults |
| Objects (resolve.alias) | Deep merged — your keys are added or override existing ones |
| Scalars (mode, devtool) | Overridden — your value replaces the framework default |

## Examples

### Adding a custom loader

```javascript
export default {
  module: {
    rules: [
      {
        test: /\.svg$/,
        type: 'asset/resource',
      },
    ],
  },
};
```

### Adding resolve aliases

```javascript
export default {
  resolve: {
    alias: {
      '~content': './content',
    },
  },
};
```

### Adding plugins

```javascript
import { ProvidePlugin } from '@rspack/core';

export default {
  plugins: [
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};
```

## Build cache

Aplos uses Rspack's persistent filesystem cache to speed up repeat builds. The client and SSR compilations keep separate caches so they never invalidate each other.

By default the cache lives in `node_modules/.cache/aplos/`. If the `XDG_CACHE_HOME` environment variable is set, the cache is written under `$XDG_CACHE_HOME/aplos/` instead. This matters in CI/CD and on PaaS builders: point `XDG_CACHE_HOME` at a directory that persists between builds and the cache survives across deploys, turning every build after the first into a warm build.

```bash
# Persist the cache across builds (CI example)
export XDG_CACHE_HOME=/path/to/persistent/cache
bun run build
```

The cache invalidates automatically when `rspack.config.js` or `rspack.ssr.config.js` changes. To force a clean build, delete the cache directory.

!!! warning
    Avoid overriding core framework settings (entry, output.path, internal aliases) as this may break Aplos functionality.
