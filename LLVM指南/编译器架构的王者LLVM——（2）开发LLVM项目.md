编译器架构的王者LLVM——（2）开发LLVM项目
===================================


## 开发LLVM项目

介绍了LLVM这么多，那么我们能用LLVM做一款自己的编程语言么？答案是，有点难度，但不是不可行。只要你熟悉C++编程，而且有足够的热情，那么就没有什么能阻止你了。

下面我就来介绍一下，LLVM项目的基本方法。
需要的东西： LLVM平台库，文档，CMAKE，C++编译器

### 环境搭建

首先我的系统是Ubuntu14.04，我就介绍Ubuntu下的配置方法了，用Windows的朋友就不好意思了。
安装llvm-3.6及其开发包：

```
sudo apt-get install llvm-3.6*
```

一般是推荐将文档和示例都下载下来的，因为比较这些对应版本的参考很重要，很多网上的代码，都是特定版本有效，后来就有API变更的情况。
所以大家一定注意版本问题，我开发的时候，源里面的版本最高就3.6，我也不追求什么最新版本，新特性什么的，所以声明一下，本系列教程的LLVM版本均为3.6版，文档参考也为3.6版。

```
sudo apt-get install clang cmake
```

clang编译器，我个人感觉比gcc好用许多倍，而且这个编译器就是用llvm作为后端，能够帮助我们编译一些C代码到LLVM中间码，方便我们有个正确的中间码参考。


### CMAKE管理项目

CMake作为C++项目管理的利器，也是非常好用的一个工具，这样我们就不用自己很烦的写Makefile了，

下面是一个CMake示例，同时还带有FLex和Bison的配置：

```cmake
cmake_minimum_required(VERSION 2.8)
project(RedApple)

set(LLVM_TARGETS_TO_BUILD X86)
set(LLVM_BUILD_RUNTIME OFF)
set(LLVM_BUILD_TOOLS OFF)

find_package(LLVM REQUIRED CONFIG)
message(STATUS "Found LLVM ${LLVM_PACKAGE_VERSION}")
message(STATUS "Using LLVMConfig.cmake in: ${LLVM_DIR}")

find_package(BISON)
find_package(FLEX)

SET (CMAKE_CXX_COMPILER_ENV_VAR "clang++")
SET (CMAKE_CXX_FLAGS "-std=c++11")
SET (CMAKE_CXX_FLAGS_DEBUG   "-g")
SET (CMAKE_CXX_FLAGS_MINSIZEREL  "-Os -DNDEBUG")
SET (CMAKE_CXX_FLAGS_RELEASE  "-O4 -DNDEBUG")
SET (CMAKE_CXX_FLAGS_RELWITHDEBINFO "-O2 -g")

SET(EXECUTABLE_OUTPUT_PATH ${PROJECT_SOURCE_DIR}/bin)

include_directories(${LLVM_INCLUDE_DIRS})
add_definitions(${LLVM_DEFINITIONS})

FLEX_TARGET(MyScanner ${CMAKE_CURRENT_SOURCE_DIR}/src/redapple_lex.l
                      ${CMAKE_CURRENT_BINARY_DIR}/redapple_lex.cpp COMPILE_FLAGS -w)
BISON_TARGET(MyParser ${CMAKE_CURRENT_SOURCE_DIR}/src/redapple_parser.y
                      ${CMAKE_CURRENT_BINARY_DIR}/redapple_parser.cpp)
ADD_FLEX_BISON_DEPENDENCY(MyScanner MyParser)

include_directories(Debug Release build include src src/Model src/Utils)

file(GLOB_RECURSE source_files  ${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp
                                ${CMAKE_CURRENT_SOURCE_DIR}/src/Model/*.cpp
                                ${CMAKE_CURRENT_SOURCE_DIR}/src/Macro/*.cpp
                                ${CMAKE_CURRENT_SOURCE_DIR}/src/Utils/*.cpp)
add_executable(redapple ${source_files} 
                        ${BISON_MyParser_OUTPUTS} 
                        ${FLEX_MyScanner_OUTPUTS})

install(TARGETS redapple RUNTIME DESTINATION bin)

# Find the libraries that correspond to the LLVM components
# that we wish to use
llvm_map_components_to_libnames(llvm_libs 
    support core irreader executionengine interpreter 
    mc mcjit bitwriter x86codegen target)

# Link against LLVM libraries
target_link_libraries(redapple ${llvm_libs})
```

