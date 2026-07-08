<template>
    <div class="array-visualizer">
        <div class="toolbar">
            <div class="op-group">
                <span class="op-label">随机访问</span>
                <input type="number" class="mini-input" v-model.number="accessIndex" :min="0" />
                <button class="btn" :disabled="busy" @click="doAccess">访问</button>
            </div>

            <div class="op-group">
                <span class="op-label">插入</span>
                <span class="sub">下标</span>
                <input type="number" class="mini-input" v-model.number="insertIndex" :min="0" />
                <span class="sub">值</span>
                <input type="number" class="mini-input" v-model.number="insertValue" />
                <button class="btn" :disabled="busy" @click="doInsert">插入</button>
            </div>

            <div class="op-group">
                <span class="op-label">删除</span>
                <span class="sub">下标</span>
                <input type="number" class="mini-input" v-model.number="deleteIndex" :min="0" />
                <button class="btn" :disabled="busy" @click="doDelete">删除</button>
            </div>

            <div class="op-group">
                <button class="btn ghost" :disabled="busy" @click="reset">重置</button>
            </div>
        </div>

        <div class="stage">
            <div class="meta">
                <span>容量 capacity = {{ capacity }}</span>
                <span>长度 length = {{ length }}</span>
                <span>基地址 base = {{ baseAddress }}</span>
                <span>元素大小 size = {{ elemSize }} 字节</span>
            </div>

            <div class="cells">
                <div
                    v-for="i in capacity"
                    :key="i - 1"
                    class="cell-wrap"
                >
                    <div class="addr">{{ formatAddr(i - 1) }}</div>
                    <div
                        class="cell"
                        :class="{
                            filled: (i - 1) < length,
                            active: activeIndex === (i - 1),
                            moving: movingSet.has(i - 1),
                        }"
                    >
                        <span v-if="(i - 1) < length">{{ data[i - 1] }}</span>
                        <span v-else class="empty-mark">·</span>
                    </div>
                    <div class="index">{{ i - 1 }}</div>
                </div>
            </div>

            <div class="log" :class="logType">
                <span class="log-icon">{{ logIcon }}</span>
                <span v-html="logText"></span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';

const props = defineProps({
    capacity: {
        type: Number,
        default: 8,
    },
    baseAddress: {
        type: Number,
        default: 0x1000,
    },
    elemSize: {
        type: Number,
        default: 4,
    },
});

const initial = [3, 1, 4, 1, 5];

const data = reactive(initial.slice());
const capacity = props.capacity;
const baseAddress = props.baseAddress;
const elemSize = props.elemSize;

const length = computed(() => data.length);

const accessIndex = ref(2);
const insertIndex = ref(2);
const insertValue = ref(9);
const deleteIndex = ref(1);

const busy = ref(false);
const activeIndex = ref(-1);
const movingSet = reactive(new Set());

const logText = ref('可视化数组的<b>随机访问</b>、<b>插入</b>、<b>删除</b>操作。插入和删除会触发元素搬移，注意观察它们的差异。');
const logType = ref('info');

const logIcon = computed(() => {
    if (logType.value === 'ok') return '✓';
    if (logType.value === 'error') return '✕';
    return 'ℹ';
});

