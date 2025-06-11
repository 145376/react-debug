import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  mode: "production",
  server: {
    port: 3008,
  },
  plugins: [
    react({
      jsxRuntime: "automatic",
      jsxImportSource: path.resolve(import.meta.dirname, "react-source/react/"),
    }),
  ],
  define: {
    __EXPERIMENTAL__: false,
    __PROFILE__: false,
    __DEV__: false,
  },
  resolve: {
    alias: [
      {
        find: "react",
        replacement: path.resolve(import.meta.dirname, "react-source/react/"),
      },
      {
        find: /^react-dom\/(.*)?/,
        replacement: path.resolve(
          import.meta.dirname,
          "react-source/react-dom/$1"
        ),
      },
      {
        find: /^react-source\/(.*)?/,
        replacement: path.resolve(import.meta.dirname, "react-source/$1"),
      },
      {
        find: /^react-dom-bindings\/(.*)?/,
        replacement: path.resolve(
          import.meta.dirname,
          "react-source/react-dom-bindings/$1"
        ),
      },
      {
        find: /^shared\/(.*)?/,
        replacement: path.resolve(
          import.meta.dirname,
          "react-source/shared/$1"
        ),
      },
      {
        find: /^react-reconciler\/(.*)?/,
        replacement: path.resolve(
          import.meta.dirname,
          "react-source/react-reconciler/$1"
        ),
      },
      {
        find: "scheduler",
        replacement: path.resolve(
          import.meta.dirname,
          "react-source/scheduler/"
        ),
      },
      {
        find: /^react-client\/(.*)?/,
        replacement: path.resolve(
          import.meta.dirname,
          "react-source/react-client/$1"
        ),
      },
    ],
  },
});
