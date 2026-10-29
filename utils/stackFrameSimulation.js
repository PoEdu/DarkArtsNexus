// A deterministic teaching trace, not a general-purpose x86 emulator.
export const stackTop = 0x1000;
export const stackBottom = 0x0fc0;
export const sourceLines = [
    'long addThree(long n) {',
    '    long temp = n + 3;',
    '    return temp;',
    '}',
    '',
    'int main(void) {',
    '    long x = 7;',
    '    long result = addThree(x);',
    '    return (int)result;',
    '}',
];

export function createStackTrace() {
    const state = { rsp: stackTop, rbp: 0x1100, rdi: null, rax: null, memory: {}, calls: [] };
    const steps = [];
    function record(owner, instruction, line, explanation, update = () => {}) {
        const previous = { ...state.memory };
        update();
        steps.push({ ...state, memory: { ...state.memory }, calls: [...state.calls], owner, instruction, line, explanation,
            changed: Object.keys(state.memory).filter(address => state.memory[address] !== previous[address]).map(Number),
            released: Object.keys(previous).filter(address => !(address in state.memory)).map(Number),
        });
    }
    function put(address, owner, label, value) { state.memory[address] = { owner, label, value }; }
    function push(owner, label, value) { state.rsp -= 8; put(state.rsp, owner, label, value); }
    function pop() { const value = state.memory[state.rsp].value; delete state.memory[state.rsp]; state.rsp += 8; return value; }
    function reserve(owner) {
        state.rsp -= 16;
        put(state.rsp, owner, '局部槽位（未初始化）', '未定');
        put(state.rsp + 8, owner, '保留槽位 / 对齐空间', '—');
    }
    function releaseLocals() {
        for (const address of Object.keys(state.memory)) if (Number(address) < state.rbp) delete state.memory[address];
        state.rsp = state.rbp;
    }
    record('外部调用者', '准备调用 main', null, '从调用 main 前开始。rsp 为 16 字节对齐；外部调用者的栈帧不展开。寄存器中的初始帧指针用 0x1100 示意。');
    record('外部调用者', 'call main', 5, 'call 将返回外部调用者的指令地址压入栈，再进入 main；rsp 减少 8 字节。', () => { push('main', '返回外部调用者', '外部继续位置'); state.calls.push('main'); });
    record('main', 'push rbp', 5, '保存调用者的 rbp。此时 rbp 仍指向外部调用者，尚未建立 main 的帧基址。', () => push('main', '保存的 rbp', state.rbp));
    record('main', 'mov rbp, rsp', 5, '让 rbp 指向刚保存的旧 rbp，建立 main 的帧基址。', () => { state.rbp = state.rsp; });
    record('main', 'sub rsp, 16', 6, '为 x 和 result 预留两个 8 字节槽位；只是移动栈指针，槽位尚未初始化。', () => reserve('main'));
    record('main', 'mov qword [rbp-16], 7', 6, '将 x = 7 写到 main 的局部槽位中。', () => put(state.rbp - 16, 'main', 'x · [main rbp − 16]', 7));
    record('main', 'mov rdi, [rbp-16]', 7, '第一个整数参数通过 rdi 传递。参数不必压栈，main 的 x 仍保留。', () => { state.rdi = state.memory[state.rbp - 16].value; });
    record('main', 'call addThree', 7, '调用前 rsp 满足 16 字节对齐。call 压入返回 main 的地址，随后转入 addThree。', () => { push('addThree', '返回 main', 'main: 保存返回值'); state.calls.push('addThree'); });
    record('addThree', 'push rbp', 0, '保存 main 的帧指针。两个调用的栈空间现在同时存在。', () => push('addThree', '保存的 rbp', state.rbp));
    record('addThree', 'mov rbp, rsp', 0, '建立 addThree 的帧基址；main 的 rbp 已保存在当前栈中。', () => { state.rbp = state.rsp; });
    record('addThree', 'sub rsp, 16', 1, '为 temp 及对齐空间预留 16 字节。本例不使用 red zone。', () => reserve('addThree'));
    record('addThree', 'mov [rbp-16], rdi', 1, '先把参数 n 的值 7 写入 temp 的槽位；下一条指令完成加法。', () => put(state.rbp - 16, 'addThree', 'temp（计算中）', state.rdi));
    record('addThree', 'add qword [rbp-16], 3', 1, 'temp = n + 3 = 10。main 的 x 不受影响。', () => put(state.rbp - 16, 'addThree', 'temp · [addThree rbp − 16]', state.memory[state.rbp - 16].value + 3));
    record('addThree', 'mov rax, [rbp-16]', 2, '将返回值 10 放入 rax。返回值保存在寄存器中，之后可以撤销局部槽位。', () => { state.rax = state.memory[state.rbp - 16].value; });
    record('addThree', 'mov rsp, rbp', 2, '撤销 addThree 的局部空间，rsp 回到保存旧 rbp 的位置。释放不意味着把内存字节清零。', releaseLocals);
    record('addThree', 'pop rbp', 2, '从栈中恢复 main 的帧指针，rsp 上移 8 字节。返回地址现在位于栈顶。', () => { state.rbp = pop(); });
    record('addThree', 'ret', 7, 'ret 取出返回地址并回到 main；rsp 再上移 8 字节。addThree 的栈帧已撤销，rax 仍为 10。', () => { pop(); state.calls.pop(); });
    record('main', 'mov [rbp-8], rax', 7, 'main 把 rax 中的返回值保存到 result 的槽位。', () => put(state.rbp - 8, 'main', 'result · [main rbp − 8]', state.rax));
    record('main', 'mov eax, dword [rbp-8]', 8, 'main 返回 int：将 result 的低 32 位放入 eax。本例值为 10，写 eax 同时清零 rax 的高 32 位。', () => { state.rax = state.memory[state.rbp - 8].value; });
    record('main', 'mov rsp, rbp', 8, '撤销 main 的局部空间，x 与 result 的槽位不再有效。', releaseLocals);
    record('main', 'pop rbp', 8, '恢复外部调用者的 rbp，栈顶只剩返回地址。', () => { state.rbp = pop(); });
    record('main', 'ret', null, 'main 返回外部调用者。rsp 与 rbp 恢复到演示开始时的值，两个函数的栈帧均已撤销。', () => { pop(); state.calls.pop(); });
    return steps;
}

export function formatStackValue(value) {
    return typeof value === 'number' ? `0x${value.toString(16).padStart(4, '0')}` : value ?? '—';
}
