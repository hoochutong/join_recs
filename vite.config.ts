// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // 루트는 기본값이라 생략 가능하나 명시하면 더 명확함
  build: {
    outDir: 'dist',       // 기본값
    emptyOutDir: true,    // 배포 시 dist 폴더 비우기
  },
});