import { defineConfig } from "vite";

export default defineConfig({
  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
  build: {
    rollupOptions: {
      input: {
        // Vite sẽ tìm các file HTML này ở thư mục gốc project
        main: "index.html",
        background: "background.html",
      },
    },
  },
});