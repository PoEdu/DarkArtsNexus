<template>
    <div class="linked-list-visualizer" :class="variantClass">
        <div class="variant-bar">
            <span class="variant-chip" :class="{ on: isPlain }">单向链表</span>
            <span v-if="circular" class="variant-chip on circular">循环</span>
            <span v-if="doubly" class="variant-chip on doubly">双向</span>
            <span v-if="chunked" class="variant-chip on chunked">块状</span>
        </div>

        <div class="ops-panel">
            <section class="ops-section">
                <div class="ops-title">访问</div>
                <div class="ops-row">
                    <div class="op-group highlight-read">
                        <span class="op-label">随机读取</span>
                        <span class="sub">下标</span>
                        <input type="number" class="mini-input" v-model.number="accessIndex" :min="0" />
                        <button class="btn" :disabled="busy" @click="doAccess">读取</button>
                        <span class="op-hint">{{ accessHint }}</span>
                    </div>
                    <div class="op-group">
                        <span class="op-label">查找</span>
                        <span class="sub">值</span>
                        <input type="number" class="mini-input" v-model.number="searchValue" />
                        <button class="btn" :disabled="busy" @click="doSearch">查找</button>
                        <span class="op-hint">按值遍历 O(n)</span>
                    </div>
                </div>
            </section>

            <section class="ops-section">
                <div class="ops-title">添加</div>
                <div class="ops-row">
                    <div class="op-group highlight-prepend">
                        <span class="op-label">头部添加</span>
                        <input type="number" class="mini-input" v-model.number="prependValue" />
                        <button class="btn" :disabled="busy" @click="doPrepend">添加</button>
                        <span class="op-hint">改 head，O(1)</span>
                    </div>
                    <div class="op-group highlight-append">
                        <span class="op-label">末尾添加</span>
                        <input type="number" class="mini-input" v-model.number="appendValue" />
                        <button class="btn" :disabled="busy" @click="doAppend">添加</button>
                        <span class="op-hint">{{ appendHint }}</span>
                    </div>
                </div>
            </section>

            <section class="ops-section">
                <div class="ops-title">修改</div>
                <div class="ops-row">
                    <div class="op-group">
                        <span class="op-label">插入</span>
                        <span class="sub">位置</span>
                        <input type="number" class="mini-input" v-model.number="insertIndex" :min="0" />
                        <span class="sub">值</span>
                        <input type="number" class="mini-input" v-model.number="insertValue" />
                        <button class="btn" :disabled="busy" @click="doInsert">插入</button>
                    </div>
                    <div class="op-group">
                        <span class="op-label">删除</span>
                        <span class="sub">位置</span>
                        <input type="number" class="mini-input" v-model.number="deleteIndex" :min="0" />
                        <button class="btn" :disabled="busy" @click="doDelete">删除</button>
                    </div>
                    <div class="op-group">
                        <button class="btn ghost" :disabled="busy" @click="reset">重置</button>
                    </div>
                </div>
            </section>
        </div>

        <div class="stage">
            <div class="meta">
                <span>长度 length = {{ nodes.length }}</span>
                <span>head = {{ nodes.length ? '节点0' : 'null' }}</span>
                <span v-if="nodes.length">tail = 节点{{ nodes.length - 1 }}</span>
                <span v-if="circular">tail.next → head</span>
                <span v-if="doubly">双向 prev / next</span>
                <span v-if="chunked">块容量 blockSize = {{ blockSize }}</span>
            </div>

            <!-- 块状链表 -->
            <div v-if="chunked" class="chain chunked-chain" :class="{ 'doubly-chain': doubly }">
                <div class="head-badge" :class="{ active: highlightHead }">head</div>
                <div class="arrow head-arrow" :class="{ active: highlightHead, relink: relinkHead }">→</div>

                <transition-group name="slot" tag="div" class="slots">
                    <div
                        v-for="(block, bi) in chunks"
                        :key="block.id"
                        class="slot block-slot"
                    >
                        <div
                            class="block"
                            :class="{
                                splitting: block.id === splittingBlockId,
                                merging: block.id === mergingBlockId,
                            }"
                        >
                            <div v-if="doubly" class="block-prev">prev</div>
                            <div class="block-label">块{{ bi }}</div>
                            <div class="block-cells">
                                <div
                                    v-for="(node, oi) in block.items"
                                    :key="node.id"
                                    class="cell"
                                    :class="cellClass(globalIndex(bi, oi), node)"
                                >
                                    {{ node.value }}
                                </div>
                            </div>
                            <div class="block-next">next</div>
                        </div>
                        <div v-if="doubly" class="arrow-pair">
                            <div
                                class="arrow"
                                :class="{
                                    active: visitingBlockIndex === bi,
                                    relink: relinkBlockIds.has(block.id),
                                }"
                            >→</div>
                            <div
                                class="prev-arrow"
                                :class="{
                                    active: visitingBlockIndex === bi + 1,
                                    relink: !!chunks[bi + 1] && relinkPrevBlockIds.has(chunks[bi + 1].id),
                                }"
                            >←</div>
                        </div>
                        <div
                            v-else
                            class="arrow"
                            :class="{
                                active: visitingBlockIndex === bi,
                                relink: relinkBlockIds.has(block.id),
                            }"
                        >→</div>
                    </div>
                </transition-group>

                <div v-if="!circular" class="null-badge">null</div>
                <div
                    v-else-if="nodes.length"
                    class="loop-wrap"
                    :class="{ relink: relinkTail }"
                >
                    <div class="loop-arrow">↩</div>
                    <span class="loop-label">tail块 → head</span>
                </div>
                <div
                    v-if="nodes.length"
                    class="tail-badge"
                    :class="{ active: highlightTail }"
                >tail</div>
            </div>

            <!-- 普通 / 循环 / 双向 -->
            <div v-else class="chain" :class="{ 'doubly-chain': doubly }">
                <div class="head-badge" :class="{ active: highlightHead }">head</div>
                <div class="arrow head-arrow" :class="{ active: highlightHead, relink: relinkHead }">→</div>

                <transition-group name="slot" tag="div" class="slots">
                    <div
                        v-for="(node, i) in nodes"
                        :key="node.id"
                        class="slot"
                    >
                        <div
                            class="node"
                            :class="{
                                doubly,
                                active: activeIndex === i,
                                visiting: visitingIndex === i,
                                inserting: node.id === insertingId,
                                removing: node.id === removingId,
                            }"
                        >
                            <div v-if="doubly" class="node-prev">prev</div>
                            <div class="node-data">{{ node.value }}</div>
                            <div class="node-next">next</div>
                        </div>

                        <div v-if="doubly" class="arrow-pair">
                            <div
                                class="arrow"
                                :class="{ active: visitingIndex === i, relink: relinkArrowIds.has(node.id) }"
                            >→</div>
                            <div
                                class="prev-arrow"
                                :class="{
                                    active: visitingIndex === i + 1,
                                    relink: !!nodes[i + 1] && relinkPrevArrowIds.has(nodes[i + 1].id),
                                }"
                            >←</div>
                        </div>
                        <div
                            v-else
                            class="arrow"
                            :class="{ active: visitingIndex === i, relink: relinkArrowIds.has(node.id) }"
                        >→</div>
                    </div>
                </transition-group>

                <div v-if="!circular" class="null-badge">null</div>
                <div
                    v-else-if="nodes.length"
                    class="loop-wrap"
                    :class="{ relink: relinkTail }"
                >
                    <div class="loop-arrow">↩</div>
                    <span class="loop-label">tail → head</span>
                </div>
                <div
                    v-if="nodes.length"
                    class="tail-badge"
                    :class="{ active: highlightTail }"
                >tail</div>
            </div>

            <div class="log" :class="logType">
                <span class="log-icon">{{ logIcon }}</span>
                <span v-html="logText"></span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';

