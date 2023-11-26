<template>
  <p>自动机</p>
  <el-row :gutter="80">
    <el-col :span="12">
      <div id="graph" />
    </el-col>
    <el-col :span="12">
      <vxe-table :data="tableData" :edit-config="{ trigger: 'click', mode: 'cell' }">
        <vxe-column type="seq" title="state" width="60"></vxe-column>
        <vxe-column field="a" title="a" :edit-render="{ name: 'MyInput' }" />
        <vxe-column field="b" title="b" :edit-render="{ name: 'MyInput' }" />
        <vxe-column field="c" title="c" :edit-render="{ name: 'MyInput' }" />
      </vxe-table>
      <label>&nbsp;&nbsp;试试在以上表格中输入其他数字</label>
    </el-col>
  </el-row>
</template>


<script setup>
import { h, ref, onMounted } from 'vue'
import * as graphviz from 'd3-graphviz'
import { VXETable } from 'vxe-table'


function gen_dot(tb) {
  var end_states = [];
  // 先找出所有的终态
  for (var row = 0; row < tb.length; row++) {
    if (tb[row].end) end_states.push(tb[row].id);
  }

  var edges = [];
  const cols = ['a', 'b', 'c'];
  for (var row = 0; row < tb.length; row++) {
    for (const col of cols) {
      console.log(tb[row], col, tb[row][col]);
      if (!tb[row][col]) continue;
      if (tb[row].id <= tb[row][col])
        edges.push(`${tb[row].id} -> ${tb[row][col]} [label="${col}"];`);
      else
        edges.push(`${tb[row][col]} -> ${tb[row].id} [label="${col}" dir=back];`);
    }
  }

  return `digraph FSM {
    rankdir=LR;
    node [shape = doublecircle]; 
    ${end_states.join(' ')};
    node [shape = circle];
    ${edges.join('\n')}
  }`;
}

VXETable.renderer.add('MyInput', {
  // 可编辑激活模板
  renderEdit(renderOpts, params) {
    let { row, column } = params;
    return h('input', {
      class: "my-cell", text: "text",
      value: row[column.field],
      onInput: (e) => {
        if (e.target.value)
          row[column.field] = Number(e.target.value);
        else
          row[column.field] = '';
        var dot = gen_dot(tableData.value);
        console.log(dot);
        graphviz.graphviz('#graph')
          .width(400)
          .height(220)
          .fit(true)
          .renderDot(dot);
      }
    });
  },
  // 可编辑显示模板
  renderCell(renderOpts, params) {
    let { row, column } = params
    return [
      h('span', {}, row[column.field])
    ]
  },
  // 导出模板，例如导出插槽中自定义的内容
  exportMethod(params) {
    const { row, column } = params
    return '自定义内容'
  }
});

var tableData = ref([
  { id: 1, a: 2, b: '', c: '' },
  { id: 2, a: '', b: 3, c: '' },
  { id: 3, a: '', b: 2, c: 4 },
  { id: 4, end: true }
])

onMounted(() => {
    graphviz.graphviz('#graph')
    .width(400)
    .height(220)
    .fit(true)
    .renderDot(gen_dot(tableData.value));
  });

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

.my-cell {
  width: 50px;
}</style>