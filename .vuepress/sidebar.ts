import { sidebar } from "vuepress-theme-hope";

export const Sidebar = sidebar({
  "/编译原理/": [
    {
      text: "前端",
      prefix: "1.前端",
      children: [
        "(1)词法分析",
        "(2)语法分析",
        "(3)语义分析",
      ],
    },
    {
      text: "中端",
      prefix: "2.中端",
      children: [
        "(1)值编号",
        "(2)数据流分析",
        "(3)SSA",
        "(4)循环展开",
        "(5)函数内联",
        "(6)别名分析",
      ]
    },
    {
      text: "后端",
      prefix: "3.后端",
      children: [
        "(1)指令选择",
        "(2)指令调度",
        "(3)寄存器分配",
        "(4)窥孔优化",
      ]
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
