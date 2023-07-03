LLVM函数的调用时声明插入
=======================

如果调用一个未声明的函数，我们知道肯定是不正确的，但符号表中，可能预先存有该函数的	FunctionType，这时即使未扫描到该函数，我们也可以用Module中的getOrInsertFunction方法，获取或插入一个函数。


Constant * Module::getOrInsertFunction (	
	StringRef 		Name,
	FunctionType * 	T,
	AttributeSet 	AttributeList 
)

其行为是这样的：
1. 如果不存在，创建一个原型
2. 存在，但是一个static的局部函数，那么创建一个新的全局函数替换之
3. 存在，而且类型正确，返回当前函数
4. 存在，类型不匹配，那么会在外层包一个constantexpr cast的语句，转换到正确的类型上

是不是很方便呢？
这样应该可以减少一次函数的声明遍历。