const props = defineProps({
    circular: {
        type: Boolean,
        default: false,
    },
    doubly: {
        type: Boolean,
        default: false,
    },
    chunked: {
        type: Boolean,
        default: false,
    },
    blockSize: {
        type: Number,
        default: 2,
    },
});

let uid = 0;
function makeNode(value) {
    return { id: uid++, value };
}

const initial = [3, 1, 4, 1, 5];
const nodes = reactive(initial.map((v) => makeNode(v)));

const searchValue = ref(4);
const accessIndex = ref(2);
const prependValue = ref(0);
const appendValue = ref(7);
const insertIndex = ref(2);
const insertValue = ref(9);
const deleteIndex = ref(1);

const busy = ref(false);
const activeIndex = ref(-1);
const visitingIndex = ref(-1);
const visitingBlockIndex = ref(-1);
const highlightHead = ref(false);
const highlightTail = ref(false);
const insertingId = ref(-1);
const removingId = ref(-1);
const relinkHead = ref(false);
const relinkTail = ref(false);
const relinkArrowIds = reactive(new Set());
const relinkPrevArrowIds = reactive(new Set());
const relinkBlockIds = reactive(new Set());
const relinkPrevBlockIds = reactive(new Set());
const splittingBlockId = ref(-1);
const mergingBlockId = ref(-1);

const variantClass = computed(() => ({
    circular: props.circular,
    doubly: props.doubly,
    chunked: props.chunked,
}));

const isPlain = computed(() => !props.circular && !props.doubly && !props.chunked);

const accessHint = computed(() => {
    if (props.chunked) return '定位块 + 块内 O(1)';
    if (props.doubly) return '可从 tail 侧遍历';
    return '从 head 遍历 O(n)';
});

const appendHint = computed(() => {
    if (props.chunked) return '尾块有空间则 O(1)';
    if (props.doubly) return 'tail 指针 O(1)';
    if (props.circular) return '先找尾 O(n)';
    return '无 tail，O(n)';
});

const chunks = computed(() => {
    if (!props.chunked) return [];
    const result = [];
    for (let i = 0; i < nodes.length; i += props.blockSize) {
        result.push({
            id: `b-${i}`,
            items: nodes.slice(i, i + props.blockSize),
        });
    }
    return result;
});

const logText = ref('');
const logType = ref('info');

const logIcon = computed(() => {
    if (logType.value === 'ok') return '✓';
    if (logType.value === 'error') return '✕';
    return 'ℹ';
});

