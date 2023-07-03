编译器架构的王者LLVM——（4）简单的词法和语法分析
===================================

## 简单的词法和语法分析

Lex和Yacc真是太好用了，非常方便我们构建一门语言的分析程序。

如果你对Lex和Yacc不了解的话，建议先看下我之前写的两篇文章，分别介绍了Lex和Yacc的用法。

Lex识别C风格字符串和注释
http://blog.csdn.net/xfxyy_sxfancy/article/details/45024573

创造新语言（2）——用Lex&Yacc构建简单的分析程序
http://blog.csdn.net/xfxyy_sxfancy/article/details/45046465


### FLex创建一门语言的词法分析程序

我们创建的是一门编程语言，那么词法分析程序就不能像做实验一样那么草率，必须考虑周全，一般一门语言的词法分析程序大概需要囊括如下的几个方面：

识别关键字、识别标识符、识别基本常量（数字、浮点数、字符串、字符）、识别注释、识别运算符

这些都是非常重要的，而且是一门语言语法中必不可少的部分。

于是RedApple的词法分析部分，我就设计成了这样：

```lex
%{
#include <string>
#include "Model/nodes.h"
#include <list>
using namespace std;

#include "redapple_parser.hpp"
#include "StringEscape.h"

#define SAVE_TOKEN     yylval.str = maketoken(yytext, yyleng)
#define SAVE_STRING    yylval.str = makestring(yytext, yyleng, 2)
#define SAVE_STRING_NC yylval.str = makestring(yytext, yyleng, 3)
extern "C" int yywrap() { return 1; }
char* maketoken(const char* data, int len);
char* makestring(const char* data, int len, int s);

%}

%option yylineno

%%

"/*"([^\*]|(\*)*[^\*/])*(\*)*"*/" ; /* 就是这种注释 */ 

#[^\n]*\n               ; /* 井号注释 */ 
"//"[^\n]*\n            ; /* 双线注释 */ 

[ \t\v\n\f]             ; /* 过滤空白字符 */


"=="                    return CEQ;
"<="                    return CLE;
">="                    return CGE;
"!="                    return CNE;

"<"                     return '<';
"="                     return '=';
">"                     return '>';
"("                     return '(';
")"                     return ')';
"["                     return '[';
"]"                     return ']';
"{"                     return '{';
"}"                     return '}';
"."                     return '.';
","                     return ',';
":"                     return ':';
";"                     return ';';
"+"                     return '+';
"-"                     return '-';
"*"                     return '*';
"/"                     return '/';
"%"                     return '%';
"^"                     return '^';
"&"                     return '&';
"|"                     return '|';
"~"                     return '~';

    /* 宏运算符 */
"@"                     return '@';
",@"                    return MBK;

    /* 下面声明要用到的关键字 */

    /* 控制流 */
"if"                    return IF;
"else"                  return ELSE;
"while"                 return WHILE;
"do"                    return DO;
"goto"                  return GOTO;
"for"                   return FOR;
"foreach"               return FOREACH;

    /* 退出控制 */
"break"|"continue"|"exit"   SAVE_TOKEN; return KWS_EXIT;

"return"                return RETURN;

    /* 特殊运算符 */
"new"                   return NEW;
"this"                  return THIS;
    
    /* 特殊定义 */
"delegate"              return DELEGATE;
"def"                   return DEF;
"define"                return DEFINE;
"import"                return IMPORT;
"using"                 return USING;
"namespace"             return NAMESPACE;

"try"|"catch"|"finally"|"throw"  SAVE_TOKEN; return KWS_ERROR; /* 异常控制 */

"null"|"true"|"false"               SAVE_TOKEN; return KWS_TSZ; /* 特殊值 */

"struct"|"enum"|"union"|"module"|"interface"|"class"     SAVE_TOKEN; return KWS_STRUCT; /* 结构声明 */

"public"|"private"|"protected"  SAVE_TOKEN; return KWS_FWKZ; /* 访问控制 */

"const"|"static"|"extern"|"virtual"|"abstract"|"in"|"out"        SAVE_TOKEN; return KWS_FUNC_XS; /* 函数修饰符 */

"void"|"double"|"int"|"float"|"char"|"bool"|"var"|"auto"  SAVE_TOKEN; return KWS_TYPE; /* 基本类型 */

[a-zA-Z_][a-zA-Z0-9_]*  SAVE_TOKEN; return ID; /* 标识符 */

[0-9]*\.[0-9]*          SAVE_TOKEN; return DOUBLE;
[0-9]+                  SAVE_TOKEN; return INTEGER;

\"(\\.|[^\\"])*\"       SAVE_STRING; return STRING; /* 字符串 */
@\"(\\.|[^\\"])*\"      SAVE_STRING_NC; return STRING; /* 无转义字符串 */
\'(\\.|.)\'             SAVE_STRING; return CHAR;   /* 字符 */

.                       printf("Unknown Token!\n"); yyterminate();

%%


char* maketoken(const char* data, int len) {
    char* str = new char[len+1];
    strncpy(str, data, len);
    str[len] = 0;
    return str;
}

char* makestring(const char* data, int len, int s) {
    char* str = new char[len-s+1];
    strncpy(str, data+s-1, len-s);
    str[len-s] = 0;
    if (s == 3) return str;
    printf("source: %s\n",str);
    char* ans = CharEscape(str);
    printf("escape: %s\n",ans);
    delete[] str; 
    return ans; 
}
```

