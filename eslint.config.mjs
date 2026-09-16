import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // French product copy naturally contains apostrophes in JSX text.
      // This rule is stylistic only and does not affect HTML escaping at runtime.
      "react/no-unescaped-entities": "off",

      // Keep legacy / integration typing debt visible while still blocking
      // parsing, type/build and React correctness failures in CI.
      "@typescript-eslint/no-explicit-any": "warn",

      // Several existing async loaders are intentionally invoked from effects.
      // Keep the React 19 signal visible without blocking the migration.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "visual-artifacts/**",
  ]),
]);

export default eslintConfig;
