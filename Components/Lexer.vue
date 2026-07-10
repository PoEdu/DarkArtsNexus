<template>
  <div class="lexer-demo">
    <p class="lexer-hint">在编辑器中输入 C 代码，词法分析会实时切分并在上方标注每个 Token 的类型。</p>

    <div class="lexer-main">
      <div class="lexer-editor-panel">
        <div ref="codeEditor" class="lexer-editor"></div>
        <div class="lexer-legend">
          <span v-for="item in legend" :key="item.type" class="legend-item">
            <i class="legend-swatch" :style="{ background: item.color }"></i>
            {{ item.label }}
          </span>
        </div>
      </div>

      <div class="lexer-token-panel">
        <div class="token-panel-header">
          <span>Token 序列</span>
          <span class="token-count">{{ displayTokens.length }} 个</span>
        </div>
        <div class="token-list">
          <div
            v-for="(token, index) in displayTokens"
            :key="`${token.from}-${token.to}-${index}`"
            class="token-row"
            :class="{ active: activeTokenIndex === index }"
            @click="focusToken(token)"
            @mouseenter="activeTokenIndex = index"
          >
            <span class="token-idx">{{ index }}</span>
            <span class="token-type" :style="{ color: typeColor(token.type) }">{{ token.type }}</span>
            <code class="token-value">{{ formatValue(token.value) }}</code>
            <span class="token-pos">[{{ token.from }}, {{ token.to }})</span>
          </div>
          <div v-if="displayTokens.length === 0" class="token-empty">暂无 Token</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { basicSetup } from 'codemirror';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { EditorView, Decoration, ViewPlugin } from '@codemirror/view';
import { tokenize, tokenAt } from '../ComShared/cLexer.js';

const SAMPLE_CODE = `int main() {
  int a = 1;
  // 词法分析演示
  if (a <= 10) {
    printf("Hello, %d\\n", a);
  }
  return 0;
}`;

const TYPE_COLORS = {
  Keyword: '#4c6ef5',
  Identifier: '#2b8a3e',
  Number: '#e67700',
  String: '#9c36b5',
  Char: '#9c36b5',
  Operator: '#c92a2a',
  Punctuation: '#495057',
  Comment: '#868e96',
  Whitespace: '#ced4da',
  Unknown: '#f03e3e',
};

const legend = [
  { type: 'Keyword', label: '关键字', color: TYPE_COLORS.Keyword },
  { type: 'Identifier', label: '标识符', color: TYPE_COLORS.Identifier },
  { type: 'Number', label: '数字', color: TYPE_COLORS.Number },
  { type: 'String', label: '字符串', color: TYPE_COLORS.String },
  { type: 'Operator', label: '运算符', color: TYPE_COLORS.Operator },
  { type: 'Punctuation', label: '标点', color: TYPE_COLORS.Punctuation },
  { type: 'Comment', label: '注释', color: TYPE_COLORS.Comment },
];

function buildDecorations(tokens, active) {
  const marks = [];
  for (const token of tokens) {
    if (token.type === 'Whitespace') continue;
    const isActive =
      active && token.from === active.from && token.to === active.to;
    marks.push(
      Decoration.mark({
        class: `lex-token lex-token-${token.type.toLowerCase()}${isActive ? ' lex-active' : ''}`,
        attributes: {
          'data-type': token.type,
          'data-value': token.value,
          title: `${token.type}: ${token.value}`,
        },
      }).range(token.from, token.to),
    );
  }
  return Decoration.set(marks, true);
}

const setActiveEffect = StateEffect.define();
let currentActive = null;

const tokenField = StateField.define({
  create(state) {
    return buildDecorations(tokenize(state.doc.toString()), currentActive);
  },
  update(deco, tr) {
    let hasActiveEffect = false;
    for (const e of tr.effects) {
      if (e.is(setActiveEffect)) {
        currentActive = e.value;
        hasActiveEffect = true;
      }
    }
    if (tr.docChanged || hasActiveEffect) {
      return buildDecorations(tokenize(tr.state.doc.toString()), currentActive);
    }
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

const codeEditor = ref(null);
const tokens = ref([]);
const activeTokenIndex = ref(-1);
let editorView = null;

const displayTokens = computed(() =>
  tokens.value.filter((t) => t.type !== 'Whitespace'),
);

function typeColor(type) {
  return TYPE_COLORS[type] || '#495057';
}

function formatValue(value) {
  if (value.includes('\n')) return value.replace(/\n/g, '\\n');
  return value;
}

function syncTokens(doc) {
  tokens.value = tokenize(doc);
}

function focusToken(token) {
  if (!editorView) return;
  editorView.dispatch({
    selection: { anchor: token.from, head: token.to },
    scrollIntoView: true,
  });
  editorView.focus();
  const idx = displayTokens.value.findIndex(
    (t) => t.from === token.from && t.to === token.to,
  );
  if (idx >= 0) activeTokenIndex.value = idx;
}

watch(activeTokenIndex, (idx) => {
  if (!editorView) return;
  const token = idx >= 0 ? displayTokens.value[idx] : null;
  const range = token ? { from: token.from, to: token.to } : null;
  if (
    (range && currentActive && range.from === currentActive.from && range.to === currentActive.to) ||
    (!range && !currentActive)
  ) {
    return;
  }
  editorView.dispatch({ effects: setActiveEffect.of(range) });
});

const hoverPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;
      this.onMove = this.onMove.bind(this);
      view.dom.addEventListener('mousemove', this.onMove);
    }

    onMove(event) {
      const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos == null) return;
      const hit = tokenAt(pos, tokens.value);
      if (!hit) {
        activeTokenIndex.value = -1;
        return;
      }
      const idx = displayTokens.value.findIndex(
        (t) => t.from === hit.from && t.to === hit.to,
      );
      activeTokenIndex.value = idx;
    }

    destroy() {
      this.view.dom.removeEventListener('mousemove', this.onMove);
    }
  },
);