function formatAddr(index) {
    return '0x' + (baseAddress + index * elemSize).toString(16).toUpperCase();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearMarks() {
    activeIndex.value = -1;
    movingSet.clear();
}

function setLog(text, type = 'info') {
    logText.value = text;
    logType.value = type;
}

async function doAccess() {
    if (busy.value) return;
    const idx = accessIndex.value;
    if (!Number.isInteger(idx) || idx < 0 || idx >= length.value) {
        setLog(`下标 <b>${idx}</b> 越界，有效范围是 <b>0 ~ ${length.value - 1}</b>。`, 'error');
        return;
    }
    busy.value = true;
    clearMarks();
    const addr = formatAddr(idx);
    setLog(
        `随机访问 <b>arr[${idx}]</b>：地址 = base + ${idx} × ${elemSize} = <b>${addr}</b>，` +
        `直接定位，时间复杂度 <b>O(1)</b>。`,
        'ok',
    );
    activeIndex.value = idx;
    await sleep(900);
    clearMarks();
    busy.value = false;
}

async function doInsert() {
    if (busy.value) return;
    const idx = insertIndex.value;
    const val = insertValue.value;
    if (length.value >= capacity) {
        setLog(`数组已满（length = capacity = ${capacity}），无法继续插入。`, 'error');
        return;
    }
    if (!Number.isInteger(idx) || idx < 0 || idx > length.value) {
        setLog(`插入下标 <b>${idx}</b> 非法，有效范围是 <b>0 ~ ${length.value}</b>。`, 'error');
        return;
    }
    if (!Number.isFinite(val)) {
        setLog('请输入合法的插入值。', 'error');
        return;
    }

    busy.value = true;
    clearMarks();
    setLog(`在下标 <b>${idx}</b> 处插入 <b>${val}</b>：需要把 [${idx}, ${length.value - 1}] 的元素整体后移一位。`, 'info');
    await sleep(700);

    for (let i = length.value - 1; i >= idx; i--) {
        movingSet.add(i);
        movingSet.add(i + 1);
        data[i + 1] = data[i];
        await sleep(300);
        movingSet.delete(i);
    }
    movingSet.clear();

    data[idx] = val;
    activeIndex.value = idx;
    const moves = length.value - idx;
    setLog(
        `插入完成，共搬移 <b>${moves}</b> 个元素。最坏情况（插入到开头）时间复杂度 <b>O(n)</b>。`,
        'ok',
    );
    await sleep(900);
    clearMarks();
    busy.value = false;
}

async function doDelete() {
    if (busy.value) return;
    const idx = deleteIndex.value;
    if (!Number.isInteger(idx) || idx < 0 || idx >= length.value) {
        setLog(`删除下标 <b>${idx}</b> 越界，有效范围是 <b>0 ~ ${length.value - 1}</b>。`, 'error');
        return;
    }

    busy.value = true;
    clearMarks();
    const removed = data[idx];
    activeIndex.value = idx;
    setLog(`删除下标 <b>${idx}</b> 处的元素 <b>${removed}</b>：需要把后面的元素整体前移一位来填补空缺。`, 'info');
    await sleep(700);
    activeIndex.value = -1;

    for (let i = idx; i < length.value - 1; i++) {
        movingSet.add(i);
        movingSet.add(i + 1);
        data[i] = data[i + 1];
        await sleep(300);
        movingSet.delete(i + 1);
    }
    movingSet.clear();

    data.pop();
    const moves = length.value - idx;
    setLog(
        `删除完成，共搬移 <b>${moves}</b> 个元素。最坏情况（删除开头）时间复杂度 <b>O(n)</b>。`,
        'ok',
    );
    await sleep(600);
    clearMarks();
    busy.value = false;
}

function reset() {
    if (busy.value) return;
    clearMarks();
    data.splice(0, data.length, ...initial);
    setLog('已重置为初始数组。', 'info');
}
</script>

<style scoped>
.array-visualizer {
    margin: 16px 0;
    padding: 16px;
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 8px;
    background: var(--vp-c-bg-soft, #f5f7fa);
}

.toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
}

.op-group {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 6px;
    background: var(--vp-c-bg, #fff);
}

.op-label {
    font-weight: 600;
    font-size: 13px;
}

.sub {
    font-size: 12px;
    color: var(--vp-c-text-2, #909399);
}

.mini-input {
    width: 56px;
    padding: 4px 6px;
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 4px;
    background: var(--vp-c-bg, #fff);
    color: var(--vp-c-text-1, #303133);
    font-size: 13px;
}

.btn {
    padding: 4px 12px;
    border: 1px solid var(--vp-c-brand, #409eff);
    border-radius: 4px;
    background: var(--vp-c-brand, #409eff);
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    transition: opacity 0.2s;
}

.btn:hover {
    opacity: 0.85;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn.ghost {
    background: transparent;
    color: var(--vp-c-text-2, #909399);
    border-color: var(--vp-c-divider, #dcdfe6);
}

.meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 12px;
    font-size: 13px;
    font-family: var(--vp-font-family-mono, Consolas, monospace);
    color: var(--vp-c-text-2, #909399);
}

.cells {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 16px;
}

.cell-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.addr {
    font-size: 10px;
    font-family: var(--vp-font-family-mono, Consolas, monospace);
    color: var(--vp-c-text-3, #a8abb2);
}

.cell {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 6px;
    background: var(--vp-c-bg, #fff);
    font-size: 18px;
    font-weight: 600;
    font-family: var(--vp-font-family-mono, Consolas, monospace);
    color: var(--vp-c-text-3, #a8abb2);
    transition: all 0.25s ease;
}

.cell.filled {
    color: var(--vp-c-text-1, #303133);
    border-color: var(--vp-c-brand, #409eff);
}

.cell.active {
    background: var(--vp-c-brand, #409eff);
    color: #fff;
    transform: translateY(-6px) scale(1.08);
    box-shadow: 0 6px 14px rgba(64, 158, 255, 0.4);
}

.cell.moving {
    background: #fdf6ec;
    border-color: #e6a23c;
    color: #b88230;
    transform: translateY(-4px);
}

.empty-mark {
    color: var(--vp-c-text-3, #c0c4cc);
}

.index {
    font-size: 12px;
    color: var(--vp-c-text-2, #909399);
    font-family: var(--vp-font-family-mono, Consolas, monospace);
}

.log {
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.6;
    background: var(--vp-c-bg, #fff);
    border-left: 3px solid var(--vp-c-text-3, #a8abb2);
    color: var(--vp-c-text-1, #303133);
}

.log.ok {
    border-left-color: #67c23a;
    background: #f0f9eb;
}

.log.error {
    border-left-color: #f56c6c;
    background: #fef0f0;
}

.log.info {
    border-left-color: var(--vp-c-brand, #409eff);
    background: var(--vp-c-brand-soft, #ecf5ff);
}

.log-icon {
    display: inline-block;
    margin-right: 6px;
    font-weight: 700;
}
</style>
