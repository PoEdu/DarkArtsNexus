title: 编译器架构的王者LLVM——（10）变量的存储与读取
---


# 变量的存储与读取

变量是一款编程语言中的核心，说编译语言是一种符号处理工具，其实是有些道理的。栈式符号表可以方便的记录编译过程中的变量和语法符号，我们上节已经了解了其中的实现方法。那么，还有没有其他的办法能够简单的实现变量的存取呢？

## LLVM的内置符号表

其实LLVM还提供了一个内部符号表，这个和我们的符号表不一样，它的符号是以函数为界的，函数内的是局部符号，外面的是全局符号。这个符号表的作用，主要是供LLVM找到各个底层的语法元素而设计的，所以它的功能较为有限。

例如下面这段字节码：
```
define void @print(i64 %k1) {
entry:
	...
}
```

我们可以通过符号表，找到k1这个元素。

这个符号表的获取也很简单，只要你有basicblock，你就能够找到这个符号表的指针：

```
	BasicBlock* bb = context->getNowBlock();
    ValueSymbolTable* st = bb->getValueSymbolTable();
    Value* v = st->lookup(value);
```

## 栈上变量空间的分配，AllocaInst语句

AllocaInst是LLVM的一条标准语句，负责栈上空间的分配，你无需考虑栈的增长的操作，它会自动帮你完成，并返回给你对应空间的指针。

千万不要认为这个语句能够动态分配堆内存，堆内存实际上是通过调用Malloc语句来分配的。

```
	%k = alloca i64
```

以上语句，会让k的类型变为你分配类型的指针。

这个语句的C++接口非常的好用，像这样：
```
AllocaInst *alloc = new AllocaInst(t, var_name, context->getNowBlock());
```

t对应分配的类型，var_name对应语句返回的那个变量名（上面的‘k’），最后一个参数当然是插入的basicblock。

这时，返回的语句，就代表k这个指针了。


## 变量的存储

LLVM中，变量的存储，都需要知道要存储地址的指针，注意，一定是指针，而不是值。

原型：
```
 	StoreInst (Value *Val, Value *Ptr, bool isVolatile, BasicBlock *InsertAtEnd)
```

使用示例：
```
	new StoreInst(value2, value1, false, context->getNowBlock());
```

这个value1，就是目标的存储指针，而value2则是要放入的值。false表示不是易变的，这个参数相当与C语言中的volatile关键字，主要是防止这个变量在重复读取时的编译器优化。因为一般的编译器优化，都会将一个变量在没有改变情况下的多次读取，认为取到同一个值，虽然这在多线程和硬中断的环境下并不成立。



## 变量的读取

变量的读取，就用Load语句：
```
LoadInst (Value *Ptr, const Twine &NameStr, bool isVolatile, unsigned Align, BasicBlock *InsertAtEnd)
```

使用示例：
```
new LoadInst(v, "", false, bb);
```

我们这里暂时没有考虑内存对齐的问题，当然，一般在Clang中，都是4字节对齐的。我们注意到，其实Load语句也是从指针中取值的，返回的则是一个值类型。


## 打造一个赋值语句

赋值语句其实是一个挺尴尬的语句，左边要赋值的，应该是一个指针地址，而右边的部分，则应该是一个获取到的值。而之前我们的运算，函数调用等等，绝大部分都是依赖值类型的。

我们先要为变量实现一个值的获取，这部分因为很通用，我们放到IDNode节点的代码生成中：
```
Value* IDNode::codeGen(CodeGenContext* context) {
    BasicBlock* bb = context->getNowBlock();
    ValueSymbolTable* st = bb->getValueSymbolTable();
    Value* v = st->lookup(value);
    if (v == NULL || v->hasName() == false) {
        errs() << "undeclared variable " << value << "\n";
        return NULL;
    }
    Value* load = new LoadInst(v, "", false, bb);
    return load;
}
```

value是我们类的成员变量，记录的是变量名。

然而赋值语句有时还会要求获取到的是指针，不是值，现在我们要为赋值语句实现一个符号指针的获取：
```
Value* IDNode::codeGen(CodeGenContext* context) {
    BasicBlock* bb = context->getNowBlock();
    ValueSymbolTable* st = bb->getValueSymbolTable();
    Value* v = st->lookup(value);
    if (v == NULL || v->hasName() == false) {
        errs() << "undeclared variable " << value << "\n";
        return NULL;
    }
    if (context->isSave()) return v; // 我们在上下文类中记录了一个变量，看当前状态是存还是取
    Value* load = new LoadInst(v, "", false, bb);
    return load;
}

```

那么我们在调用时，只需要这样做：

```
static Value* opt2_macro(CodeGenContext* context, Node* node) {
	std::string opt = node->getStr();

	Node* op1 = (node = node->getNext());
	if (node == NULL) return NULL;
	Node* op2 = (node = node->getNext());
	if (node == NULL) return NULL;

	if (opt == "=") {
		context->setIsSave(true); // 这两句设置的目前是为下面的节点解析时,返回指针而不是load后的值
		Value* ans1 = op1->codeGen(context);
		context->setIsSave(false);
		Value* ans2 = op2->codeGen(context);
		return new StoreInst(ans2, ans1, false, context->getNowBlock());
	}

	...
}
```
其实我们这里也可以单独实现一个函数来处理这个功能，但由于两个函数功能太像，所以也不怎么想添加一个类似的函数了。
这个部分暂时先这样处理一下，待整体结构完善后，应该有更好的实现方法。
