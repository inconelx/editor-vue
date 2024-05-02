<template>
  <div>
    <textarea type="text" v-model="inputText" @input="highlightKeywords" placeholder="Enter text"></textarea>
    <div v-html="highlightedText"></div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      inputText: '',
      keywordGroups: [
        { keywords: ['keyword1', 'keyword2'], styleClass: 'highlight1' },
        { keywords: ['keyword3', 'keyword4'], styleClass: 'highlight2' }
      ]
    };
  },
  computed: {
    highlightedText() {
      let text = this.inputText;
      // 遍历关键字组
      this.keywordGroups.forEach(group => {
        // 对每组关键字进行高亮处理
        group.keywords.forEach(keyword => {
          const regExp = new RegExp(keyword, 'gi'); // 创建正则表达式，忽略大小写
          // 将匹配到的关键字用 <span> 标签包裹起来，并添加样式类
          text = text.replace(regExp, `<span class="${group.styleClass}">${keyword}</span>`);
        });
      });
      return text;
    }
  },
  methods: {
    highlightKeywords() {
      // 可以在这里实现自动高亮
      // 这里省略自动高亮的实现
    }
  }
};
</script>
<style>
  .highlight1 {
    color: red;
  }
  .highlight2 {
    color: blue;
  }
</style>