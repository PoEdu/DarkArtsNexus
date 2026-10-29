<template>
    <section class="stack-demo" aria-label="两个函数调用的栈帧演示">
        <div class="stack-heading"><strong>跟随一次函数调用，观察栈帧的建立与撤销</strong><span>Linux x86-64 · System V ABI</span></div>
        <p class="stack-hint">main → addThree → main。保留帧指针、不使用 red zone 的教学指令；地址为示意值，每行代表 8 字节。</p>
        <div class="stack-controls" role="group" aria-label="演示播放控制">
            <button type="button" :disabled="index === 0" @click="seek(index - 1)">上一步</button>
            <button type="button" :disabled="index === steps.length - 1" @click="seek(index + 1)">下一步</button>
            <button type="button" :aria-pressed="playing" @click="togglePlay">{{ playing ? '暂停' : index === steps.length - 1 ? '重新播放' : '自动播放' }}</button>
            <button type="button" @click="seek(0)">重置</button>
            <label>速度 <select v-model.number="delay" @change="restartTimer"><option :value="2400">慢速</option><option :value="1500">正常</option><option :value="800">快速</option></select></label>
        </div>
        <label class="stack-progress">步骤 {{ index + 1 }} / {{ steps.length }}
            <input type="range" min="0" :max="steps.length - 1" :value="index" aria-label="跳转到演示步骤" @input="seek(Number($event.target.value))" />
        </label>
        <div class="stack-status" role="status" aria-live="polite" aria-atomic="true">
            <strong>{{ current.owner }} · <code>{{ current.instruction }}</code></strong>
            <p>{{ current.explanation }}</p>
        </div>
        <div class="stack-registers" aria-label="执行当前步骤后的寄存器">
            <span v-for="register in registers" :key="register" :class="{ 'register-changed': previous && current[register] !== previous[register] }">
                <strong>{{ register }}</strong> {{ formatStackValue(current[register]) }}
                <small v-if="register === 'rdi' && current.rdi !== null">参数 {{ current.rdi }}</small>
                <small v-if="register === 'rax' && current.rax !== null">返回值 {{ current.rax }}</small>
            </span>
        </div>
        <p class="stack-chain">执行当前步骤后的调用链：<strong>外部调用者<span v-for="name in current.calls" :key="name"> → {{ name }}</span></strong></p>
        <div class="stack-columns">
            <div class="stack-memory">
                <div class="stack-axis">高地址 ↑　｜　栈向低地址增长 ↓</div>
                <div class="stack-legend"><span class="main-marker">main 的槽位</span><span class="callee-marker">addThree 的槽位</span><span>虚线：不属于当前活动栈</span></div>
                <div v-for="address in addresses" :key="address" class="stack-slot"
                    :class="{ 'slot-main': cell(address)?.owner === 'main', 'slot-callee': cell(address)?.owner === 'addThree', 'slot-empty': !cell(address), 'slot-changed': current.changed.includes(address), 'slot-released': current.released.includes(address) }">
                    <code class="stack-address">{{ formatStackValue(address) }}</code>
                    <div class="stack-slot-content">
                        <template v-if="cell(address)"><strong>{{ cell(address).label }}</strong><span>{{ cellValue(address) }}</span></template>
                        <span v-else>{{ address === stackTop ? '演示起始栈顶边界' : current.released.includes(address) ? '刚撤销 · 不再有效' : '非活动槽位' }}</span>
                    </div>
                    <div class="stack-pointers"><b v-if="current.rsp === address">← rsp</b><b v-if="current.rbp === address">← rbp</b></div>
                </div>
                <p class="stack-hint">{{ current.rbp > stackTop ? `rbp = ${formatStackValue(current.rbp)}，指向图外的调用者。` : 'rbp 标记当前帧基址，rsp 标记当前栈顶。' }} “撤销”表示失效，不表示底层字节已被擦除。</p>
            </div>
            <div class="stack-code">
                <strong>C 源码位置</strong>
                <ol class="stack-source"><li v-for="(line, lineIndex) in sourceLines" :key="lineIndex" :class="{ 'source-active': current.line === lineIndex }" :aria-current="current.line === lineIndex ? 'step' : undefined"><code>{{ line || ' ' }}</code></li></ol>
                <p class="stack-hint">上方指令表示刚执行的操作；源码高亮表示对应或返回后的源码位置。指令使用 Intel 风格，不是编译器输出的唯一形式。</p>
                <dl class="stack-notes">
                    <dt>call / ret</dt><dd>保存与取出返回地址，转移控制流。</dd>
                    <dt>push rbp / mov rbp, rsp</dt><dd>保存调用者帧指针，建立当前帧基址。</dd>
                    <dt>sub rsp, 16</dt><dd>预留局部空间；不需要为每次调用执行一次系统调用。</dd>
                    <dt>mov rsp, rbp / pop rbp</dt><dd>撤销局部空间并恢复调用者的帧指针，相当于本例中的 leave。</dd>
                </dl>
            </div>
        </div>
        <p class="stack-hint">真实编译器可能将局部值保存在寄存器、内联函数或省略 rbp。图中为返回地址标注所属调用，便于观察；栈帧边界的术语口径可以不同。</p>
    </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { createStackTrace, formatStackValue, sourceLines, stackTop, stackBottom } from '../utils/stackFrameSimulation.js';

