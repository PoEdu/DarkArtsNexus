# LR语法分析

父章 [语法分析](../(2)语法分析.md) 用 Bison 展示了**移进–归约**：能读就移进，栈顶形成某产生式右部就归约。Bison 等工具生成的核心是一张 **ACTION / GOTO 表**。本节按 LR(0) → LR(1) → LALR 说明表如何由文法构造，以及三者能力差别。表驱动 LL 见 [LL 语法分析](./LL.md)。


## 移进–归约与项目

分析器维护状态栈。对当前状态 $s$ 与向前看符号 $a$：

- **移进（shift）**：读入 $a$，进入新状态；
- **归约（reduce）**：按某产生式 $A\to\beta$ 弹出 $|\beta|$ 个符号，再经 GOTO 压入 $A$ 对应状态；
- **接受（accept）**；
- **报错**。

**LR(0) 项目**是带圆点的产生式，如 $A\to\alpha\cdot\beta$，表示「$\alpha$ 已在栈上，期望继续匹配 $\beta$」。

- $\mathrm{CLOSURE}(I)$：若 $A\to\alpha\cdot B\beta\in I$，则把所有 $B\to\cdot\gamma$ 加入 $I$，直到不动。
- $\mathrm{GOTO}(I,X)$：把 $I$ 中所有 $A\to\alpha\cdot X\beta$ 的圆点右移过 $X$，再取闭包。


## 构建LR0语法分析表

