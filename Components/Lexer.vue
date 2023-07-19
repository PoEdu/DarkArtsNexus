<template>
  <div>
    <div ref="codeEditor"></div>
    <button @click="showTokens">显示Token信息</button>
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue';
import { basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, highlightActiveLine, Decoration } from '@codemirror/view';
import { RangeSet } from '@codemirror/rangeset';
import { javascript } from '@codemirror/lang-javascript';

const languageConf = new Compartment;

const codeEditor = ref(null);
const highlightedCode = ref(null);
let editorView = null;

onMounted(() => {
  // 示例代码
  const code = `
        function greet(name) {
          console.log('Hello, ' + name);
        }
        greet('World');
      `;

  editorView = new EditorView({
    state: EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        highlightActiveLine(),
        languageConf.of(javascript()),
      ]
    }),
    parent: codeEditor.value
  });
});

const highlightToken = (from, to, className, type) => {
  const decorations = [];
  const decoration = Decoration.mark({
            class: className,
            attributes: { 'data-type': type },
            start: from,
            end: to,
          });
  decorations.push(decoration);

  const decorationSet = RangeSet.of(decorations);
  editorView.dispatch({ effects: decorationSet.effects() });
};


// 在指定的token上应用高亮和类型标注
const tokenType = 'function'; // 要标注的token类型
const tokenClassName = 'cm-custom-token'; // 自定义的CSS类名


const showTokens = () => {
  // 在这里执行您的词法分析，并获得token信息

  highlightToken(9, 9+8, tokenClassName, tokenType);
};

</script>

<style>
.cm-keyword {
  color: blue;
}

.cm-identifier {
  color: green;
}

.cm-operator {
  color: red;
}
</style>