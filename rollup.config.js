import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json' assert { type: 'json' };

export default {
    input: 'src/ImageEditor.svelte',
    output: [
        { file: pkg.module, format: 'es' },
        { file: pkg.main, format: 'umd', name: 'SvelteImageEditor' },
    ],
    plugins: [
        svelte({
            emitCss: false,
        }),
        resolve(),
        commonjs(),
    ],
};
