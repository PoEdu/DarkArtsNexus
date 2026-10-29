<template>
    <section class="memory-layout" aria-label="运行时内存布局交互图">
        <div class="memory-heading">
            <strong>探索进程的虚拟地址空间</strong>
            <span>Linux / ELF · 简化示意</span>
        </div>
        <p class="memory-hint">点击内存区域查看详情，或选择一个 C 对象观察它通常存放在哪里。也可用 Tab 和 Enter 操作。</p>
        <label class="memory-picker">
            观察对象
            <select v-model="exampleId" @change="selectExample">
                <option value="">自由探索各区域</option>
                <option v-for="example in examples" :key="example.id" :value="example.id">{{ example.label }}</option>
            </select>
        </label>
        <p v-if="currentExample" class="memory-example" role="status">{{ currentExample.note }}</p>
        <div class="memory-columns">
            <div class="memory-map" role="group" aria-label="从高地址到低地址的内存区域">
                <div class="memory-axis">高地址</div>
                <template v-for="region in regions" :key="region.id">
                    <div v-if="region.id === 'heap'" class="memory-gap">⋮ 未映射空间 ⋮</div>
                    <button
                        type="button"
                        class="memory-region"
                        :class="{ 'is-selected': selectedId === region.id }"
                        :aria-pressed="selectedId === region.id"
                        @click="selectRegion(region.id)"
                    >
                        <span><strong>{{ region.title }}</strong><small>{{ region.subtitle }}</small></span>
                        <span class="memory-permission">{{ region.permission }}</span>
                    </button>
                </template>
                <div class="memory-axis">低地址</div>
                <button type="button" class="memory-tls" :aria-pressed="selectedId === 'tls'" @click="selectRegion('tls')">
                    TLS：每个线程一份 ↗
                </button>
                <small class="memory-hint">TLS 单独展示其含义，不代表它固定在地址空间底部。</small>
            </div>
            <div class="memory-detail" aria-live="polite" aria-atomic="true">
                <div class="memory-detail-label">当前区域</div>
                <h3>{{ selected.title }}</h3>
                <p>{{ selected.description }}</p>
                <dl>
                    <dt>存储内容</dt><dd>{{ selected.contents }}</dd>
                    <dt>常见权限</dt><dd>{{ selected.access }}</dd>
                    <dt>生命周期</dt><dd>{{ selected.lifetime }}</dd>
                    <dt>典型示例</dt><dd><code>{{ selected.code }}</code></dd>
                </dl>
                <p class="memory-caution"><strong>理解要点：</strong>{{ selected.caution }}</p>
            </div>
        </div>
        <p class="memory-footnote">R = 读，W = 写，X = 执行。图中高度不表示容量，顺序和增长方向仅为典型示意；真实地址受平台、链接方式和 ASLR 影响，区域之间也可能有空洞。</p>
    </section>
</template>

<script setup>
import { computed, ref } from 'vue';