function defaultLog() {
    const parts = ['链表节点在内存中<b>不连续</b>存储'];
    if (props.chunked) {
        parts.push(`数据按 <b>块</b> 组织，块内 ${props.blockSize} 个元素可随机访问`);
    }
    if (props.doubly) {
        parts.push('每个节点维护 <b>prev</b> 与 <b>next</b> 两个指针');
    } else {
        parts.push('靠 <b>next 指针</b> 串联');
    }
    if (props.circular) {
        parts.push('尾节点的 <b>next</b> 指回 <b>head</b>，形成环');
    }
    parts.push('按索引读取需顺序遍历 <b>O(n)</b>，头部添加 <b>O(1)</b>，末尾添加视是否维护 tail 指针而定。');
    return parts.join('，') + ' 试一试下面的操作。';
}

watch(
    () => [props.circular, props.doubly, props.chunked, props.blockSize],
    () => {
        if (!busy.value) {
            logText.value = defaultLog();
            logType.value = 'info';
        }
    },
    { immediate: true },
);

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function globalIndex(blockIndex, offset) {
    return blockIndex * props.blockSize + offset;
}

function cellClass(index, node) {
    return {
        active: activeIndex.value === index,
        visiting: visitingIndex.value === index,
        inserting: node.id === insertingId.value,
        removing: node.id === removingId.value,
    };
}

function clearMarks() {
    activeIndex.value = -1;
    visitingIndex.value = -1;
    visitingBlockIndex.value = -1;
    highlightHead.value = false;
    highlightTail.value = false;
    insertingId.value = -1;
    removingId.value = -1;
    relinkHead.value = false;
    relinkTail.value = false;
    relinkArrowIds.clear();
    relinkPrevArrowIds.clear();
    relinkBlockIds.clear();
    relinkPrevBlockIds.clear();
    splittingBlockId.value = -1;
    mergingBlockId.value = -1;
}

function setLog(text, type = 'info') {
    logText.value = text;
    logType.value = type;
}

function tailIndex() {
    return nodes.length - 1;
}

async function traverseTo(target, describe) {
    highlightHead.value = true;
    await sleep(450);

    if (props.chunked) {
        let pos = 0;
        for (let bi = 0; bi < chunks.value.length; bi++) {
            visitingBlockIndex.value = bi;
            const block = chunks.value[bi];
            for (let oi = 0; oi < block.items.length; oi++) {
                if (pos >= target) break;
                visitingIndex.value = pos;
                setLog(
                    `${describe}：进入<b>块${bi}</b>，扫描块内第 <b>${oi}</b> 个元素（值 ${block.items[oi].value}）……`,
                    'info',
                );
                await sleep(480);
                pos++;
            }
            if (pos >= target) break;
        }
        visitingIndex.value = -1;
        visitingBlockIndex.value = -1;
        return;
    }

    for (let i = 0; i < target; i++) {
        visitingIndex.value = i;
        setLog(`${describe}：从 head 出发，走过第 <b>${i}</b> 个节点（值 ${nodes[i].value}）……`, 'info');
        await sleep(480);
    }
    visitingIndex.value = -1;
}

async function traverseToIndexForAccess(idx) {
    if (props.chunked) {
        const blockIdx = Math.floor(idx / props.blockSize);
        const offset = idx % props.blockSize;

        highlightHead.value = true;
        await sleep(400);

        for (let bi = 0; bi < blockIdx; bi++) {
            visitingBlockIndex.value = bi;
            setLog(`随机读取：沿块链前进，经过<b>块${bi}</b>（块间遍历）……`, 'info');
            await sleep(480);
        }

        visitingBlockIndex.value = blockIdx;
        visitingIndex.value = idx;
        setLog(
            `到达<b>块${blockIdx}</b>，块内下标 <b>${offset}</b> 可直接定位，` +
            `读取 list[${idx}] = <b>${nodes[idx].value}</b>，块内访问 <b>O(1)</b>。`,
            'info',
        );
        await sleep(650);
        visitingBlockIndex.value = -1;
        visitingIndex.value = -1;
        return;
    }

    if (props.doubly && idx > nodes.length / 2) {
        highlightTail.value = true;
        await sleep(450);
        for (let i = nodes.length - 1; i > idx; i--) {
            visitingIndex.value = i;
            setLog(
                `双向链表：下标 <b>${idx}</b> 靠近尾部，从 <b>tail</b> 沿 <b>prev</b> 后退，经过第 <b>${i}</b> 个节点……`,
                'info',
            );
            await sleep(480);
        }
        visitingIndex.value = idx;
        setLog(
            `到达下标 <b>${idx}</b>，读取值 <b>${nodes[idx].value}</b>。` +
            `双向链表可从两端择优遍历，但仍为 <b>O(n)</b>。`,
            'info',
        );
        await sleep(550);
        visitingIndex.value = -1;
        return;
    }

    highlightHead.value = true;
    await sleep(400);
    for (let i = 0; i < idx; i++) {
        visitingIndex.value = i;
        const hint = props.circular && i === nodes.length - 1
            ? '（循环链表按索引访问仍需遍历，环不能跳过步数）'
            : '';
        setLog(`随机读取：从 head 顺序走到下标 <b>${i}</b>（值 ${nodes[i].value}）……${hint}`, 'info');
        await sleep(480);
    }
    visitingIndex.value = idx;
    setLog(
        `到达下标 <b>${idx}</b>，读取值 <b>${nodes[idx].value}</b>。` +
        `链表无连续内存，按索引访问必须遍历，<b>O(n)</b>。`,
        'info',
    );
    await sleep(550);
    visitingIndex.value = -1;
}

