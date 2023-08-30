import { defineConfig } from "vite"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import packageJson from "./package.json"
import typescript from "@rollup/plugin-typescript"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig(({ command, mode }) => ({
    plugins: [typescript()],
    build: {
        lib: {
            entry: "src/index.ts",
            name: "@webstd-ui/router",
            fileName: format => `${packageJson.name}.${format}.js`,
        },
    },
    resolve: {
        alias: {
            "~": resolve(__dirname, "./reference-app"),
            "@webstd-ui/router": resolve(__dirname, "src/index.ts"),
            "@webstd-ui/view/internals": resolve(__dirname, "../view/src/internals/index.ts"),
            "@webstd-ui/view": resolve(__dirname, "../view/src/index.ts"),
        },
    },
    clearScreen: command === "serve" && mode === "development",
}))
