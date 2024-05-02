<template>
    <div class="outCover" :style="themeBack">
        <div class="detailOptions">
            <button class="themeButton" @click="themeChange" :style="themeColor">◑</button>
            <select v-model="lauguageMode" class="lauguageModeSelect" :style="themeColor">
                <option v-for="option in lauguageOptions" :value="option.value" :style="[themeBack, themeColor]">{{ option.text }}</option>
            </select>
        </div>
        <div class="meditor">
            <div ref="rowList" class="rowNum" :style="dynamicStyles" v-html="rowNumText"></div>
            <div ref="editor" class="editor" :style="dynamicStyles">
                <div ref="showText" class="Text show" :style="[dynamicStyles, themeColor]" v-html="inputText"></div>
                <textarea ref="textarea" class="Text inputTextarea" spellcheck="false" @mousedown="mDown" @scroll="sMove" @keydown="specialKey" @input="onInput" @mousemove="mMove" @wheel="fontChange" :style="[dynamicStyles, themeCaretColor]"></textarea>
                <select ref="promptBox" :class="{ 'blackBack': blackUsed, 'lightBack': !blackUsed }" class="promptBox" :style="[promptBoxStyles, themeColor, themeBack]" @click="submitPromptByClick" @keydown.enter="submitPromptByEnter" @keydown.esc="promptBoxHide" :size="selectSize" v-model="selectedOption">
                    <option v-for="option in options" :value="option.value" :style="[dynamicStyles, themeColor, themeBack]">{{ option.text }}</option>
                </select>
            </div>
            <div ref="markdownShow" class="markdownShow" :style="markdownWidth"><div class="Text" v-html="markdownText"></div></div>
        </div>
    </div>
</template>
 