async function traverseToTail(describe) {
    if (nodes.length === 0) return;

    if (props.chunked) {
        highlightHead.value = true;
        await sleep(400);
        const lastBi = chunks.value.length - 1;
        for (let bi = 0; bi < lastBi; bi++) {
            visitingBlockIndex.value = bi;
            setLog(`${describe}：沿块链前进，经过<b>块${bi}</b>……`, 'info');
            await sleep(480);
        }
        visitingBlockIndex.value = lastBi;
        highlightTail.value = true;
        setLog(`${describe}：到达尾块<b>块${lastBi}</b>。`, 'info');
        await sleep(500);
        visitingBlockIndex.value = -1;
        return;
    }

    if (props.doubly) {
        highlightTail.value = true;
        setLog(
            `${describe}：双向链表维护 <b>tail</b> 指针，直接定位尾节点，无需遍历，<b>O(1)</b>。`,
            'info',
        );
        visitingIndex.value = tailIndex();
        await sleep(700);
        visitingIndex.value = -1;
        return;
    }

    highlightHead.value = true;
    await sleep(400);
    for (let i = 0; i < nodes.length - 1; i++) {
        visitingIndex.value = i;
        setLog(`${describe}：从 head 走到第 <b>${i}</b> 个节点，寻找尾节点……`, 'info');
        await sleep(480);
    }
    visitingIndex.value = tailIndex();
    highlightTail.value = true;
    setLog(
        `${describe}：到达尾节点（下标 <b>${tailIndex()}</b>）。` +
        `单向链表无 tail 指针时需遍历，<b>O(n)</b>。`,
        'info',
    );
    await sleep(600);
    visitingIndex.value = -1;
}

async function doAccess() {
    if (busy.value) return;
    const idx = accessIndex.value;
    if (!Number.isInteger(idx) || idx < 0 || idx >= nodes.length) {
        setLog(`下标 <b>${idx}</b> 越界，有效范围是 <b>0 ~ ${nodes.length - 1}</b>。`, 'error');
        return;
    }

    busy.value = true;
    clearMarks();
    await traverseToIndexForAccess(idx);
    activeIndex.value = idx;
    const summary = props.chunked
        ? `读取 list[${idx}] = <b>${nodes[idx].value}</b>。定位块 <b>O(⌈n/k⌉)</b> + 块内 <b>O(1)</b>。`
        : props.doubly && idx > nodes.length / 2
            ? `读取 list[${idx}] = <b>${nodes[idx].value}</b>。双向可从 tail 侧遍历，整体仍 <b>O(n)</b>。`
            : `读取 list[${idx}] = <b>${nodes[idx].value}</b>。链表按索引访问 <b>O(n)</b>，远不如数组。`;
    setLog(summary, 'ok');
    await sleep(900);
    clearMarks();
    busy.value = false;
}

async function doPrepend() {
    if (busy.value) return;
    const val = prependValue.value;
    if (!Number.isFinite(val)) {
        setLog('请输入合法的添加值。', 'error');
        return;
    }

    busy.value = true;
    clearMarks();
    highlightHead.value = true;
    setLog(`头部添加 <b>${val}</b>：直接改 <b>head</b> 指针，无需遍历，<b>O(1)</b>。`, 'info');
    await sleep(650);

    const node = makeNode(val);
    nodes.unshift(node);
    insertingId.value = node.id;

    if (props.chunked) {
        await relinkChunkedInsert(0);
        await maybeSplitBlock(0);
    } else if (props.doubly) {
        await relinkDoublyInsert(0, node);
    } else {
        await relinkSinglyInsert(0, node);
    }

    insertingId.value = -1;
    setLog(`头部添加完成。所有链表变体在头部插入均为 <b>O(1)</b>。`, 'ok');
    await sleep(800);
    clearMarks();
    busy.value = false;
}

async function doAppend() {
    if (busy.value) return;
    const val = appendValue.value;
    if (!Number.isFinite(val)) {
        setLog('请输入合法的添加值。', 'error');
        return;
    }

    busy.value = true;
    clearMarks();
    const idx = nodes.length;

    if (props.chunked) {
        const lastBlock = chunks.value[chunks.value.length - 1];
        const lastBlockFull = lastBlock && lastBlock.items.length >= props.blockSize;

        if (!lastBlock || lastBlockFull) {
            await traverseToTail(`末尾添加 ${val}`);
            setLog(`尾块已满或不存在，需新建块并链接到链尾。`, 'info');
            await sleep(600);
        } else {
            highlightTail.value = true;
            visitingBlockIndex.value = chunks.value.length - 1;
            setLog(
                `末尾添加 <b>${val}</b>：尾块尚有空间，直接写入尾块，` +
                `块内 <b>O(1)</b>，无需遍历整条链。`,
                'info',
            );
            await sleep(700);
            visitingBlockIndex.value = -1;
        }
    } else {
        await traverseToTail(`末尾添加 ${val}`);
    }

    const node = makeNode(val);
    nodes.push(node);
    insertingId.value = node.id;
    setLog(`创建新节点 <b>${val}</b> 并接到链尾……`, 'info');
    await sleep(550);

    if (props.chunked) {
        await relinkChunkedInsert(idx);
        await maybeSplitBlock(idx);
    } else if (props.doubly) {
        await relinkDoublyInsert(idx, node);
    } else {
        await relinkSinglyInsert(idx, node);
    }

    insertingId.value = -1;
    const tailMsg = props.doubly
        ? `末尾添加完成。双向链表有 tail 指针，整体 <b>O(1)</b>。`
        : props.circular
            ? `末尾添加完成。需先遍历找尾，再维护 <b>tail.next → head</b>，整体 <b>O(n)</b>。`
            : `末尾添加完成。单向链表无 tail 时需遍历，整体 <b>O(n)</b>。`;
    setLog(tailMsg, 'ok');
    await sleep(900);
    clearMarks();
    busy.value = false;
}

