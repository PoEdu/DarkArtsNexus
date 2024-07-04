import { sidebar } from "vuepress-theme-hope";

export const Sidebar = sidebar({
  "/编译原理/": [
    {
      "text": "序言",
      "link": "/编译原理/序言"
    },
    {
      text: "前端",
      prefix: "1.前端",
      children: [
        "(1)词法分析",
        "(2)语法分析",
        "(3)语义分析",
        "(4)中间代码生成",
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
        "(7)指向分析",
        "(8)自动矢量化",
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
  "/运行时环境/": [
    {
      text: "内存布局",
      prefix: "1.内存布局",
      children: [
        "(1)运行时内存布局",
        "(2)栈帧",
        "(3)堆",
      ]
    },
    {
      text: "多线程与并发",
      prefix: "2.多线程与并发",
      children: [
        "(1)线程",
        "(2)同步",
      ]
    },
    {
      text: "链接与库",
      prefix: "3.链接与库",
      children: [
        "(1)静态链接",
        "(2)动态链接",
      ]
    }
  ],
  "MiniLua": [
    {
      text: "序言",
      link: "/MiniLua/序言"
    },
  ],
  "/数据结构/": [
    {
      text: "序言",
      link: "/数据结构/序言"
    },
    {
      text: "数组",
      link: "/数据结构/数组"
    },
    {
      text: "链表",
      link: "/数据结构/链表",
    },
    {
      text: "栈",
      link: "/数据结构/栈"
    },
    {
      text: "队列",
      link: "/数据结构/队列"
    },
    {
      text: "树",
      link: "/数据结构/树"
    },
    {
      text: "图",
      link: "/数据结构/图"
    },
    {
      text: "自动机",
      link: "/数据结构/自动机"
    },

  ]
});