<script>
import {lexer} from './analysis.js'
import {marked} from 'marked'
export default {
    data() {
        return {
            markdownText: '',
            inputText: '',
            rowNumText: '',
            commentHead: '//',
            fontSize: 32,
            tabSize: 4,
            prevSelectionStart: 0,
            prevSelectionEnd: 0,
            fontFamily: 'Consolas',
            promptBoxLeft: 0,
            promptBoxTop: 0,
            promptBoxDisplay: 'none',
            promptBoxOpacity: 1,
            selectedOption: '1',
            options: [
                { text: '1', value: '1' },
                { text: '2', value: '2' },
                { text: '3', value: '3' }
            ],
            promptWordLen: 0,
            textRollLeft: 0,
            textRollTop: 0,
            blackUsed: true,
            lauguageMode: 'C',
            lauguageOptions: [
                { text: 'C', value: 'C' },
                { text: 'JavaScript', value: 'JavaScript' },
                { text: 'Markdown', value: 'Markdown' }
            ],
            inputMouseX: 0,
            inputMouseY: 0,
        };
    },
    computed: {
        dynamicStyles() {
            return {
                fontSize: this.fontSize + 'px',
                lineHeight: this.fontSize * 1.25 + 'px',
                letterSpacing: 0,
                tabSize: this.tabSize,
                fontFamily: this.fontFamily,
            };
        },
        promptBoxStyles() {
            return {
                left: this.promptBoxLeft - this.textRollLeft + 'px',
                top: this.promptBoxTop - this.textRollTop + 'px',
                display: this.promptBoxDisplay,
                opacity: this.promptBoxOpacity,
                width: this.fontSize * 16 + 'px',
            };
        },
        selectSize() {
            return Math.min(this.options.length > 1 ? this.options.length : 2, 8);
        },
        markdownWidth(){
            return{
                color: this.blackUsed?'white':'black',
                flexGrow: this.lauguageMode === 'Markdown' ? 1 : 0,
                margin: this.lauguageMode === 'Markdown' ? '6px 6px 6px 3px' : '0px 0px 0px 3px',
            }
        },
        themeBack(){
            return{
                backgroundColor: this.blackUsed?'rgb(64, 64, 64)':'skyblue',
            }
        },
        themeColor(){
            return{
                color: this.blackUsed?'white':'black',
                borderColor: this.blackUsed?'gray':'gray',
            }
        },
        themeCaretColor(){
            return{
                caretColor: this.blackUsed?'white':'black',
            }
        },
    },
    watch: {
    },
    methods: {
        jaccardSimilarity(str1, str2, n) {
            const grams1 = new Set();
            const grams2 = new Set();
            // 生成 str1 的 n-gram 集合
            for (let i = 0; i < str1.length - n + 1; i++) {
                grams1.add(str1.slice(i, i + n));
            }
            // 生成 str2 的 n-gram 集合
            for (let i = 0; i < str2.length - n + 1; i++) {
                grams2.add(str2.slice(i, i + n));
            }
            // 返回交集大小
            return [...grams1].filter(gram => grams2.has(gram)).length;
        },
        sortBySimilarity(pstr, strs) {
            let alpha = pstr.length / 4 + 1 / 4;
            const similarityMap = new Map();
            const strsArray = [];
            for(const astr in strs) {
                if(astr.length >= pstr.length){
                    const similarity = this.jaccardSimilarity(pstr, astr, Math.min(pstr.length, 2)); // 计算交集大小
                    if(similarity >= alpha){
                        similarityMap.set(astr, similarity);
                        strsArray.push(astr);
                    }
                }
            }
            const sortedStrs = [...strsArray].sort((a, b) => similarityMap.get(b) - similarityMap.get(a)); // 按相似度排序
            return sortedStrs;
        },
        updateInput(str){
            var matches = str.match(/\n/g);
            matches = matches ? matches.length + 1 : 1;
            let rtext = '';
            for(let i = 0; i < matches; i++){
                rtext += (i + 1) + '\n';
            }
            this.rowNumText = rtext + '\n';
            let text = str + "\n";
            if(this.lauguageMode === 'Markdown'){
                this.markdownText = marked(str);
                this.inputText = text.replace(/&/g, '&amp;');
                this.inputText = text.replace(/</g, '&lt;');
            }
            else{
                let tokens, keywords;
                [tokens, keywords] = lexer(text, this.lauguageMode);
                this.inputText = '';
                let lenCount = 0;
                let prompts = {};
                for(var i = 0; i < keywords.length; i++){
                    prompts[keywords[i]] = 0;
                }
                const textarea = this.$refs.textarea;
                var usePrompts = textarea.selectionStart == textarea.selectionEnd;
                var promptsUsed = false;
                var promptWord;
                for(var i = 0; i < tokens.length; i++){
                    let x = tokens[i].value;
                    if(tokens[i].type === 'PREPROCESSOR' || tokens[i].type === 'STRING' || tokens.type === 'OPERATOR'){
                        x = x.replace(/</g, '&lt;') 
                    }
                    this.inputText += '<span class="' + tokens[i].type + '">' + x + '</span>';
                    if(usePrompts || promptsUsed || lenCount < textarea.selectionStart){
                        if(tokens[i].type === 'IDENTIFIER'){
                            if(tokens[i].value in prompts){
                                prompts[tokens[i].value]++;
                            }
                            else{
                                prompts[tokens[i].value] = 1;
                            }
                        }
                        if(!promptsUsed){
                            lenCount += tokens[i].value.length;
                            if(tokens[i].type === 'IDENTIFIER' || tokens[i].type === 'KEYWORD'){
                                if(lenCount === textarea.selectionStart){
                                    promptsUsed = true;
                                    promptWord = tokens[i].value;
                                }
                            }
                        }
                    }
                }
                if(promptsUsed){
                    if(prompts[promptWord] === 1){
                        delete prompts[promptWord];
                    }
                    this.promptWordLen = promptWord.length;
                    var sortedStrs = this.sortBySimilarity(promptWord, prompts);
                    if(sortedStrs.length > 0){
                        this.options = [];
                        this.selectedOption = sortedStrs[0];
                        for(const i in sortedStrs){
                            this.options.push({ text: sortedStrs[i], value: sortedStrs[i]});
                        }
                        this.promptBoxUpdate();
                    }
                    else{
                        this.promptBoxDisplay = 'none';
                    }
                }
                else{
                    this.promptBoxDisplay = 'none';
                }
            }
        },
        onInput(event){
            if(event.isTrusted){
                const textarea = this.$refs.textarea;
                this.updateInput(textarea.value);
            }
        },
        promptBoxUpdate(){
            this.promptBoxDisplay = 'block';
            const textarea = this.$refs.textarea;
            const start = textarea.selectionStart;
            const startStr = textarea.value.slice(0, start);
            const startLines = startStr.split('\n');
            const preLine = startLines[startLines.length - 1];
            const width = this.lineWidth(preLine);
            this.promptBoxLeft = width;
            this.promptBoxTop = this.fontSize * 1.25 * startLines.length;
        },
        specialInput(inputStr, replaceLen){
            const textarea = this.$refs.textarea;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const startStr = textarea.value.substring(0, start - replaceLen) + inputStr;
            const endStr = textarea.value.substring(end);
            textarea.value = startStr + endStr;
            textarea.selectionStart = textarea.selectionEnd = start + inputStr.length - replaceLen;
            const startLines = startStr.split('\n');
            const preLine = startLines[startLines.length - 1];
            var width = this.lineWidth(preLine);
            var height = startLines.length * this.fontSize * 1.25;
            if(width - textarea.scrollLeft > textarea.clientWidth){
                textarea.scrollLeft = width - textarea.clientWidth;
            }
            else if(width - textarea.scrollLeft < 0){
                textarea.scrollLeft = width;
            }
            if(height - textarea.scrollTop > textarea.clientHeight){
                textarea.scrollTop = height - textarea.clientHeight;
            }
            else if(height - textarea.scrollTop < 0){
                textarea.scrollTop = height;
            }
            this.updateInput(textarea.value);
        },
        specialKey(event) {
            if(event.key === 'Tab') {
                event.preventDefault();
                const textarea = this.$refs.textarea;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const shiftPressed = event.shiftKey
                if(!shiftPressed && !textarea.value.substring(start, end).includes('\n')){
                    this.specialInput('\t', 0);
                }
                else{//快速缩进
                    var lineStart = start;
                    var lineEnd = end;
                    for(; lineStart > 0 && textarea.value[lineStart - 1] != '\n'; lineStart--);
                    if(textarea.value[lineEnd - 1] === '\n') lineEnd--;
                    const startStr = textarea.value.substring(0, lineStart);
                    const endStr = textarea.value.substring(lineEnd);
                    const midStr = textarea.value.substring(lineStart, lineEnd);
                    const startLines = midStr.split('\n');
                    textarea.value = startStr;
                    if(!shiftPressed){
                        for(let i = 0; i < startLines.length; i++){
                            textarea.value += '\t' + startLines[i];
                            if(i < startLines.length - 1) textarea.value += '\n';
                        }
                        textarea.value += endStr;
                        textarea.selectionStart = start + 1;
                        textarea.selectionEnd = end + startLines.length;
                    }
                    else{
                        let x0 = 0;
                        let xsum = 0;
                        for(let i = 0; i < startLines.length; i++){
                            if(startLines[i][0] === '\t'){
                                textarea.value += startLines[i].substring(1);
                                xsum++;
                                if(i === 0) x0++;
                            }
                            else{
                                textarea.value += startLines[i];
                            }
                            if(i < startLines.length - 1) textarea.value += '\n';
                        }
                        textarea.value += endStr;
                        textarea.selectionStart = start - x0;
                        textarea.selectionEnd = end - xsum;
                    }
                    this.updateInput(textarea.value);
                }
            }
            else if((event.key === 'ArrowUp' || event.key === 'ArrowDown') && this.promptBoxDisplay === 'block'){
                event.preventDefault();
                this.$refs.promptBox.focus();
            }
            else if(event.key === 'Enter'){//自动缩进
                event.preventDefault();
                const textarea = this.$refs.textarea;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                var tabs = '\n';
                if(start > 0){
                    var len = 0;
                    for(let i = start - 1; i >= 0 && textarea.value[i] != '\n'; i--){
                        if(textarea.value[i] === '\t'){
                            len++;
                        }
                    }
                    if(textarea.value[start - 1] === '{' || textarea.value[start - 1] === '(' || textarea.value[start - 1] === '['){
                        len++;
                    }
                    if(textarea.value[start - 1] === '{' && textarea.value[end] === '}' ||
                        textarea.value[start - 1] === '(' && textarea.value[end] === ')' ||
                        textarea.value[start - 1] === '[' && textarea.value[end] === ']' ){
                        const startStr = textarea.value.substring(0, end) + '\n';
                        const endStr = textarea.value.substring(end);
                        textarea.value = startStr + endStr;
                        textarea.selectionStart = start;
                        textarea.selectionEnd = end;
                    }
                    for(let i = 0; i < len; i++){
                        tabs += '\t';
                    }
                }
                this.specialInput(tabs, 0);
            }
            else if(event.key === '[' || event.key === '{' || event.key === '"' || event.key === "'" || event.key === '('){//左右括号一起打
                event.preventDefault();
                const textarea = this.$refs.textarea;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const startStr = textarea.value.substring(0, start) + event.key;
                var a;
                if(event.key === '[') a = ']';
                if(event.key === '{') a = '}';
                if(event.key === "'") a = "'";
                if(event.key === '"') a = '"';
                if(event.key === '(') a = ')';
                const midStr = textarea.value.substring(start, end) + a;
                const endStr = textarea.value.substring(end);
                textarea.value = startStr + midStr + endStr;
                textarea.selectionStart = start + 1;
                textarea.selectionEnd = end + 1;
                this.updateInput(textarea.value);
            }
            else if(event.key === 'Backspace'){//左右括号并列时一块删除
                const textarea = this.$refs.textarea;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                if(start === end && start > 0 && start < textarea.value.length){
                    if(textarea.value[start - 1] === '[' && textarea.value[start] === ']' ||
                    textarea.value[start - 1] === '{' && textarea.value[start] === '}' ||
                    textarea.value[start - 1] === "'" && textarea.value[start] === "'" ||
                    textarea.value[start - 1] === '"' && textarea.value[start] === '"' ||
                    textarea.value[start - 1] === '(' && textarea.value[start] === ')'){
                        event.preventDefault();
                        const startStr = textarea.value.substring(0, start - 1);
                        const endStr = textarea.value.substring(start + 1);
                        textarea.value = startStr + endStr;
                        textarea.selectionStart = start - 1;
                        textarea.selectionEnd = end - 1;
                        this.updateInput(textarea.value);
                    }
                }
            }
            else if(event.key === '/' && event.ctrlKey){//快速注释
                const textarea = this.$refs.textarea;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                var lineStart = start;
                var lineEnd = end;
                for(; lineStart > 0 && textarea.value[lineStart - 1] != '\n'; lineStart--);
                if(textarea.value[lineEnd - 1] === '\n') lineEnd--;
                const midStr = textarea.value.substring(lineStart, lineEnd);
                const startStr = textarea.value.substring(0, lineStart);
                const endStr = textarea.value.substring(lineEnd);
                const startLines = midStr.split('\n');
                var flag = true;//true代表去注释
                for(let i = 0; i < startLines.length; i++){
                    let xstr = startLines[i].trim();
                    if(!(xstr.length >= this.commentHead.length && xstr.substring(0, this.commentHead.length) === this.commentHead)){
                        flag = false;
                        break;
                    }
                }
                if(flag){
                    var xstr = '';
                    var state = true;
                    var startDes = 0;
                    var endDes = 0;
                    for(let i = lineStart; i < lineEnd; i++){
                        if(state > 0){
                            if(textarea.value.substring(i, i + this.commentHead.length) === this.commentHead){
                                state = false;
                                if(start > i) startDes += this.commentHead.length;
                                if(end > i) endDes += this.commentHead.length;
                                i += this.commentHead.length - 1;
                            }
                            else{
                                xstr += textarea.value[i];
                            }
                        }
                        else{
                            xstr += textarea.value[i];
                            if(textarea.value[i] === '\n'){
                                state = true;
                            }
                        }
                    }
                    textarea.value = startStr + xstr + endStr;
                    textarea.selectionStart = start - startDes;
                    textarea.selectionEnd = end - endDes;
                    this.updateInput(textarea.value);
                }
                else{
                    var xstr = '';
                    var state = true;
                    var startAdd = 0;
                    var endAdd = 0;
                    for(let i = lineStart; i < lineEnd; i++){
                        if(state){
                            xstr += this.commentHead;
                            if(start > i) startAdd += this.commentHead.length;
                            if(end > i) endAdd += this.commentHead.length;
                            state = false;
                        }
                        xstr += textarea.value[i];
                        if(!state){
                            if(textarea.value[i] === '\n'){
                                state = true;
                            }
                        }
                    }
                    textarea.value = startStr + xstr + endStr;
                    textarea.selectionStart = start + startAdd;
                    textarea.selectionEnd = end + endAdd;
                    this.updateInput(textarea.value);
                }
            }
            else if((event.key === 'b' || event.key === 'i' || event.key === 's' || event.key === 'k') && event.ctrlKey && this.lauguageMode === 'Markdown'){
                event.preventDefault();
                const textarea = this.$refs.textarea;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const startStr = textarea.value.substring(0, start);
                const midStr = textarea.value.substring(start, end);
                const endStr = textarea.value.substring(end);
                var a;
                if(event.key === 'b') a = '**';
                else if(event.key === 'i') a = '*';
                else if(event.key === 's') a = '~~';
                else if(event.key === 'k') a = '```';
                if(startStr.length >= a.length && startStr.substring(startStr.length - a.length) === a && endStr.length >= a.length && endStr.substring(0, a.length) === a){
                    textarea.value = startStr.substring(0, startStr.length - a.length) + midStr + endStr.substring(a.length);
                    textarea.selectionStart = start - a.length;
                    textarea.selectionEnd = end - a.length;
                }
                else{
                    textarea.value = startStr + a + midStr + a + endStr;
                    textarea.selectionStart = start + a.length;
                    textarea.selectionEnd = end + a.length;
                }
                this.updateInput(textarea.value);
            }
        },
        lineWidth(line){
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const font = this.fontSize + 'px ' + this.fontFamily;
            context.font = font;
            var fontWidth = context.measureText(' ').width;
            var textWidth = 0;
            var tabWidth = fontWidth * this.tabSize;
            for (let i = 0; i < line.length; i++){
                if(line[i] == '\t'){
                    textWidth = Math.floor(textWidth / tabWidth) * tabWidth + tabWidth;
                }
                else{
                    textWidth += context.measureText(line[i]).width;
                }
            }
            return textWidth;
        },
        mDown(event){
            this.promptBoxDisplay = 'none';
            setTimeout(() => {
                const textarea = this.$refs.textarea;
                if(event.offsetX <= textarea.clientWidth && event.offsetY <= textarea.clientHeight){
                    const start = textarea.selectionStart;
                    const startStr = textarea.value.slice(0, start);
                    const startLines = startStr.split('\n');
                    if(startLines.length > 0){
                        const preLine = startLines[startLines.length - 1];
                        const width = this.lineWidth(preLine);
                        if(width < textarea.scrollLeft){
                            textarea.scrollLeft = width;
                        }
                    }
                }
            }, 0);
        },
        mMove(event){
            const textarea = this.$refs.textarea;
            this.inputMouseX = event.clientX - textarea.getBoundingClientRect().left;
            this.inputMouseY = event.clientY - textarea.getBoundingClientRect().top;
        },
        sMove(){
            const textarea = this.$refs.textarea;
            const showText = this.$refs.showText;
            const rowList = this.$refs.rowList;
            showText.scrollLeft = textarea.scrollLeft;
            showText.scrollTop = textarea.scrollTop;
            rowList.scrollTop = textarea.scrollTop;
            this.textRollLeft = textarea.scrollLeft;
            this.textRollTop = textarea.scrollTop;
            if(this.promptBoxDisplay === 'block'){
                if(this.promptBoxLeft - textarea.scrollLeft < 0 || this.promptBoxLeft - textarea.scrollLeft > textarea.clientWidth + 1 ||
                this.promptBoxTop - textarea.scrollTop < 0 || this.promptBoxTop - textarea.scrollTop > textarea.clientHeight + 1){
                    this.promptBoxOpacity = 0;
                }
                else{
                    this.promptBoxOpacity = 1;
                }
            }
        },
        submitPromptByClick(event){
            event.preventDefault();
            this.specialInput(this.selectedOption, this.promptWordLen);
            this.promptBoxHide();
        },
        submitPromptByEnter(event){
            event.preventDefault();
            this.specialInput(this.selectedOption, this.promptWordLen);
            this.promptBoxHide();
        },
        promptBoxHide(){
            this.promptBoxDisplay = 'none';
            this.$refs.textarea.focus();
        },
        fontChange(event){
            if(event.ctrlKey){
                event.preventDefault();
                if(this.promptBoxDisplay === 'none'){
                    var preFontSize = this.fontSize;
                    this.fontSize = Math.min(Math.max(this.fontSize - event.deltaY / 100, 16), 96);
                    const textarea = this.$refs.textarea;
                    textarea.scrollLeft = (this.inputMouseX + textarea.scrollLeft) * this.fontSize / preFontSize - this.inputMouseX;
                    textarea.scrollTop = (this.inputMouseY + textarea.scrollTop) * this.fontSize / preFontSize - this.inputMouseY;
                }
            }
        },
        themeChange(){
            this.blackUsed = !this.blackUsed;
        },
    },
    mounted() {
        this.$watch('lauguageMode', (newValue, oldValue) => {
            if(newValue === 'Markdown'){
                this.promptBoxDisplay = 'none';
            }
            this.promptBoxDisplay = 'none';
            const textarea = this.$refs.textarea;
            this.updateInput(textarea.value);
        });
    },
}
</script>
  
