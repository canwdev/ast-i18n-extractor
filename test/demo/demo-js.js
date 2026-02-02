export default {
  head() {
    return generateHead.call(this, {
      offText: `Sale! ${this.off} OFF! ${this.isCN} ENDS TODAY! ${this.item}`,
      title: `Head Text is Here! | ${this.$t('title')}`,
      description: this.isEN
        ? `Is this the real life? Is this just fantasy?`
        : this.$t('page.desc'),
      ogDesc: 'Such a lovely place (Such a lovely place)',
      ogImage: `Such AAA lovely place (Such a lovely place)`,
    })
  },
  name: 'DemoVue2',
  label2: 'Welcome to the XXX California',
  components: {SubComponent2, SubComponent1, TestComponent},
  data() {
    return {
      isCN: false,
      off: 10,
      item: {
        id: 1,
        label: 'PDF',
        label2: 'Welcome to the Hotel California',
      },
      testList: ['Facebook', 'Twitter', 'Instagram', 'TikTok', 'YouTube'],
    }
  },
  computed: {
    title() {
      return `It's close to midnight, and something evil's lurking in the dark`
    },
    ndList() {
      return [
        {label: 'Tiny Dancer in my hand, pirouetting for the man.', class: 'main'},
        {label: 'Same Text', class: 'sub'},
        {label: 'Same Text', class: 'sub'},
        {label: 'Same Text', class: 'sub'},
        {label: 'Same Text', class: 'sub'},
        {label: '', class: 'sub'},
      ]
    },
    demoFeats() {
      return [
        [
          'Compression Option',
          'Video Quality',
          'Bandwidth',
          'Ideal Use Cases',
          'Network Requirement',
        ],
        [
          'Full PDF',
          'Highest',
          'High (Lossless)',
          'High-end studios, live broadcasts',
          'High-speed network',
        ],
        ['PDF HX', 'Good', 'Lowest', 'Balanced', 'Remote production, education, corporate comms'],
        ['PDF HX2', 'Good', 'Low', 'Enhanced efficiency', 'Reliable low-latency connections'],
        ['PDF HX3', 'Great', 'Medium', 'Greater efficiency', 'Limited bandwidth scenarios'],
      ]
    },
  },
  methods: {
    onLangChange(lang = 'Demo text') {
      alert('Hello world!' + lang)
      const text = 'Plenty of room at the Hotel California'
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