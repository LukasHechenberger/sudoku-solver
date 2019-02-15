import { builtinModules } from 'module';
import MagicString from 'magic-string';
import resolve from 'rollup-plugin-node-resolve';
import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';
import { dependencies } from './package.json';

const extensions = ['.js', '.ts'];

export default {
  external: builtinModules.concat(Object.keys(dependencies)),
  input: [
    './src/index.ts',
    './src/cli.ts',
  ],
  output: {
    dir: './out/',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [
    resolve({ extensions }),
    json(),
    babel({ extensions, include: ['src/**/*'] }),
    {
      name: 'shebang',
      renderChunk(code, { fileName }) {
        if (fileName.endsWith('cli.js')) {
          const s = new MagicString(code);

          s.prepend(`#!/usr/bin/env node

`);

          return {
            code: s.toString(),
            map: s.generateMap({ hires: true }),
          };
        }

        return null;
      },
    },
  ],
};
