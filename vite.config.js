import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
   build: {
      lib: {
         entry: path.resolve(__dirname, "index.js"), // Entry point
         name: "ndmvrAframe",
         fileName: (format) => `index.${format}.js`
      },
      rollupOptions: {
         external: ["aframe", "rxjs"], // Don't bundle dependencies
         output: {
            globals: {
               aframe: "AFRAME",
               rxjs: "rxjs"
            }
         }
      }
   }
});