import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Todo lo que empiece con /api se reenvia al backend Express,
      // asi durante el desarrollo no hace falta configurar CORS.
      '/api': 'http://localhost:3000',
    },
  },
});
