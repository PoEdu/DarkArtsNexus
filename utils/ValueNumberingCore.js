/**
 * 值编号步骤的数据结构
 * @typedef {Object} ValueNumberingStep
 * @property {string} statement - 原始语句
 * @property {string} symbol - 被赋值符号
 * @property {string} expression - 表达式
 * @property {string} valueNumber - 值编号
 * @property {string} explanation - 说明
 */

/**
 * 值编号分析器类
 */
export class ValueNumberingAnalyzer {
  constructor() {
    this.reset();
  }

  /**
   * 重置分析器状态
   */
  reset() {
    this.valueMap = new Map(); // 存储变量到值编号的映射
    this.expressionMap = new Map(); // 存储表达式到值编号的映射
    this.steps = []; // 存储分析步骤
    this.valueCounter = 1; // 值编号计数器
  }

  /**
   * 分析代码并生成值编号步骤
   * @param {string} code - 输入的代码
   * @returns {ValueNumberingStep[]} 值编号步骤数组
   */
  analyze(code) {
    this.reset();
    const lines = code.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const step = this.processLine(line);
      if (step) {
        this.steps.push(step);
      }
    });

    return this.steps;
  }

  getValueNumber(symbol) {
  }

  getValueNumberFromExpression(symbolLeft, operator, symbolRight) {
    const valueNumberLeft = this.getValueNumber(symbolLeft);
    const valueNumberRight = this.getValueNumber(symbolRight);

    if (operator === '+' || operator === '*') {
      numberLeft = symbolLeft.substring(1);
      numberRight = symbolRight.substring(1);
      if (parseInt(numberLeft) > parseInt(numberRight)) {
        return `${numberRight}${operator}${numberLeft}`;
      } else {
        return `${numberLeft}${operator}${numberRight}`;
      }
    }

    return `${numberLeft}${operator}${numberRight}`;
  }


  /**
   * 处理单行代码
   * @param {string} line - 代码行
   * @returns {ValueNumberingStep|null} 处理结果
   */
  processLine(line) {
    // 移除行尾的分号
    line = line.replace(/;$/, '');
    
    const match = line.match(/(\w+)\s*=\s*(.+)/);
    if (!match) return null;

    const [, symbol, expression] = match;
    let valueNumber = `v${this.valueCounter}`;
    let explanation = '';

    // 处理表达式
    const parts = expression.split(/\s*[\+\-\*\/]\s*/);
    const operators = expression.match(/[\+\-\*\/]/g) || [];
    
    if (parts.length > 1) {
      let left = parts[0];
      let right = parts[1];
      let operator = operators[0];

      valueNumber = this.getValueNumberFromExpression(left, operator, right);
      explanation = `新的复合表达式`;
    } else {
      explanation = `新的值`;
    }

    this.valueMap.set(symbol, valueNumber);
    if (!this.valueMap.has(expression)) {
      this.valueMap.set(expression, valueNumber);
    }

    this.valueCounter++;

    return {
      statement: line,
      symbol,
      expression,
      valueNumber,
      explanation
    };
  }

  /**
   * 生成优化后的代码
   * @returns {string} 优化后的代码
   */
  generateOptimizedCode() {
    return this.steps
      .map(step => {
        if (step.explanation.includes('复用')) {
          return `    // ${step.explanation}`;
        }
        return `    ${step.statement}`;
      })
      .join('\n');
  }
} 