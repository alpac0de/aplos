import globals from "globals";
import pluginJs from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginReactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["**/.aplos/**", "**/dist/**", "**/public/**", "templates"] },
  { files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"] },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintReact.configs.recommended,
  // Carries the React Compiler rules that eslint-plugin-react-compiler used to.
  pluginReactHooks.configs.flat["recommended-latest"],
  // @eslint-react ships its own rules-of-hooks and compiler checks: turn off the
  // react-hooks copies so a violation is reported once, not twice.
  eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"],
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        crypto: "off",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["tests/**"],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },
];
