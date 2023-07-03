编译器架构的王者LLVM——（9）栈式符号表的构建
===================================


# 栈式符号表的构建

栈式符号表对于一款编译器，无疑是核心的组件。
无论你在做什么符号扫描，那么都离不开符号表，如何得知一个符号是否定义，以及它的类型，那么唯有查看符号表中的记录。
栈式符号表并不复杂，但思想精妙，本文，将介绍一款栈式符号表的原理及简单构建。


## 源代码的例子

首先我们来看一段C代码

```
int a[3] = { 100, 10, 1};

int work() {
	if (a[0] == 100) { // 这里的a指向的是全局符号a
		int a = 99999; // 重新定义了局部符号    下图的符号表是扫描到这里后的情况
		for (int i = 0; i< 10; ++i) {
			a /= 3; // 由于局部符号优先级较高，引用局部符号
		}
		return a; // 局部符号
	}
	return a[0]; // 局部符号生命周期已过，找到全局符号
}
```

于是我们发现，符号表在局部声明变量后，将局部符号增加了，这和全局符号并不冲突，而是优先级不同，越靠近栈顶，越先发现

![](./9/fhb.png)


## 用C++的map和stack构建符号表

如果考虑效率的话，最佳选择是用C语言构建符号表，这样操作起来会更快，但我们毕竟目前考虑开发的简便型而言，用C++的map就可以方便地实现符号表。

首先我们做一个局部符号表，由于其中不会有重复的符号名，所以我们只要简单的将其存放起来即可。
然后符号表还需要记录很多类型信息、指针信息等，我们设计一个结构体表示它们：

```
enum SymbolType
{
	var_t, type_t, struct_t, enum_t, delegate_t, function_t
};

struct id {
    int        level;
    SymbolType type;
    void*      data;
};
```

我们目前是简单起见，由于还不知道都可能放哪些东西，例如数组符号，肯定要包含数组长度、维度等信息，各种变量都会包含类型信息，所以我们这里放了一个void*的指针，到时候需要的化，就强制转换一下。

这里其实定义一个基类，需要存储的内容去多态派生也是可以的，没做主要是因为可能存放的东西类型很多，暂时先用一个void*，这样可能方便一点。

于是我们的局部符号表就有了：
```
class IDMap
{
public:
    IDMap();
    ~IDMap();
    id* find(string& str) const; // 查找一个符号
    void insert(string& str, int level, SymbolType type, void* data); // 插入一个符号
private:
    map<string,id*> ID_map;
};
```

我想查找和插入都是C++中map的基础函数，大家应该很轻松就能实现吧。

再弄一个栈来存储一个IDMap：
```
class IDTable
{
public:
    IDTable();
    id* find(string& str) const;
    void insert(string& str,SymbolType type, void* data);
    void push(); // 压栈和弹栈操作，例如在函数的解析时，需要压栈，一个函数解析完，就弹栈
    void pop();
    int getLevel(); // 获取当前的层级，如果为0，则说明是只有全局符号了
private:
    deque<IDMap> ID_stack;
};
```

这里用deque而没用stack的原因是，deque支持随机访问，而stack只能访问栈顶。

寻找时，就按照从栈顶到栈底的顺序依次寻找符号：
```
id* IDTable::find(string& idname) const {
    for (auto p = ID_stack.rbegin(); p != ID_stack.rend(); ++p) {
        const IDMap& imap = *p;
        id* pid = imap.find(idname);
        if (pid != NULL) return pid;
    }
    return NULL;
}
```

插入时，就往栈顶，当前最新的符号表里面插入：

```
void IDTable::insert(string& str,SymbolType type, void* data) {
    IDMap& imap = ID_stack.back();
    imap.insert(str,getLevel(), type, data);
}
```

这样，一款简易的栈式符号表就构建好了。

## 附1：Github参考源码

[idmap.h](https://github.com/sunxfancy/RedApple/blob/master/src/idmap.h)
[idmap.cpp](https://github.com/sunxfancy/RedApple/blob/master/src/idmap.cpp)
[idtable.h](https://github.com/sunxfancy/RedApple/blob/master/src/idtable.h)
[idtable.cpp](https://github.com/sunxfancy/RedApple/blob/master/src/idtable.cpp)

## 附2：Graphviz的绘图源码

Graphviz绘图真的非常爽，上面的数据结构图就是用它的dot画的，想了解的朋友可以参考我之前写的 [结构化图形绘制利器Graphviz](http://blog.csdn.net/xfxyy_sxfancy/article/details/49641825)：
```
digraph g {
	graph [
		rankdir = "LR"
	];
	node [
		fontsize = "16"
		shape = "ellipse"
	];
	edge [
	];

	"node0" [
		label = "<f0> stack | <f1> | <f2> | ..."
		shape = "record"	
	];

	"node1" [
		label = "<f0> 全局符号 | a | work |  | ..."
		shape = "record"
	]

	"node2" [
		label = "<f0> 局部符号 | a |  | ..."
		shape = "record"
	]

	"node0":f1 -> "node1":f0 [
		id = 0
	];

	"node0":f2 -> "node2":f0 [
		id = 1
	];

}
```
