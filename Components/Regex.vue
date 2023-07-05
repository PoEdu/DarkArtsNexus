<template>
  <p>尝试一下正则匹配!</p>
  <vxe-grid ref="xGrid" v-bind="gridOptions" v-on="gridEvents">
    <template #name_edit="{ row }">
      <vxe-input v-model="row.name" />
    </template>
  </vxe-grid>
  <p>输入正则式</p>
  <el-input v-model="regex_str"></el-input>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { VXETable } from 'vxe-table'
import { ElInput } from 'element-plus'


const xGrid = ref()

const gridOptions = reactive({
  border: true,
  keepSource: true,
  id: 'toolbar_demo_1',
  printConfig: {},
  importConfig: {},
  exportConfig: {},
  columnConfig: {
    resizable: true
  },
  customConfig: {
    storage: true
  },
  editConfig: {
    trigger: 'click',
    mode: 'cell',
    showStatus: true
  },
  columns: [
    { type: 'checkbox', width: 50 },
    { type: 'seq', width: 60 },
    { field: 'name', title: '要匹配的数据', editRender: {}, slots: { edit: 'name_edit' } },
  ],
  toolbarConfig: {
    buttons: [
      { code: 'myInsert', name: '新增' },
      { code: 'myDelete', name: '删除', status: 'warning' },
    ],
  },
  data: [
    { id: 10001, name: 'Test1' },
    { id: 10002, name: 'Test2' },
    { id: 10003, name: 'Test3' },
    { id: 10003, name: 'Test3' },
  ]
})

const gridEvents = {
  toolbarButtonClick({ code }) {
    const $grid = xGrid.value
    if ($grid) {
      switch (code) {
        case 'myInsert': {
          $grid.insert({
            name: ''
          })
          break
        }
        case 'myDelete': {
          $grid.removeCheckboxRow();
          VXETable.modal.message({ content: `删除成功`, status: 'success' })
          break
        }
      }
    }
  }
}

const regex_str = ref(0);

regex_str.value = "[a-z]+[0-9]*";
</script>


<style>
table {
  overflow-x: visible;
  margin: 0 auto;
}

th,
td {
  border: 0;
}
</style>