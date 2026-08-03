# LL语法分析

父章 [语法分析](../(2)语法分析.md) 用**递归下降**手写了预测分析：每个非终结符一个函数，靠 `peek()` 选分支。把「当前非终结符 + 当前向前看终结符 → 该用哪条产生式」做成一张表，运行时只查表、进栈出栈，就是**表驱动的 LL(1) 分析**。本节讲这张表怎么造。


## 构建LL语法分析表

LL(1) 表示：从左到右扫描输入（Left-to-right），最左推导（Leftmost derivation），向前看 **1** 个终结符即可唯一决定产生式。

### FIRST 与 FOLLOW

对文法符号串 $\alpha$：

- $\mathrm{FIRST}(\alpha)$：从 $\alpha$ 能推导出的串的**开头终结符**集合；若 $\alpha \Rightarrow^* \varepsilon$，则 $\varepsilon$ 也记入 FIRST。
- $\mathrm{FOLLOW}(A)$：在某个句型中，紧跟在非终结符 $A$ **右边**可能出现的终结符集合；若 $A$ 可以出现在句型末尾，则把结束符 $\$$ 放入 $\mathrm{FOLLOW}(A)$。

计算要点（反复直到不动）：

**FIRST**

1. 终结符 $a$：$\mathrm{FIRST}(a)=\{a\}$。
2. 若 $A\to \varepsilon$，则 $\varepsilon\in\mathrm{FIRST}(A)$。
3. 若 $A\to Y_1 Y_2\cdots Y_k$，把 $\mathrm{FIRST}(Y_1)$ 中非 $\varepsilon$ 的符号加入 $\mathrm{FIRST}(A)$；若 $Y_1\Rightarrow^*\varepsilon$，再并入 $\mathrm{FIRST}(Y_2)$，以此类推；若全部可空，则 $\varepsilon\in\mathrm{FIRST}(A)$。

**FOLLOW**

1. 开始符号 $S$：$\$$\in\mathrm{FOLLOW}(S)$。
2. 若有 $A\to \alpha B\beta$，则 $\mathrm{FIRST}(\beta)\setminus\{\varepsilon\}$ 并入 $\mathrm{FOLLOW}(B)$。
3. 若有 $A\to \alpha B$，或 $A\to \alpha B\beta$ 且 $\beta\Rightarrow^*\varepsilon$，则 $\mathrm{FOLLOW}(A)$ 并入 $\mathrm{FOLLOW}(B)$。

### 填表规则

分析表 $M[A,a]$（行：非终结符；列：终结符或 $\$$）：

1. 对每条 $A\to\alpha$，对每个终结符 $a\in\mathrm{FIRST}(\alpha)$，令 $M[A,a]=A\to\alpha$。
2. 若 $\varepsilon\in\mathrm{FIRST}(\alpha)$，则对每个 $b\in\mathrm{FOLLOW}(A)$，令 $M[A,b]=A\to\alpha$。
3. 其余格子为报错。

若某格被两条产生式写入，则出现**冲突**，文法不是 LL(1)。常见原因：左递归、公共左因子。需先改写文法（消左递归、提取左公因子），再算 FIRST/FOLLOW 填表。父章的递归下降能直接写，正是因为那份四则运算文法（或改写后）满足 LL(1)。

### 例子：消去左递归后的表达式骨架

左递归的 $E\to E+T\mid T$ 不是 LL(1)。改写为：

```
E  → T E'
E' → + T E' | ε
T  → F T'
T' → * F T' | ε
F  → ( E ) | id
```

**FIRST**

| 符号 | FIRST |
|------|-------|
| $F$ | $\{(\,,\,\mathrm{id}\}$ |
| $T'$ | $\{\ast\,,\,\varepsilon\}$ |
| $T$ | $\{(\,,\,\mathrm{id}\}$ |
| $E'$ | $\{+\,,\,\varepsilon\}$ |
| $E$ | $\{(\,,\,\mathrm{id}\}$ |

**FOLLOW**

| 符号 | FOLLOW |
|------|--------|
| $E$ | $\{)\,,\,\$\}$ |
| $E'$ | $\{)\,,\,\$\}$ |
| $T$ | $\{+\,,\,)\,,\,\$\}$ |
| $T'$ | $\{+\,,\,)\,,\,\$\}$ |
| $F$ | $\{\ast\,,\,+\,,\,)\,,\,\$\}$ |

（由 $F\to(E)$ 得 $)\in\mathrm{FOLLOW}(E)$；由 $E\to T E'$ 等规则按上面三条传播。）

**LL(1) 分析表**（空格表示出错）：

|  | $\mathrm{id}$ | `+` | `*` | `(` | `)` | $\$$ |
|--|---------------|-----|-----|-----|-----|------|
| $E$ | $E\to T E'$ | | | $E\to T E'$ | | |
| $E'$ | | $E'\to + T E'$ | | | $E'\to\varepsilon$ | $E'\to\varepsilon$ |
| $T$ | $T\to F T'$ | | | $T\to F T'$ | | |
| $T'$ | | $T'\to\varepsilon$ | $T'\to * F T'$ | | $T'\to\varepsilon$ | $T'\to\varepsilon$ |
| $F$ | $F\to\mathrm{id}$ | | | $F\to( E )$ | | |

### 分析过程示意

输入 `id + id`，栈底为 $\$$，开始时栈为 $\$\ E$（顶在右）：

| 栈（顶在右） | 输入 | 动作 |
|--------------|------|------|
| $\$\ E$ | $\mathrm{id}\,+\,\mathrm{id}\,\$$ | $E\to T E'$ |
| $\$\ E'\, T$ | $\mathrm{id}\,+\,\mathrm{id}\,\$$ | $T\to F T'$ |
| $\$\ E'\, T'\, F$ | $\mathrm{id}\,+\,\mathrm{id}\,\$$ | $F\to\mathrm{id}$ |
| $\$\ E'\, T'\, \mathrm{id}$ | $\mathrm{id}\,+\,\mathrm{id}\,\$$ | 匹配 $\mathrm{id}$ |
| $\$\ E'\, T'$ | $+\,\mathrm{id}\,\$$ | $T'\to\varepsilon$ |
| $\$\ E'$ | $+\,\mathrm{id}\,\$$ | $E'\to + T E'$ |
| $\$\ E'\, T\, +$ | $+\,\mathrm{id}\,\$$ | 匹配 `+` |
| … | … | 继续至栈与输入皆为 $\$$ |

与递归下降对照：查 $M[E,\mathrm{id}]$ 相当于在 `parseE` 里看到 `id`/`(` 时调用 `parseT` 再处理 `E'`；表只是把分支选择显式化，便于工具生成。


## 小结

| 概念 | 作用 |
|------|------|
| FIRST | 产生式「能以哪些终结符开头」 |
| FOLLOW | 可空产生式「在哪些向前看符号下仍可选」 |
| LL(1) 表 | $M[A,a]$ 唯一决定 $A$ 的展开 |
| 冲突 | 需消左递归 / 提左公因子，或改用 LR 族 |

下一篇：[LR 语法分析](./LR.md)（自底向上的分析表）。