1. 增广文法：加 $S'\to S$，保证唯一接受。
2. 从 $I_0=\mathrm{CLOSURE}(\{S'\to\cdot S\})$ 出发，对每个项目集、每个文法符号求 GOTO，得到**项目集规范族**。
3. 填表：
   - 若 $A\to\alpha\cdot a\beta\in I_i$ 且 $a$ 为终结符，$\mathrm{GOTO}(I_i,a)=I_j$，则 $\mathrm{ACTION}[i,a]=\mathrm{shift}\ j$；
   - 若 $A\to\alpha\cdot\in I_i$ 且 $A\neq S'$，则对**所有**终结符 $a$（及 $\$$）设 $\mathrm{ACTION}[i,a]=\mathrm{reduce}\ A\to\alpha$（这是 LR(0) 的粗暴之处）；
   - 若 $S'\to S\cdot\in I_i$，则 $\mathrm{ACTION}[i,\$]=\mathrm{accept}$；
   - 若 $\mathrm{GOTO}(I_i,A)=I_j$，则 $\mathrm{GOTO}[i,A]=j$。

同一格既要移进又要归约，或两个不同归约，就是 **移进–归约冲突** / **归约–归约冲突**。LR(0) 对「何时可归约」不加向前看，许多实用文法在 LR(0) 下会冲突。

### 例子：$E\to E+\mathrm{id}\mid\mathrm{id}$

增广：$S'\to E$。

| 集 | 项目 |
|----|------|
| $I_0$ | $S'\to\cdot E$，$E\to\cdot E+\mathrm{id}$，$E\to\cdot\mathrm{id}$ |
| $I_1$ | $S'\to E\cdot$，$E\to E\cdot +\mathrm{id}$ |
| $I_2$ | $E\to\mathrm{id}\cdot$ |
| $I_3$ | $E\to E+\cdot\mathrm{id}$ |
| $I_4$ | $E\to E+\mathrm{id}\cdot$ |

$\mathrm{GOTO}(I_0,E)=I_1$，$\mathrm{GOTO}(I_0,\mathrm{id})=I_2$，$\mathrm{GOTO}(I_1,+)=I_3$，$\mathrm{GOTO}(I_3,\mathrm{id})=I_4$。

**ACTION / GOTO（LR(0)）**

| 状态 | $\mathrm{id}$ | `+` | $\$$ | $E$ |
|------|---------------|-----|------|-----|
| 0 | s2 | | | 1 |
| 1 | | s3 | acc | |
| 2 | r($E\to\mathrm{id}$) | r | r | |
| 3 | s4 | | | |
| 4 | r($E\to E+\mathrm{id}$) | r | r | |

$I_2$、$I_4$ 的归约对所有终结符都写同一 reduce，在此文法下碰巧不与 shift 撞车；$I_1$ 在 `+` 上移进、在 $\$$ 上接受，也无冲突。换更丰富的文法时，LR(0) 常在「可归约状态」上与移进冲突——这时需要带展望符的 LR(1)，或先用 FOLLOW 限制归约列的 **SLR(1)**（把 reduce 只填在 $\mathrm{FOLLOW}(A)$ 上，是 LR(0) 的常见加强，工具里有时作为第一步）。


## 构建LR1语法分析表

**LR(1) 项目**为 $[A\to\alpha\cdot\beta,\, a]$：$a$ 是展望符，表示「归约 $A\to\alpha$ 时，向前看应是 $a$ 才合法」。

闭包：若 $[A\to\alpha\cdot B\beta,\, a]\in I$，则对每条 $B\to\gamma$、每个 $b\in\mathrm{FIRST}(\beta a)$，加入 $[B\to\cdot\gamma,\, b]$。

GOTO 仍右移圆点再闭包；填 ACTION 时：

- 移进规则与 LR(0) 类似；
- **仅当** $[A\to\alpha\cdot,\, a]\in I_i$ 时，才在 $\mathrm{ACTION}[i,a]$ 写 $\mathrm{reduce}\ A\to\alpha$（不再对整个终结符表刷 reduce）。

因此许多 LR(0) 冲突在 LR(1) 下消失：同一状态里可以「对某些向前看归约、对另一些移进」。

### 对照直觉

经典「赋值」片段：

```
S' → S
S  → L = R | R
L  → * R | id
R  → L
```

在 LR(0) 中，栈上已形成 $L$ 时，既可能作为 $R\to L$ 归约，也可能后面还有 `=` 要移进，易出现移进–归约冲突。LR(1) 用展望符区分「后面是 `=`」与「后面是 FOLLOW 中的其它符号」，冲突可消除。该文法是 LR(1)（亦是 LALR(1)）的常用例子；完整项目集规范族条目较多，构造步骤与上节相同，只是项目都带上展望符。

**代价**：LR(1) 状态数往往远大于 LR(0)/LALR，表更大。


## 构建LALR语法分析表

观察 LR(1) 项目集：若两个集的**心**（去掉展望符后的 LR(0) 项目）相同，仅展望符不同，LALR 就把它们**合并**，展望符取并集，再据此填 ACTION/GOTO。

- 能力：$\mathrm{LR(0)} \subset \mathrm{SLR(1)} \subseteq \mathrm{LALR(1)} \subseteq \mathrm{LR(1)}$（就「能无冲突分析的文法类」而言）。
- 合并后可能把原本分开的展望符合在一起，**引入**归约–归约冲突（原 LR(1) 无冲突、LALR 有冲突的文法存在，但少见）。
- 状态数接近 LR(0)，远小于 LR(1)，故 Yacc/Bison 等默认生成 **LALR(1)** 分析器。

构造路径常见两种：

1. 先建 LR(1) 族再合并同心集；
2. 先建 LR(0) 族，再为每个归约项传播/计算展望符（高效实现常用后者思想）。

对仅含 $E\to E+\mathrm{id}\mid\mathrm{id}$ 的小例子，LR(0)/SLR/LALR/LR(1) 表实质相同；差别要在「归约与移进依赖精细向前看」的文法上才明显。父章 Bison 对表达式用 `%left` 声明，本质是在 LALR 表出现移进–归约冲突时，按优先级/结合性**消解冲突**，而不是改用完整 LR(1) 表。


## 小结

| 方法 | 向前看 | 典型用途 |
|------|--------|----------|
| LL(1) | 1 个终结符选产生式 | 手写递归下降、简单工具 |
| LR(0) | 归约不看向前看 | 教学；实用中易冲突 |
| SLR(1) | 用 FOLLOW 限制归约 | LR(0) 的廉价加强 |
| LALR(1) | 合并同心 LR(1) 项 | Yacc/Bison 默认 |
| LR(1) | 精确展望符 | 能力最强，表最大 |

自顶向下（LL）与自底向上（LR）都能构造语法树；复杂程序设计语言文法更常走 LALR/LR 工具链，而手写前端仍多用递归下降（LL 思想）。
