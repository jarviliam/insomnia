/** @type { import('eslint').Linter.Config } */
module.exports = {
  extends: '../../.eslintrc.js',
  rules: {
    'filenames/match-exported': 'off',
    camelcase: 'off',
    '@typescript-eslint/no-use-before-define': 'off', // TSCONVERSION
    '@typescript-eslint/no-explicit-any': 'off', // TSCONVERSION
    'no-restricted-properties': ['error', {
      property: 'openExternal',
      message: 'use the `clickLink` function in `electron-helpers.ts` instead.  see https://security.stackexchange.com/questions/225799/dangers-of-electrons-shell-openexternal-on-untrusted-content for more information.',
    }],
  },
};
