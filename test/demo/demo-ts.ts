interface Item {
  id: number
  label: string
  label2: string
  moreLink?: string
}

interface TestListItem {
  type?: string
  url?: string
}

interface NdListItem {
  label: string
  class: string
}

interface VideoData {
  src: string
  poster: string
  demo_text?: string
}

interface BoxImage {
  ratio: number
  style: string
  videoData: VideoData
  label: string
  labelClass?: string
}

enum Status {
  Active = "Active Status",
  Inactive = "Inactive Status"
}

const isCN = ref(false)
const off = ref(10)
const item = ref<Item>({
  id: 1,
  label: 'PDF',
  label2: 'Welcome to the Hotel California',
})
const testList = ref<TestListItem[]>(
  ['Facebook', 'Twitter', 'Instagram', 'TikTok', 'YouTube'].map(name => ({
    name,
  })),
)

const title = computed(
  () => `It's close to midnight, and something evil's lurking in the dark`,
)

const ndList = computed<NdListItem[]>(() => [
  { label: 'Tiny Dancer in my hand, pirouetting for the man.', class: 'main' },
  { label: 'Same Text', class: 'sub' },
  { label: 'Same Text', class: 'sub' },
  { label: 'Same Text', class: 'sub' },
  { label: 'Same Text', class: 'sub' },
  { label: '', class: 'sub' },
])

const demoFeats = computed<string[][]>(() => [
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
  [
    'PDF HX',
    'Good',
    'Lowest',
    'Balanced',
    'Remote production, education, corporate comms',
  ],
  [
    'PDF HX2',
    'Good',
    'Low',
    'Enhanced efficiency',
    'Reliable low-latency connections',
  ],
  [
    'PDF HX3',
    'Great',
    'Medium',
    'Greater efficiency',
    'Limited bandwidth scenarios',
  ],
])

const boxImages = computed<BoxImage[]>(() => [
  {
    ratio: 0.56,
    style: 'flex:1;',
    videoData: {
      src: 'https://picsum.photos/300/400',
      poster: 'https://picsum.photos/300/400',
    },
    label: 'Ice, ice, baby.',
    labelClass: 'active',
  },
  {
    ratio: 0.56,
    style: 'flex:1;',
    videoData: {
      src: 'https://picsum.photos/300/400',
      poster: 'https://picsum.photos/300/400',
    },
    label: 'Vanilla Ice, Ice Ice Baby',
  },
])

const videoData1 = ref<VideoData>({
  src: 'https://picsum.photos/400/200',
  poster: 'https://picsum.photos/300/400',
})

const videoData2 = ref<VideoData>({
  demo_text:
    'Yesterday, all my troubles seemed so far away. Now it looks as though they\'re here to stay.',
  src: 'https://picsum.photos/300/200',
  poster: 'https://picsum.photos/200/300',
})

function onLangChange(lang: string = 'Demo text') {
  alert(`Hello world!${lang}`)
  const text = 'Plenty of room at the Hotel California'
  const text2 = `You can find ${lang} here !!!`
  console.log(text)
}

function checkValidate(): boolean {
  for (const item of testList.value) {
    if (!item.type) {
      return false
    }
    if (!item.url) {
      return false
    }
  }
  return true
}
