<template>
  <div class="regex-demo">
    <p class="regex-hint">
      表格中的数据可点击修改，也可新增 / 删除行。下方修改正则时，匹配片段会即时高亮。
    </p>

    <div class="regex-toolbar" role="toolbar" aria-label="匹配数据操作">
      <button class="toolbar-button toolbar-button--primary" type="button" @click="addRow">
        新增行
      </button>
      <button class="toolbar-button toolbar-button--danger" type="button" @click="deleteSelectedRows">
        删除选中行
      </button>
      <span v-if="toolbarMessage" class="toolbar-message" role="status">{{ toolbarMessage }}</span>
    </div>

    <vxe-grid class="regex-table" ref="xGrid" v-bind="gridOptions">
      <template #name_default="{ row }">
        <code class="match-view" v-html="viewOf(row.name).html"></code>
      </template>
      <template #name_edit="{ row }">
        <input
          v-model="row.name"
          class="cell-editor"
          type="text"
          spellcheck="false"
          aria-label="要匹配的数据"
          @keydown.enter="finishEdit"
        />
      </template>
      <template #status_default="{ row }">
        <span v-if="regexError" class="status-muted">—</span>
        <span v-else-if="viewOf(row.name).count > 0" class="status-hit">
          {{ viewOf(row.name).count }} 处
        </span>
        <span v-else class="status-miss">无匹配</span>
      </template>
    </vxe-grid>

    <label class="regex-label" for="regex-input">正则表达式</label>
    <input
      id="regex-input"
      class="regex-input"
      type="text"
      spellcheck="false"
      autocomplete="off"
      v-model="regexStr"
      placeholder="例如：[A-Za-z0-9_.]+@[A-Za-z0-9]+\.edu"
    />
    <p v-if="regexError" class="regex-error">正则无效：{{ regexError }}</p>
    <p v-else class="regex-flags">使用标志 <code>g</code>（全局匹配所有出现）。</p>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'

const xGrid = ref()
let nextId = 10010
const toolbarMessage = ref('')

const regexStr = ref('[A-Za-z0-9_.]+@[A-Za-z0-9]+\\.edu')

const gridOptions = reactive({
  border: true,
  keepSource: true,
  size: 'small',
  id: 'regex_match_demo',
  columnConfig: {
    resizable: true,
  },
  editConfig: {
    trigger: 'click',
    mode: 'cell',
    showStatus: false,
  },
  columns: [
    {
      type: 'checkbox',
      width: 48,
      minWidth: 48,
      maxWidth: 48,
      align: 'center',
      headerAlign: 'center',
    },
    {
      type: 'seq',
      width: 52,
      minWidth: 52,
      maxWidth: 52,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'name',
      title: '要匹配的数据',
      minWidth: 220,
      editRender: {},
      slots: { default: 'name_default', edit: 'name_edit' },
    },
    {
      field: 'status',
      title: '结果',
      width: 90,
      slots: { default: 'status_default' },
    },
  ],
  data: [
    { id: 10001, name: 'alice@school.edu' },
    { id: 10002, name: 'bob@company.com' },
    { id: 10003, name: 'carol@mit.edu.cn' },
    { id: 10004, name: 'not-an-email' },
    { id: 10005, name: 'user_01@campus.edu and backup@lab.edu' },
    { id: 10006, name: 'Test123 and abc' },
  ],
})

async function addRow() {
  const $grid = xGrid.value
  if (!$grid) return

  const { row } = await $grid.insert({
    id: nextId++,
    name: '',
  })
  toolbarMessage.value = '已新增一行'
  await $grid.setEditCell(row, 'name')
}

async function deleteSelectedRows() {
  const $grid = xGrid.value
  if (!$grid) return

  const selectedRows = $grid.getCheckboxRecords()
  if (selectedRows.length === 0) {
    toolbarMessage.value = '请先勾选要删除的行'
    return
  }

  await $grid.removeCheckboxRow()
  toolbarMessage.value = `已删除 ${selectedRows.length} 行`
}