看起来非常的长，但主要多的就是枚举了大量的关键字和运算符，当然，这个你在开发一门语言的前期，不用面面俱到，可以选自己用到的先写，不足的再日后补充。

要注意，这里最难的应该就是：
```
"/*"([^\*]|(\*)*[^\*/])*(\*)*"*/" ; /* 就是这种注释 */ 
```

乍看起来，非常恐怖的正则式，但其实就是在枚举多种可能情况，来保障注释范围的正确性。
```
"/*"   (  [^\*]   |   (\*)* [^\*/]   )*   (\*)*    "*/" ; /* 就是这种注释 */ 
```

### 用Bison创建通用的语法分析程序

这里我编写的是类C语言的语法，要注意的是，很多情况会造成规约-规约冲突和移入-规约冲突。这里我简要介绍一个bison的工作原理。

这种算法在编译原理中，被称为LALR(1)分析法，是自底向上规约的算法之一，而且又会向前看一个token，Bison中的每一行，被称为一个产生式（或BNF范式）


例如下面这行：
```
def_module_statement : KWS_STRUCT ID '{' def_statements '}' 
```

左边的是要规约的节点， 冒号右边是描述这个语法节点是用哪些节点产生的。
这是一个结构体定义的语法描述，KWS_STRUCT是终结符，来自Lex里的元素，看了上面的Lex描述，你应该能找到它的定义：
```
"struct"|"enum"|"union"|"module"|"interface"|"class"     SAVE_TOKEN; return KWS_STRUCT; /* 结构声明 */
```

其实就是可能的一些关键字。而def_statements是另外的语法节点，由其他定义得来。

规约-规约冲突，是说，在当前产生式结束后，后面跟的元素还确定的情况下，能够规约到两个不同的语法节点:

```
def_module_statement : KWS_STRUCT ID '{' def_statements '}' ;
def_class_statement : KWS_STRUCT ID '{' def_statements '}' ;

statement : def_module_statement ';' 
		  | def_class_statement ';' 
		  ;
```
以上文法便会产生规约-规约冲突，这是严重的定义错误，必须加以避免。
注意，我为了体现这个语法的错误，特意加上了上下文环境，不是说一样的语法定义会产生规约规约冲突，而是说后面可能跟的终结符都一样时，（在这里是';'）才会产生规约规约冲突，所以避免这种问题也简单，就是把相似的语法节点合并在一起就可以了。

说道移入-规约冲突，就要谈起if-else的摇摆问题：

```
if_state : IF '(' expr ')' statement 
         | IF '(' expr ')' statement ELSE statement 
         ;

statement : if_state
		  | ...
		  ;
```

正如这个定义一样，在 if的前半部识别完成后，下一个元素是ELSE终结符，此时可以规约，可以移入
说规约合法的理由是，if_state也是statement，而if第二条statement后面就是ELSE。
根据算法，这里规约是合理的，而移入同样是合理的。

为了避免这种冲突，一般Bison会优先选择移入，这样ELSE会和最近的IF匹配。
所以说，移入-规约冲突在你清楚的知道是哪的问题的时候，可以不加处理。但未期望的移入-规约冲突有可能让你的分析器不正确工作，这点还需要注意。