const steps = createStackTrace();
const index = ref(0);
const playing = ref(false);
const delay = ref(1500);
const registers = ['rsp', 'rbp', 'rdi', 'rax'];
const addresses = Array.from({ length: (stackTop - stackBottom) / 8 + 1 }, (_, i) => stackTop - i * 8);
const current = computed(() => steps[index.value]);
const previous = computed(() => index.value > 0 ? steps[index.value - 1] : null);
let timer = null;
function cell(address) { return current.value.memory[address]; }
function cellValue(address) {
    const entry = cell(address);
    return entry.label === '保存的 rbp' ? formatStackValue(entry.value) : entry.value;
}
function stop() {
    if (timer !== null) clearInterval(timer);
    timer = null;
    playing.value = false;
}
function seek(target) {
    stop();
    index.value = Math.max(0, Math.min(steps.length - 1, target));
}
function startTimer() {
    timer = setInterval(() => {
        if (index.value < steps.length - 1) index.value += 1;
        if (index.value === steps.length - 1) stop();
    }, delay.value);
}
function togglePlay() {
    if (playing.value) { stop(); return; }
    if (index.value === steps.length - 1) index.value = 0;
    playing.value = true;
    startTimer();
}
function restartTimer() {
    if (!playing.value) return;
    clearInterval(timer);
    startTimer();
}
onBeforeUnmount(stop);
</script>

<style scoped>
.stack-demo { --stack-accent: var(--theme-color, #2879a8); margin: 1.5rem 0; padding: 1.2rem; border: 1px solid var(--border-color, #b8c4cf); border-radius: 14px; color: var(--text-color, #263746); background: var(--bg-color, #fff); }
.stack-heading { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: space-between; }
.stack-heading > span, .stack-hint, .stack-axis, .stack-legend { font-size: .8rem; line-height: 1.7; }
.stack-controls { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.stack-controls button, .stack-controls select { padding: .5rem .7rem; border: 1px solid var(--border-color, #b8c4cf); border-radius: 6px; background: var(--bg-color-secondary, #f3f6f8); color: inherit; font: inherit; font-size: .85rem; }
.stack-controls button { cursor: pointer; }
.stack-controls button:disabled { opacity: .45; cursor: default; }
.stack-controls button[aria-pressed="true"] { border-color: var(--stack-accent); }
.stack-demo :is(button, select, input):focus-visible { outline: 3px solid var(--stack-accent); outline-offset: 3px; }
.stack-progress { display: flex; align-items: center; gap: .8rem; font-size: .85rem; margin: 1rem 0; }
.stack-progress input { flex: 1; min-width: 0; accent-color: var(--stack-accent); }
.stack-status { padding: .85rem; border-left: 4px solid var(--stack-accent); background: var(--bg-color-secondary, #f3f6f8); min-height: 6rem; }
.stack-status p { margin: .4rem 0 0; font-size: .9rem; }
.stack-status code { overflow-wrap: anywhere; }
.stack-registers { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .9rem; }
.stack-registers > span { padding: .4rem .6rem; border: 1px solid var(--border-color, #b8c4cf); border-radius: 6px; font-family: monospace; }
.stack-registers small { display: block; }
.stack-registers .register-changed { border-color: var(--stack-accent); box-shadow: inset 0 -2px var(--stack-accent); }
.stack-chain { font-size: .85rem; }
.stack-columns { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
.stack-axis { text-align: center; }
.stack-legend { display: flex; flex-wrap: wrap; gap: .4rem .8rem; margin: .5rem 0; }
.main-marker { border-left: 4px solid #2884b4; padding-left: .3rem; }
.callee-marker { border-left: 4px solid #ab71cb; padding-left: .3rem; }
.stack-slot { display: grid; grid-template-columns: 4.3rem minmax(0, 1fr) 3.5rem; gap: .3rem; align-items: center; min-height: 3.4rem; margin-bottom: .35rem; padding: .4rem; border: 1px solid var(--border-color, #b8c4cf); border-left: 4px solid transparent; border-radius: 5px; transition: background-color .2s; }
.slot-main { border-left-color: #2884b4; background: rgba(40,132,180,.09); }
.slot-callee { border-left-color: #ab71cb; background: rgba(171,113,203,.09); }
.slot-empty { border-style: dashed; }
.slot-changed { outline: 2px solid var(--stack-accent); outline-offset: -2px; }
.slot-released { border-color: var(--stack-accent); }
.stack-address { font-size: .75rem; padding: 0; background: transparent; }
.stack-slot-content { display: flex; flex-direction: column; font-size: .75rem; overflow-wrap: anywhere; }
.stack-pointers { display: flex; flex-direction: column; font: .75rem monospace; color: var(--stack-accent); }
.stack-code { min-width: 0; padding: .8rem; border-radius: 8px; background: var(--bg-color-secondary, #f3f6f8); }
.stack-source { padding-left: 2rem; font-size: .8rem; }
.stack-source li { padding: .25rem .2rem; border-left: 3px solid transparent; }
.stack-source code { white-space: pre-wrap; overflow-wrap: anywhere; padding: 0; background: transparent; font-size: inherit; }
.stack-source .source-active { border-left-color: var(--stack-accent); background: rgba(40,132,180,.12); font-weight: 700; }
.stack-notes { font-size: .85rem; line-height: 1.7; }
.stack-notes dt { font-family: monospace; font-weight: 700; margin-top: .8rem; }
.stack-notes dd { margin: .25rem 0; }
@media (max-width: 760px) { .stack-columns { grid-template-columns: minmax(0, 1fr); } .stack-demo { padding: .7rem; } }
@media (prefers-reduced-motion: reduce) { .stack-slot { transition: none; } }
</style>
