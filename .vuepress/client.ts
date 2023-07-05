import { defineClientConfig } from '@vuepress/client'
import { onMounted } from 'vue'
import 'element-plus/dist/index.css'
import 'vxe-table/lib/style.css'

export default defineClientConfig({
    async enhance({ app, router, siteData }) {
        if (!__VUEPRESS_SSR__) {
            var ElementPlus = await import('element-plus');
            var VXETable = await import('vxe-table');
            app.use(ElementPlus);
            app.use(VXETable);
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