<template>
    <div class="graph-adjacency-list">
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
        <div class="adjacency-panel">
            <h4 class="adjacency-title">邻接表</h4>
            <table class="adjacency-table">
                <thead>
                    <tr>
                        <th>顶点</th>
                        <th>邻接顶点（链表）</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in adjacencyRows" :key="row.id">
                        <td class="vertex-id">{{ row.id }}</td>
                        <td class="neighbor-list">
                            <template v-if="row.neighbors.length">
                                <span
                                    v-for="(neighbor, index) in row.neighbors"
                                    :key="`${row.id}-${neighbor.id}-${index}`"
                                    class="neighbor-node"
                                >
                                    <span class="neighbor-value">
                                        {{ formatNeighbor(neighbor) }}
                                    </span>
                                    <span class="neighbor-arrow">→</span>
                                </span>
                                <span class="neighbor-null">null</span>
                            </template>
                            <span v-else class="neighbor-null">null</span>
                        </td>
                    </tr>
                    <tr v-if="!adjacencyRows.length">
                        <td colspan="2" class="empty-hint">暂无顶点</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';
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

function formatNeighbor(neighbor) {
    if (props.allowWeight || graphData.value.allowWeight) {
        return `${neighbor.id}(w:${neighbor.weight})`;
    }
    return String(neighbor.id);
}

const adjacencyRows = computed(() => buildAdjacencyList(graphData.value));
</script>

<style scoped>
.graph-adjacency-list {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: flex-start;
    margin: 16px 0;
}

.graph-panel {
    flex: 0 0 auto;
}

.adjacency-panel {
    flex: 1 1 280px;
    min-width: 280px;
}

.adjacency-title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
}

.adjacency-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.adjacency-table th,
.adjacency-table td {
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    padding: 10px 12px;
    text-align: left;
    vertical-align: middle;
}

.adjacency-table th {
    background: var(--vp-c-bg-soft, #f5f7fa);
    font-weight: 600;
}

.vertex-id {
    width: 72px;
    text-align: center;
    font-weight: 600;
}

.neighbor-list {
    font-family: var(--vp-font-family-mono, Consolas, monospace);
}

.neighbor-node {
    display: inline-flex;
    align-items: center;
}

.neighbor-value {
    display: inline-block;
    min-width: 24px;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--vp-c-bg-soft, #f0f2f5);
    text-align: center;
}

.neighbor-arrow {
    margin: 0 6px;
    color: var(--vp-c-text-2, #909399);
}

.neighbor-null {
    color: var(--vp-c-text-3, #a8abb2);
    font-style: italic;
}

.empty-hint {
    text-align: center;
    color: var(--vp-c-text-2, #909399);
}
</style>
