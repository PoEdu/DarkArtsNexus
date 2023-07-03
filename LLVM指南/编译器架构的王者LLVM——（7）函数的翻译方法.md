编译器架构的王者LLVM——（7）函数的翻译方法
===================================

# 函数的翻译方法

前面介绍了许多编译器架构上面的特点，如何组织语法树、如果多遍扫描语法树。今天开始，我们就要设计本编译器中最核心的部分了，如何设计一个编译时宏，再利用LLVM按顺序生成模块。

## 设计宏

我们的编译器可以说是宏驱动的，因为我们扫描每个语法节点后，都会考察当前是不是一个合法的宏，例如我们来分析一下上一章的示例代码：

```
void hello(int k, int g) {
    ......
}   
```

我暂时隐藏了函数体部分，让大家先关注一下函数头

```
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
        	......
```

我们的语法树的每一层相当于是链表组织的，通过next指针都可以找到下一个元素。
而语法树的开头部分，是一个“function”的宏名称，这个部分就是提示我们用哪个宏函数来翻译用的。

接下来的节点就是： 返回类型，函数名，参数表，函数体

例如参数表，里面的内容很多，但我们扫描时，它们是一个整体，进行识别。

所以我们的宏的形式实际上就是这样：

```
	(function 返回类型 函数名 (形参表) (函数体))
```

括号括起来的部分表示是一个列表，而不是一个元素。


## 宏函数的编写

我们之前已经定义了宏的函数形式，我们需要传入的有我们自己的上下文类和当前要处理的Node节点，返回的是LLVM的Value类型（各个语句的抽象基类）

```
typedef Value* (*CodeGenFunction)(CodeGenContext*, Node*);
```

于是我们将这个函数实现出来：

```
static Value* function_macro(CodeGenContext* context, Node* node) {
	// 第一个参数, 返回类型


	// 第二个参数, 函数名
	node = node->getNext();


	// 第三个参数, 参数表
	Node* args_node = node = node->getNext();


	// 第四个参数, 代码块
	node = node->getNext();

	return F;
}

```


获取一个字符串代表的类型，往往不是一件容易的事，尤其在存在结构体和类的情况下，这时，我们往往需要查一下符号表，检查这个字符串是否为类型，以及是什么样的类型，是基本类型、结构体，还是函数指针或者指向其他结构的指针等等。
获取类型，往往是LLVM中非常重要的一步。

我们这里先写一下查符号表的接口，不做实现，接下来的章节中，我们会介绍经典的栈式符号表的实现。

第二个参数是函数名，我们将其保存在临时变量中待用：

```
static Value* function_type_macro(CodeGenContext* context, Node* node) {
	// 第一个参数, 返回类型
	Type* ret_type = context->FindType(node);

	// 第二个参数, 函数名
	node = node->getNext();
	std::string function_name = node->getStr();

	// 第三个参数, 参数表
	Node* args_node = node = node->getNext();

	// 第四个参数, 代码块
	node = node->getNext();

	return F;
}
```


接下来的参数表也许是很不好实现的一部分，因为其嵌套比较复杂，不过思路还好，就是不断的去扫描节点，这样我们就可以写出如下的代码：

```
	// 第三个参数, 参数表
	Node* args_node = node = node->getNext();
	std::vector<Type*> type_vec;   // 类型列表
	std::vector<std::string> arg_name; // 参数名列表
	if (args_node->getChild() != NULL) {
		for (Node* pC = args_node->getChild(); 
			 pC != NULL; pC = pC->getNext() ) 
		{
			Node* pSec = pC->getChild()->getNext();
			Type* t = context->FindType(pSec);
			type_vec.push_back(t);
			arg_name.push_back(pSec->getNext()->getStr());	
		}
	}
```

其实有了前三个参数，我们就可以构建LLVM中的函数声明了，这样是不用写函数体代码的。
LLVM里很多对象都有这个特点，函数可以只声明函数头，解析完函数体后再将其填回去。结构体也一样，可以先声明符号，回头再向里填入类型信息。这些特性都是方便生成声明的实现，并且在多遍扫描的实现中也会显得很灵活。

我们下面来声明这个函数：

```
	// 先合成一个函数
	FunctionType *FT = FunctionType::get(ret_type, type_vec, 
		/*not vararg*/false);

	Module* M = context->getModule();
	Function *F = Function::Create(FT, Function::ExternalLinkage, 
		function_name, M);
```

这里，我们使用了函数类型，这也是派生自Type的其中一个类，函数类型也可以getPointerTo来获取函数指针类型。
另外，如果构建函数时，添加了Function::ExternalLinkage参数，就相当于C语言的extern关键字，确定这个函数要导出符号。这样，你写的函数就能够被外部链接，或者作为外部函数的声明使用。


## 函数的特殊问题

接下来我们要创建函数的代码块，但这部分代码实际上和上面的不是在同一个函数中实现的，应该说，他们不是在一趟扫描中。
我们知道，如果要让一个函数内的代码块能够调用在任意位置声明的函数，那么我们就必须对所有函数都先处理刚才讲过的前三个参数，这样函数的声明就有了，在之后的正式扫描中，才有了如下的代码块生成部分：

```
	// 第四个参数, 代码块
	node = node->getNext();
	BasicBlock* bb = context->createBlock(F); // 创建新的Block

	// 特殊处理参数表, 这个地方特别坑，你必须给每个函数的参数
	// 手动AllocaInst开空间，再用StoreInst存一遍才行，否则一Load就报错
	// context->MacroMake(args_node->getChild());
	if (args_node->getChild() != NULL) {
		context->MacroMake(args_node);
		int i = 0;
		for (auto arg = F->arg_begin(); i != arg_name.size(); ++arg, ++i) {
			arg->setName(arg_name[i]);
			Value* argumentValue = arg;
			ValueSymbolTable* st = bb->getValueSymbolTable();
			Value* v = st->lookup(arg_name[i]);
			new StoreInst(argumentValue, v, false, bb);
		}
	}
	context->MacroMake(node);

	// 处理块结尾
	bb = context->getNowBlock();
	if (bb->getTerminator() == NULL)
		ReturnInst::Create(*(context->getContext()), bb);
	return F;
```

这个地方问题非常多，我先保留一个悬念，在接下来代码块和变量存储与加载的讲解中，我会再次提到这个部分的特殊处理。
