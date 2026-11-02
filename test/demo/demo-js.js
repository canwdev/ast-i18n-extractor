// JS 示例：Vue 2 选项式写法，覆盖对象属性、模板字符串、数组、已有 $t 复用、代码位置跳过
const COMPARE_CONFIG = {
  name: 'ComparePanel',
  id: 'compare-panel',
  class: 'compare-root',
}

export default {
  name: 'ComparePanel',
  data() {
    return {
      isCN: false,
      rows: [
        { label: 'Compression Option', value: 'Full' },
        { label: 'Video Quality', value: 'Highest' },
      ],
    }
  },
  computed: {
    // 含插值的模板字符串会转成 `{0}` 占位符并自动带参数
    pageTitle() {
      return `Compare ${this.rows.length} formats`
    },
    heroText() {
      return 'Choose the right format for your workflow'
    },
    // 已有 $t 调用会被识别，不重复生成 key
    sectionTitle() {
      return this.$t('compare.section_title')
    },
  },
  methods: {
    retry(count = 1) {
      this.$message.error('Please select a format first')
      alert(`Retry attempt ${count}`)
      // console 参数属于调试信息，不抽取
      console.log('debug only, console arguments are skipped')
      return this.rows.push({ label: 'Bitrate', value: 'Auto' })
    },
    normalize(text) {
      // String.replace 的替换串不抽取
      return text.replace(' ', '-')
    },
    save() {
      if (!this.rows.length) {
        throw new Error('Nothing to compare')
      }
    },
  },
}
