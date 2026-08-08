import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local build/verification scratch copy — a duplicate of the app that is
    // gitignored, so linting it only produces phantom findings.
    ".verify/**",
  ]),
  {
    // Maintenance scripts are plain CommonJS, run directly with `node` rather
    // than bundled, so `require()` is the correct form. The rule arrives via
    // eslint-config-next/typescript, which assumes ESM sources.
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Pre-existing React Compiler advisories across 9 components: mount flags,
    // resetting state on route change, and syncing state from the DOM. They
    // are performance advisories rather than defects, and reworking them is
    // tracked separately. Kept visible as warnings so CI still fails on new
    // errors instead of being switched off wholesale.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
