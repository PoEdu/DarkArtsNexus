import { registerComponentsPlugin } from '@vuepress/plugin-register-components'
import { getDirname, path } from '@vuepress/utils'
import { hopeTheme } from "vuepress-theme-hope";
import { Navbar } from "./navbar.js";
import { Sidebar } from "./sidebar.js";
import { viteBundler } from '@vuepress/bundler-vite';


const __dirname = getDirname(import.meta.url)

export default {
    base: "/",
    lang: "zh-CN",
    title: '现代黑魔法学院',
    description: '一个交互实验式编译器技术学习站',
    pagePatterns: ['**/*.md', '!**/README.md', '!.vuepress', '!node_modules'],

    plugins: [
        registerComponentsPlugin({
            componentsDir: path.resolve(__dirname, '../Components'),
        }),
    ],

    theme: hopeTheme({
        hostname: "https://PoIndex.github.io/",

        author: {
            name: "西风逍遥游",
            url: "https://github.com/sunxfancy",
        },

        iconAssets: "fontawesome-with-brands",

        logo: "/logo.svg",

        repo: "https://github.com/PoEdu/PoIndex",

        // navbar
        navbar: Navbar,

        // sidebar
        sidebar: Sidebar,

        footer: "默认页脚",

        displayFooter: true,

        metaLocales: {
            editLink: "在 GitHub 上编辑此页",
        },

        plugins: {
            comment: {
                // your options
                provider: "Giscus",
                repo: "PoEdu/discussion",
                repoId: "R_kgDOJfuqJg",
                category: "General",
                categoryId: "DIC_kwDOJfuqJs4CWUDF",
            },
            copyCode: {},
            mdEnhance: {
                // your options
                tabs: true,
                codetabs: true,
                card: true,
                mermaid: true,
                attrs: true,
                footnote: true,
                include: true,
            },
        }
    }),
    bundler: viteBundler({
    viteOptions: {
    },
    vuePluginOptions: {},
    }),
    
}
