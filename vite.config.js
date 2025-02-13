import { defineConfig } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
   if (mode === "pages") {
      return {
         build: {
            outDir: "dist",
            emptyOutDir: true,
            rollupOptions: {
               input: "index.html",
            },
         },
      };
   } else {
      return {
         build: {
            outDir: "dist",
            emptyOutDir: true,
            lib: {
               entry: path.resolve(__dirname, "index.js"),
               name: "ndmvrAframe",
               fileName: (format) => `index.${format}.js`,
            },
            rollupOptions: {
               external: ["aframe", "rxjs"],  // Don't bundle dependencies
               output: {
                  globals: {
                     aframe: "AFRAME",
                     rxjs: "rxjs",
                  },
               },
            },
         },
      };
   }
});
