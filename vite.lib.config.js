// vite.lib.config.js — 构建可嵌入 bundle（npm 组件）。
// 产出 dist-lib/koi-viewer.js (ESM) + dist-lib/koi-viewer.umd.cjs (UMD)，React 作为外部依赖。
// 用法：npm run build:lib
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/lib.js', import.meta.url)),
      name: 'KoiPond',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'es' ? 'koi-viewer.js' : 'koi-viewer.umd.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJsxRuntime',
        },
      },
    },
    outDir: 'dist-lib',
    emptyOutDir: true,
  },
});
