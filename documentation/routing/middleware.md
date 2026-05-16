# Route Middleware

Route middleware lets you intercept navigation **before** a route renders. It
is the place to put authentication guards and conditional redirects — the logic
that decides *whether the user is allowed here, and where to send them if not*.

Without middleware, that logic ends up scattered inside a layout or page,
running in a `useEffect` *after* the protected content has already mounted —
which causes a visible flash of the guarded screen before the redirect. A
middleware runs first, so the guarded route is never painted when access is
denied.

## Defining a Middleware

Create a single file at `src/middleware.tsx` (or `.ts`, `.jsx`, `.js`). It sits
next to `src/pages`, **not** inside it, so it is never treated as a route.

Export a default function. It receives the current location and either returns
nothing (navigation proceeds) or returns `redirect(...)` (navigation is
redirected before render):

```tsx
// src/middleware.tsx
import { redirect } from 'aplos/redirect';

const PUBLIC_ROUTES = ['/login', '/signup', '/reset-password'];

export default function middleware({ pathname }) {
  const isAuthenticated = Boolean(localStorage.getItem('token'));

  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    return redirect('/login');
  }
}
```

That is the complete auth guard for an app. No `PUBLIC_ROUTES` list duplicated
in a layout, no `useEffect`, no flash.

## The Middleware Context

The function is called with a single object describing the target location:

| Field          | Type                | Description                                  |
| -------------- | ------------------- | -------------------------------------------- |
| `pathname`     | `string`            | Path being navigated to, e.g. `/dashboard`   |
| `search`       | `string`            | Raw query string, e.g. `?ref=email`          |
| `searchParams` | `URLSearchParams`   | Parsed query string                          |
| `hash`         | `string`            | URL hash fragment                            |
| `state`        | `unknown`           | History state passed to `navigate(...)`      |

## The `redirect` Helper

```tsx
import { redirect } from 'aplos/redirect';

redirect('/login');                    // replace current history entry (default)
redirect('/login', { replace: false }); // push a new history entry instead
```

By default the redirect **replaces** the current history entry, so the guarded
URL is not left in the browser history (pressing Back won't bounce the user
between the guard and the login page). Pass `{ replace: false }` to push
instead.

Returning anything that is *not* a `redirect(...)` (including `undefined`) lets
navigation continue normally.

## Conditional Redirects

Middleware is not limited to auth. Any "where should this request go" decision
belongs here:

```tsx
// src/middleware.tsx
import { redirect } from 'aplos/redirect';

export default function middleware({ pathname, searchParams }) {
  // Capture a token handed off in the URL, then clean it up
  const handoffToken = searchParams.get('token');
  if (handoffToken) {
    localStorage.setItem('token', handoffToken);
    return redirect(pathname); // drop ?token= from the URL
  }

  // Send the bare root to the app shell
  if (pathname === '/') {
    return redirect('/dashboard');
  }
}
```

### Redirect targets must settle

Middleware runs again on the path it redirects *to*. So the condition that
triggered a redirect **must be false after that redirect**, or navigation
never settles and the app loops.

The `token` example above is correct *because it converges*: `redirect(pathname)`
drops the query string, so on the re-run `searchParams.get('token')` is `null`
and the branch is skipped. The redirect removes its own trigger.

Contrast a non-converging guard:

```tsx
// ✗ infinite loop: every path (including /login) redirects again
export default function middleware({ pathname }) {
  if (!localStorage.getItem('token')) {
    return redirect('/login'); // /login has no token either → redirects forever
  }
}
```

The fix is to exempt the redirect target from its own condition — e.g. let
`/login` through (`PUBLIC_ROUTES` in the auth example at the top of this page).
Rule of thumb: **never redirect to a path your middleware would redirect away
from.**

As a safety net, Aplos bounds the number of consecutive redirects with no
route rendered in between. If the middleware exceeds it, Aplos logs an error
naming the cause and **fails open** (renders the route) rather than freezing
the tab on a blank page. This is a backstop for a bug, not a feature to rely
on — a guard that trips it is misconfigured.

## Async Middleware

The middleware may be `async`. While the returned promise is pending, the
target route is **not** painted:

```tsx
export default async function middleware({ pathname }) {
  const session = await refreshSession();
  if (!session && pathname !== '/login') {
    return redirect('/login');
  }
}
```

!!! tip
    Prefer **synchronous** middleware for auth guards. A sync check (reading a
    token from `localStorage`) decides before the first paint with no blank
    frame. Reserve `async` for cases where a brief blank frame is acceptable,
    such as refreshing an expired session.

## Error Handling

If the middleware throws (or an async middleware rejects), Aplos logs the error
and **fails open** — the route renders normally rather than wedging
navigation. A bug in the guard must not lock users out of the entire app.

## Scope: Client Runtime Only

Route middleware runs in the **browser**, before the matched route renders.

It does **not** run during static rendering (`'use static'`) or at build time.
This is intentional: there is no authenticated user at build time, and a
statically generated page is one HTML file served to everyone — it cannot carry
a per-user access decision. For purely static redirects (e.g. `/old` →
`/new`), use the `routes` config in `aplos.config.js` instead.

This covers the real-world need: apps with authentication are guarded at
runtime; fully static sites are public and have nothing to guard.

!!! note
    Middleware runs on every navigation, including the initial load and
    browser back/forward, and re-runs when the path or query string changes.

## See Also

- [Layouts](layouts.md) — for *presentation* shared across routes. Keep auth
  logic in middleware, not in layouts.
- [Configuration: Runtime](../configuration/runtime.md) — static `routes`
  redirects in `aplos.config.js`.
