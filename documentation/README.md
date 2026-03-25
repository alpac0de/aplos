# Aplos Documentation

This directory contains the documentation for Aplos Framework, built with MkDocs Material.

## Running the Documentation Locally

### Using Docker Compose (Recommended)

The easiest way to run the documentation is using Docker Compose:

```bash
# Start the documentation server
bun run docs:dev
```

The documentation will be available at [http://localhost:8000](http://localhost:8000).

Press `Ctrl+C` to stop the server.

### Building Static Documentation

To build the static documentation site:

```bash
bun run docs:build
```

The static site will be generated in the `site/` directory.

## Using MkDocs Directly

If you prefer to use MkDocs directly without Docker:

### Install MkDocs and Material Theme

```bash
pip install mkdocs-material
```

### Run Development Server

```bash
mkdocs serve
```

### Build Static Site

```bash
mkdocs build
```

## Documentation Structure

```
docs/
├── index.md                      # Homepage
├── getting-started/
│   ├── installation.md           # Installation guide
│   └── quick-start.md            # Quick start tutorial
├── routing/
│   ├── file-based.md             # File-based routing
│   ├── dynamic-routes.md         # Dynamic routes
│   └── layouts.md                # Layouts system
├── configuration/
│   ├── overview.md               # Configuration overview
│   ├── runtime.md                # Runtime configuration
│   └── rspack.md                 # Custom rspack configuration
├── cli/
│   └── commands.md               # CLI commands reference
└── api/
    └── components.md             # API reference
```

## Contributing to Documentation

When adding new features to Aplos, please update the relevant documentation files. Follow these guidelines:

1. Use clear, concise language
2. Include code examples
3. Add warnings or notes where appropriate
4. Keep examples realistic and practical
5. Test all code examples before committing

## Documentation Style

- Use Markdown format
- Code blocks should specify the language (```tsx, ```bash, etc.)
- Use admonitions for important notes:
  - `!!! note` for general information
  - `!!! warning` for warnings
  - `!!! tip` for helpful tips