const regions = [
    {
        id: 'kernel', title: '内核地址范围', subtitle: '用户态与内核态的边界', permission: '特权访问',
        description: '操作系统管理的系统地址范围，普通用户代码不能直接访问。',
        contents: '内核代码、内核数据及设备相关映射。', access: '受特权级保护，具体页面权限各不相同。',
        lifetime: '由操作系统管理，不随普通函数调用创建或释放。', code: 'read(fd, buffer, size); // 通过系统调用请求服务',
        caution: '不是每个进程各自拥有一份内核。启用 KPTI 时，用户态页表也不一定映射完整内核。',
    },
    {
        id: 'stack', title: '栈', subtitle: '↓ 常见平台向低地址增长', permission: 'RW',
        description: '组织函数调用所需的临时存储，每个线程通常使用自己的栈。',
        contents: '局部数组、寄存器溢出值、保存的寄存器以及部分调用数据。', access: '通常可读写、不可执行。',
        lifetime: '栈帧随调用建立和撤销；自动局部对象通常在离开所属作用域时结束生命周期。', code: 'void f(void) { int local[16]; }',
        caution: '参数、局部变量和返回值也可能位于寄存器或被优化掉。函数返回后不能继续访问已结束生命周期的局部对象。',
    },
    {
        id: 'mapping', title: '内存映射区域', subtitle: '共享库 / 文件 / 匿名映射', permission: '依映射而定',
        description: '加载器、程序和分配器可以在这里建立不同用途的映射。',
        contents: '共享库的代码与数据、映射文件、匿名内存，以及部分线程栈和动态分配。', access: '可以只读、可读写或可执行，由每个映射的属性决定。',
        lifetime: '随映射建立而存在，直到 munmap、模块卸载或进程退出等操作撤销映射。', code: 'mmap(NULL, length, prot, flags, fd, 0);',
        caution: '映射不等于共享：MAP_PRIVATE 的修改是私有的，MAP_SHARED 才用于共享对应数据；共享仍需同步。',
    },
    {
        id: 'heap', title: '传统堆 / 动态分配', subtitle: '↑ brk 堆通常向高地址增长', permission: 'RW',
        description: '动态对象的生命周期不必与创建它的函数调用一致。',
        contents: 'malloc 等接口分配的对象和分配器管理信息。', access: '通常可读写、不可执行。',
        lifetime: '分配后持续存在，直到显式释放或被运行时回收。', code: 'int *p = malloc(sizeof *p); // 使用后 free(p)',
        caution: '堆对象也可能来自 mmap 区域，不一定在 [heap] 中。free 不保证立即把物理内存归还操作系统。',
    },
    {
        id: 'bss', title: '零初始化区', subtitle: '.bss', permission: 'RW',
        description: '为零初始化的静态存储对象提供空间，无须在文件中保存等量的零字节。',
        contents: '未显式初始化或初始化为零的全局变量、静态变量。', access: '通常可读写、不可执行。',
        lifetime: '主程序中的这些对象具有程序级存储期。', code: 'static int count; // 初值为 0',
        caution: '节的大小会占用虚拟内存，但不会等量增加文件大小。普通未初始化的自动局部变量不适用此零初始化规则。',
    },
    {
        id: 'data', title: '已初始化数据区', subtitle: '.data', permission: 'RW',
        description: '保存带初值的可写静态存储对象，初始数据通常记录在文件中。',
        contents: '带非零常量初值的全局变量、文件静态变量和函数内静态变量等。', access: '通常可读写、不可执行。',
        lifetime: '主程序中的对象通常在整个程序运行期间保有存储。', code: 'static int count = 10;',
        caution: '函数内 static 变量不会在每次调用后消失。作用域限制名字可见的位置，存储期决定存储存在多久。',
    },
    {
        id: 'rodata', title: '只读数据区', subtitle: '.rodata', permission: 'R',
        description: '保存运行期间不需要修改的数据。',
        contents: '字符串字面量、部分静态常量与查找表。', access: '通常只读、不可执行。',
        lifetime: '通常随可执行文件或共享库的映射存在。', code: 'const char *p = "hello"; // 此处观察 "hello"',
        caution: '指针变量与指向的字符串是不同对象。const 不保证对象位于 .rodata；修改字符串字面量属于未定义行为。',
    },
    {
        id: 'text', title: '代码区', subtitle: '.text', permission: 'RX',
        description: '保存编译后的机器指令，处理器通过控制流转移执行函数。',
        contents: '函数的机器指令。', access: '通常可读、可执行，不可写。',
        lifetime: '通常随所属可执行文件或共享库映射存在。', code: 'int add(int a, int b) { return a + b; }',
        caution: '调用函数不会把函数指令复制到栈上。JIT 生成的代码也可能位于匿名映射中。',
    },
];
const tls = {
    id: 'tls', title: '线程局部存储 TLS',
    description: '同一个变量名在不同线程中对应各自独立的对象实例。',
    contents: 'C11 _Thread_local 或 C++ thread_local 对象。', access: '通常可读写；它是线程存储机制，不是独立的权限类别。',
    lifetime: '与所属线程关联，由加载器和线程运行时建立实际存储。', code: '_Thread_local int thread_error;',
    caution: '.tdata 和 .tbss 描述初始化模板与零初始化部分。TLS 的实际实例不必组成一个独立、连续的地址段。',
};
const examples = [
    { id: 'function', label: '函数 add 的机器指令', region: 'text', note: '函数指令通常位于代码区，调用现场则由寄存器与栈共同维护。' },
    { id: 'literal', label: '字符串字面量 "hello"', region: 'rodata', note: '观察的是字面量本身，而不是保存它地址的指针变量。' },
    { id: 'global', label: '全局 int count = 10', region: 'data', note: '非零常量初值通常存入文件的 .data，运行时对象可修改。' },
    { id: 'zero', label: '全局 int count（无显式初值）', region: 'bss', note: '具有静态存储期的 count 会被零初始化，通常由 .bss 提供空间。' },
    { id: 'local', label: '函数内的普通局部数组', region: 'stack', note: '需要实际存储的局部数组通常在栈上；优化器仍可能消除未使用的对象。' },
    { id: 'pointer', label: '局部指针 int *p = malloc(4) 中的 p', region: 'stack', note: 'p 自身可能在寄存器或栈中；此图展示需要栈存储的情况，与它指向的动态对象区分。' },
    { id: 'allocated', label: 'malloc 返回的内存对象', region: 'heap', note: '这里选中动态分配这一概念；实际内存也可能来自 mmap，不保证位于传统 brk 堆。' },
    { id: 'file', label: 'mmap 映射的文件内容', region: 'mapping', note: '具体读写权限与共享方式由映射参数决定。' },
    { id: 'thread', label: '_Thread_local int thread_error', region: 'tls', note: '每个线程各有一份对象，不能把它理解为所有线程共享的普通全局变量。' },
];
const selectedId = ref('text');
const exampleId = ref('');
const selected = computed(() => selectedId.value === 'tls' ? tls : regions.find(region => region.id === selectedId.value));
const currentExample = computed(() => examples.find(example => example.id === exampleId.value));
function selectRegion(id) {
    selectedId.value = id;
    exampleId.value = '';
}
function selectExample() {
    if (currentExample.value) selectedId.value = currentExample.value.region;
}
</script>

