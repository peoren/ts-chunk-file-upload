// 'off' 或 0 - 关闭规则
// 'warn' 或 1 - 开启规则，使用警告级别的错误：warn (不会导致程序退出)
// 'error' 或 2 - 开启规则，使用错误级别的错误：error (当被触发的时候，程序会退出)
module.exports = {
    root: true,
    env: {
        browser: true,
        node: true,
        es6: true
    },
    extends: [
        'eslint:recommended',
    ],
    plugins: ["@typescript-eslint"],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        jsxPragma: 'React',
        ecmaFeatures: {
            jsx: true,
            tsx: true
        }
    },
    rules: {
        // TS
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unused-vars': 'off',

        // TS补充规则
        // 尽可能使用 === 和 !==
        eqeqeq: 'warn',
        // 取消禁用 debugger, 已配置打包自动删除
        'no-debugger': 'off',
        // 禁止重复导入
        'no-duplicate-imports': 'error',
        // 禁止出现空语句块
        'no-empty': [
            'error',
            {
                allowEmptyCatch: true
            }
        ],
        // 禁止在没有类型检查操作符的情况下与 null 进行比较
        'no-eq-null': 'error',
        // 禁用 eval()
        'no-eval': 'error',
        // 禁用 Object 的构造函数
        'no-new-object': 'warn',
        // 禁止对 Function 对象使用 new 操作符
        'no-new-func': 'error',
        // 禁止对函数参数再赋值
        'no-param-reassign': 'warn',
        // 禁止在常规字符串中出现模板字面量占位符语法
        'no-template-curly-in-string': 'error',
        // 禁用不必要的构造函数
        'no-useless-constructor': 'error',
        // 禁止出现未使用过的变量
        'no-unused-vars': 'off',
        // 要求使用 let 或 const 而不是 var
        'no-var': 'warn',
        // 要求或禁止对象字面量中方法和属性使用简写语法
        'object-shorthand': 'warn',
        // 要求使用箭头函数作为回调
        'prefer-arrow-callback': 'warn',
        // 要求使用 const 声明那些声明后不再被修改的变量
        'prefer-const': [
            'warn',
            {
                destructuring: 'all'
            }
        ],
        // 要求使用模板字面量而非字符串连接
        'prefer-template': 'warn',
        // 禁止使用不带 await 表达式的 async 函数
        'require-await': 'warn',
        // 需要把立即执行的函数包裹起来
        'wrap-iife': ['warn', 'inside'],

    }
}
