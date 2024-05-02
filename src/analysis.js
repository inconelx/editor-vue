export function lexer(input, mode){
    let code = input;
    const tokens = [[],[]];
    if(mode === 'C'){
        const keywords = ['int', 'float', 'char', 'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'switch', 'case', 'default', 'sizeof', 'void', 'typedef', 'struct', 'union', 'enum', 'static', 'const', 'extern', 'register', 'auto', 'volatile', 'unsigned', 'signed', 'short', 'long', 'double', 'const', 'goto'];
        
        const regex = /(\s+)|(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|((?<=^|\n)#.*)|("(?:[^"\\]|\\.)*?"|'(?:[^"'\\]|\\.)')|([-\+]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-\+]?(?:0|[1-9]\d*))?)|([A-Za-z_]\w*)|([-\+\*\.\\/%&\|\^=!<>~])|([\{\}\[\]\(\);,])|(.)/g;
        tokens[1] = keywords;
        // 对代码进行词法分析
        let match;
        while ((match = regex.exec(code)) !== null) {
            if (match[1]) tokens[0].push({ type: 'WHITESPACE', value: match[1] }); // 空白字符
            else if (match[2]) tokens[0].push({ type: 'COMMENT', value: match[2] }); // 注释
            else if (match[3]) tokens[0].push({ type: 'PREPROCESSOR', value: match[3] }); // 预处理指令
            else if (match[4]) tokens[0].push({ type: 'STRING', value: match[4] }); // 字符串常量
            else if (match[5]) tokens[0].push({ type: 'NUMBER', value: match[5] }); // 数字常量
            else if (match[6]) {
                if (keywords.includes(match[6])) {
                    tokens[0].push({ type: 'KEYWORD', value: match[6] }); // 关键字
                } else {
                    tokens[0].push({ type: 'IDENTIFIER', value: match[6] }); // 标识符
                }
            }
            else if (match[7]) tokens[0].push({ type: 'OPERATOR', value: match[7] }); // 运算符
            else if (match[8]) tokens[0].push({ type: 'DELIMITER', value: match[8] }); // 分隔符
            else{
                if(tokens[0].length > 0 && tokens[0][tokens[0].length - 1].type === 'UNKNOWN'){
                    tokens[0][tokens[0].length - 1].value += match[9];
                }
                else{
                    tokens[0].push({ type: 'UNKNOWN', value: match[9] });
                }
            }
            console.log(match);
        }
    }
    else if(mode === 'JavaScript'){
        const keywords = ['break', 'delete', 'if', 'this', 'while', 'case', 'do', 'in', 'throw', 'with', 'catch', 'else', 'instanceof', 'try', 'continue', 'finally', 'new', 'typeof', 'debugger', 'for', 'return', 'var', 'default', 'function', 'switch', 'void']
        const regex = /(\s+)|(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\]|\\.)*?"|'(?:[^'\\]|\\.)*?')|([-\+]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-\+]?(?:0|[1-9]\d*))?)|([A-Za-z_$]\w*)|([-\+\*\.\\/%&\|\^=!<>~])|([\{\}\[\]\(\);,])|(.)/g;
        tokens[1] = keywords;
        // 对代码进行词法分析
        let match;
        while ((match = regex.exec(code)) !== null) {
            if (match[1]) tokens[0].push({ type: 'WHITESPACE', value: match[1] }); // 空白字符
            else if (match[2]) tokens[0].push({ type: 'COMMENT', value: match[2] }); // 注释
            else if (match[3]) tokens[0].push({ type: 'STRING', value: match[3] }); // 字符串常量
            else if (match[4]) tokens[0].push({ type: 'NUMBER', value: match[4] }); // 数字常量
            else if (match[5]) {
                if (keywords.includes(match[5])) {
                    tokens[0].push({ type: 'KEYWORD', value: match[5] }); // 关键字
                } else {
                    tokens[0].push({ type: 'IDENTIFIER', value: match[5] }); // 标识符
                }
            }
            else if (match[6]) tokens[0].push({ type: 'OPERATOR', value: match[6] }); // 运算符
            else if (match[7]) tokens[0].push({ type: 'DELIMITER', value: match[7] }); // 分隔符
            else{
                if(tokens[0].length > 0 && tokens[0][tokens[0].length - 1].type === 'UNKNOWN'){
                    tokens[0][tokens[0].length - 1].value += match[8];
                }
                else{
                    tokens[0].push({ type: 'UNKNOWN', value: match[8] });
                }
            }
        }
    }
    return tokens;
}