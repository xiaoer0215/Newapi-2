/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import react from '@vitejs/plugin-react';
import { defineConfig, transformWithEsbuild } from 'vite';
import pkg from '@douyinfe/vite-plugin-semi';
import path from 'path';
import { codeInspectorPlugin } from 'code-inspector-plugin';
const { vitePluginSemi } = pkg;

const devProxyTarget =
  process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:3000';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    process.env.NODE_ENV === 'production'
      ? null
      : codeInspectorPlugin({
          bundler: 'vite',
        }),
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!/src\/.*\.js$/.test(id)) {
          return null;
        }

        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
    react(),
    // vitePluginSemi({
    //   theme: '@douyinfe/semi-theme-default',
    // }),
  ].filter(Boolean),
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.json': 'json',
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep React and i18n runtime in one base chunk to avoid cross-chunk
          // cycles like react-core <-> i18n after Rollup helper extraction.
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules/i18next') ||
            id.includes('node_modules/react-i18next')
          ) {
            return 'framework';
          }
          // Semi UI
          if (id.includes('node_modules/@douyinfe/semi-ui') || id.includes('node_modules/@douyinfe/semi-icons') || id.includes('node_modules/@douyinfe/semi-foundation') || id.includes('node_modules/@douyinfe/semi-animation')) {
            return 'semi-ui';
          }
          // VChart (very large, not tree-shakeable — isolate for caching)
          if (id.includes('node_modules/@visactor/')) {
            return 'vchart';
          }
          // Markdown / KaTeX ecosystem (large, not tree-shakeable)
          if (id.includes('node_modules/katex/') || id.includes('node_modules/react-markdown/') || id.includes('node_modules/rehype-') || id.includes('node_modules/remark-') || id.includes('node_modules/hast') || id.includes('node_modules/unified/') || id.includes('node_modules/unist') || id.includes('node_modules/mdast') || id.includes('node_modules/micromark') || id.includes('node_modules/vfile') || id.includes('node_modules/bail/') || id.includes('node_modules/trough/') || id.includes('node_modules/is-plain-obj/')) {
            return 'markdown';
          }
          // Utility tools
          if (id.includes('node_modules/axios/') || id.includes('node_modules/history/') || id.includes('node_modules/marked/') || id.includes('node_modules/dayjs/') || id.includes('node_modules/clsx/') || id.includes('node_modules/use-debounce/')) {
            return 'tools';
          }
          // Misc React components
          if (id.includes('node_modules/react-dropzone') || id.includes('node_modules/react-fireworks') || id.includes('node_modules/react-telegram-login') || id.includes('node_modules/react-toastify') || id.includes('node_modules/react-turnstile') || id.includes('node_modules/qrcode.react') || id.includes('node_modules/sse.js')) {
            return 'react-components';
          }
          // NOTE: @lobehub/icons, lucide-react, react-icons, antd are intentionally
          // NOT assigned here — let tree-shaking reduce them to only used exports.
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: true,
      },
      '/mj': {
        target: devProxyTarget,
        changeOrigin: true,
      },
      '/pg': {
        target: devProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
