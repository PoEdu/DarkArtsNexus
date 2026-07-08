<template>
    <div class="graph-edge-list">
        <div class="graph-panel">
            <Graph
                :width="graphWidth"
                :height="graphHeight"
                :directed="directed"
                :allow-weight="allowWeight"
                hide-title
                @graph-change="onGraphChange"
            />
        </div>
        <div class="edge-panel">
            <h4 class="edge-title">边表</h4>
            <table class="edge-table">
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>起点</th>
                        <th>终点</th>
                        <th v-if="showWeight">权重</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(edge, index) in edges" :key="`${edge.from}-${edge.to}-${index}`">
                        <td class="edge-index">{{ index }}</td>
                        <td class="edge-vertex">{{ edge.from }}</td>
                        <td class="edge-vertex">{{ edge.to }}</td>
                        <td v-if="showWeight" class="edge-weight">{{ edge.weight }}</td>
                    </tr>
                    <tr v-if="!edges.length">
                        <td :colspan="showWeight ? 4 : 3" class="empty-hint">暂无边</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { buildEdgeList } from '../ComShared/graphUtils.js';

defineProps({
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
        default: true,
    },
    allowWeight: {
        type: Boolean,
        default: false,
    },
});

const graphData = ref({
    nodes: [],
    links: [],
    allowWeight: false,
});

function onGraphChange(data) {
    graphData.value = data;
}

const showWeight = computed(() => graphData.value.allowWeight);
const edges = computed(() => buildEdgeList(graphData.value));
</script>

<style scoped>
.graph-edge-list {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: flex-start;
    margin: 16px 0;
}

.graph-panel {
    flex: 0 0 auto;
}

.edge-panel {
    flex: 1 1 280px;
    min-width: 280px;
}

.edge-title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
}

.edge-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.edge-table th,
.edge-table td {
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    padding: 10px 12px;
    text-align: center;
    vertical-align: middle;
}

.edge-table th {
    background: var(--vp-c-bg-soft, #f5f7fa);
    font-weight: 600;
}

.edge-index {
    width: 64px;
    color: var(--vp-c-text-2, #909399);
}

.edge-vertex,
.edge-weight {
    font-family: var(--vp-font-family-mono, Consolas, monospace);
    font-weight: 600;
}

.empty-hint {
    color: var(--vp-c-text-2, #909399);
}
</style>
