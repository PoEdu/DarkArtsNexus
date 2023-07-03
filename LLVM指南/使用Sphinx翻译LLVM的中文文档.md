使用Sphinx翻译LLVM的中文文档 
===============================

Sphinx是一款非常方便的文档生成工具，以前就早有耳闻，最近计划将LLVM的文档翻译一些，在打开LLVM的文档源文件后发现，整个文档部分整理的非常整洁。下载的最新版LLVM-3.8版的源码，已经完全使用Sphinx生成文档，于是我也学习了一些Sphinx的相关用法。

<!--more-->

Sphinx是python编写的一款命令行工具，在python3或python2下都能正常的工作，安装可以使用流行的pip进行安装：

```sh
$ pip install sphinx --upgrade
$ pip install sphinx-intl
```

Sphinx的依赖项比较新，最好还是更新一下比较好。`sphinx-intl`是一个命令行工具，用来实现多语言翻译的。

Sphinx有着非常独特且方便的代码翻译模型，可以用工具将英语版编写的文档中的文字全部抽取出来，在`.po`文件下，可以让用户方便地进行修改和翻译。最后根据生成时的语言配置，构建对应语言版本的文档。

![sphinx i18n model](http://www.sphinx-doc.org/en/stable/_images/translation.png)

不过我们先不管Sphinx是如何进行翻译抽取的，先来看下LLVM文档的构建。

## 基本HTML文档的构建

默认LLVM的docs目录下的makefile是给doxygen使用的，这里我将`Makefile.sphinx`改成默认的makefile。这样接下来的命令中，都不会再出现对于原版`-f Makefile.sphinx`参数了。

首先对于构建html版本，非常简单，直接make默认参数即可，或者`make html`都可以。

这样，会在`_build`目录下生成对应的网站文件夹。

这样构建的文档，是可以作为静态网站直接发布出去的，不过发布到github上的gitpages上还是会有点问题，我们这里先不谈，接下来的发布注意中再细说。


## 抽取文档中的文本并开始翻译

我们的目标是翻译，将英文文档尽可能正确无误地转换为中文文档。这里我们使用`sphinx-intl`工具进行翻译。

1. 首先配置`conf.py`文件
    `conf.py`是sphinx的配置文件，我们需要为其增加国际化翻译文件夹：
    ```py
    language = 'zh_CN' # language supported
    locale_dirs = ['locale/']   # path is example but recommended.
    gettext_compact = False     # optional.
    ```
2. 抽取需要转换的文本到pot文件列表中
    执行如下指令即可：
    ```sh
    $ make gettext
    ```
    这时，会在`_build`目录出现一个`locale`文件夹，是抽取出的全部文本段。
    
3. 更新对应语言的版本
    ```sh
    $ sphinx-intl update -p _build/locale -l zh_CN
    ```

4. 手动翻译抽取后的文段
    这时，我们将可以在`locale`目录，注意，是文档项目根目录下的`locale`，这才是我们要翻译文本的`.po`文件夹。里面内容大概如下：
    ```
    #: ../../builders.rst:4
    msgid "Available builders"
    msgstr "<一些你要翻译的汉语>"
    ```
    msgid和msgstr一对一句，是全部抽取出来的文本的翻译，只要你对应翻译，注意rst文件的格式，翻译出来很少会出问题，样式完全一致，而且链接不会错乱。

5. 构建新版文档
    由于我们在`conf.py`下配置了默认的language，所以只要这时再重新make，项目文档就生成成中文版的了。
    

## 看下效果

今天一下午研究sphinx+晚上翻译，将LLVM官网首页翻译了个大概，有兴趣的朋友可以看下我发布到gitpages上的中文文档：

<http://sunxfancy.github.io/llvm-cn/>

另外英语好且正在使用LLVM的朋友，欢迎一同和我来翻译这个项目，给更多人带来便利。


## 发布项目的小问题

之前我们提到，发布到gitpages出些问题，所有`_static`等带`_`前缀的文件夹无法访问，思考了一下，觉得是github本身的问题，在看sphinx文档的时候，发现提到了一个文件，必须同时发布到gitpages上。

`.nojekyll`,这个空的小文件十分重要，因为它直接关系着github上的解析规则，加上这个空文件，gitpages就会停止默认的过滤规则，运行我们的资源文件的访问。
