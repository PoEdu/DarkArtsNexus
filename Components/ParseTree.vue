<template>
    <div class="parse-tree-container">
        <div v-if="topdown === 'true' || bottomup === 'true'" class="controls">
            <button @click="stepForward" :disabled="!canStepForward || isPlaying">下一步</button>
            <button @click="resetAnimation" :disabled="isPlaying">重置</button>
            <button @click="togglePlay" :class="{ 'playing': isPlaying }">
                {{ isPlaying ? '暂停' : '播放' }}
            </button>
        </div>
        <div class="input-display" v-if="topdown === 'true' || bottomup === 'true'">
            <div class="input-line">
                <template v-for="(token, index) in tokens" :key="index">
                    <span v-if="token !== ' '" 
                          :class="{ 'current-token': currentTokenIndex === index }">
                        {{ token }}
                    </span>
                    <span v-else>&nbsp;</span>
                </template>
            </div>
        </div>
        <div class="bnf-display" v-if="currentStep">
            <h4>当前步骤的BNF表达式：</h4>
            <pre>{{ currentStep.bnf }}</pre>
        </div>
        <div :id="treeId"></div>
    </div>
</template>

<script>
import * as graphviz from 'd3-graphviz'

// BNF规则定义
const bnfRules = {
    'expression': 'expression → term {addop term}',
    'term': 'term → factor {mulop factor}',
    'factor': 'factor → number',
    'addop': 'addop → "+" | "-"',
    'mulop': 'mulop → "*" | "/"'
};

// 解析树节点类
class ParseTreeNode {
    constructor(id, type, value, children = []) {
        this.id = id;
        this.type = type;
        this.value = value;
        this.children = children;
    }
}

// 创建解析树
const createParseTree = () => {
  // 自底向上的解析树
  return new ParseTreeNode("A", "expression", null, [
      new ParseTreeNode("B", "term", null, [
          new ParseTreeNode("C", "factor", "2"),
          new ParseTreeNode("D", "mulop", "*"),
          new ParseTreeNode("E", "factor", "3")
      ]),
      new ParseTreeNode("F", "addop", "+"),
      new ParseTreeNode("G", "term", null, [
          new ParseTreeNode("H", "factor", "4"),
          new ParseTreeNode("I", "mulop", "*"),
          new ParseTreeNode("J", "factor", "5")
      ])
  ]);
};

// 生成DOT语言表示
function generateDot(node, visibleNodes = new Set()) {
    let dot = "digraph G {\n";
    dot += 'node [style="filled", fillcolor="white"];\n';

    function traverse(node) {
        if (node) {
            const nodeId = `"${node.id}"`;
            const nodeLabel = `"${node.type}${node.value ? ` (${node.value})` : ''}"`;
            const isVisible = visibleNodes.has(node.id);
            
            if (isVisible) {
                dot += `${nodeId} [label=${nodeLabel}, fillcolor="lightblue"];\n`;
            } else {
                dot += `${nodeId} [label=${nodeLabel}, fillcolor="white", style="filled,opacity=0.3"];\n`;
            }

            if (node.children) {
                node.children.forEach(child => {
                    const childId = `"${child.id}"`;
                    dot += `${nodeId} -> ${childId};\n`;
                    traverse(child);
                });
            }
        }
    }

    traverse(node);
    dot += "}";
    return dot;
}

// 可视化解析树
function visualizeParseTree(root, topdown, bottomup, elementId, stepCallback) {
    const viz = graphviz.graphviz(`#${elementId}`);
    viz.width(800)
        .height(325)
        .fit(true);

    if (topdown === 'false' && bottomup === 'false') {
        const dot = generateDot(root, new Set([...Array.from({length: 100}, (_, i) => String.fromCharCode(65 + i))]));
        viz.renderDot(dot);
        return;
    }

    const visibleNodes = new Set();
    const nodeOrder = [];
    const nodeInfo = new Map();

    // 收集节点信息
    function collectNodes(node) {
        if (node) {
            if (bottomup === 'true') {
                // 自底向上的顺序：先收集子节点，再收集当前节点
                if (node.children) {
                    node.children.forEach(collectNodes);
                }
                nodeInfo.set(node.id, { type: node.type, value: node.value });
                nodeOrder.push(node.id);
            } else {
                // 自顶向下的顺序：先收集当前节点，再收集子节点
                nodeInfo.set(node.id, { type: node.type, value: node.value });
                nodeOrder.push(node.id);
                if (node.children) {
                    node.children.forEach(collectNodes);
                }
            }
        }
    }

    collectNodes(root);
    let currentIndex = 0;

    function updateVisualization() {
        const dot = generateDot(root, visibleNodes);
        viz.renderDot(dot);
        
        if (stepCallback && currentIndex > 0) {
            const currentNodeId = nodeOrder[currentIndex - 1];
            const { type, value } = nodeInfo.get(currentNodeId);
            stepCallback({
                step: currentIndex,
                total: nodeOrder.length,
                nodeId: currentNodeId,
                nodeType: type,
                value: value,
                bnf: bnfRules[type] || '未知规则'
            });
        }
    }

    return {
        stepForward: () => {
            if (currentIndex < nodeOrder.length) {
                visibleNodes.add(nodeOrder[currentIndex]);
                currentIndex++;
                updateVisualization();
                return true;
            }
            return false;
        },
        reset: () => {
            visibleNodes.clear();
            currentIndex = 0;
            updateVisualization();
        },
        isComplete: () => currentIndex >= nodeOrder.length
    };
}

