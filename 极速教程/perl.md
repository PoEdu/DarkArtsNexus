Perl 极速教程
==================

Perl是一门古老的通用编程脚本语言，内部集成了好用的正则表达式功能，python，php等语言在后来的发展中极大的借鉴了perl的很多设计思想。如果你学习过PHP，那么你会发现很多语法都是极其相似的。

## 安装与环境配置

一般如果你在使用linux时，系统往往已经自带了perl，你可以用`perl -v`来查看perl是否安装并显示其版本信息：

```sh
$ perl -v

This is perl 5, version 18, subversion 2 (v5.18.2) built for darwin-thread-multi-2level
(with 2 registered patches, see perl -V for more detail)

Copyright 1987-2013, Larry Wall
……
```

如果没有，那么你需要下载安装perl语言，可以访问`https://www.perl.org/get.html`来获取最新 Perl解释器。


你可以在命令行下输入`perl -e <perl code>` 或 `perl <perl-script.pl>`来执行一段perl代码。一般perl脚本的后缀是`*.pl`

或者在Linux下，你可以把一个脚本的解释器写在脚本开头
```pl
#!/usr/env perl

print "Hello world~!\n"
```


## 基础语法

下面是一些基础语法的示例，调用函数：

```pl
print("Hello, world\n");
print "Hello, world\n";
```

注释有两种，单行或多行:

```pl
# 这是一个单行注释
print "Hello, world\n";
 
=pod 注释
这是一个多行注释
这是一个多行注释
这是一个多行注释
这是一个多行注释
=cut
```

变量，主要有三种  标量（scalar）、数组（array）和哈希（hashes）
每种类型都有属于自己的符号：分别是`$`、`@`和`%`
变量定义如果使用`my`关键字，生命期直到其所在的代码块结束或者文件的末尾。
如果使用`our`关键字，则生命期是整个模块。

例如，下面的：
```pl
my $email='myemail\@xxx.com'; 
my @to=('john', 'david');
our %contacts={'john' => 'john\@xxx.com', 'david'=>'david\@xxx.com' };
```

小心！如果你把email存放到一个数组里时，由于默认的解析规则，@有可能会被perl当作是一个@xxx的全局变量，所以必须对`@`转义,写成`\@`.

于是你可以用`[N]`来对数组进行取值，需要注意的是，这里类型符号要以取到的值的类型为准：

```pl
print $to[0]  # "john" 这里取到的是一个scala, 所以用$符号，即使@to是一个数组
```
你也可以使用负数作为下标，这样就可以从末尾开始往前取某个元素：
```pl
print $to[-1]; # "david"
```

类似的，对于hash表，我们可以用`{N}` 来获取其元素
```pl
print $contacts{"jonh"} # 'john@xxx.com'
```







控制流语句主要有 if..elsif..else 语句：
```pl
$a = 100;
# 使用 == 判断两个数是否相等
if( $a  ==  20 ){
    # 条件为 true 时执行
    printf "a 的值为 20\n";
}elsif( $a ==  30 ){
    # 条件为 true 时执行
    printf "a 的值为 30\n";
}else{
    # 以上所有的条件为 false 时执行
    printf "a 的值为 $a\n";
}
```

循环语句：
```pl
# 执行 while 循环
while( $a < 20 ){
   printf "a 的值为 : $a\n";
   $a = $a + 1;
}

# 执行 until 循环
until( $a > 10 ){
   printf "a 的值为 : $a\n";
   $a = $a + 1;
}

# 执行 for 循环
for( $a = 0; $a < 10; $a = $a + 1 ){
    print "a 的值为: $a\n";
}


@list = (2, 12, 36, 42, 51);
 
# 执行foreach 循环
foreach $a (@list){
    print "a 的值为: $a\n";
}

# 无限循环
for( ; ; )
{
   printf "循环会无限执行。\n";
}
```

当你在循环中想跳出时，perl也提供了如下几种控制语句：

```pl
next;
```


字符串操作

拼接，使用`.`运算符：
```pl
my $string = "world";
print "Hello ".$string; # "Hello world"
```




## 高级用法





