# Dynamic Routes

Dynamic route segments are defined using brackets `[param]` in filenames.

## Basic Dynamic Routes

```
src/pages/
  ├── blog/
  │   └── [slug].tsx   -> /blog/my-post, /blog/another-post
  └── articles/
      └── [id].tsx     -> /articles/123, /articles/456
```

## Using Dynamic Parameters

Access route parameters using React Router's `useParams` hook:

```tsx
// src/pages/blog/[slug].tsx
import { useParams } from 'react-router-dom';

export default function BlogPost() {
  const { slug } = useParams();

  return (
    <div>
      <h1>Post: {slug}</h1>
      <p>You are viewing the post with slug: {slug}</p>
    </div>
  );
}
```

```tsx
// src/pages/articles/[id].tsx
import { useParams } from 'react-router-dom';

export default function Article() {
  const { id } = useParams();

  return (
    <div>
      <h1>Article #{id}</h1>
      <p>Viewing article ID: {id}</p>
    </div>
  );
}
```

## Route Configuration with Requirements

You can add parameter constraints using regular expressions in `aplos.config.js`:

```javascript
// aplos.config.js
module.exports = {
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
}
```

### Common Requirement Patterns

- `\\d+`: Numbers only
- `[a-zA-Z]+`: Letters only
- `[a-zA-Z0-9_-]+`: Alphanumeric with dashes and underscores
- `.*`: Any character (use with caution)