Ubuntu的默认安装，有时LLVM会出bug，cmake找不到许多配置文件，我仔细查看了它的CMake配置，发现有一行脚本路径写错了：
/usr/share/llvm-3.6/cmake/ 是llvm的cmake配置路径

其中的LLVMConfig.cmake第48行，它原来的路径是这样的：

```
set(LLVM_CMAKE_DIR "/usr/share/llvm-3.6/share/llvm/cmake")
```

应该改成：

```
set(LLVM_CMAKE_DIR "/usr/share/llvm-3.6/cmake")
```


Ubuntu下的llvm文档和示例都在如下目录：
/usr/share/doc/llvm-3.6-doc
/usr/share/doc/llvm-3.6-examples

我们将example下的HowToUseJIT复制到工作目录中，测试编译一下，懒得找的可以粘我后面附录给的内容。
然后再用简单修改后的CMake测试编译一下。

项目结构是这样的：
```
HowToUseJIT -- src
                + --- HowToUseJIT.cpp
        +  --- CMakeLists.txt
        +  --- build 

```

在项目根目录执行如下指令：
```
cd build
cmake ..
make
```
如果编译通过了，那么恭喜你，你已经会构建LLVM项目了


### 附： CMakeLists.txt 和 HowToUseJIT.cpp

CMakeLists.txt
```cmake
cmake_minimum_required(VERSION 2.8)
project(llvm_test)

set(LLVM_TARGETS_TO_BUILD X86)
set(LLVM_BUILD_RUNTIME OFF)
set(LLVM_BUILD_TOOLS OFF)

find_package(LLVM REQUIRED CONFIG)

message(STATUS "Found LLVM ${LLVM_PACKAGE_VERSION}")
message(STATUS "Using LLVMConfig.cmake in: ${LLVM_DIR}")


SET (CMAKE_CXX_COMPILER_ENV_VAR "clang++")

SET (CMAKE_CXX_FLAGS "-std=c++11")
SET (CMAKE_CXX_FLAGS_DEBUG   "-g")
SET (CMAKE_CXX_FLAGS_MINSIZEREL  "-Os -DNDEBUG")
SET (CMAKE_CXX_FLAGS_RELEASE  "-O4 -DNDEBUG")
SET (CMAKE_CXX_FLAGS_RELWITHDEBINFO "-O2 -g")

SET(EXECUTABLE_OUTPUT_PATH ${PROJECT_SOURCE_DIR}/bin)

include_directories(${LLVM_INCLUDE_DIRS})
add_definitions(${LLVM_DEFINITIONS})

file(GLOB_RECURSE source_files "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp")
add_executable(llvm_test ${source_files})
install(TARGETS llvm_test RUNTIME DESTINATION bin)

# Find the libraries that correspond to the LLVM components
# that we wish to use
llvm_map_components_to_libnames(llvm_libs 
    Core
    ExecutionEngine
    Interpreter
    MC
    Support
    nativecodegen)

# Link against LLVM libraries
target_link_libraries(llvm_test ${llvm_libs})
```