async function relinkDoublyInsert(idx, node) {
    const succ = idx < nodes.length - 1 ? nodes[idx + 1] : null;
    const pred = idx > 0 ? nodes[idx - 1] : null;

    relinkArrowIds.add(node.id);
    setLog(`让新节点的 <b>next</b> 指向后继节点。`, 'info');
    await sleep(650);

    relinkPrevArrowIds.add(node.id);
    setLog(`让新节点的 <b>prev</b> 指向前驱节点。`, 'info');
    await sleep(650);

    if (succ) {
        relinkPrevArrowIds.add(succ.id);
        setLog(`让后继节点的 <b>prev</b> 改指向新节点。`, 'info');
        await sleep(650);
    } else if (props.circular && nodes.length > 1) {
        relinkTail.value = true;
        setLog(`循环链表：尾节点的 <b>next</b> 仍指向 <b>head</b>。`, 'info');
        await sleep(650);
    }

    if (idx === 0) {
        relinkHead.value = true;
        if (props.circular && nodes.length > 1) {
            relinkPrevArrowIds.add(nodes[tailIndex()].id);
            setLog(`再把 <b>head</b> 与前驱 <b>next/prev</b> 接好；<b>head.prev</b> 指向尾节点。`, 'ok');
        } else {
            setLog(`再把 <b>head</b> 指向新节点，插入完成。`, 'ok');
        }
    } else {
        relinkArrowIds.add(pred.id);
        setLog(`再把前驱节点的 <b>next</b> 指向新节点，插入完成。`, 'ok');
    }
}

async function relinkSinglyInsert(idx, node) {
    const predId = idx > 0 ? nodes[idx - 1].id : null;

    relinkArrowIds.add(node.id);
    setLog(`让新节点的 <b>next</b> 指向后继节点。`, 'info');
    await sleep(650);

    if (idx === 0) {
        relinkHead.value = true;
        if (props.circular && nodes.length > 1) {
            relinkTail.value = true;
            setLog(`再把 <b>head</b> 指向新节点；尾节点的 <b>next</b> 仍回指 <b>head</b>。`, 'ok');
        } else {
            setLog(`再把 <b>head</b> 指向新节点，插入完成。`, 'ok');
        }
    } else {
        relinkArrowIds.add(predId);
        if (props.circular && idx === nodes.length - 1) {
            relinkTail.value = true;
            setLog(`前驱 <b>next</b> 指向新节点；新节点成为尾节点，<b>next → head</b>。`, 'ok');
        } else {
            setLog(`再把前驱节点的 <b>next</b> 指向新节点，插入完成。`, 'ok');
        }
    }
}

async function relinkDoublyDelete(idx) {
    const removed = nodes[idx];
    const succ = idx < nodes.length - 1 ? nodes[idx + 1] : null;
    const pred = idx > 0 ? nodes[idx - 1] : null;

    if (idx === 0) {
        relinkHead.value = true;
        setLog(`把 <b>head</b> 越过硬删节点，指向后继。`, 'info');
    } else {
        relinkArrowIds.add(pred.id);
        setLog(`前驱 <b>next</b> 越过被删节点。`, 'info');
    }
    await sleep(700);

    if (succ) {
        relinkPrevArrowIds.add(succ.id);
        setLog(`后继 <b>prev</b> 越过被删节点，改指向前驱。`, 'info');
    } else if (props.circular && nodes.length > 2) {
        relinkPrevArrowIds.add(nodes[0].id);
        setLog(`循环双向：更新 <b>head.prev</b> 与尾节点连接。`, 'info');
    }
    await sleep(700);

    if (props.circular && (idx === 0 || idx === nodes.length - 1)) {
        relinkTail.value = true;
        setLog(`循环链表：确认 <b>tail.next → head</b> 仍然成立。`, 'ok');
    } else {
        setLog(`双向指针重连完成，被删节点可释放。`, 'ok');
    }
}

async function relinkSinglyDelete(idx) {
    const predId = idx > 0 ? nodes[idx - 1].id : null;

    if (idx === 0) {
        relinkHead.value = true;
        if (props.circular && nodes.length > 1) {
            relinkTail.value = true;
            setLog(`把 <b>head</b> 指向下一个节点；尾节点 <b>next</b> 改指向新 head。`, 'info');
        } else {
            setLog(`把 <b>head</b> 越过它，直接指向下一个节点。`, 'info');
        }
    } else {
        relinkArrowIds.add(predId);
        if (props.circular && idx === nodes.length - 1) {
            relinkTail.value = true;
            setLog(`前驱 <b>next</b> 越过尾节点，改回指 <b>head</b>。`, 'info');
        } else {
            setLog(`前驱 <b>next</b> 越过它，指向后继节点。`, 'info');
        }
    }
    await sleep(750);
    setLog(`节点已脱离链表。定位后指针改动 <b>O(1)</b>。`, 'ok');
}

