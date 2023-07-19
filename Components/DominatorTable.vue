<template>
    <div>
        <table>
      <thead>
        <tr>
          <th>步骤</th>
          <th v-for="node in nodes" :key="node">{{ node }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(step, stepIndex) in dominatorSteps" :key="stepIndex">
          <td>{{ stepIndex + 1 }}</td>
          <td v-for="node in nodes" :key="node">
            <span v-for="s in step[node]">{{s + ' '}}</span> 
          </td>
        </tr>
      </tbody>
    </table>
    </div>
</template>
  
<script setup>
import { ref } from 'vue';

const props = defineProps({
  dominatorSteps: {
    type: Array,
    required: true
  },
  nodes: {
    type: Array,
    required: true
  }
});

</script>
  
<style>
/* 样式可根据需要进行自定义 */
</style>
  
  
  
  