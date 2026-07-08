<template>
    <div class="graph-adjacency-matrix">
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
        <div class="matrix-panel">
            <h4 class="matrix-title">邻接矩阵</h4>
            <div class="matrix-wrapper">
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th class="corner-cell"></th>
                            <th v-for="col in vertexIds" :key="`col-${col}`">{{ col }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in vertexIds" :key="`row-${row}`">
                            <th>{{ row }}</th>
                            <td
                                v-for="col in vertexIds"
                                :key="`${row}-${col}`"
                                :class="{ active: matrix[row][col] !== 0 }"
                            >
                                {{ matrix[row][col] }}
                            </td>
                        </tr>
                        <tr v-if="!vertexIds.length">
                            <td colspan="2" class="empty-hint">暂无顶点</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { buildAdjacencyMatrix } from '../ComShared/graphUtils.js';

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

const matrixData = computed(() => buildAdjacencyMatrix(graphData.value));
const vertexIds = computed(() => matrixData.value.vertexIds);
const matrix = computed(() => matrixData.value.matrix);
</script>

<style scoped>
.graph-adjacency-matrix {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: flex-start;
    margin: 16px 0;
}

.graph-panel {
    flex: 0 0 auto;
}

.matrix-panel {
    flex: 1 1 280px;
    min-width: 280px;
}

.matrix-title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
}

.matrix-wrapper {
    overflow-x: auto;
}

.matrix-table {
    border-collapse: collapse;
    font-size: 14px;
    font-family: var(--vp-font-family-mono, Consolas, monospace);
}

.matrix-table th,
.matrix-table td {
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    min-width: 40px;
    height: 40px;
    padding: 0;
    text-align: center;
    vertical-align: middle;
}

.matrix-table thead th {
    background: var(--vp-c-bg-soft, #f5f7fa);
    font-weight: 600;
}

.matrix-table tbody th {
    background: var(--vp-c-bg-soft, #f5f7fa);
    font-weight: 600;
}

.corner-cell {
    min-width: 40px;
}

.matrix-table td {
    color: var(--vp-c-text-3, #a8abb2);
}

.matrix-table td.active {
    background: var(--vp-c-brand-soft, #ecf5ff);
    color: var(--vp-c-brand, #409eff);
    font-weight: 700;
}

.empty-hint {
    text-align: center;
    color: var(--vp-c-text-2, #909399);
    font-family: inherit;
}
</style>
