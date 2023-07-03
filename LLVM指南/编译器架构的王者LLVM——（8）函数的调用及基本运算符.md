编译器架构的王者LLVM——（8）函数的调用及基本运算符
===================================


# 函数的调用及基本运算符

之前我们提到了函数的定义，那么，定义好的函数如何调用才行呢？今天我们就来了解一下，函数的调用。

## 函数调用的宏形式

我们去读之前对函数调用的语法树翻译形式：

```
	printf("%d\n", y);
```

会被翻译为：

```
			Node
                String call
                String printf
                String %d\n
                ID y
```

这个宏的名字是call，是个不定参数的：
```
	(call 函数名 参数表... )
```

于是我们就需要扫描参数表，获取全部调用参数。


## 调用宏的基本形式

调用宏其实很简单，就是不断循环判断有多少参数即可。

```
static Value* call_macro(CodeGenContext* context, Node* node) {
	// 参数一 函数名
	
	// 其余参数 要传入的参数
	for (Node* p = node->getNext(); p != NULL; p = p->getNext()) {
		// 循环获取参数
	}
}
```

另外我们查阅一下LLVM的文档，找到其中CallInst这个指令，LLVM的指令都派生自Instruction，可以发现构建的方法很简单：
```
	static CallInst * Create (Value *Func, ArrayRef< Value * > Args, const Twine &NameStr, BasicBlock *InsertAtEnd)
```

但是我们发现，Value中要传输的是一个Function对象，如何获取呢？当然还是从符号表中获取，我们下次会讲符号表的实现，这次也和上节一样，将接口先写出来。

```
	// 参数一 函数名
	Value* func = context->getFunction(node);
	if (func == NULL) {
		errs() << "找不到函数的定义：";
		errs() << node->getStr().c_str() << "\n";
		exit(1);
	}
```

函数调用在生成时，如果这个函数还没有被扫描到，那么在生成时会报函数定义找不到的问题，这就是我们为什么要用多遍扫描。只有充分的多次扫描语法树，才能获取每个函数后面的函数定义。虽然像C语言那样强制声明也可以，但我个人不大喜欢这种风格。

至于参数的获取，就十分简单的，但有一点要注意，参数是递归生成的，例如：

```
	printf("%d", add(3, 5));
```

这时，我们在获取参数时，就会发现，其中一个参数是表达式，那么我们就要先对其进行处理：

```
	// 其余参数 要传入的参数
	std::vector<Value*> args;
	for (Node* p = node->getNext(); p != NULL; p = p->getNext()) {
		Value* v = p->codeGen(context); // 递归地生成参数
		if (v != NULL)
			args.push_back(v);
	}
```

Node类下面有实现codeGen方法，其作用就是重新调用了完整的对当前节点的代码生成，方便递归调用：
```
Value* Node::codeGen(CodeGenContext* context) {
	return context->MacroMake(this); // MacroMake是核心的代码生成接口
}
```

于是我们递归地生成了这些代码，就可以产生一条Call语句，那么别忘记将其返回给上一层：

```
static Value* call_macro(CodeGenContext* context, Node* node) {
	// 参数一 函数名
	Value* func = context->getFunction(node);
	if (func == NULL) {
		errs() << "找不到函数的定义：";
		errs() << node->getStr().c_str() << "\n";
		exit(1);
	}

	// 其余参数 要传入的参数
	std::vector<Value*> args;
	for (Node* p = node->getNext(); p != NULL; p = p->getNext()) {
		Value* v = p->codeGen(context);
		if (v != NULL)
			args.push_back(v);
	}

	CallInst *call = CallInst::Create(func, args, "", context->getNowBlock());
	return call;
}

```


## 简单运算符计算

对于计算机，加减乘除这些基本运算，就是几个指令而已，但对于编译器，却也要分好几种情况讨论，因为，全部的运算符有这么多：
```
// Standard binary operators...
 FIRST_BINARY_INST( 8)
HANDLE_BINARY_INST( 8, Add  , BinaryOperator)
HANDLE_BINARY_INST( 9, FAdd , BinaryOperator)
HANDLE_BINARY_INST(10, Sub  , BinaryOperator)
HANDLE_BINARY_INST(11, FSub , BinaryOperator)
HANDLE_BINARY_INST(12, Mul  , BinaryOperator)
HANDLE_BINARY_INST(13, FMul , BinaryOperator)
HANDLE_BINARY_INST(14, UDiv , BinaryOperator)
HANDLE_BINARY_INST(15, SDiv , BinaryOperator)
HANDLE_BINARY_INST(16, FDiv , BinaryOperator)
HANDLE_BINARY_INST(17, URem , BinaryOperator)
HANDLE_BINARY_INST(18, SRem , BinaryOperator)
HANDLE_BINARY_INST(19, FRem , BinaryOperator)

// Logical operators (integer operands)
HANDLE_BINARY_INST(20, Shl  , BinaryOperator) // Shift left  (logical)
HANDLE_BINARY_INST(21, LShr , BinaryOperator) // Shift right (logical)
HANDLE_BINARY_INST(22, AShr , BinaryOperator) // Shift right (arithmetic)
HANDLE_BINARY_INST(23, And  , BinaryOperator)
HANDLE_BINARY_INST(24, Or   , BinaryOperator)
HANDLE_BINARY_INST(25, Xor  , BinaryOperator)
```

这些定义很难找，在文档中并没有真正写出来，而是在头文件的`llvm/IR/Instruction.def`里面，这是宏定义的专属部分。
这些还仅仅是数值运算，还不算比较运算的部分呢。

当然，这和计算机体系结构有关，浮点数的运算和整数肯定是不一样的，而我们知道，右移位也分算数右移和逻辑右移。所以必然，会有大量不同的运算符。

创建指令则很简单：
```
static BinaryOperator * Create (BinaryOps Op, Value *S1, Value *S2, const Twine &Name, BasicBlock *InsertAtEnd)
```

两个运算数，可以是常量，也可以是变量load出值后，还可以是表达式返回值，只要两个Value调用getType，符合运算规则，就可以。
注意，浮点数不能直接和整数运算，必须先将整形转为浮点才可以。

于是以下是简单的运算符操作，我只写了整数的运算操作：

```
static Value* opt2_macro(CodeGenContext* context, Node* node) {
	std::string opt = node->getStr();

	Node* op1 = (node = node->getNext());
	if (node == NULL) return NULL;
	Node* op2 = (node = node->getNext());
	if (node == NULL) return NULL;

	Instruction::BinaryOps instr;
	if (opt == "+") { instr = Instruction::Add;  goto binOper; }
	if (opt == "-") { instr = Instruction::Sub;  goto binOper; }
	if (opt == "*") { instr = Instruction::Mul;  goto binOper; }
	if (opt == "/") { instr = Instruction::SDiv; goto binOper; }

	// 未知运算符
	return NULL;

binOper:
	return BinaryOperator::Create(instr, op1->codeGen(context), 
		op2->codeGen(context), "", context->getNowBlock());
```


## 附：文档参考及源代码

[CallInst类参考](http://llvm.org/doxygen/classllvm_1_1CallInst.html)
[BinaryOperator类参考](http://llvm.org/doxygen/classllvm_1_1BinaryOperator.html)
[github源码-函数调用及基本运算符](https://github.com/sunxfancy/RedApple/blob/master/src/Macro/Functions.cpp)