function finishEdit() {
  xGrid.value?.clearEdit()
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const compiled = computed(() => {
  const source = regexStr.value
  if (!source) {
    return { re: null, error: null }
  }
  try {
    return { re: new RegExp(source, 'g'), error: null }
  } catch (err) {
    return { re: null, error: err instanceof Error ? err.message : String(err) }
  }
})

const regexError = computed(() => compiled.value.error)

function highlightMatches(text, re) {
  const raw = String(text ?? '')
  if (!re) {
    return { html: escapeHtml(raw), count: 0 }
  }

  const parts = []
  let last = 0
  let count = 0
  re.lastIndex = 0

  let match
  while ((match = re.exec(raw)) !== null) {
    const start = match.index
    const end = start + match[0].length

    if (start > last) {
      parts.push(escapeHtml(raw.slice(last, start)))
    }

    if (end > start) {
      parts.push(`<mark class="regex-hit">${escapeHtml(match[0])}</mark>`)
      count += 1
      last = end
    }

    if (match[0].length === 0) {
      re.lastIndex = start + 1
      if (re.lastIndex > raw.length) break
    }
  }

  if (last < raw.length) {
    parts.push(escapeHtml(raw.slice(last)))
  }

  return { html: parts.join(''), count }
}

function viewOf(text) {
  // Depend on regexStr so cell slots refresh when the pattern changes.
  void regexStr.value
  return highlightMatches(text, compiled.value.re)
}
</script>

<style scoped>
.regex-demo {
  margin: 1rem 0 1.5rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--c-border, #e5e7eb);
  border-radius: 8px;
  background: var(--c-bg-light, #f8fafc);
}

.regex-hint {
  margin: 0 0 0.85rem;
  color: var(--c-text-lighter, #64748b);
  font-size: 0.95rem;
  line-height: 1.5;
}

.regex-toolbar {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.25rem;
  margin-bottom: 0.65rem;
}

.toolbar-button {
  appearance: none;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.42rem 0.8rem;
  background: #fff;
  color: #334155;
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.2;
  cursor: pointer;
}

.toolbar-button:hover {
  background: #f8fafc;
}

.toolbar-button--primary {
  border-color: #3b82f6;
  background: #3b82f6;
  color: #fff;
}

.toolbar-button--primary:hover {
  background: #2563eb;
}

.toolbar-button--danger {
  border-color: #fca5a5;
  color: #b91c1c;
}

.toolbar-button--danger:hover {
  background: #fef2f2;
}

.toolbar-button:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.toolbar-message {
  margin-left: auto;
  color: #64748b;
  font-size: 0.85rem;
}

.cell-editor {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #60a5fa;
  border-radius: 4px;
  padding: 0.3rem 0.45rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92rem;
}

.cell-editor:focus {
  outline: 2px solid #bfdbfe;
  outline-offset: 0;
}

/*
 * Table.vue / Automata.vue contain legacy unscoped table rules.
 * VXE renders header and body as separate tables, so reset those rules here
 * to keep both colgroups aligned.
 */
.regex-table :deep(.vxe-table--header-wrapper table),
.regex-table :deep(.vxe-table--body-wrapper table),
.regex-table :deep(.vxe-table--footer-wrapper table) {
  margin: 0 !important;
  overflow: visible;
}

.regex-table :deep(.vxe-table--header-wrapper th),
.regex-table :deep(.vxe-table--body-wrapper td),
.regex-table :deep(.vxe-table--footer-wrapper td) {
  box-sizing: border-box;
}

.regex-table :deep(.vxe-grid--toolbar-wrapper:empty) {
  display: none;
}

.match-view {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92rem;
  line-height: 1.55;
  color: #0f172a;
}

.regex-demo :deep(.regex-hit) {
  background: #fde68a;
  color: #78350f;
  border-radius: 3px;
  padding: 0.05em 0.12em;
  box-decoration-break: clone;
}

.status-hit {
  color: #15803d;
  font-weight: 600;
}

.status-miss {
  color: #94a3b8;
}

.status-muted {
  color: #cbd5e1;
}

.regex-label {
  display: block;
  margin: 0.9rem 0 0.35rem;
  font-weight: 600;
  font-size: 0.95rem;
}

.regex-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--c-border, #cbd5e1);
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.95rem;
  background: #fff;
}

.regex-input:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
  border-color: #60a5fa;
}

.regex-error {
  margin: 0.45rem 0 0;
  color: #b91c1c;
  font-size: 0.9rem;
}

.regex-flags {
  margin: 0.45rem 0 0;
  color: #64748b;
  font-size: 0.85rem;
}

.regex-table :deep(.vxe-header--column .vxe-cell),
.regex-table :deep(.vxe-body--column .vxe-cell) {
  padding: 4px 8px !important;
  margin: 0;
}

.regex-table :deep(.vxe-header--column) {
  height: 32px !important;
  line-height: 1.3;
}

.regex-table :deep(thead th),
.regex-table :deep(tbody td) {
  border: 0;
  padding: 0;
}



</style>
