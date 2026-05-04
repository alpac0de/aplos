# {{NAME}}

Built with [Aplos](https://aplos.alpacode.io) — a fast, file-based React framework powered by Rspack.

## Getting started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Available scripts

- `bun dev` — start the development server with HMR
- `bun build` — build for production
- `bun build:static` — build with static pre-rendering for opt-in pages

## Project structure

```
src/
  pages/        # File-based routes
    _app.tsx    # Root layout
    index.tsx   # Home page (/)
    about.tsx   # About page (/about)
  styles/
    global.css
aplos.config.js
```

Add files in `src/pages/` to create new routes automatically.

## Learn more

- [Aplos documentation](https://aplos.alpacode.io)
- [GitHub repository](https://github.com/alpac0de/aplos)
