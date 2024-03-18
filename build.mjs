import dts from 'bun-plugin-dts';

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  plugins: [dts()],
  target: 'node',
  external: ['dts-bundle-generator', 'get-tsconfig']
});
