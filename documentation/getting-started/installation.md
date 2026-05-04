# Installation

The fastest way to start a new Aplos project is the scaffolding command.

## Prerequisites

- **Bun** ≥ 1.0 (recommended) or **Node.js** ≥ 18
- A terminal

## Scaffold a new project

```bash
bun create aplos my-app
```

Or with npm:

```bash
npm create aplos@latest my-app
```

This creates a new directory `my-app/` with a minimal Aplos project ready to run.

## Run the project

```bash
cd my-app
bun install
bun dev
```

The dev server starts on [http://localhost:3000](http://localhost:3000) (or the next free port if 3000 is taken).

## Add Aplos to an existing project

If you already have a project and want to add Aplos manually:

```bash
bun add aplosjs
bun add react@19 react-dom@19 react-router-dom@7
```

Then create a `src/pages/` directory and your first page (see [Quick start](quick-start.md)).

## Verify

```bash
bunx aplos --version
```

Expected output: a version number like `0.14.0`.
