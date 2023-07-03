编译器架构的王者LLVM——（6）多遍翻译的宏翻译系统
===================================

# 多遍翻译的宏翻译系统

上次我们讨论了构建语法树的基本模型，我们能够利用Lex+Bison+Node,几个组件将我们的目标语法翻译成AST语法树了，在第四章，我们也给出了RedApple这款实现型小编译器的语法结构，那么我们的准备工作基于基本完成。

我们在搞定了AST语法树的构建后，需要有一种机制，能够遍历整棵语法树，然后将其翻译为LLVM的一个模块，然后再输出成.bc字节码。

这种机制我称其为多趟宏翻译系统，因为它要多次扫描整棵语法树，每次扫描需要的部分，然后构建整个模块。我希望能实现类似Java的语法特性，无需考虑定义顺序，只要定义了，那么就能够找到该符号。这样我们就需要合理的扫描顺序。

## 扫描顺序的确定

首先，我们必须先扫描出所有的类型，因为类型的声明很重要，没有类型声明，就无法构建函数。
其次，我们要扫描出所有的函数，为其构建函数的声明。
最后，我们扫描出所有的函数定义，构建每个函数的函数体。

这样我们是三次扫描，无需担心效率问题，因为前两次扫描都是在根节点下一层，扫描的元素非常少，所以处理起来很快。

## 待扫描的AST语法树

这是我们之前生成好的AST语法树，结构还算清晰吧。我们能用的遍历手段也就是上次我们实现的next指针，然后不断的去判断当前节点的数据，然后对应的代码生成出来。

为了能够区分每条语句的含义，我在每个列表最前，都添加了翻译宏的名称，这个设计是仿照lisp做的，宏相当于是编译器中的函数，处理元数据，然后将其翻译成对应的内容。

例如这段代码：
```C
void hello(int k, int g) {
	int y = k + g;
	printf("%d\n", y);
	if (k + g < 5) printf("right\n");
}	


void go(int k) {
	int a = 0;
	while (a < k) {
		printf("go-%d\n", a);
		a = a + 1;
	}
}

void print(int k) {
	for (int i = 0; i < 10; i = i+1) {
		printf("hello-%d\n",i);
	} 
}


void main() {
	printf("hello world\n");
	hello(1,2);
	print(9);
}
```

其AST语法树如下：
```
Node
    Node
        String function
        String void
        String hello
        Node
            Node
                String set
                String int
                String k

            Node
                String set
                String int
                String g

        Node
            Node
                String set
                String int
                String y
                Node
                    String opt2
                    String +
                    ID k
                    ID g


            Node
                String call
                String printf
                String %d

                ID y

            Node
                String if
                Node
                    String opt2
                    String <
                    Node
                        String opt2
                        String +
                        ID k
                        ID g

                    Int 5

                Node
                    String call
                    String printf
                    String right

    Node
        String function
        String void
        String go
        Node
            Node
                String set
                String int
                String k

        Node
            Node
                String set
                String int
                String a
                Int 0

            Node
                String while
                Node
                    String opt2
                    String <
                    ID a
                    ID k

                Node
                    Node
                        String call
                        String printf
                        String go-%d

                        ID a

                    Node
                        String opt2
                        String =
                        ID a
                        Node
                            String opt2
                            String +
                            ID a
                            Int 1

    Node
        String function
        String void
        String print
        Node
            Node
                String set
                String int
                String k

        Node
            Node
                String for
                Node
                    String set
                    String int
                    String i
                    Int 0

                Node
                    String opt2
                    String <
                    ID i
                    Int 10

                Node
                    String opt2
                    String =
                    ID i
                    Node
                        String opt2
                        String +
                        ID i
                        Int 1


                Node
                    Node
                        String call
                        String printf
                        String hello-%d

                        ID i



    Node
        String function
        String void
        String main
        Node
        Node
            Node
                String call
                String printf
                String hello world


            Node
                String call
                String hello
                Int 1
                Int 2

            Node
                String call
                String print
                Int 9

```


## 扫描中的上下文

由于翻译过程中，我们还需要LLVMContext变量，符号表，宏定义表等必要信息，我们还需要自己实现一个上下文类，来存储必要的信息，上下文类需要在第一遍扫描前就初始化好。

例如我们在翻译中，遇到了一个变量，那么该变量是临时的还是全局的呢？是什么类型，都需要我们在符号表中存储表达，另外当前翻译的语句是属于哪条宏，该怎么翻译？我们必须有一个类来保存这些信息。

