import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import eslintPlugin  from 'vite-plugin-eslint'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [{
    ...eslintPlugin(),
    apply: 'build',
  },
    { // 不在开发时报错
      ...eslintPlugin({
        failOnWarning: false,
        failOnError: false,
      }),
      apply: 'serve',
      enforce: 'post'
    },dts({ rollupTypes: true })],
  resolve: {
    // 配置路径别名
    alias: {
      '@': '/src',
    },
  },

  build: {
    lib: {
      // 打包的入口文件
      entry: resolve(__dirname, './src/main.ts'),
      name: 'lib',
      // 打包后输出的文件名
      fileName: 'my-lib',
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: [''],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {

        },
      },
    },
  },
})
