<template>
    <span>ParseTree</span>
    <div id="parse-tree"></div>
</template>


<script>
import * as graphviz from 'd3-graphviz'


function generateDot(node) {
  let dot = "digraph G {\n";

  // 递归遍历解析树，生成dot语言表示
  function traverse(node) {
    if (node) {
      const nodeId = `"${node.id}"`;
      const nodeLabel = `"${node.type}${node.value ? ` (${node.value})` : ''}"`;

      dot += `${nodeId} [label=${nodeLabel}];\n`;

      if (node.children) {
        for (const child of node.children) {
          const childId = `"${child.id}"`;
          dot += `${nodeId} -> ${childId};\n`;
          traverse(child);
        }
      }
    }
  }

  traverse(root);
  dot += "}";

  return dot;
}

function visualizeParseTree(root) {
  const dot = generateDot(root);
  // 创建一个Graphviz实例
  const viz = graphviz.graphviz("#parse-tree");
  viz.on('initEnd', ()=>{
      // 渲染图形
      viz.width(800)
        .height(325)
        .fit(true)
        .renderDot(dot);
  });

}

// 创建解析树节点的构造函数
function ParseTreeNode(id, type, value, children) {
  this.id = id;
  this.type = type;
  this.value = value;
  this.children = children;
}

// 创建一个解析树
const root = new ParseTreeNode("A", "Expression", null, [
  new ParseTreeNode("B", "Term", null, [
    new ParseTreeNode("C", "Factor", "2"),
    new ParseTreeNode("D", "Operator", "*", []),
    new ParseTreeNode("E", "Factor", "3")
  ]),
  new ParseTreeNode("F", "Operator", "+", []),
  new ParseTreeNode("G", "Term", null, [
    new ParseTreeNode("H", "Factor", "4"),
    new ParseTreeNode("I", "Operator", "*", []),
    new ParseTreeNode("J", "Factor", "5")
  ])
]);


export default {
  mounted() {
    // 组件挂载后触发的函数调用
    visualizeParseTree(root);
  }
}

</script>

