import babel from '@rollup/plugin-babel';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        babel({
            babelHelpers: 'bundled',
            extensions: ['.ts'],
        }),
    ],
    server: {
        port: 1612,
    },
    experimental: {
        enableNativePlugin: true,
    },
    resolve: {
        tsconfigPaths: true,
    },
    css: {
        transformer: 'lightningcss',
    },
});
