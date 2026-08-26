import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (command === "build" && !(env.VITE_API_URL || "").trim().replace(/\/$/, "")) {
    throw new Error(
      "本番ビルドには VITE_API_URL が必要です。frontend/.env.production に SAM Output の ApiUrl を書いてください（/prod は残す）。",
    );
  }

  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
