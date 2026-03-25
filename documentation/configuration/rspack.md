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

!!! warning
    Avoid overriding core framework settings (entry, output.path, internal aliases) as this may break Aplos functionality.
