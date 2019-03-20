import { builtinModules } from 'module';
import resolve from 'rollup-plugin-node-resolve';
import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';
import shebang from 'rollup-plugin-add-shebang';
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
    shebang(),
  ],
};