onMounted(() => {
  editorView = new EditorView({
    state: EditorState.create({
      doc: SAMPLE_CODE,
      extensions: [
        basicSetup,
        tokenField,
        hoverPlugin,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            syncTokens(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { fontSize: '14px' },
          '.cm-content': {
            paddingTop: '28px',
            fontFamily: 'Consolas, Monaco, monospace',
            letterSpacing: '0.5px',
          },
          '.cm-line': {
            lineHeight: '2.0',
            paddingBottom: '2px',
          },
          '.cm-scroller': { minHeight: '260px', maxHeight: '420px', lineHeight: '2.0' },
        }),
      ],
    }),
    parent: codeEditor.value,
  });
  syncTokens(SAMPLE_CODE);
});

onBeforeUnmount(() => {
  editorView?.destroy();
});
</script>

<style scoped>
.lexer-demo {
  margin: 1rem 0;
  border: 1px solid var(--border-color, #dee2e6);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-color, #fff);
}

.lexer-hint {
  margin: 0;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  color: var(--text-color-light, #666);
  border-bottom: 1px solid var(--border-color, #dee2e6);
  background: var(--card-bg, #f8f9fa);
}

.lexer-main {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
}

.lexer-editor-panel {
  flex: 1 1 320px;
  min-width: 0;
  border-right: 1px solid var(--border-color, #dee2e6);
}

.lexer-editor {
  padding: 0.5rem;
}

.lexer-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 0.5rem 1rem 0.75rem;
  font-size: 0.78rem;
  color: var(--text-color-light, #666);
  border-top: 1px solid var(--border-color, #eee);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.lexer-token-panel {
  flex: 0 0 280px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  max-height: 420px;
}

.token-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color, #dee2e6);
  background: var(--card-bg, #f8f9fa);
}

.token-count {
  font-weight: 400;
  color: var(--text-color-light, #868e96);
  font-size: 0.78rem;
}

.token-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.35rem 0;
}

.token-row {
  display: grid;
  grid-template-columns: 28px 72px 1fr auto;
  gap: 0.35rem;
  align-items: center;
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.12s;
}

.token-row:hover,
.token-row.active {
  background: rgba(76, 110, 245, 0.08);
}

.token-idx {
  color: var(--text-color-light, #adb5bd);
  font-size: 0.72rem;
  text-align: right;
}

.token-type {
  font-weight: 600;
  font-size: 0.72rem;
}

.token-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
  background: transparent;
  padding: 0;
}

.token-pos {
  color: var(--text-color-light, #adb5bd);
  font-size: 0.68rem;
  font-family: monospace;
}

.token-empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-color-light, #adb5bd);
  font-size: 0.85rem;
}

@media (max-width: 720px) {
  .lexer-editor-panel {
    border-right: none;
    border-bottom: 1px solid var(--border-color, #dee2e6);
  }

  .lexer-token-panel {
    flex: 1 1 100%;
    max-height: 240px;
  }
}
</style>

<style>
/* Token 标注样式（非 scoped，作用于 CodeMirror 内部） */
.lex-token {
  position: relative;
  border-radius: 2px;
  padding: 0 1px;
}

.lex-token::before {
  content: attr(data-type);
  position: absolute;
  bottom: calc(100% - 2px);
  left: 50%;
  font-size: 9px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
  font-family: system-ui, sans-serif;
  font-weight: 600;
  z-index: 5;
  opacity: 0;
  transform: translate(-50%, 6px) scale(0.85);
  transform-origin: bottom center;
  transition: opacity 0.16s ease, transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}

.lex-token:hover,
.lex-token.lex-active {
  z-index: 6;
}

.lex-token:hover::before,
.lex-token.lex-active::before {
  opacity: 0.95;
  transform: translate(-50%, 0) scale(1);
}

.lex-token-keyword {
  background: rgba(76, 110, 245, 0.12);
  border-bottom: 2px solid #4c6ef5;
}
.lex-token-keyword::before {
  background: #4c6ef5;
  color: #fff;
}

.lex-token-identifier {
  background: rgba(43, 138, 62, 0.1);
  border-bottom: 2px solid #2b8a3e;
}
.lex-token-identifier::before {
  background: #2b8a3e;
  color: #fff;
}

.lex-token-number {
  background: rgba(230, 119, 0, 0.1);
  border-bottom: 2px solid #e67700;
}
.lex-token-number::before {
  background: #e67700;
  color: #fff;
}

.lex-token-string,
.lex-token-char {
  background: rgba(156, 54, 181, 0.1);
  border-bottom: 2px solid #9c36b5;
}
.lex-token-string::before,
.lex-token-char::before {
  background: #9c36b5;
  color: #fff;
}

.lex-token-operator {
  background: rgba(201, 42, 42, 0.08);
  border-bottom: 2px solid #c92a2a;
}
.lex-token-operator::before {
  background: #c92a2a;
  color: #fff;
}

.lex-token-punctuation {
  background: rgba(73, 80, 87, 0.08);
  border-bottom: 2px solid #868e96;
}
.lex-token-punctuation::before {
  background: #495057;
  color: #fff;
}

.lex-token-comment {
  background: rgba(134, 142, 150, 0.1);
  border-bottom: 2px dashed #868e96;
  font-style: italic;
}
.lex-token-comment::before {
  background: #868e96;
  color: #fff;
}

.lex-token-unknown {
  background: rgba(240, 62, 62, 0.12);
  border-bottom: 2px solid #f03e3e;
}
.lex-token-unknown::before {
  background: #f03e3e;
  color: #fff;
}
</style>
