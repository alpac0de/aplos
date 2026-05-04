# Create a new project

The fastest way to start an Aplos project.

## Via `bun create` (recommended)

```bash
bun create aplos my-app
```

Or with npm:

```bash
npm create aplos@latest my-app
```

This works without installing Aplos globally — the package manager downloads `create-aplos` on the fly and runs it.

## Via the `aplos` CLI

If Aplos is already installed (locally or globally):

```bash
aplos create my-app
```

Same effect: scaffolds a new minimal project in `./my-app`.

## What you get

```
my-app/
├── aplos.config.js
├── package.json
├── public/
│   └── favicon.svg
├── src/
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── index.tsx
│   │   └── about.tsx
│   └── styles/
│       └── global.css
├── tsconfig.json
└── README.md
```

A working app with two pages, a root `_app` layout, and TypeScript configured.

## Project name rules

The name must:

- Start with a letter or digit
- Contain only letters, digits, dashes (`-`), dots (`.`) or underscores (`_`)

Invalid names are rejected with a clear error message.

## After scaffolding

```bash
cd my-app
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).
