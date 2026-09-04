/** @type {import('prettier').Config} */
const config = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 110,
  tabWidth: 2,
  arrowParens: "always",
  endOfLine: "lf",
  overrides: [
    {
      files: ["*.md", "*.mdx"],
      options: { proseWrap: "preserve" },
    },
    {
      files: ["*.yml", "*.yaml"],
      options: { printWidth: 100 },
    },
  ],
};

export default config;
