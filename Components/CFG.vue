<template>
    <div ref="graphContainer"></div>
    <button @click="showDominators">显示支配树</button>
    <DominatorTable :dominatorSteps="dominatorSteps" :nodes="nodes" />
</template>
  
<script setup>
import { ref, onMounted } from 'vue';
import * as graphviz from 'd3-graphviz';
import { copyWithin } from 'xe-utils';

const graphContainer = ref(null);

var originalDotCode = null;
const dominatorSteps = ref([]);
const nodes = ref([]);

onMounted(() => {
    originalDotCode = generateDotCode(cfg);
    renderGraph(originalDotCode);
});

const cfg = {
    node1: {
        pred: [],
        succ: ["node4", "node2"],
        data: "instruction 1"
    },
    node2: {
        pred: ["node1", "node3"],
        succ: ["node3"],
        data: "instruction 2"
    },
    node3: {
        pred: ["node2"],
        succ: ["node2"],
        data: "instruction 3"
    },
    node4: {
        pred: ["node1"],
        succ: [],
        data: "instruction 4"
    }
};


const renderGraph = (dot) => {
    const container = graphContainer.value;

    // 清空容器
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // 创建 d3-graphviz 实例并渲染控制流图
    const viz = graphviz.graphviz(container);
    viz
        .dot(dot)
        .render();
};

function generateDotCode(cfg) {
    let dotCode = 'digraph G {\n';

    const visited = new Set(); // 用于记录已访问的节点

    // 递归函数，深度优先搜索
    const dfs = (nodeId) => {
        visited.add(nodeId);

        const node = cfg[nodeId];
        const label = node.data.replace(/"/g, '\\"'); // 处理节点数据中的双引号

        dotCode += `  ${nodeId} [label="${label}"];\n`;

        const successors = node.succ;
        for (const succ of successors) {
            
            // 检查是否为回边
            if (visited.has(succ)) {
                dotCode += `  ${succ}:ne -> ${nodeId}:se [dir=back]`;
            } else {
                dotCode += `  ${nodeId} -> ${succ}`;
            }

            dotCode += ';\n';

            if (!visited.has(succ)) {
                dfs(succ);
            }
        }
    };

    // 从根节点开始搜索
    const root = Object.keys(cfg)[0];
    dfs(root);

    dotCode += '}';

    return dotCode;
}

function computeDominatorTree(cfg) {
  const nodes = Object.keys(cfg);
  const entryNode = Object.keys(cfg)[0];
  const domTree = {
    id: entryNode,
    children: []
  };

  const domSets = {};
  const steps = [];

  // 初始化每个节点的支配集合
  for (const nodeId of nodes) {
    domSets[nodeId] = new Set(nodes);
  }
  domSets[entryNode] = new Set([entryNode]);

  steps.push({ ...domSets });

  // 辅助函数：计算两个集合的交集
  function intersection(setA, setB) {
    return new Set([...setA].filter((x) => setB.has(x)));
  }

  // 更新支配集合并记录每一步的结果
  const updateDomSets = () => {
    let changed = false;
    for (const nodeId of nodes) {
      if (nodeId !== entryNode) {
        const predNodes = cfg[nodeId].pred;
        let newDomSet = new Set(nodes);
        for (const pred of predNodes) {
          if (domSets[pred]) {
            newDomSet = intersection(newDomSet, domSets[pred]);
          }
        }
        newDomSet.add(nodeId);
        if (!setsAreEqual(newDomSet, domSets[nodeId])) {
          domSets[nodeId] = newDomSet;
          changed = true;
        }
      }
    }
    if (changed) {
      console.log(domSets);
      steps.push({ ...domSets });
    }
    return changed;
  };

  // 检查两个集合是否相等
  const setsAreEqual = (setA, setB) => {
    if (setA.size !== setB.size) {
      return false;
    }
    for (const element of setA) {
      if (!setB.has(element)) {
        return false;
      }
    }
    return true;
  };

  // 构建支配树
  const buildDomTree = (nodeId, parentNode) => {
    const node = {
      id: nodeId,
      children: []
    };
    parentNode.children.push(node);
    for (const succ of cfg[nodeId].succ) {
      if (domSets[succ].has(nodeId)) {
        buildDomTree(succ, node);
      }
    }
  };

  // 计算支配树
  while (updateDomSets()) {
    // 继续更新支配集合，直到不再发生变化
  }

  // 根据支配集合构建支配树
  buildDomTree(entryNode, domTree);

  return {domTree, steps};
}

const showDominators = () => {
  const {domTree, steps} = computeDominatorTree(cfg, 'node1');

  for (const nodeId in cfg) nodes.value.push(nodeId);
  console.log(nodes.value);

  for (const step of steps) {
    dominatorSteps.value.push(step);
  }

  console.log(dominatorSteps.value);

  // 生成带有支配树高亮的新的DOT代码
  const dotCodeWithDominators = highlightDominators(originalDotCode, domTree);

  // 渲染带有支配树高亮的DOT图
  renderGraph(dotCodeWithDominators);
};

const highlightDominators = (dotCode, dominatorTree) => {
  // 移除原始DOT代码的最后一行
  const lines = dotCode.trim().split('\n');
  lines.pop();
  let newDotCode = lines.join('\n');

  // 添加支配树的边
  const addDominatorEdges = (node, parent) => {
    for (const child of node.children) {
      newDotCode += `\n  ${parent} -> ${child.id} [color="red"];`;
      addDominatorEdges(child, child.id);
    }
  };

  addDominatorEdges(dominatorTree, dominatorTree.id);

  newDotCode += '\n}'; // 添加新的DOT代码的结尾

  return newDotCode;
};



</script>
  
<style>
/* 样式可根据需要进行自定义 */
</style>
  