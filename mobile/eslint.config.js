const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expo,
  prettier,
  {
    ignores: ['node_modules/*', '.expo/*', 'dist/*', 'src/api/esquema.d.ts'],
  },
  {
    // Las pantallas y los componentes solo usan los servicios; nunca los datos simulados.
    files: ['src/pantallas/**', 'src/componentes/**', 'src/navegacion/**', 'src/sesion/**'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/api/mock', '**/api/mock/*'],
              message: 'No importes datos simulados; usa los servicios de src/api.',
            },
          ],
        },
      ],
    },
  },
]);
