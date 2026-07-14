# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each entry references its pull request (`#NN`) when there is one, or the short
commit hash otherwise. Full release notes live on the
[releases page](https://github.com/alpac0de/aplos/releases).

## [0.16.0] - 2026-07-14

### Added

- #16 Ship TypeScript declarations for public entrypoints
- #23 Build to `dist` by default, add `--out-dir` option to override
- #18 Drop the Babel-only path and add a persistent React Compiler cache
- #33 Make the persistent build cache switchable, and drop production source maps
- #28 Enable side effects tree-shaking in the client bundle
- #24 Add TypeScript support to the ESLint config, run lint in CI

### Changed

- #29 Upgrade TypeScript to 6.0 and rspack to 2.1.3
- #17 Upgrade Rspack to 2.0
- #35 Build a real project in tests, and make `--mode` win over `NODE_ENV`
- 3c7a457 Bump GitHub Actions to Node 24 compatible major versions
- #19 Document the build cache and `XDG_CACHE_HOME` persistence
- #20 Add a Kemeter deploy guide and feature it as the native platform

### Fixed

- #37 Give the `<head>` a single owner
- #38 Make a scaffolded project install, typecheck and build
- #36 Resolve the rspack binary through the module graph, not a guessed path
- #30 Fix head config never being injected, and escape injected values
- #34 Inject head tags after content hashing so the emitted HTML points at the real chunks
- #31 Inject head tags at the real closing head tag, and don't fail the build when `public/` is empty
- #22 Hydrate pre-rendered SSG markup instead of recreating the root
- #32 Fail the build when rspack exits non-zero or is killed by a signal
- #19 Anchor the rspack persistent cache under `XDG_CACHE_HOME`
- #26 Fix the rspack 2.1 persistent cache `buildDependencies` format
- #21 Prevent rspack config self-import and silence the dotenv tip
- bf8ca8f Write the dev config cache as an ESM default export to match its importer
- #27 Add the missing meta charset to the default HTML template

## [0.15.0] - 2026-05-18

### Added

- 4ceadb9 Add the `aplos create` command with a minimal template
- 3f87505 Add the `create-aplos` package for `bun create aplos`
- #15 Add client-side route middleware for auth guards and conditional redirects
- #11 Per-route meta API for build-time SEO
- #12 Per-instance meta for routes expanded via `paths`
- 3d6bec0 Add a Help & Support page with Alpacode commercial support

### Changed

- 923ee5f Restrict the npm package to runtime files via the `files` field (240MB to ~103KB)
- 411c968 Switch the website to an SSG build and align the deploy workflow
- b945570 Rewrite the intro, add static-rendering, comparison, deploy and `aplos create` guides
- cd6cdfd Refine landing page copy for SEO and fix the install package name

### Fixed

- #14 Make HMR hot-swap instead of triggering a full page reload
- #13 Skip the namespace import for pages without a `meta` export
- f0d7bda Fix doc paths causing 404s

## [0.14.0] - 2026-05-04

### Added

- #10 Auto-discover documentation markdown files, register each as a static route, and generate the sidebar

### Changed

- #9 Make the React Compiler opt-in via the `reactCompiler` config flag, disabled by default (behavior change)

### Fixed

- 82229df Exclude `README.md` from auto-discovered docs

## [0.13.0] - 2026-04-19

### Added

- #10 Support `paths` (array or function) in route config, to expand dynamic routes into static nodes

## [0.12.0] - 2026-04-19

### Added

- #8 Static Site Generation: `"use static"` directive, SSG orchestrator, SSR runtime with `StaticRouter`, and the `--static` build flag

## [0.11.0] - 2026-04-19

### Changed

- 60ea157 Faster builds: SWC loader, filesystem cache, and no production source maps

### Fixed

- af9411a Use `hidden-source-map` in production for Sentry support
- 564ba58 Correct the SWC/Babel loader order and scope React aliases to exact matches

## [0.10.0] - 2026-03-27

### Added

- #6 Support a custom `rspack.config.js` in the project directory
- e236a5d Website with a landing page and documentation, deployed to aplos.alpacode.io
- 25acb57 Rename `docs/` to `documentation/` and add `resolveLoader` for external projects
- #7 Document catch-all routes and custom rspack config

### Fixed

- 0c34ac5 Fix SPA routing on GitHub Pages and use `Link` for footer navigation
- 4135711 Remove React Router aliases that break subpath imports in v7
- 5387fb0 Add missing doc pages to the website sidebar and path map

## [0.9.0] - 2026-03-25

### Added

- #5 Support catch-all routes (`[...slug].tsx`)
- b993dcd Serve the project's `public/` directory as static files in dev and prod
- af8f988 Auto-load `.env` and `.env.local` before config evaluation

### Changed

- 696dc98 Replace `react-helmet-async` with native DOM head management
- d42861f Move JSX out of the cache into `src/runtime/`, so the cache is pure JS

### Fixed

- e76837a Exclude `.aplos/cache` from babel-loader to avoid unnecessary processing
- 1065506 Add the missing `postcss-loader` dependency

## [0.8.0] - 2026-02-09

### Added

- 91a6907 Error overlay in the browser
- 974909f Display build and compilation time in the dev server and production build
- 54dea1b Improve the dev server startup message with local/network URLs and active features

### Fixed

- d55585a Rework `aplos/navigation` to properly abstract `react-router-dom`

## [0.7.0] - 2026-02-09

### Added

- ab542b0 Support a custom 404 page via `_404.tsx` in `src/pages`
- 0198605 Support a custom error page via `_error.tsx` in `src/pages`
- 33a1c1d Display the file path in `router:debug` and `router:match` output

### Changed

- 23d3a24 Upgrade rspack to ^1.7.0 and plugin-react-refresh to ^1.6.0

### Fixed

- aaf403f Fix `<head />` generation

## [0.6.0] - 2025-12-28

### Added

- #2 Head defaults configuration: globally injected `<head>` tags via `aplos.config.js`
- 5b7413c Improve starting logs

### Fixed

- 03fea48 Configure `react-helmet-async` with `HelmetProvider` at the app root
- c7d385c Fix hot reload

## [0.5.0] - 2025-11-04

### Changed

- 5e3803a Add the missing `postcss-nested`, update deps, migrate to `bun test`, improve the TS config

## [0.4.0] - 2025-09-17

### Changed

- de1b147 Upgrade to React ^19 and configure the React Compiler
- 44170f8 Add layout documentation to the README

### Fixed

- dd0381e Fix route loading
- cfc3c71 Fix config loading
- 6ac0882 Fix root layout loading

## [0.3.0] - 2025-09-02

### Added

- a8952c5 Nested layouts support
- 0cb0100 Modern functional error boundary with enhanced error catching
- 413ce82 Source maps for a better debugging experience in development

## [0.2.0] - 2025-09-02

### Added

- dd3c10f Route requirements: regex parameter validation
- 2cf3818 `router:match` command for URL testing
- 43c6ad2 Smart port selection: auto-find a free port unless `APLOS_SERVER_PORT` is set
- 5571e7a Optimized production build with bundle analysis and 90% size reduction

### Changed

- 72e0a68 Convert the codebase to ES modules for Node.js/bun compatibility
- cc68471 Replace synchronous file reading with `glob` for better performance
- 0b2b430 Replace `exec()` with `spawn()` for better security in the build command
- 49f3281 Replace `react-helmet` with `react-helmet-async`
- e2bdd2c Improve error handling in `buildRouter` and add comprehensive tests

### Fixed

- f973c71 Fix `aplos.config.js` loading with dynamic imports in ES modules
- 3c77693 Optimize `formatPath` with a regex and fix tests for bun

## [0.1.0] - 2025-08-12

First usable version: a minimalist React framework with file-based routing, built on Rspack.

### Added

- 4d3f98d File-based routing, with support for sub-folders and multiple extensions
- b17d73a `aplos/navigation` module
- 8e65fce `aplos/head` component
- b776a89 Project configuration via `aplos.config.js`
- 6f58412 `router:debug` command
- 80b0629 Configurable server port
- d17c018 Layouts, with `_layout` later renamed to `_app`
- 8c13f07 React Fast Refresh
- 966ae15 PostCSS and autoprefixer
- 1b16305 ESLint
- b2ab6ad Documentation

### Changed

- #1 Migrate to Rspack
- 3289400 Switch to `bun.lock`

[0.16.0]: https://github.com/alpac0de/aplos/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/alpac0de/aplos/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/alpac0de/aplos/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/alpac0de/aplos/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/alpac0de/aplos/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/alpac0de/aplos/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/alpac0de/aplos/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/alpac0de/aplos/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/alpac0de/aplos/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/alpac0de/aplos/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/alpac0de/aplos/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/alpac0de/aplos/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/alpac0de/aplos/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/alpac0de/aplos/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/alpac0de/aplos/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/alpac0de/aplos/releases/tag/v0.1.0
