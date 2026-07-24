// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Deno Edge Functions — linted with Deno globals (not ignored).
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      globals: {
        Deno: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      // Deno URL imports (esm.sh) are valid at runtime.
      'import/no-unresolved': 'off',
      'import/no-named-as-default': 'off',
    },
  },
]);
