<template>
    <div class="graph-traversal">
        <div class="graph-panel">
            <Graph
                :width="graphWidth"
                :height="graphHeight"
                :directed="directed"
                :highlights="highlights"
                :highlight-edges="highlightEdges"
                hide-title
                @graph-change="onGraphChange"
            />
        </div>
        <div class="control-panel">
            <h4 class="panel-title">遍历动画</h4>

            <div class="control-row">
                <span class="control-label">算法</span>
                <div class="btn-group">
                    <button
                        :class="['seg-btn', { active: algorithm === 'dfs' }]"
                        @click="setAlgorithm('dfs')"
                    >深度优先 DFS</button>
                    <button
                        :class="['seg-btn', { active: algorithm === 'bfs' }]"
                        @click="setAlgorithm('bfs')"
                    >广度优先 BFS</button>
                </div>
            </div>

            <div class="control-row">
                <span class="control-label">起点</span>
                <select class="start-select" v-model.number="startNode">
                    <option v-for="id in vertexIds" :key="id" :value="id">顶点 {{ id }}</option>
                </select>
            </div>

            <div class="control-row">
                <span class="control-label">速度</span>
                <input type="range" min="200" max="2000" step="100" v-model.number="intervalMs" />
                <span class="speed-value">{{ (intervalMs / 1000).toFixed(1) }}s / 步</span>
            </div>

            <div class="control-row buttons">
                <button class="ctrl-btn" @click="reset" :disabled="!steps.length">重置</button>
                <button class="ctrl-btn" @click="prevStep" :disabled="stepIndex <= 0">上一步</button>
                <button class="ctrl-btn primary" @click="togglePlay" :disabled="!steps.length">
                    {{ playing ? '暂停' : '播放' }}
                </button>
                <button class="ctrl-btn" @click="nextStep" :disabled="stepIndex >= steps.length - 1">下一步</button>
            </div>

            <div class="progress-hint" v-if="steps.length">
                第 {{ stepIndex + 1 }} / {{ steps.length }} 步
            </div>

            <div class="state-block">
                <div class="state-label">{{ containerLabel }}（{{ algorithm === 'dfs' ? '后进先出' : '先进先出' }}）</div>
                <div class="state-value">
                    <template v-if="currentStep && currentStep.container.length">
                        <span
                            v-for="(id, index) in currentStep.container"
                            :key="`c-${index}`"
                            class="chip frontier"
                        >{{ id }}</span>
                    </template>
                    <span v-else class="empty">空</span>
                </div>
            </div>

            <div class="state-block">
                <div class="state-label">访问顺序</div>
                <div class="state-value">
                    <template v-if="currentStep && currentStep.visited.length">
                        <span
                            v-for="(id, index) in currentStep.visited"
                            :key="`v-${index}`"
                            :class="['chip', 'visited', { current: id === currentStep.current }]"
                        >{{ id }}</span>
                    </template>
                    <span v-else class="empty">暂未访问</span>
                </div>
            </div>

            <p class="desc" v-if="currentStep">{{ currentStep.desc }}</p>

            <div class="legend">
                <span><i class="dot current"></i>当前节点</span>
                <span><i class="dot visited"></i>已访问</span>
                <span><i class="dot frontier"></i>待处理</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import { buildAdjacencyList } from '../ComShared/graphUtils.js';

const props = defineProps({
    graphWidth: {
        type: Number,
        default: 480,
    },
    graphHeight: {
        type: Number,
        default: 400,
    },
    directed: {
        type: Boolean,
        default: false,
    },
});

const graphData = ref({ nodes: [], links: [] });
const algorithm = ref('dfs');
const startNode = ref(null);
const stepIndex = ref(0);
const playing = ref(false);
const intervalMs = ref(800);

let timer = null;

function onGraphChange(data) {
    graphData.value = data;
}

const vertexIds = computed(() =>
    [...graphData.value.nodes].map((n) => n.id).sort((a, b) => a - b),
);

const adjacency = computed(() => {
    const map = {};
    for (const row of buildAdjacencyList(graphData.value)) {
        map[row.id] = row.neighbors
            .map((nb) => nb.id)
            .filter((id) => id !== row.id);
    }
    return map;
});

function buildBfsSteps(adj, start) {
    const steps = [];
    const visited = new Set();
    const inQueue = new Set([start]);
    const queue = [start];
    const order = [];
    const treeEdges = [];

    steps.push({
        current: null,
        visited: [],
        container: [start],
        treeEdges: [],
        desc: `起点 ${start} 入队`,
    });

    while (queue.length) {
        const node = queue.shift();
        visited.add(node);
        order.push(node);

        const added = [];
        for (const nb of adj[node] || []) {
            if (!visited.has(nb) && !inQueue.has(nb)) {
                queue.push(nb);
                inQueue.add(nb);
                treeEdges.push({ from: node, to: nb });
                added.push(nb);
            }
        }

        steps.push({
            current: node,
            visited: [...order],
            container: [...queue],
            treeEdges: [...treeEdges],
            desc: `出队并访问 ${node}` + (added.length ? `，邻居 ${added.join('、')} 入队` : '，无新邻居入队'),
        });
    }

    steps.push({
        current: null,
        visited: [...order],
        container: [],
        treeEdges: [...treeEdges],
        desc: `队列为空，遍历结束，共访问 ${order.length} 个顶点`,
    });

    return steps;
}

