// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Dev-only scripts, not shipped code: `document` is a real global inside
    // their page.evaluate() callbacks, and `console` is a real Node global -
    // neither is declared for plain .mjs files the way the TS project's own
    // "DOM" lib declares them for src/**/*.ts.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { document: 'readonly', console: 'readonly' },
    },
  },
);