export default {
    props: {
        topdown: {
            type: String,
            default: "false"
        },
        bottomup: {
            type: String,
            default: "false"
        }
    },
    data() {
        return {
            treeId: `parse-tree-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            animationController: null,
            currentStep: null,
            canStepForward: true,
            isPlaying: false,
            playInterval: null,
            inputString: "2 * 3 + 4 * 5",
            currentTokenIndex: -1
        }
    },
    mounted() {
        this.tokens = this.inputString.split(' ');
        const root = createParseTree();
        let tokenIndex = 0;
        
        this.animationController = visualizeParseTree(
            root,
            this.topdown,
            this.bottomup,
            this.treeId,
            (stepInfo) => {
                this.currentStep = stepInfo;
                this.canStepForward = !this.animationController.isComplete();
                if (stepInfo.value) {
                    this.currentTokenIndex = tokenIndex++;
                }
            }
        );
    },
    methods: {
        stepForward() {
            if (this.animationController) {
                this.canStepForward = this.animationController.stepForward();
            }
        },
        resetAnimation() {
            if (this.animationController) {
                this.animationController.reset();
                this.currentStep = null;
                this.canStepForward = true;
                this.currentTokenIndex = -1;
                this.stopPlaying();
            }
        },
        togglePlay() {
            if (this.isPlaying) {
                this.stopPlaying();
            } else {
                this.startPlaying();
            }
        },
        startPlaying() {
            if (!this.canStepForward) return;
            this.isPlaying = true;
            this.playInterval = setInterval(() => {
                if (!this.animationController.stepForward()) {
                    this.stopPlaying();
                }
            }, 1000);
        },
        stopPlaying() {
            this.isPlaying = false;
            if (this.playInterval) {
                clearInterval(this.playInterval);
                this.playInterval = null;
            }
        }
    },
    watch: {
        topdown(newVal) {
            this.stopPlaying();
            const root = createParseTree();
            let tokenIndex = 0;
            
            this.animationController = visualizeParseTree(
                root,
                newVal,
                this.bottomup,
                this.treeId,
                (stepInfo) => {
                    this.currentStep = stepInfo;
                    this.canStepForward = !this.animationController.isComplete();
                    if (stepInfo.value) {
                        this.currentTokenIndex = tokenIndex++;
                    }
                }
            );
        },
        bottomup(newVal) {
            this.stopPlaying();
            const root = createParseTree();
            let tokenIndex = 0;
            
            this.animationController = visualizeParseTree(
                root,
                this.topdown,
                newVal,
                this.treeId,
                (stepInfo) => {
                    this.currentStep = stepInfo;
                    this.canStepForward = !this.animationController.isComplete();
                    if (stepInfo.value) {
                        this.currentTokenIndex = tokenIndex++;
                    }
                }
            );
        }
    },
    beforeUnmount() {
        this.stopPlaying();
    }
}
</script>

<style scoped>
.parse-tree-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.controls button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    background-color: #4CAF50;
    color: white;
    cursor: pointer;
    transition: background-color 0.3s;
}

.controls button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.controls button.playing {
    background-color: #f44336;
}

.input-display {
    position: relative;
    margin: 1rem 0;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 4px;
}

.input-line {
    font-family: monospace;
    font-size: 1.2rem;
    padding: 0.5rem;
    background-color: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    letter-spacing: 1px;
    white-space: pre;  /* 保持空格 */
}

.current-token {
    background-color: #e3f2fd;
    color: #1976d2;
    font-weight: bold;
}

.scanner-position {
    position: absolute;
    bottom: -20px;
    left: 0;
    transition: left 0.3s ease;
    color: #f44336;
    font-size: 1.2rem;
    transform: translateX(-50%);
    pointer-events: none;
}

.bnf-display {
    background-color: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
}

.bnf-display pre {
    margin: 0;
    white-space: pre-wrap;
    font-family: monospace;
}
</style>