下面是我的Bison配置文件：
```
%{
#include "Model/nodes.h"
#include <list>
using namespace std;

#define YYERROR_VERBOSE 1

Node *programBlock; /* the top level root node of our final AST */

extern int yylex();
extern int yylineno;
extern char* yytext;
extern int yyleng;

void yyerror(const char *s);

%}

 

/* Represents the many different ways we can access our data */

%union {
    Node *nodes;
    char *str;
    int token;
}

 

/* Define our terminal symbols (tokens). This should

   match our tokens.l lex file. We also define the node type

   they represent.

 */

%token <str> ID INTEGER DOUBLE
%token <token> CEQ CNE CGE CLE MBK
%token <token> '<' '>' '=' '+' '-' '*' '/' '%' '^' '&' '|' '~' '@'
%token <str> STRING CHAR
%token <token> IF ELSE WHILE DO GOTO FOR FOREACH  
%token <token> DELEGATE DEF DEFINE IMPORT USING NAMESPACE
%token <token> RETURN NEW THIS 
%token <str> KWS_EXIT KWS_ERROR KWS_TSZ KWS_STRUCT KWS_FWKZ KWS_FUNC_XS KWS_TYPE

/* 
   Define the type of node our nonterminal symbols represent.
   The types refer to the %union declaration above. Ex: when
   we call an ident (defined by union type ident) we are really
   calling an (NIdentifier*). It makes the compiler happy.
 */

%type <nodes> program
%type <nodes> def_module_statement
%type <nodes> def_module_statements
%type <nodes> def_statement
%type <nodes> def_statements
%type <nodes> for_state
%type <nodes> if_state
%type <nodes> while_state
%type <nodes> statement
%type <nodes> statements
%type <nodes> block
%type <nodes> var_def
%type <nodes> func_def
%type <nodes> func_def_args
%type <nodes> func_def_xs 
%type <nodes> numeric
%type <nodes> expr
%type <nodes> call_arg 
%type <nodes> call_args 
%type <nodes> return_state

//%type <token> operator 这个设计容易引起规约冲突，舍弃
/* Operator precedence for mathematical operators */


%left '~'
%left '&' '|'
%left CEQ CNE CLE CGE '<' '>' '='
%left '+' '-'
%left '*' '/' '%' '^'
%left '.'
%left MBK '@'

%start program

%%

program : def_statements { programBlock = Node::getList($1); }
        ;

def_module_statement : KWS_STRUCT ID '{' def_statements '}' { $$ = Node::make_list(3, StringNode::Create($1), StringNode::Create($2), $4); }
                     | KWS_STRUCT ID ';' { $$ = Node::make_list(3, StringNode::Create($1), StringNode::Create($2), Node::Create()); }
                     ;

def_module_statements  : def_module_statement { $$ = Node::getList($1); }
                       | def_module_statements def_module_statement { $$ = $1; $$->addBrother(Node::getList($2)); }
                       ;

func_def_xs : KWS_FUNC_XS { $$ = StringNode::Create($1); }
            | func_def_xs KWS_FUNC_XS {$$ = $1; $$->addBrother(StringNode::Create($2)); }
            ;

def_statement : var_def ';' { $$ = $1; }
              | func_def 
              | def_module_statement 
              | func_def_xs func_def { $$ = $2; $2->addBrother(Node::getList($1)); } 
              ;

def_statements : def_statement { $$ = Node::getList($1); }
               | def_statements def_statement { $$ = $1; $$->addBrother(Node::getList($2)); }
               ;

statements : statement { $$ = Node::getList($1); }
           | statements statement { $$ = $1; $$->addBrother(Node::getList($2)); }
           ;

statement : def_statement 
          | expr ';' { $$ = $1; } 
          | block 
          | if_state
          | while_state
          | for_state
          | return_state
          ;

if_state : IF '(' expr ')' statement { $$ = Node::make_list(3, StringNode::Create("if"), $3, $5); }
         | IF '(' expr ')' statement ELSE statement { $$ = Node::make_list(4, StringNode::Create("if"), $3, $5, $7); }
         ;

while_state : WHILE '(' expr ')' statement { $$ = Node::make_list(3, StringNode::Create("while"), $3, $5); }
            ;

for_state : FOR '(' expr ';' expr ';' expr ')' statement { $$ = Node::make_list(5, StringNode::Create("for"), $3, $5, $7, $9); }
          | FOR '(' var_def ';' expr ';' expr ')' statement { $$ = Node::make_list(5, StringNode::Create("for"), Node::Create($3), $5, $7, $9); }
          ;

return_state : RETURN ';' { $$ = StringNode::Create("return"); }
             | RETURN expr ';' { $$ = StringNode::Create("return"); $$->addBrother($2); }              

block : '{' statements '}' { $$ = Node::Create($2); }
      | '{' '}' { $$ = Node::Create(); }
      ; 

var_def : KWS_TYPE ID { $$ = Node::make_list(3, StringNode::Create("set"), StringNode::Create($1), StringNode::Create($2)); }
        | ID ID { $$ = Node::make_list(3, StringNode::Create("set"), StringNode::Create($1), StringNode::Create($2)); }
        | KWS_TYPE ID '=' expr { $$ = Node::make_list(4, StringNode::Create("set"), StringNode::Create($1), StringNode::Create($2), $4); }
        | ID ID '=' expr { $$ = Node::make_list(4, StringNode::Create("set"), StringNode::Create($1), StringNode::Create($2), $4); }
        ;

func_def : ID ID '(' func_def_args ')' block
            { $$ = Node::make_list(5, StringNode::Create("function"), StringNode::Create($1), StringNode::Create($2), $4, $6); }
         | KWS_TYPE ID '(' func_def_args ')' block
            { $$ = Node::make_list(5, StringNode::Create("function"), StringNode::Create($1), StringNode::Create($2), $4, $6); }
         | ID ID '(' func_def_args ')' ';'
            { $$ = Node::make_list(5, StringNode::Create("function"), StringNode::Create($1), StringNode::Create($2), $4); }
         | KWS_TYPE ID '(' func_def_args ')' ';'
            { $$ = Node::make_list(5, StringNode::Create("function"), StringNode::Create($1), StringNode::Create($2), $4); }
         ;

func_def_args : var_def { $$ = Node::Create(Node::Create($1)); }
              | func_def_args ',' var_def { $$ = $1; $$->addChildren(Node::Create($3)); }
              | %empty  { $$ = Node::Create(); }
              ;

numeric : INTEGER { $$ = IntNode::Create($1); }
        | DOUBLE { $$ = FloatNode::Create($1); }
        ;

expr : expr '=' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("="), $1, $3); }
     | ID '(' call_args ')' { $$ = Node::make_list(2, StringNode::Create("call"), StringNode::Create($1)); $$->addBrother($3); }
     | ID { $$ = IDNode::Create($1); }
     | numeric { $$ = $1; }
     | STRING { $$ = StringNode::Create($1); }
     | KWS_TSZ 
     | NEW ID '(' call_args ')' { $$ = Node::make_list(3, StringNode::Create("new"), StringNode::Create($2), $4); }
     | expr CEQ expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("=="), $1, $3); }
     | expr CNE expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("!="), $1, $3); }
     | expr CLE expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("<="), $1, $3); }
     | expr CGE expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create(">="), $1, $3); }
     | expr '<' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("<"), $1, $3); }
     | expr '>' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create(">"), $1, $3); }
     | expr '+' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("+"), $1, $3); }
     | expr '-' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("-"), $1, $3); }
     | expr '*' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("*"), $1, $3); }
     | expr '/' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("/"), $1, $3); }
     | expr '%' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("%"), $1, $3); }
     | expr '^' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("^"), $1, $3); }
     | expr '&' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("&"), $1, $3); }
     | expr '|' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("|"), $1, $3); }
     | expr '.' expr { $$ = Node::make_list(4, StringNode::Create("opt2"), StringNode::Create("."), $1, $3); }
     | '~' expr { $$ = Node::make_list(4, StringNode::Create("opt1"), StringNode::Create("~"), $2); }
     | '(' expr ')'  /* ( expr ) */  { $$ = $2; }
     ;


call_arg  :  expr { $$ = $1;  }
          |  ID ':' expr { $$ = Node::make_list(3, StringNode::Create(":"), $1, $3); }
          ;

call_args : %empty { $$ = Node::Create(); }
          | call_arg { $$ = Node::getList($1); }
          | call_args ',' call_arg  { $$ = $1; $$->addBrother(Node::getList($3)); }
          ;

%%

void yyerror(const char* s){
    fprintf(stderr, "%s \n", s);    
    fprintf(stderr, "line %d: ", yylineno);
    fprintf(stderr, "text %s \n", yytext);
    exit(1);
}
```