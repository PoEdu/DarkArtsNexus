import { sidebar } from "vuepress-theme-hope";

export const Sidebar = sidebar({
  "/编译原理/": [
    {
      text: "前端",
      prefix: "1.前端",
      children: [
        "(1)词法分析",
        "(2)语法分析"
      ],
    }
  ],
  "/图形学实践/": [
    {
      text: "DirectX12简明教程",
      prefix: "DX12",
      children: [
        "0.准备工作",
        "1.绘制三角形",
        "2.添加纹理",
        "3.基础光照模型"
      ],
    }
   
  ]
});
