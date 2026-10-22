// @ts-check

const eslint = require('@eslint/js');
const angular = require('angular-eslint');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['projects/**/*'],
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-signal-model': 'error',
    },
  },
  {
    files: ['src/app/shared/ui/**/*.ts'],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      '@angular-eslint/directive-selector': 'off',
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/no-input-rename': 'off',
      '@angular-eslint/prefer-signal-model': 'off',
    },
  },
  {
    files: ['src/app/**/pages/**/*.ts', 'src/app/**/components/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'bridge',
              allowTypeImports: true,
              message:
                "Ne pas importer le bridge à l'exécution depuis une page ou un composant. Passer par repository/service/store.",
            },
          ],
          patterns: [
            {
              group: ['bridge/*'],
              allowTypeImports: true,
              message:
                "Ne pas importer le bridge à l'exécution depuis une page ou un composant. Passer par repository/service/store.",
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'EventSource',
          message: 'Ne pas utiliser EventSource depuis une page ou un composant. Passer par service/repository/store.',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
    },
  },
);