function buildDfsSteps(adj, start) {
    const steps = [];
    const visited = new Set();
    const order = [];
    const stack = [];
    const treeEdges = [];

    function visit(node, parent) {
        visited.add(node);
        order.push(node);
        stack.push(node);
        if (parent !== null) treeEdges.push({ from: parent, to: node });

        steps.push({
            current: node,
            visited: [...order],
            container: [...stack],
            treeEdges: [...treeEdges],
            desc: `访问 ${node}，压入栈`,
        });

        for (const nb of adj[node] || []) {
            if (!visited.has(nb)) visit(nb, node);
        }

        stack.pop();
        const backTo = stack.length ? stack[stack.length - 1] : null;
        steps.push({
            current: backTo,
            visited: [...order],
            container: [...stack],
            treeEdges: [...treeEdges],
            desc: backTo !== null ? `${node} 邻居已处理完，出栈回溯到 ${backTo}` : `${node} 出栈，遍历结束，共访问 ${order.length} 个顶点`,
        });
    }

    visit(start, null);
    return steps;
}

const steps = computed(() => {
    const start = startNode.value;
    if (start === null || start === undefined) return [];
    if (!vertexIds.value.includes(start)) return [];

    return algorithm.value === 'dfs'
        ? buildDfsSteps(adjacency.value, start)
        : buildBfsSteps(adjacency.value, start);
});

const currentStep = computed(() => steps.value[stepIndex.value] || null);

const highlights = computed(() => {
    const step = currentStep.value;
    if (!step) return {};
    const map = {};
    for (const id of step.visited) map[id] = 'visited';
    for (const id of step.container) {
        if (!step.visited.includes(id)) map[id] = 'frontier';
    }
    if (step.current !== null && step.current !== undefined) map[step.current] = 'current';
    return map;
});

const highlightEdges = computed(() => currentStep.value?.treeEdges || []);

const containerLabel = computed(() => (algorithm.value === 'dfs' ? '栈' : '队列'));

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    playing.value = false;
}

function nextStep() {
    if (stepIndex.value < steps.value.length - 1) {
        stepIndex.value += 1;
    } else {
        stopTimer();
    }
}

function prevStep() {
    if (stepIndex.value > 0) stepIndex.value -= 1;
}

function reset() {
    stopTimer();
    stepIndex.value = 0;
}

function togglePlay() {
    if (playing.value) {
        stopTimer();
        return;
    }
    if (stepIndex.value >= steps.value.length - 1) stepIndex.value = 0;
    playing.value = true;
    timer = setInterval(() => {
        if (stepIndex.value >= steps.value.length - 1) {
            stopTimer();
            return;
        }
        stepIndex.value += 1;
    }, intervalMs.value);
}

function setAlgorithm(algo) {
    if (algorithm.value === algo) return;
    algorithm.value = algo;
}

watch(vertexIds, (ids) => {
    if (!ids.includes(startNode.value)) {
        startNode.value = ids.length ? ids[0] : null;
    }
}, { immediate: true });

watch([algorithm, startNode, adjacency], () => {
    reset();
});

watch(intervalMs, () => {
    if (playing.value) {
        stopTimer();
        togglePlay();
    }
});

onUnmounted(stopTimer);
</script>

<style scoped>
.graph-traversal {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: flex-start;
    margin: 16px 0;
}

.graph-panel {
    flex: 0 0 auto;
}

.control-panel {
    flex: 1 1 300px;
    min-width: 300px;
}

.panel-title {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: 600;
}

.control-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.control-label {
    min-width: 36px;
    font-size: 13px;
    color: var(--vp-c-text-2, #606266);
}

.btn-group {
    display: inline-flex;
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 6px;
    overflow: hidden;
}

.seg-btn {
    padding: 6px 12px;
    font-size: 13px;
    border: none;
    background: var(--vp-c-bg, #fff);
    cursor: pointer;
    color: var(--vp-c-text-1, #303133);
}

.seg-btn.active {
    background: var(--vp-c-brand, #409eff);
    color: #fff;
}

.start-select {
    padding: 5px 10px;
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 4px;
    background: var(--vp-c-bg, #fff);
}

.speed-value {
    font-size: 12px;
    color: var(--vp-c-text-2, #909399);
}

.buttons {
    gap: 8px;
}

.ctrl-btn {
    padding: 6px 14px;
    font-size: 13px;
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 4px;
    background: var(--vp-c-bg, #fff);
    cursor: pointer;
    color: var(--vp-c-text-1, #303133);
}

.ctrl-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.ctrl-btn.primary {
    background: var(--vp-c-brand, #409eff);
    color: #fff;
    border-color: var(--vp-c-brand, #409eff);
}

.progress-hint {
    margin: 4px 0 12px;
    font-size: 12px;
    color: var(--vp-c-text-2, #909399);
}

.state-block {
    margin-bottom: 14px;
}

.state-label {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
}

.state-value {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 28px;
    align-items: center;
}

.chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 26px;
    padding: 0 8px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--vp-font-family-mono, Consolas, monospace);
    background: var(--vp-c-bg-soft, #f0f2f5);
}

.chip.visited {
    background: #f0f9eb;
    color: #67c23a;
}

.chip.frontier {
    background: #fdf6ec;
    color: #e6a23c;
}

.chip.current {
    background: #fef0f0;
    color: #f56c6c;
    outline: 2px solid #f56c6c;
}

.empty {
    color: var(--vp-c-text-3, #a8abb2);
    font-style: italic;
    font-size: 13px;
}

.desc {
    margin: 4px 0 14px;
    padding: 8px 12px;
    font-size: 13px;
    background: var(--vp-c-bg-soft, #f5f7fa);
    border-radius: 4px;
}

.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 12px;
    color: var(--vp-c-text-2, #606266);
}

.legend .dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 5px;
    vertical-align: middle;
}

.legend .dot.current {
    background: #f56c6c;
}

.legend .dot.visited {
    background: #67c23a;
}

.legend .dot.frontier {
    background: #e6a23c;
}
</style>
