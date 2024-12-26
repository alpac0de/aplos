import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
    {ignores: [".aplos", "templates", "public"]},
    {files: ["**/*.{js,mjs,cjs,jsx}"]},
    {
      languageOptions: {
        globals: {
          ...globals.browser,
          ...globals.node,
        }
      }
    },
    pluginJs.configs.recommended,
    pluginReact.configs.flat.recommended,
];