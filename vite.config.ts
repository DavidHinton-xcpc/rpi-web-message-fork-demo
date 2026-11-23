import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

// Point the dev server at the LOCAL rpi-web backend (port from
// ~/.rpi/agent/web.json, default 3997), not the SSH-forwarded cloud one.
// Override with RPI_WEB_BACKEND when the backend listens elsewhere.
const backend = process.env.RPI_WEB_BACKEND ?? "http://127.0.0.1:3997";

const proxy: Record<string, ProxyOptions> = {
  "/api": {
    target: backend,
    changeOrigin: true,
    configure(proxy) {
      proxy.on("proxyReq", (request) => {
        request.removeHeader("origin");
      });
    },
  },
};

export default defineConfig(({ mode }) => {
  const remote = mode === "remote";
  return {
    base: "./",
    plugins: [react()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id))
              return "react-runtime";
            if (
              id.includes("node_modules") &&
              (id.includes("highlight.js") || id.includes("lowlight"))
            )
              return "syntax";
          },
        },
      },
    },
    server: remote
      ? {
          host: "0.0.0.0",
          allowedHosts: ["work-dev.bigfisharc.cn"],
          port: 18087,
          strictPort: true,
          hmr: {
            host: "work-dev.bigfisharc.cn",
            protocol: "wss",
            clientPort: 443,
          },
          proxy,
        }
      : {
          host: "127.0.0.1",
          port: 4191,
          strictPort: true,
          proxy,
        },
  };
});