<style>
    .outCover{
        /* width: 1200px;
        height: 800px; */
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
    }
    .detailOptions{
        display: flex;
        width: calc(100% - 6px);
        height: 42px;
        padding: 6px 0px 0px 6px;
    }
    .themeButton {
        background-color: rgba(0, 0, 0, 0);
        border: 1px solid;
        border-radius: 1px;
        width: 42px;
        font-size: 20px;
    }
    .themeButton:hover{
        background-color: rgba(128, 128, 128, 0.25);
    }
    .lauguageModeSelect{
        margin-left: 6px;
        outline: none;
        border: 1px solid;
        border-radius: 1px;
        width: 150px;
        background-color: rgba(0, 0, 0, 0);
        font-size: 20px;
        font-family: 'Consolas';
    }
    .lauguageModeSelect:hover{
        background-color: rgba(128, 128, 128, 0.25);
    }
    .meditor{
        display: flex;
        width: 100%;
        height: calc(100% - 48px);
    }
    .rowNum{
        position: relative;
        min-width: 36px;
        height: auto;
        margin: 6px 6px 6px 12px;
        white-space: pre;
        overflow: hidden;
        color: crimson;
        text-align: right;
    }
    .editor{
        position: relative;
        margin:6px 3px 6px 6px;
        border-left: 0;
        flex-grow: 1;
        height: auto;
        background-color: rgba(128, 128, 128, 0.125);
    }
    .Text{
        position: absolute;
        padding: 0;
        border: 0;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        white-space: pre;
        overflow: auto;
    }
    .Text::-webkit-scrollbar-track {
        background-color: rgba(0, 0, 0, 0.125);
        border-radius: 1px;
    }
    .Text::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.25);
        border-radius: 1px;
    }
    .Text::-webkit-scrollbar {
        width: 12px;
        height: 12px;
        background-color: rgba(0, 0, 0, 0);
    }
    .Text::-webkit-scrollbar-corner {
        background-color: rgba(0, 0, 0, 0.25);
        border-radius: 1px;
    }
    .show{
        z-index: 3;
        pointer-events: none;
        color: white;
    }
    .show::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0);
    }
    .show::-webkit-scrollbar-track {
        background-color: rgba(0, 0, 0, 0);
    }
    .show::-webkit-scrollbar-corner {
        background-color: rgba(0, 0, 0, 0);
    }
    .inputTextarea{
        outline: none;
        z-index: 4;
        background-color: rgba(0, 0, 0, 0);
        color: rgba(0, 0, 0, 0); 
        resize: none;
    }
    .inputTextarea::selection {  
        color: rgba(0, 0, 0, 0); 
    }
    .promptBox{
        position: absolute;
        z-index: 5;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        white-space: pre;
        border: 1px solid;
        border-radius: 1px;
        overflow-x: hidden;
        overflow-y: auto;
    }
    .markdownShow {
        position: relative;
        background-color: rgba(128, 128, 128, 0.125);
        flex-grow: 1;
        height: auto;
    }
    select::-webkit-scrollbar-track {
        background-color: rgba(0, 0, 0, 0.125);
        border-radius: 1px;
    }
    select::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.25);
        border-radius: 1px;
    }
    select::-webkit-scrollbar {
        width: 12px;
        height: 12px;
        background-color: whitesmoke;
    }
    ::selection {  
        background-color: rgba(0, 0, 255, 0.25);
    }
    .COMMENT {
        color: green;
        font-style: italic;
    }
    .PREPROCESSOR {
        color: royalblue;
    }
    .KEYWORD {
        color:indigo;
        font-weight: bold;
    }
    .IDENTIFIER {
        color:chocolate;
    }
    .OPERATOR{
        color: darkcyan;
    }
    .NUMBER{
        color: purple;
    }
    .STRING{
        color:mediumorchid;
    }
    .DELIMITER{
        color: darkcyan;
    }
    .UNKNOWN{
        text-decoration: underline wavy red;
    }
</style>