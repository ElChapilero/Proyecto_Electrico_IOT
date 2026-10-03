import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Solo la API versionada se reenvia al backend Express,
      // asi durante el desarrollo no hace falta configurar CORS.
      '/api/v1': 'http://localhost:3000',
    },
  },
});
