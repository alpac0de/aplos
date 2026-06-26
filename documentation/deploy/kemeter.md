# Deploy to Kemeter

[Kemeter](https://kemeter.io) is the platform Aplos is built for. The two are developed together (Kemeter runs its own frontend on Aplos), so deploying an Aplos app to Kemeter is the smoothest path: push your repo, and Kemeter installs, builds, and serves it, with the [rspack build cache](/documentation/configuration/rspack#build-cache) persisted across deploys out of the box.

## Why Kemeter

- **Persistent build cache, zero config.** Kemeter exposes `XDG_CACHE_HOME` to the build, pointed at a volume that survives between deploys. Aplos writes its rspack cache there automatically, so every deploy after the first is a warm build, with no setup and no cache config.
- **Git push to deploy.** Connect a repository and Kemeter clones, installs dependencies, runs your build, and serves the result.
- **Built-in SPA fallback.** Static assets are served with a single-page fallback, so client-side routes resolve to your app shell.
- **HTTPS by default.** Each app gets a domain with automatic HTTPS.

## Setup

Deploy an Aplos app with the `node` runtime so Kemeter runs the build (and the cache kicks in).

### 1. Define build and start scripts

In your `package.json`:

```json
{
  "scripts": {
    "build": "aplos build --mode production --static",
    "start": "serve --single public/dist"
  }
}
```

`serve --single` serves `public/dist/` with an SPA fallback, so any route that isn't a pre-rendered file falls back to `index.html`.

### 2. Configure the app on Kemeter

Create an application with the `node` runtime and point it at your repository. Set the build command and the directory to serve:

```bash
KEMETER_COMMAND_BUILD="bun run build"
KEMETER_PUBLIC_DIR=public/dist
```

| Variable | Value | Purpose |
|---|---|---|
| `KEMETER_COMMAND_BUILD` | `bun run build` | Runs your Aplos build after dependencies are installed |
| `KEMETER_PUBLIC_DIR` | `public/dist` | Directory served once the build finishes (with SPA fallback) |
| `KEMETER_APPLICATION_PORT` | `8080` | Listen port (default value, override if needed) |

`XDG_CACHE_HOME` is injected automatically for build-phase runtimes, so you don't configure caching at all: Aplos picks it up on its own.

### 3. Deploy

Push to the connected branch. Kemeter runs the full flow:

1. `bun install` installs dependencies
2. `bun run build` runs `aplos build --static`, producing `public/dist/` and reusing the persistent rspack cache
3. `serve --single public/dist` serves the assets with SPA fallback

The app comes up on its Kemeter domain over HTTPS once the readiness probe passes.

## Pre-built static assets

If you'd rather build in CI and commit the output, you can use the `static` runtime instead. Note that the `static` runtime serves the repository root and does **not** run a build phase, so it doesn't get the persistent cache. The `node` runtime above is the recommended path for Aplos because it builds on the platform and benefits from caching. For a pure CI-built static deploy to other hosts, see [Other static hosts](/documentation/deploy/static-host).
