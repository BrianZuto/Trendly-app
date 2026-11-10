// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
    expoConfig,
    {
        ignores: ['dist/*', 'coverage/*'],
    },
    {
        // El alias @/ → src/ está en jsconfig.json (Metro y Jest lo leen de ahí)
        settings: { 'import/resolver': { typescript: { project: './jsconfig.json' } } },
    },
    {
        files: ['__tests__/**/*.js', 'test/**/*.js', 'jest.setup.js'],
        languageOptions: { globals: { jest: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' } },
    },
])