<style scoped>
.memory-layout {
    --memory-accent: var(--theme-color, #2879a8);
    margin: 1.5rem 0;
    padding: 1.25rem;
    border: 1px solid var(--border-color, #b8c4cf);
    border-radius: 14px;
    color: var(--text-color, #263746);
    background: var(--bg-color, #fff);
}
.memory-heading { display: flex; flex-wrap: wrap; gap: .5rem 1rem; justify-content: space-between; }
.memory-heading span, .memory-hint, .memory-footnote { font-size: .85rem; line-height: 1.6; }
.memory-picker { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; font-weight: 600; }
.memory-picker select { max-width: 100%; padding: .6rem; border: 1px solid var(--border-color, #b8c4cf); border-radius: 6px; color: inherit; background: var(--bg-color, #fff); font: inherit; font-size: .9rem; }
.memory-example { padding: .75rem; border-left: 3px solid var(--memory-accent); background: var(--bg-color-secondary, #f3f6f8); font-size: .9rem; }
.memory-columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 1.25rem; margin-top: 1rem; align-items: start; }
.memory-map { display: flex; flex-direction: column; gap: .35rem; }
.memory-axis, .memory-gap { text-align: center; font-size: .8rem; padding: .3rem; }
.memory-gap { border: 1px dashed var(--border-color, #b8c4cf); padding: .75rem; }
.memory-region, .memory-tls { color: inherit; font: inherit; text-align: left; cursor: pointer; border: 1px solid var(--border-color, #b8c4cf); background: var(--bg-color-secondary, #f3f6f8); border-radius: 7px; padding: .65rem .75rem; }
.memory-region { display: flex; align-items: center; justify-content: space-between; gap: .5rem; border-left: 4px solid var(--border-color, #b8c4cf); }
.memory-region small { display: block; font-size: .75rem; margin-top: .2rem; }
.memory-region.is-selected, .memory-tls[aria-pressed="true"] { border-color: var(--memory-accent); outline: 1px solid var(--memory-accent); }
.memory-region.is-selected strong { color: var(--memory-accent); }
.memory-region:hover, .memory-tls:hover { border-color: var(--memory-accent); }
.memory-layout button:focus-visible, .memory-layout select:focus-visible { outline: 3px solid var(--memory-accent); outline-offset: 3px; }
.memory-permission { font: .75rem monospace; flex-shrink: 0; }
.memory-detail { min-width: 0; padding: 1rem; background: var(--bg-color-secondary, #f3f6f8); border-radius: 10px; }
.memory-detail-label { font-size: .8rem; color: var(--memory-accent); }
.memory-detail h3 { margin: .4rem 0 .8rem; padding: 0; border: 0; }
.memory-detail p, .memory-detail dl { font-size: .9rem; line-height: 1.7; }
.memory-detail dt { font-weight: 700; margin-top: .8rem; }
.memory-detail dd { margin: .15rem 0 0; }
.memory-detail code { white-space: pre-wrap; overflow-wrap: anywhere; }
.memory-caution { border-top: 1px solid var(--border-color, #b8c4cf); padding-top: .8rem; }
.memory-footnote { margin-bottom: 0; }
@media (max-width: 640px) {
    .memory-layout { padding: .8rem; }
    .memory-columns { grid-template-columns: minmax(0, 1fr); }
    .memory-picker select { width: 100%; }
}
</style>
