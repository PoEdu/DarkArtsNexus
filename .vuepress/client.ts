import { defineClientConfig } from '@vuepress/client'
import { onMounted } from 'vue'
import 'element-plus/dist/index.css'

export default defineClientConfig({
    async enhance({ app, router, siteData }) {
        if (!__VUEPRESS_SSR__) {
            var ElementPlus = await import('element-plus');
            app.use(ElementPlus);
        }
    },
    setup() { 
        onMounted(() => {
            console.log('Client app is mounted!');
        });
    },
    layouts: {},
    rootComponents: [],
})