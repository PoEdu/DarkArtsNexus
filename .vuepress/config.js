import { defaultTheme } from 'vuepress'
import { copyCodePlugin } from "vuepress-plugin-copy-code2";
import { commentPlugin } from "vuepress-plugin-comment2";
import { mdEnhancePlugin } from "vuepress-plugin-md-enhance";
import { registerComponentsPlugin } from '@vuepress/plugin-register-components'
import { getDirname, path } from '@vuepress/utils'

const __dirname = getDirname(import.meta.url)

export default {
    title: '现代黑魔法学院',
    description: '一个交互实验式编译器技术学习站',
    theme: defaultTheme({
        // 默认主题配置
        navbar: [
            {
                text: '首页',
                link: '/',
            },
            {
                text: '路线图',
                link: '/sitemap',
            }
        ],
    }),
    plugins: [
        commentPlugin({
            // your options
            provider: "Giscus",
            repo:"PoEdu/discussion",
            repoId:"R_kgDOJfuqJg",
            category:"General",
            categoryId:"DIC_kwDOJfuqJs4CWUDF",
        }),
        copyCodePlugin({
            // your options
        }),
        mdEnhancePlugin({
            // your options
            tab: true,
            codetabs: true,
            card: true,
            mermaid: true,
            attrs: true,
            footnote: true,
        }),
        registerComponentsPlugin({
            componentsDir: path.resolve(__dirname, '../Components'),
        }),
    ],
}
