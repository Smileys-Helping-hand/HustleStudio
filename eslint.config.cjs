const { FlatCompat } = require('@eslint/eslintrc');

// Use FlatCompat to mirror existing .eslintrc.cjs rules to a flat config
const compat = new FlatCompat({ combinePlugins: true, recommendedConfig: 'recommended' });

module.exports = [
  // extend recommended and plugins used previously
  ...compat.extends(
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier'
  ),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': ['warn'],
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
      'jsx-a11y/alt-text': 'warn',
    },
  },
];
