import { createRspackConfig } from "./src/build/rspack-config.js";

// Thin CLI adapter. The real config lives in src/build/rspack-config.js as a
// parameterised function so the build can call it in-process. This file keeps
// `--config rspack.config.js` working for the rspack CLI by reading the env
// vars once and delegating.
//
// `aplos build --mode` is the source of truth, forwarded as APLOS_MODE because
// this config is loaded in the rspack subprocess. NODE_ENV is only a fallback:
// reading it first made `--mode=production` silently emit a development bundle
// (no contenthash, so deploys serve stale files from HTTP caches) whenever the
// environment set NODE_ENV to anything else, which CI runners routinely do.
//
// APLOS_OUT_DIR is forwarded by `aplos build` (which resolves --out-dir /
// $APLOS_OUT_DIR / the `dist` default) since this config runs in a separate
// rspack process.
export default createRspackConfig({
  mode: process.env.APLOS_MODE || process.env.NODE_ENV || "development",
  outDir: process.env.APLOS_OUT_DIR || "dist",
});
