const KEYWORDS = new Set([
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
    'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
    'inline', 'int', 'long', 'register', 'return', 'short', 'signed',
    'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned',
    'void', 'volatile', 'while',
]);

const OPERATORS = new Set([
    '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||',
    '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=',
    '->', '...',
]);

/**
 * @typedef {{ type: string, value: string, from: number, to: number }} Token
 */

/**
 * @param {string} source
 * @returns {Token[]}
 */
export function tokenize(source) {
    const tokens = [];
    let i = 0;

    while (i < source.length) {
        const start = i;
        const ch = source[i];

        // 空白符
        if (/\s/.test(ch)) {
            while (i < source.length && /\s/.test(source[i])) i++;
            tokens.push({ type: 'Whitespace', value: source.slice(start, i), from: start, to: i });
            continue;
        }

        // 行注释
        if (ch === '/' && source[i + 1] === '/') {
            i += 2;
            while (i < source.length && source[i] !== '\n') i++;
            tokens.push({ type: 'Comment', value: source.slice(start, i), from: start, to: i });
            continue;
        }

        // 块注释
        if (ch === '/' && source[i + 1] === '*') {
            i += 2;
            while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
            if (i < source.length) i += 2;
            tokens.push({ type: 'Comment', value: source.slice(start, i), from: start, to: i });
            continue;
        }

        // 字符串
        if (ch === '"') {
            i++;
            while (i < source.length) {
                if (source[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (source[i] === '"') {
                    i++;
                    break;
                }
                i++;
            }
            tokens.push({ type: 'String', value: source.slice(start, i), from: start, to: i });
            continue;
        }

        // 字符字面量
        if (ch === '\'') {
            i++;
            while (i < source.length) {
                if (source[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (source[i] === '\'') {
                    i++;
                    break;
                }
                i++;
            }
            tokens.push({ type: 'Char', value: source.slice(start, i), from: start, to: i });
            continue;
        }

        // 数字
        if (/\d/.test(ch) || (ch === '.' && /\d/.test(source[i + 1]))) {
            if (source[i] === '0' && /[xX]/.test(source[i + 1])) {
                i += 2;
                while (i < source.length && /[0-9a-fA-F]/.test(source[i])) i++;
            } else {
                while (i < source.length && /[\d_]/.test(source[i])) i++;
                if (source[i] === '.' && /\d/.test(source[i + 1])) {
                    i++;
                    while (i < source.length && /[\d_]/.test(source[i])) i++;
                }
                if (/[eE]/.test(source[i])) {
                    i++;
                    if (/[+-]/.test(source[i])) i++;
                    while (i < source.length && /[\d_]/.test(source[i])) i++;
                }
            }
            while (/[uUlLfF]/.test(source[i])) i++;
            tokens.push({ type: 'Number', value: source.slice(start, i), from: start, to: i });
            continue;
        }

        // 标识符 / 关键字
        if (/[A-Za-z_]/.test(ch)) {
            while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i++;
            const word = source.slice(start, i);
            const type = KEYWORDS.has(word) ? 'Keyword' : 'Identifier';
            tokens.push({ type, value: word, from: start, to: i });
            continue;
        }

        // 多字符运算符
        let matched = '';
        for (let len = 3; len >= 2; len--) {
            const op = source.slice(i, i + len);
            if (OPERATORS.has(op)) {
                matched = op;
                break;
            }
        }
        if (matched) {
            i += matched.length;
            tokens.push({ type: 'Operator', value: matched, from: start, to: i });
            continue;
        }

        // 单字符运算符
        if ('+-*/%=&|^~!<>?:'.includes(ch)) {
            i++;
            tokens.push({ type: 'Operator', value: ch, from: start, to: i });
            continue;
        }

        // 标点
        if ('()[]{},.;'.includes(ch)) {
            i++;
            tokens.push({ type: 'Punctuation', value: ch, from: start, to: i });
            continue;
        }

        // 未知
        i++;
        tokens.push({ type: 'Unknown', value: ch, from: start, to: i });
    }

    return tokens;
}

/**
 * @param {number} pos
 * @param {Token[]} tokens
 * @returns {Token | undefined}
 */
export function tokenAt(pos, tokens) {
    return tokens.find((t) => pos >= t.from && pos < t.to);
}
