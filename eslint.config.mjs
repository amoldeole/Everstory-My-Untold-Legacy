import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import ts from "typescript-eslint";

/**
 * ESLint flat configuration.
 *
 * `eslint-config-next` brings the Next.js, React and accessibility rules;
 * `eslint-config-prettier` switches off the formatting rules that would fight
 * with Prettier. Prettier owns formatting, ESLint owns correctness.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "drizzle/**",
      ".data/**",
      ".scratch/**",
      "*.config.js",
    ],
  },
  ...nextCoreWebVitals,
  prettier,
  {
    // `eslint-config-next` registers `@typescript-eslint` on its own config
    // objects, but a rule referenced from a *different* object needs the
    // plugin declared right here too.
    plugins: {
      "@typescript-eslint": ts.plugin,
    },
    rules: {
      // Warn rather than fail for unused variables — they are usually a sign
      // of incomplete work, not broken code.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-img-element": "off",
      // `dangerouslySetInnerHTML` is used for server-sanitised Markdown output.
      "react/no-danger": "off",
    },
  },
  {
    files: ["scripts/**/*.{ts,mjs,js}", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
];

export default config;
