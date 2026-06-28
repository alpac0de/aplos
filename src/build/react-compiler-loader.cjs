// React Compiler loader that only invokes Babel on files that actually need it.
//
// `@swc/react-compiler` exposes a native detector (`isReactCompilerRequiredSync`)
// that cheaply decides whether a file contains components/hooks the React
// Compiler would transform. Files that don't (plain utils, type-only modules,
// constants) skip Babel entirely and are returned untouched — keeping the fast
// SWC-only path for the bulk of the codebase. Only matching files pay the Babel
// cost, and only for the single `babel-plugin-react-compiler` plugin.
//
// This loader is wired in instead of `babel-loader` when `reactCompiler: true`.
// react-refresh (dev) is handled natively by SWC, so Babel is no longer needed
// for that.

const { isReactCompilerRequiredSync } = require("@swc/react-compiler");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let babelCore = null;
function getBabel() {
  if (!babelCore) {
    babelCore = require("@babel/core");
  }
  return babelCore;
}

// Resolve the plugin to an absolute path so Babel finds it relative to this
// loader (inside aplos' node_modules) rather than the user project's CWD.
const reactCompilerPlugin = require.resolve("babel-plugin-react-compiler");

// Persistent on-disk cache for Babel output. The React Compiler costs ~200ms
// per component, which dominates build time on large codebases. Keying on the
// source content + plugin version means an unchanged file is never recompiled —
// the first build is full price, every rebuild only pays for files that changed.
const CACHE_VERSION = (() => {
  try {
    return require("babel-plugin-react-compiler/package.json").version;
  } catch {
    return "0";
  }
})();

// Cache location follows the XDG Base Directory spec so it lands wherever the
// host wants caches to live. On a CI/PaaS that persists a cache directory
// between builds (e.g. by exporting XDG_CACHE_HOME to a mounted volume), the
// React Compiler output survives across deployments and the per-component
// Babel cost is paid once instead of on every build. Falls back to ~/.cache,
// then the OS temp dir for ephemeral environments.
function resolveCacheRoot() {
  if (process.env.XDG_CACHE_HOME) {
    return path.join(process.env.XDG_CACHE_HOME, "aplos", "react-compiler");
  }
  if (process.env.HOME) {
    return path.join(process.env.HOME, ".cache", "aplos", "react-compiler");
  }
  return path.join(os.tmpdir(), "aplos-react-compiler-cache");
}
const CACHE_DIR = resolveCacheRoot();
let cacheReady = false;
function ensureCacheDir() {
  if (!cacheReady) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    cacheReady = true;
  }
}
function cacheKey(source, sourceMap) {
  return crypto
    .createHash("sha1")
    .update(CACHE_VERSION)
    .update(sourceMap ? "1" : "0")
    .update(source)
    .digest("hex");
}

module.exports = function reactCompilerLoader(source) {
  const callback = this.async();

  let required = false;
  try {
    required = isReactCompilerRequiredSync(Buffer.from(source));
  } catch {
    // If detection fails, fall back to running the compiler so we never
    // silently drop a needed transform.
    required = true;
  }

  if (!required) {
    callback(null, source);
    return;
  }

  // Cache lookup: identical source → reuse previous Babel output.
  const key = cacheKey(source, this.sourceMap);
  const cacheFile = path.join(CACHE_DIR, key + ".json");
  try {
    ensureCacheDir();
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    callback(null, cached.code, cached.map || undefined);
    return;
  } catch {
    // Cache miss — fall through to compile.
  }

  const babel = getBabel();
  babel.transform(
    source,
    {
      filename: this.resourcePath,
      babelrc: false,
      configFile: false,
      sourceMaps: this.sourceMap,
      // The source is still TS/JSX at this point (this loader runs before SWC,
      // bottom-up). Parse those syntaxes so the compiler can read the AST.
      parserOpts: { plugins: ["jsx", "typescript"] },
      plugins: [[reactCompilerPlugin, {}]],
    },
    (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      try {
        fs.writeFileSync(
          cacheFile,
          JSON.stringify({ code: result.code, map: result.map || null })
        );
      } catch {
        // Cache write is best-effort; never fail the build over it.
      }
      callback(null, result.code, result.map || undefined);
    }
  );
};
