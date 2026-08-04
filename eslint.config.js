import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    // Documentation d'API générée par TypeDoc.
    'docs/api',
    // Fichiers de travail écrits par la CLI Supabase.
    'supabase/.temp',
    // Edge Functions : code Deno, avec ses propres globales et ses imports par
    // URL. Il est vérifié par `deno check`, pas par cette configuration ESLint
    // qui cible le navigateur.
    'supabase/functions',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
