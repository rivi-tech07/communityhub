import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/.tsbuild/**', '**/dist/**', '**/next-env.d.ts', 'outputs/**'] },
  ...tseslint.configs.recommended,
);