HowToUseJIT.cpp
```cpp
//===-- examples/HowToUseJIT/HowToUseJIT.cpp - An example use of the JIT --===//
//
//                     The LLVM Compiler Infrastructure
//
// This file is distributed under the University of Illinois Open Source
// License. See LICENSE.TXT for details.
//
//===----------------------------------------------------------------------===//
//
//  This small program provides an example of how to quickly build a small
//  module with two functions and execute it with the JIT.
//
// Goal:
//  The goal of this snippet is to create in the memory
//  the LLVM module consisting of two functions as follow: 
//
// int add1(int x) {
//   return x+1;
// }
//
// int foo() {
//   return add1(10);
// }
//
// then compile the module via JIT, then execute the `foo'
// function and return result to a driver, i.e. to a "host program".
//
// Some remarks and questions:
//
// - could we invoke some code using noname functions too?
//   e.g. evaluate "foo()+foo()" without fears to introduce
//   conflict of temporary function name with some real
//   existing function name?
//
//===----------------------------------------------------------------------===//

#include "llvm/ExecutionEngine/GenericValue.h"
#include "llvm/ExecutionEngine/Interpreter.h"
#include "llvm/IR/Constants.h"
#include "llvm/IR/DerivedTypes.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Instructions.h"
#include "llvm/IR/LLVMContext.h"
#include "llvm/IR/Module.h"
#include "llvm/Support/ManagedStatic.h"
#include "llvm/Support/TargetSelect.h"
#include "llvm/Support/raw_ostream.h"

using namespace llvm;

int main() {
  
  InitializeNativeTarget();

  LLVMContext Context;
  
  // Create some module to put our function into it.
  std::unique_ptr<Module> Owner = make_unique<Module>("test", Context);
  Module *M = Owner.get();

  // Create the add1 function entry and insert this entry into module M.  The
  // function will have a return type of "int" and take an argument of "int".
  // The '0' terminates the list of argument types.
  Function *Add1F =
    cast<Function>(M->getOrInsertFunction("add1", Type::getInt32Ty(Context),
                                          Type::getInt32Ty(Context),
                                          (Type *)0));

  // Add a basic block to the function. As before, it automatically inserts
  // because of the last argument.
  BasicBlock *BB = BasicBlock::Create(Context, "EntryBlock", Add1F);

  // Create a basic block builder with default parameters.  The builder will
  // automatically append instructions to the basic block `BB'.
  IRBuilder<> builder(BB);

  // Get pointers to the constant `1'.
  Value *One = builder.getInt32(1);

  // Get pointers to the integer argument of the add1 function...
  assert(Add1F->arg_begin() != Add1F->arg_end()); // Make sure there's an arg
  Argument *ArgX = Add1F->arg_begin();  // Get the arg
  ArgX->setName("AnArg");            // Give it a nice symbolic name for fun.

  // Create the add instruction, inserting it into the end of BB.
  Value *Add = builder.CreateAdd(One, ArgX);

  // Create the return instruction and add it to the basic block
  builder.CreateRet(Add);

  // Now, function add1 is ready.


  // Now we're going to create function `foo', which returns an int and takes no
  // arguments.
  Function *FooF =
    cast<Function>(M->getOrInsertFunction("foo", Type::getInt32Ty(Context),
                                          (Type *)0));

  // Add a basic block to the FooF function.
  BB = BasicBlock::Create(Context, "EntryBlock", FooF);

  // Tell the basic block builder to attach itself to the new basic block
  builder.SetInsertPoint(BB);

  // Get pointer to the constant `10'.
  Value *Ten = builder.getInt32(10);

  // Pass Ten to the call to Add1F
  CallInst *Add1CallRes = builder.CreateCall(Add1F, Ten);
  Add1CallRes->setTailCall(true);

  // Create the return instruction and add it to the basic block.
  builder.CreateRet(Add1CallRes);

  // Now we create the JIT.
  ExecutionEngine* EE = EngineBuilder(std::move(Owner)).create();

  outs() << "We just constructed this LLVM module:\n\n" << *M;
  outs() << "\n\nRunning foo: ";
  outs().flush();

  // Call the `foo' function with no arguments:
  std::vector<GenericValue> noargs;
  GenericValue gv = EE->runFunction(FooF, noargs);

  // Import result of execution:
  outs() << "Result: " << gv.IntVal << "\n";
  delete EE;
  llvm_shutdown();
  return 0;
}

```