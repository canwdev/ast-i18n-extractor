export default {
  head() {
    return generateHead.call(this, {
      offText: `Sale! ${this.off} OFF! ${this.isCN} ENDS TODAY! ${this.item}`,
      title: `Head Text is Here! | ${this.$t('title')}`,
      description: this.isEN
        ? `Is this the real life? Is this just fantasy? (JS)`
        : this.$t('page.desc'),
      ogDesc: 'Such a lovely place (Such a lovely place)',
      ogImage: `Such AAA lovely place (Such a lovely place)`,
    })
  },
  name: 'DemoVue2',
  label2: 'Welcome to the sample region',
  components: { SubComponent2, SubComponent1, TestComponent },
  data() {
    return {
      isCN: false,
      off: 10,
      item: {
        id: 1,
        label: 'FormatA',
        label2: 'Welcome to the sample venue',
      },
      testList: ['PlatformA', 'PlatformB', 'PlatformC', 'PlatformD', 'PlatformE'],
    }
  },
  computed: {
    title() {
      return `It's close to midnight, and something evil's lurking in the dark`
    },
    ndList() {
      return [
        { label: 'Tiny Dancer in my hand, pirouetting for the man.', class: 'main' },
        { label: 'Same Text', class: 'sub' },
        { label: 'Same Text', class: 'sub' },
        { label: 'Same Text', class: 'sub' },
        { label: 'Same Text', class: 'sub' },
        { label: '', class: 'sub' },
      ]
    },
    demoFeats() {
      return [
        [
          'Compression Option',
          'Video Quality',
          'SampleMetric',
          'Ideal Use Cases',
          'Network Requirement',
        ],
        [
          'Full FormatA',
          'Highest',
          'High (Lossless)',
          'High-end studios, live broadcasts',
          'High-speed network',
        ],
        ['FormatA HX', 'Good', 'Lowest', 'Balanced', 'Use case description one'],
        ['FormatA HX2', 'Good', 'Low', 'Feature note one', 'Use case description two'],
        ['FormatA HX3', 'Great', 'Medium', 'Feature note two', 'Feature note three'],
      ]
    },
  },
  methods: {
    onLangChange(lang = 'Demo text') {
      alert(`Hello world!${lang}`)
      const text = 'Plenty of room at the sample venue'
      const text2 = `You can find ${lang} here !!!`
      console.log(text)
    },
    checkValidate() {
      for (const item of this.testList) {
        if (!item.type) {
          this.$message.error('Please select social media type')
          return false
        }
        if (!item.url) {
          this.$message.error('Please input social media link')
          return false
        }
        if (!isOutLink(item.url)) {
          this.$message.error('Please input a valid link')
          return false
        }
      }
      return true
    },
  },
}
