<template>
    <div>
      <vxe-table
        border
        show-overflow
        :data="tableData"
        :column-config="{resizable: true}"
        :edit-config="{trigger: 'click', mode: 'cell'}">
        <vxe-column type="seq" width="60"></vxe-column>
        <vxe-column field="name" title="Name" :edit-render="{autofocus: '.vxe-input--inner'}">
          <template #edit="{ row }">
            <vxe-input v-model="row.name" type="text"></vxe-input>
          </template>
        </vxe-column>
        <vxe-column field="role" title="Role" :edit-render="{}">
          <template #edit="{ row }">
            <vxe-input v-model="row.role" type="text" placeholder="请输入昵称"></vxe-input>
          </template>
        </vxe-column>
        <vxe-column field="sex" title="Sex" :edit-render="{}">
          <template #default="{ row }">
            <span>{{ formatSex(row.sex) }}</span>
          </template>
          <template #edit="{ row }">
            <vxe-select v-model="row.sex" transfer>
              <vxe-option v-for="item in sexList1" :key="item.value" :value="item.value" :label="item.label"></vxe-option>
            </vxe-select>
          </template>
        </vxe-column>
        <vxe-column field="sex2" title="多选下拉" :edit-render="{}">
          <template #default="{ row }">
            <span>{{ formatMultiSex(row.sex2) }}</span>
          </template>
          <template #edit="{ row }">
            <vxe-select v-model="row.sex2" multiple transfer>
              <vxe-option v-for="item in sexList1" :key="item.value" :value="item.value" :label="item.label"></vxe-option>
            </vxe-select>
          </template>
        </vxe-column>
        <vxe-column field="num6" title="Number" :edit-render="{}">
          <template #edit="{ row }">
            <vxe-input v-model="row.num6" type="number" placeholder="请输入数值"></vxe-input>
          </template>
        </vxe-column>
        <vxe-column field="date12" title="Date" :edit-render="{}">
          <template #edit="{ row }">
            <vxe-input v-model="row.date12" type="date" placeholder="请选择日期" transfer></vxe-input>
          </template>
        </vxe-column>
        <vxe-column field="date13" title="Week" :edit-render="{}">
          <template #edit="{ row }">
            <vxe-input v-model="row.date13" type="week" placeholder="请选择日期" transfer></vxe-input>
          </template>
        </vxe-column>
        <vxe-column field="address" title="Address" :edit-render="{}">
          <template #edit="{ row }">
            <vxe-input v-model="row.address" type="text"></vxe-input>
          </template>
        </vxe-column>
      </vxe-table>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { ref } from 'vue'
  
  interface RowVO {
    id: number
    name: string
    nickname: string
    role: string
    sex: string
    sex2: string[]
    num1: number
    age: number
    address: string
    date12: string
    date13: string
  }
  
  const tableData = ref<RowVO[]>([
    { id: 10001, name: 'Test1', nickname: 'T1', role: 'Develop', sex: '0', sex2: ['0'], num1: 40, age: 28, address: 'Shenzhen', date12: '', date13: '' },
    { id: 10002, name: 'Test2', nickname: 'T2', role: 'Designer', sex: '1', sex2: ['0', '1'], num1: 20, age: 22, address: 'Guangzhou', date12: '', date13: '2020-08-20' },
    { id: 10003, name: 'Test3', nickname: 'T3', role: 'Test', sex: '0', sex2: ['1'], num1: 200, age: 32, address: 'Shanghai', date12: '2020-09-10', date13: '' },
    { id: 10004, name: 'Test4', nickname: 'T4', role: 'Designer', sex: '1', sex2: ['1'], num1: 30, age: 23, address: 'Shenzhen', date12: '', date13: '2020-12-04' }
  ])
  
  const sexList1 = ref([
    { label: '', value: '' },
    { label: '男', value: '1' },
    { label: '女', value: '0' }
  ])
  
  const formatSex = (value: string) => {
    if (value === '1') {
      return '男'
    }
    if (value === '0') {
      return '女'
    }
    return ''
  }
  
  const formatMultiSex = (values: string[]) => {
    if (values) {
      return values.map(val => formatSex(val)).join(',')
    }
    return ''
  }
  </script>

<style>
table {
    overflow-x: visible;
    margin: 0 auto;
}
th, td {
    border: 0;
}
</style>