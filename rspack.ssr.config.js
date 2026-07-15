import { createSSRConfig } from "./src/build/ssr-config.js";

// Thin CLI adapter. The real SSR config lives in src/build/ssr-config.js as a
// parameterised function so the build can call it in-process. This file keeps
// `--config rspack.ssr.config.js` working for the rspack CLI by reading the env
// vars once and delegating.
export default createSSRConfig({
  mode: process.env.APLOS_MODE || process.env.NODE_ENV || "production",
});