async function relinkChunkedInsert(idx) {
    const blockIdx = Math.floor(idx / props.blockSize);
    const block = chunks.value[blockIdx];
    if (!block) return;

    relinkBlockIds.add(block.id);
    setLog(`在<b>块${blockIdx}</b> 内插入元素，块间 <b>next</b> 指针保持不变。`, 'info');
    await sleep(650);

    if (props.doubly) {
        relinkPrevBlockIds.add(block.id);
        setLog(`双向块状链表：同步维护相邻块的 <b>prev</b> 指针。`, 'info');
        await sleep(650);
    }

    if (props.circular) {
        if (idx === 0) relinkHead.value = true;
        if (idx === nodes.length - 1 || nodes.length === 1) relinkTail.value = true;
        setLog(`循环块状链表：确认 <b>尾块.next → head</b> 仍然成立。`, 'ok');
    } else {
        setLog(`块状链表插入完成，块内写入 <b>O(1)</b>。`, 'ok');
    }
}

async function relinkChunkedDelete(idx) {
    const blockIdx = Math.max(0, Math.floor(idx / props.blockSize));
    const block = chunks.value[blockIdx];
    if (!block) return;

    relinkBlockIds.add(block.id);
    setLog(`从<b>块${blockIdx}</b> 删除元素，块内搬移或留空。`, 'info');
    await sleep(650);

    if (props.doubly) {
        relinkPrevBlockIds.add(block.id);
        setLog(`双向块状链表：检查相邻块的 <b>prev</b> 是否需要调整。`, 'info');
        await sleep(650);
    }

    if (props.circular) {
        relinkTail.value = true;
        if (idx === 0) relinkHead.value = true;
        setLog(`循环块状链表：<b>tail块 → head</b> 回环指针重连完成。`, 'ok');
    } else {
        setLog(`块状链表删除完成。`, 'ok');
    }
}

async function maybeSplitBlock(insertIdx) {
    if (!props.chunked) return;

    const blockIdx = Math.floor(insertIdx / props.blockSize);
    const block = chunks.value[blockIdx];
    if (!block || block.items.length <= props.blockSize) return;

    splittingBlockId.value = block.id;
    setLog(`块 <b>${blockIdx}</b> 已满（${props.blockSize} 个元素），执行<b>块分裂</b>：后半段拆成新块。`, 'info');
    await sleep(900);
    splittingBlockId.value = -1;

    const nextBlock = chunks.value[blockIdx + 1];
    if (nextBlock) {
        relinkBlockIds.add(block.id);
        setLog(`原块 <b>next</b> 先指向新块，新块 <b>next</b> 再接原后继块。`, 'ok');
        await sleep(700);
        relinkBlockIds.clear();
    }
}

async function maybeMergeBlock(deleteIdx) {
    if (!props.chunked) return;

    const blockIdx = Math.max(0, Math.floor(deleteIdx / props.blockSize));
    const block = chunks.value[blockIdx];
    if (!block || block.items.length >= props.blockSize || chunks.value.length <= 1) return;

    mergingBlockId.value = block.id;
    setLog(`块 <b>${blockIdx}</b> 元素过少，执行<b>块合并</b>：与相邻块拼接，减少块数量。`, 'info');
    await sleep(900);
    mergingBlockId.value = -1;
    setLog(`块合并完成，块间 <b>next</b> 指针随之调整。`, 'ok');
    await sleep(500);
}

async function doSearch() {
    if (busy.value) return;
    const val = searchValue.value;
    if (!Number.isFinite(val)) {
        setLog('请输入合法的查找值。', 'error');
        return;
    }

    busy.value = true;
    clearMarks();
    highlightHead.value = true;
    await sleep(400);

    let found = -1;
    if (props.chunked) {
        let pos = 0;
        for (let bi = 0; bi < chunks.value.length; bi++) {
            visitingBlockIndex.value = bi;
            const block = chunks.value[bi];
            for (let oi = 0; oi < block.items.length; oi++) {
                visitingIndex.value = pos;
                setLog(`查找 <b>${val}</b>：在<b>块${bi}</b> 内比较第 <b>${oi}</b> 个元素（值 ${block.items[oi].value}）……`, 'info');
                await sleep(520);
                if (block.items[oi].value === val) {
                    found = pos;
                    break;
                }
                pos++;
            }
            if (found >= 0) break;
            pos = (bi + 1) * props.blockSize;
            if (pos > nodes.length) pos = nodes.length;
        }
    } else {
        for (let i = 0; i < nodes.length; i++) {
            visitingIndex.value = i;
            setLog(`查找 <b>${val}</b>：比较第 <b>${i}</b> 个节点（值 ${nodes[i].value}）……`, 'info');
            await sleep(520);
            if (nodes[i].value === val) {
                found = i;
                break;
            }
        }
    }

    visitingIndex.value = -1;
    visitingBlockIndex.value = -1;

    if (found >= 0) {
        activeIndex.value = found;
        const extra = props.chunked ? '（块内随机访问为 <b>O(1)</b>，定位块仍为 <b>O(n)</b>）' : '';
        setLog(`在位置 <b>${found}</b> 处找到 <b>${val}</b>。整体查找 <b>O(n)</b>${extra}。`, 'ok');
    } else {
        setLog(`遍历完整个链表，未找到 <b>${val}</b>。时间复杂度 <b>O(n)</b>。`, 'error');
    }

    await sleep(900);
    clearMarks();
    busy.value = false;
}

