import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const NO_REACT = { group: ['react', 'react-dom', 'react-dom/*'], message: 'The chart package must not depend on React.' };
const NO_NODE = { group: ['node:*'], message: 'The chart package runs in the browser too.' };
const NO_IZTRO = { group: ['iztro', 'iztro/*'], message: 'Only packages/chart/src/astrolabe.ts calls iztro; use @tuvi/chart.' };

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/test-results/**', '**/playwright-report/**', '.data/**', 'brand/generated/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // The chart package runs in the browser and in Node: plain TypeScript, no UI framework, no Node built-ins.
  // iztro is called from one module only (packages/chart/src/astrolabe.ts); the tests compare against it directly.
  {
    files: ['packages/chart/src/**/*.ts'],
    ignores: ['packages/chart/src/astrolabe.ts', '**/*.test.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NO_REACT, NO_NODE, NO_IZTRO] }] },
  },
  {
    files: ['packages/chart/src/astrolabe.ts', 'packages/chart/src/**/*.test.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NO_REACT, NO_NODE] }] },
  },
  {
    files: ['apps/**/*.{ts,tsx}', 'scripts/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NO_IZTRO] }] },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['apps/web/**/*.tsx'],
    ...jsxA11y.flatConfigs.recommended,
  },
);
