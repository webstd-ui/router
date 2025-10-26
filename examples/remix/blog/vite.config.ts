import { defineConfig } from "vite";

export default defineConfig({
    server: {
        port: 1612,
    },
    experimental: {
        enableNativePlugin: true,
    },
    resolve: {
        tsconfigPaths: true,
    },
});