于是我们先不谈实现，将接口写出来

```C
class CodeGenContext;
typedef Value* (*CodeGenFunction)(CodeGenContext*, Node*);
typedef struct _funcReg
{
	const char*     name;
	CodeGenFunction func;
} FuncReg;


class CodeGenContext
{
public:
	CodeGenContext(Node* node);
	~CodeGenContext();

	// 必要的初始化方法
	void PreInit();
	void PreTypeInit();
	void Init();

	void MakeBegin() { 
		MacroMake(root); 
	}

	// 这个函数是用来一条条翻译Node宏的
	Value* MacroMake(Node* node);
	// 递归翻译该节点下的所有宏
	void MacroMakeAll(Node* node); 
	CodeGenFunction getMacro(string& str);

	// C++注册宏
	// void AddMacros(const FuncReg* macro_funcs); // 为只添加不替换保留
	void AddOrReplaceMacros(const FuncReg* macro_funcs);

	// 代码块栈的相关操作
	BasicBlock* getNowBlock();
	BasicBlock* createBlock();
	BasicBlock* createBlock(Function* f);

	// 获取当前模块中已注册的函数
	Function* getFunction(Node* node);
	Function* getFunction(std::string& name);
	void nowFunction(Function* _nowFunc);

	void setModule(Module* pM) { M = pM; }
	Module* getModule() { return M; }
	void setContext(LLVMContext* pC) { Context = pC; }
	LLVMContext* getContext() { return Context; }

	// 类型的定义和查找
	void DefType(string name, Type* t);
	Type* FindType(string& name);
	Type* FindType(Node*);

	void SaveMacros();
	void RecoverMacros();

	bool isSave() { return _save; }
	void setIsSave(bool save) { _save = save; }

	id* FindST(Node* node) const;

	id* FindST(string& str) const {
		return st->find(str);
	}
	IDTable* st;
private:
	// 语法树根节点
	Node* root;

	// 当前的LLVM Module
	Module* M;
	LLVMContext* Context;
	Function* nowFunc;
	BasicBlock* nowBlock;
	
	// 这是用来查找是否有该宏定义的
	map<string, CodeGenFunction> macro_map;

	// 这个栈是用来临时保存上面的查询表的
	stack<map<string, CodeGenFunction> > macro_save_stack;

	void setNormalType();

	// 用来记录当前是读取还是存入状态
	bool _save;
};
```

## 宏的注册

宏是内部的非常重要的函数，本身是一个C函数指针，宏有唯一的名字，通过map表，去查找该宏对应的函数，然后调用其对当前的语法节点进行解析。

宏函数的定义：
```
typedef Value* (*CodeGenFunction)(CodeGenContext*, Node*);
```

注册我是仿照lua的方式设计的，将函数指针组织成数组，然后初始化进入结构体：
```
extern const FuncReg macro_funcs[] = {
	{"function", function_macro},
	{"struct",   struct_macro},
	{"set",      set_macro},
	{"call",     call_macro},
	{"opt2",     opt2_macro},
	{"for",      for_macro},
	{"while",    while_macro},
	{"if",       if_macro},
	{"return",   return_macro},
	{"new",      new_macro},
	{NULL, NULL}
};
```

这样写是为了方便我们一次就导入一批函数进入我们的系统。函数指针我还是习惯使用C指针，一般避免使用C++的成员指针，那样太复杂，而且不容易和其他模块链接，因为C++是没有标准ABI的，但C语言有。

## 实现扫描的引导

扫描其实很简单了，如果当前节点是个字符串，而且在宏定义中能够找到，那么我们就调用这条宏来处理，否则如果是列表的化，就对每一条分别递归处理。

宏的查找我直接使用了stl模版库中的map和string，非常的方便。

```cpp
Value* CodeGenContext::MacroMake(Node* node) {
	if (node == NULL) return NULL;

	if (node->isStringNode()) {
		StringNode* str_node = (StringNode*)node;
		CodeGenFunction func = getMacro(str_node->getStr());
		if (func != NULL) {
			return func(this, node->getNext());
		} 
		return NULL;
	} 
	if (node->getChild() != NULL && node->getChild()->isStringNode())
		return MacroMake(node->getChild());
	Value* ans;
	for (Node* p = node->getChild(); p != NULL; p = p->getNext()) 
		ans = MacroMake(p);
	return ans;
}

CodeGenFunction CodeGenContext::getMacro(string& str) {
	auto func = macro_map.find(str);
	if (func != macro_map.end()) return func->second;
	else return NULL;
}

```
