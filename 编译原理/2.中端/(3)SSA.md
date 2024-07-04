# 静态单赋值（SSA）


<ClientOnly><CFG /></ClientOnly>


静态单赋值（Static Single Assignment，SSA）是一种中间表示形式，其中每个变量只能被赋值一次。这种表示形式在编译器优化中非常有用，因为它简化了数据流分析和转换。在这篇文章中，我们将介绍SSA的基本概念，以及如何将常规的控制流图（Control Flow Graph，CFG）转换为SSA形式。

