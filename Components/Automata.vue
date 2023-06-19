<script setup>
import { ref } from 'vue'

const count = ref(0);
</script>

<template>
  <p>Automata</p>
  <button @click="count++">You clicked me {{ count }} times.</button>
</template>