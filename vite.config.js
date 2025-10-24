import { defineConfig } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
   if (mode === "pages") {
      return {
         build: {
            outDir: "dist",
            emptyOutDir: true,
            rollupOptions: {
               input: {
                  main: path.resolve(__dirname, "index.html"),
                  stress: path.resolve(__dirname, "stress.html"),
               },
            },
         },
         // server: {
         //    host: true,
         //    cors: true,
         //    strictPort: false,
         // },
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
               external: ["aframe", "rxjs", "three", "jsroot"],  // Don't bundle dependencies
               output: {
                  globals: {
                     aframe: "AFRAME",
                     rxjs: "rxjs",
                    three: "THREE",
                    jsroot: "JSROOT"
                  },
               },
            },
            // server: {
            //    host: true,
            //    cors: true,
            //    strictPort: false,
            // },
         },
      };
   }
});