async function doInsert() {
    if (busy.value) return;
    const idx = insertIndex.value;
    const val = insertValue.value;
    if (!Number.isInteger(idx) || idx < 0 || idx > nodes.length) {
        setLog(`插入位置 <b>${idx}</b> 非法，有效范围是 <b>0 ~ ${nodes.length}</b>。`, 'error');
        return;
    }
    if (!Number.isFinite(val)) {
        setLog('请输入合法的插入值。', 'error');
        return;
    }

    busy.value = true;
    clearMarks();
    await traverseTo(idx, `在位置 ${idx} 处插入 ${val}`);

    const node = makeNode(val);
    nodes.splice(idx, 0, node);
    insertingId.value = node.id;
    setLog(`创建新节点 <b>${val}</b>，为它腾出位置……`, 'info');
    await sleep(650);

    if (props.chunked) {
        await relinkChunkedInsert(idx);
    } else if (props.doubly) {
        await relinkDoublyInsert(idx, node);
    } else {
        await relinkSinglyInsert(idx, node);
    }

    await maybeSplitBlock(idx);
    insertingId.value = -1;
    await sleep(800);
    clearMarks();
    busy.value = false;
}

async function doDelete() {
    if (busy.value) return;
    const idx = deleteIndex.value;
    if (!Number.isInteger(idx) || idx < 0 || idx >= nodes.length) {
        setLog(`删除位置 <b>${idx}</b> 越界，有效范围是 <b>0 ~ ${nodes.length - 1}</b>。`, 'error');
        return;
    }

    busy.value = true;
    clearMarks();
    await traverseTo(idx, `删除位置 ${idx}`);

    const removed = nodes[idx];
    removingId.value = removed.id;
    setLog(`定位到位置 <b>${idx}</b> 的节点（值 ${removed.value}），准备将它从链上摘除。`, 'info');
    await sleep(700);

    if (props.chunked) {
        await relinkChunkedDelete(idx);
    } else if (props.doubly) {
        await relinkDoublyDelete(idx);
    } else {
        await relinkSinglyDelete(idx);
    }

    nodes.splice(idx, 1);
    await maybeMergeBlock(idx);
    await sleep(650);
    clearMarks();
    busy.value = false;
}

function reset() {
    if (busy.value) return;
    clearMarks();
    nodes.splice(0, nodes.length, ...initial.map((v) => makeNode(v)));
    setLog('已重置为初始链表。', 'info');
}
</script>

<style scoped>
.linked-list-visualizer {
    margin: 16px 0;
    padding: 16px;
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 8px;
    background: var(--vp-c-bg-soft, #f5f7fa);
}

.variant-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
}

