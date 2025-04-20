<template>
  <div class="value-numbering">
    <div class="input-section">
      <h3>输入代码</h3>
      <textarea
        v-model="inputCode"
        rows="10"
        placeholder="请输入C语言代码..."
        @input="processCode"
      ></textarea>
    </div>

    <div class="process-section">
      <h3>值编号过程</h3>
      <div class="controls">
        <button @click="prevStep" :disabled="currentStep === 0">上一步</button>
        <button @click="nextStep" :disabled="currentStep >= steps.length">下一步</button>
        <button @click="resetProcess">重置</button>
      </div>

      <div class="steps">
        <div v-for="(step, index) in steps" :key="index" 
             :class="['step', { active: index === currentStep }]">
          <div class="step-header">
            <span class="step-number">步骤 {{ index + 1 }}</span>
            <span class="step-statement">{{ step.statement }}</span>
          </div>
          <div class="value-table">
            <table>
              <thead>
                <tr>
                  <th>被赋值符号</th>
                  <th>表达式</th>
                  <th>值编号</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ step.symbol }}</td>
                  <td>{{ step.expression }}</td>
                  <td>{{ step.valueNumber }}</td>
                  <td>{{ step.explanation }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="result-section" v-if="optimizedCode">
      <h3>优化后的代码</h3>
      <pre><code>{{ optimizedCode }}</code></pre>
    </div>
  </div>
</template>

<script>
import { ValueNumberingAnalyzer } from '../utils/ValueNumberingCore';

export default {
  name: 'ValueNumbering',
  data() {
    return {
      inputCode: '',
      currentStep: 0,
      steps: [],
      optimizedCode: '',
      analyzer: new ValueNumberingAnalyzer()
    }
  },
  methods: {
    processCode() {
      this.resetProcess();
      if (!this.inputCode.trim()) return;

      this.steps = this.analyzer.analyze(this.inputCode);
      this.optimizedCode = this.analyzer.generateOptimizedCode();
    },

    nextStep() {
      if (this.currentStep < this.steps.length) {
        this.currentStep++;
      }
    },

    prevStep() {
      if (this.currentStep > 0) {
        this.currentStep--;
      }
    },

    resetProcess() {
      this.currentStep = 0;
      this.steps = [];
      this.optimizedCode = '';
      this.analyzer.reset();
    }
  }
}
</script>

<style scoped>
.value-numbering {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.input-section, .process-section, .result-section {
  margin-bottom: 20px;
}

textarea {
  width: 100%;
  padding: 10px;
  font-family: monospace;
}

.controls {
  margin: 10px 0;
}

.controls button {
  margin-right: 10px;
  padding: 5px 10px;
}

.steps {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
}

.step {
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.step.active {
  background-color: #f0f8ff;
  border-color: #b0c4de;
}

.step-header {
  margin-bottom: 10px;
}

.step-number {
  font-weight: bold;
  margin-right: 10px;
}

.value-table table {
  width: 100%;
  border-collapse: collapse;
}

.value-table th, .value-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.value-table th {
  background-color: #f5f5f5;
}

pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
