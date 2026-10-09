import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "android/**", "public/**"],
  },
  {
    files: ["src/**/*.ts", "server/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "no-debugger": "error",
      "no-unreachable": "error",
      "no-constant-binary-expression": "error",
      "no-duplicate-imports": "error",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
