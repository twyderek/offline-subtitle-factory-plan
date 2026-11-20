export default [
  {
    files: ['lib/**/*.mjs', 'public/shared/**/*.mjs', 'public/app/index.mjs', 'public/review/index.mjs', 'public/trim/index.mjs', 'tests/unit/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        document: 'readonly',
        Error: 'readonly',
        globalThis: 'readonly',
        process: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
