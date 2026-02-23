import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import { resolve } from "path"

const devPort = 5176

export default defineConfig(({ command }) => ({
    plugins: [svelte()],
    root: command === 'serve' ? 'demo' : '.',
    server: {
        port: devPort,
        strictPort: true,
        host: 'localhost',
    },
    resolve: {
        alias: {
            $lib: resolve(__dirname, "./src/lib"),
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        exclude: ["**/node_modules/**", "**/dist/**", "**/tests/e2e/**"],
        root: '.',
    },
    build: {
        lib: {
            entry: "src/index.ts",
            name: "SvelteCalendarLib",
            fileName: "index",
        },
        rollupOptions: {
            external: ["svelte", "luxon"],
            output: {
                globals: {
                    svelte: "Svelte",
                    luxon: "luxon",
                },
            },
        },
    },
}))
