import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3010,
  },
  build: {
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Conservative manual chunking to keep very large third-party libs in their own files
        // and split other node_modules by package to avoid one massive vendor bundle.
        manualChunks(id) {
          if (!id) return 'vendor';
          if (id.includes('node_modules')) {
            // explicit large libs
            if (id.includes('exceljs')) return 'chunk-exceljs';
            if (id.includes('jspdf')) return 'chunk-jspdf';
            if (id.includes('html2canvas')) return 'chunk-html2canvas';
            if (id.includes('recharts')) return 'chunk-recharts';
            if (id.includes('xlsx')) return 'chunk-xlsx';

            // extract package name from path (handles scoped packages)
            const match = id.match(/[\\/]node_modules[\\/](?:@[^\\/]+[\\/][^\\/]+|[^\\/]+)(?=[\\/]|$)/);
            if (match) {
              const pkgPath = match[0].replace(/^[\\/]node_modules[\\/]/, '');
              const pkgName = pkgPath.replace(/[\\/]/g, '-').replace(/^@/, 'scoped-');
              // group core libs into a small vendor-core
              if (/^(react|react-dom|firebase)$/.test(pkgName)) return 'vendor-core';
              return `vendor-${pkgName}`;
            }

            return 'vendor-others';
          }
        },
      },
    },
  },
});