.variant-chip {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: var(--vp-c-text-3, #a8abb2);
    background: var(--vp-c-bg, #fff);
    border: 1px solid var(--vp-c-divider, #dcdfe6);
}

.variant-chip.on {
    color: var(--vp-c-brand, #409eff);
    border-color: var(--vp-c-brand, #409eff);
    background: var(--vp-c-brand-soft, #ecf5ff);
}

.variant-chip.on.circular {
    color: #e6a23c;
    border-color: #e6a23c;
    background: #fdf6ec;
}

.variant-chip.on.doubly {
    color: #409eff;
    border-color: #409eff;
    background: #ecf5ff;
}

.variant-chip.on.chunked {
    color: #9b59b6;
    border-color: #9b59b6;
    background: #f4ecf7;
}

.ops-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
    padding: 12px;
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 8px;
    background: var(--vp-c-bg, #fff);
}

.ops-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ops-title {
    margin: 0;
    padding: 0;
    border: none;
    line-height: 1.4;
    font-size: 13px;
    font-weight: 700;
    color: var(--vp-c-text-2, #606266);
    letter-spacing: 0.02em;
}

.ops-title::before {
    content: none;
}

.ops-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.op-hint {
    font-size: 11px;
    color: var(--vp-c-text-3, #a8abb2);
    white-space: nowrap;
}

.op-group.highlight-read,
.op-group.highlight-prepend,
.op-group.highlight-append {
    border-color: var(--vp-c-brand-soft, #b3d8ff);
    background: var(--vp-c-bg-soft, #fafcff);
}

.linked-list-visualizer.doubly .op-group.highlight-append {
    border-color: #b3d8ff;
    box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.15);
}

.linked-list-visualizer.chunked .op-group.highlight-read {
    border-color: #e8daef;
    box-shadow: inset 0 0 0 1px rgba(155, 89, 182, 0.15);
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

.chain {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-bottom: 16px;
    min-height: 84px;
}

.arrow-pair {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    line-height: 1;
}

.arrow-pair .arrow,
.arrow-pair .prev-arrow {
    margin: 0;
}

.slots {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
}

.slot {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    max-width: 220px;
}

.block-slot {
    max-width: 280px;
}

.head-badge,
.tail-badge,
.null-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--vp-font-family-mono, Consolas, monospace);
    color: var(--vp-c-text-2, #909399);
    background: var(--vp-c-bg, #fff);
    border: 1px dashed var(--vp-c-divider, #dcdfe6);
}

.loop-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px dashed #e6a23c;
    background: #fdf6ec;
    color: #b88230;
    font-size: 12px;
    font-weight: 600;
}

.loop-wrap.relink {
    animation: relink-pulse 0.6s ease-in-out infinite;
    border-color: #67c23a;
    color: #67c23a;
    background: #f0f9eb;
}

.loop-arrow {
    font-size: 22px;
    line-height: 1;
}

.loop-label {
    font-family: var(--vp-font-family-mono, Consolas, monospace);
    font-size: 11px;
}

.arrow,
.prev-arrow {
    color: var(--vp-c-text-3, #a8abb2);
    font-size: 20px;
    font-weight: 700;
    transition: all 0.25s ease;
}

.prev-arrow {
    font-size: 18px;
    margin-bottom: 2px;
}

.arrow.active,
.head-arrow.active,
.prev-arrow.active {
    color: var(--vp-c-brand, #409eff);
    transform: scale(1.3);
}

.arrow.relink,
.prev-arrow.relink {
    color: #67c23a;
    animation: relink-pulse 0.6s ease-in-out infinite;
}

@keyframes relink-pulse {
    0%, 100% {
        transform: scale(1);
        text-shadow: none;
    }
    50% {
        transform: scale(1.6);
        text-shadow: 0 0 8px rgba(103, 194, 58, 0.7);
    }
}

.node {
    display: flex;
    align-items: stretch;
    height: 48px;
    border: 2px solid var(--vp-c-brand, #409eff);
    border-radius: 6px;
    overflow: hidden;
    background: var(--vp-c-bg, #fff);
    transition: all 0.25s ease;
}

.node.doubly {
    height: 48px;
}

.node-data {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    padding: 0 8px;
    font-size: 18px;
    font-weight: 600;
    font-family: var(--vp-font-family-mono, Consolas, monospace);
    color: var(--vp-c-text-1, #303133);
}

.node-next,
.node-prev {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    padding: 0 4px;
    font-size: 11px;
    color: var(--vp-c-text-2, #909399);
    background: var(--vp-c-bg-soft, #f5f7fa);
    border-left: 1px solid var(--vp-c-divider, #dcdfe6);
}

.node-prev {
    border-left: none;
    border-right: 1px solid var(--vp-c-divider, #dcdfe6);
}

.block {
    display: flex;
    align-items: stretch;
    min-height: 56px;
    border: 2px solid #9b59b6;
    border-radius: 8px;
    overflow: hidden;
    background: var(--vp-c-bg, #fff);
    transition: all 0.25s ease;
}

.block.splitting {
    border-color: #e6a23c;
    box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.25);
    transform: scale(1.03);
}

.block.merging {
    border-color: #67c23a;
    box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.25);
}

.block-label {
    display: flex;
    align-items: center;
    padding: 0 8px;
    font-size: 11px;
    font-weight: 700;
    color: #9b59b6;
    background: #f4ecf7;
    border-right: 1px solid #e8daef;
    writing-mode: vertical-rl;
    text-orientation: mixed;
}

.block-cells {
    display: flex;
    align-items: stretch;
}

.cell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 38px;
    padding: 0 8px;
    font-size: 17px;
    font-weight: 600;
    font-family: var(--vp-font-family-mono, Consolas, monospace);
    border-right: 1px solid var(--vp-c-divider, #dcdfe6);
    transition: all 0.25s ease;
}

.cell:last-child {
    border-right: none;
}

.block-next,
.block-prev {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    padding: 0 4px;
    font-size: 11px;
    color: var(--vp-c-text-2, #909399);
    background: var(--vp-c-bg-soft, #f5f7fa);
    border-left: 1px solid var(--vp-c-divider, #dcdfe6);
}

.block-prev {
    border-left: none;
    border-right: 1px solid var(--vp-c-divider, #dcdfe6);
}

.node.visiting,
.cell.visiting {
    background: #fdf6ec;
    border-color: #e6a23c;
    transform: translateY(-4px);
}

.node.active,
.cell.active {
    background: #f0f9eb;
    color: #3a7a28;
    box-shadow: inset 0 0 0 2px #67c23a;
}

.node.inserting,
.cell.inserting {
    background: #f0f9eb;
    box-shadow: inset 0 0 0 2px #67c23a;
}

.node.removing,
.cell.removing {
    background: #fef0f0;
    color: #c45656;
    box-shadow: inset 0 0 0 2px #f56c6c;
}

.node.inserting {
    border-color: #67c23a;
    transform: translateY(-6px) scale(1.05);
}

.node.removing {
    border-color: #f56c6c;
    transform: translateY(-6px);
}

.head-badge.active {
    color: var(--vp-c-brand, #409eff);
    border-color: var(--vp-c-brand, #409eff);
}

.tail-badge.active {
    color: #e6a23c;
    border-color: #e6a23c;
    background: #fdf6ec;
}

.slot-enter-from {
    opacity: 0;
    max-width: 0;
    transform: translateY(-40px);
}

.slot-enter-to,
.slot-leave-from {
    opacity: 1;
    max-width: 280px;
    transform: translateY(0);
}

.slot-leave-to {
    opacity: 0;
    max-width: 0;
    transform: translateY(40px);
}

.slot-enter-active,
.slot-leave-active,
.slot-move {
    transition: max-width 0.45s ease, opacity 0.45s ease, transform 0.45s ease;
}

.slot-leave-active {
    position: relative;
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
