# API Reference

## Components

### Head

Manage document head elements (title, meta tags, etc.) using native DOM head management.

**Import:**

```tsx
import Head from 'aplos/head';
```

**Usage:**

```tsx
export default function MyPage() {
  return (
    <>
      <Head>
        <title>My Page Title</title>
        <meta name="description" content="Page description" />
        <meta property="og:title" content="My Page" />
      </Head>
      <div>
        <h1>Page Content</h1>
      </div>
    </>
  );
}
```

**Props:**

- `children`: React elements representing head tags

**Example with multiple tags:**

```tsx
<Head>
  <title>Blog Post - My Site</title>
  <meta name="description" content="An amazing blog post" />
  <meta name="keywords" content="react, aplos, tutorial" />
  <link rel="canonical" href="https://example.com/blog/post" />
</Head>
```

### Link

Navigation component for client-side routing (wrapper around React Router's Link).

**Import:**

```tsx
import { Link } from 'aplos/navigation';
```

**Usage:**

```tsx
export default function Navigation() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/blog">Blog</Link>
    </nav>
  );
}
```

**Props:**

All props from [React Router's Link component](https://reactrouter.com/en/main/components/link) are supported:

- `to` (required): The destination path
- `replace`: Replace current entry in history stack
- `state`: State to pass to the location
- `preventScrollReset`: Prevent scroll reset on navigation
- And all standard anchor tag attributes

**Example with styling:**

```tsx
<Link
  to="/profile"
  className="nav-link"
  style={{ color: 'blue' }}
>
  Profile
</Link>
```

## Utilities

### getConfig

Access runtime configuration values defined in `aplos.config.js`.

**Import:**

```tsx
import getConfig from 'aplos/config';
```

**Usage:**

```tsx
export default function ApiClient() {
  const config = getConfig();

  return (
    <div>
      <p>API Base URL: {config.api_base_url}</p>
      <p>Environment: {config.environment}</p>
    </div>
  );
}
```

**Returns:**

An object containing all values from `publicRuntimeConfig` in your `aplos.config.js`.

**Configuration:**

```javascript
// aplos.config.js
module.exports = {
  publicRuntimeConfig: {
    api_base_url: process.env.API_BASE_URL,
    environment: process.env.NODE_ENV
  }
}
```

See [Runtime Configuration](../configuration/runtime.md) for more details.

## React Router Hooks

Aplos uses React Router under the hood. You can use all React Router hooks:

### useParams

Access dynamic route parameters:

```tsx
import { useParams } from 'react-router-dom';

export default function BlogPost() {
  const { slug } = useParams();
  return <h1>Post: {slug}</h1>;
}
```

### useNavigate

Programmatic navigation:

```tsx
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // After login...
    navigate('/dashboard');
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

### useLocation

Access current location:

```tsx
import { useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  return <div>Current path: {location.pathname}</div>;
}
```

### useSearchParams

Access and manipulate URL query parameters:

```tsx
import { useSearchParams } from 'react-router-dom';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q');

  return <div>Searching for: {query}</div>;
}
```

### useMatch

Check if the current URL matches a given pattern:

```tsx
import { useMatch } from 'react-router-dom';

export default function NavItem({ to, children }) {
  const match = useMatch(to);
  return <a className={match ? 'active' : ''} href={to}>{children}</a>;
}
```

### NavLink

Navigation link that automatically applies an active class when the route matches:

```tsx
import { NavLink } from 'aplos/navigation';

export default function Navigation() {
  return (
    <nav>
      <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
        Home
      </NavLink>
    </nav>
  );
}
```

### Navigate

Component for declarative redirects:

```tsx
import { Navigate } from 'aplos/navigation';

export default function OldPage() {
  return <Navigate to="/new-page" replace />;
}
```

### Outlet

Renders child routes in a layout component:

```tsx
import { Outlet } from 'aplos/navigation';

export default function Layout() {
  return (
    <div>
      <nav>...</nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

For more React Router hooks, see the [React Router documentation](https://reactrouter.com/en/main/hooks).
