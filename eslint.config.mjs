import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        // Third-party libraries loaded via CDN
        marked: "readonly",
        mermaid: "readonly",
        Prism: "readonly",
        DOMPurify: "readonly",
        CodeMirror: "readonly",
        hljs: "readonly",
        // App globals
        expandMermaid: "readonly",
      },
    },
    rules: {
      // Style rules - intentionally lenient
      "indent": "off",
      "linebreak-style": ["error", "unix"],
      "quotes": "off",
      "semi": "off",
      "no-unused-vars": "warn",
      "no-console": "off",
      // Security rules
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      // Code quality
      "eqeqeq": ["error", "always"],
      "no-var": "warn",
      "prefer-const": "warn",
    },
  },
];
