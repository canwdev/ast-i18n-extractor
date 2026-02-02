<script setup lang="ts">
import { ref, computed } from "vue";
import TestComponent from "~/components/TestComponent.vue";
import SubComponent1 from "~/components/SubComponent1.vue";
import SubComponent2 from "~/components/SubComponent2.vue";

interface Item {
  id: number;
  label: string;
  label2: string;
  moreLink?: string;
}

interface TestListItem {
  type?: string;
  url?: string;
}

interface NdListItem {
  label: string;
  class: string;
}

interface VideoData {
  src: string;
  poster: string;
  demo_text?: string;
}

interface BoxImage {
  ratio: number;
  style: string;
  videoData: VideoData;
  label: string;
  labelClass?: string;
}

const isCN = ref(false);
const off = ref(10);
const item = ref<Item>({
  id: 1,
  label: "PDF",
  label2: "Welcome to the Hotel California",
});
const testList = ref<TestListItem[]>(
  ["Facebook", "Twitter", "Instagram", "TikTok", "YouTube"].map((name) => ({
    name,
  })),
);

const title = computed(
  () => `It's close to midnight, and something evil's lurking in the dark`,
);

const ndList = computed<NdListItem[]>(() => [
  { label: "Tiny Dancer in my hand, pirouetting for the man.", class: "main" },
  { label: "Same Text", class: "sub" },
  { label: "Same Text", class: "sub" },
  { label: "Same Text", class: "sub" },
  { label: "Same Text", class: "sub" },
  { label: "", class: "sub" },
]);

const demoFeats = computed<string[][]>(() => [
  [
    "Compression Option",
    "Video Quality",
    "Bandwidth",
    "Ideal Use Cases",
    "Network Requirement",
  ],
  [
    "Full PDF",
    "Highest",
    "High (Lossless)",
    "High-end studios, live broadcasts",
    "High-speed network",
  ],
  [
    "PDF HX",
    "Good",
    "Lowest",
    "Balanced",
    "Remote production, education, corporate comms",
  ],
  [
    "PDF HX2",
    "Good",
    "Low",
    "Enhanced efficiency",
    "Reliable low-latency connections",
  ],
  [
    "PDF HX3",
    "Great",
    "Medium",
    "Greater efficiency",
    "Limited bandwidth scenarios",
  ],
]);

const boxImages = computed<BoxImage[]>(() => [
  {
    ratio: 0.56,
    style: "flex:1;",
    videoData: {
      src: "https://picsum.photos/300/400",
      poster: "https://picsum.photos/300/400",
    },
    label: "Ice, ice, baby.",
    labelClass: "active",
  },
  {
    ratio: 0.56,
    style: "flex:1;",
    videoData: {
      src: "https://picsum.photos/300/400",
      poster: "https://picsum.photos/300/400",
    },
    label: "Vanilla Ice, Ice Ice Baby",
  },
]);

const videoData1 = ref<VideoData>({
  src: "https://picsum.photos/400/200",
  poster: "https://picsum.photos/300/400",
});

const videoData2 = ref<VideoData>({
  demo_text:
    "Yesterday, all my troubles seemed so far away. Now it looks as though they're here to stay.",
  src: "https://picsum.photos/300/200",
  poster: "https://picsum.photos/200/300",
});

const onLangChange = (lang: string = "Demo text") => {
  alert("Hello world!" + lang);
  const text = "Plenty of room at the Hotel California";
  const text2 = `You can find ${lang} here !!!`;
  console.log(text);
};

const checkValidate = (): boolean => {
  for (const item of testList.value) {
    if (!item.type) {
      return false;
    }
    if (!item.url) {
      return false;
    }
  }
  return true;
};
</script>

<template>
  <div class="demo-vue-3">
    <div class="ta-h2">
      {{ "Demo Vue3 Component Long Long Long Long Text 01" }}
    </div>
    <div class="ta-h2">
      {{ "Demo Vue3 Component Long Long Long Long Text 02" }}
    </div>
    <div class="ta-h2">{{ `On Sale, ${off} OFF!` }}</div>
    <div class="ta-h2" v-html="`Cool HTML`"></div>
    <div class="ta-h2" v-html="title"></div>
    <div class="ta-h1">{{ title || $t("navbar.accessories") }}</div>
    <a
      v-if="item.moreLink"
      :href="item.moreLink"
      rel="nofollow"
      :data-id="`compare-more-${item.id}`"
      :data-href="item.moreLink"
      :data-phone="`iPhone`"
      :data-mac="`iMac`"
      :data-oses="['macOS', 'Windows', `Linux`, 'Android OS']"
      :data-ndi="`PDF`"
      target="_blank"
      class="compare-more"
    >
      Learn More
    </a>
    <div class="container w1200 padding-120">
      <div class="dialog-lr-layout _reversed">
        <div
          class="lr-left"
          data-lyric1="You may say I'm a dreamer, but I'm not the only one."
          :data-lyric2="'Hello, it\'s me. I was wondering if after all these years you\'d like to meet.'"
          :data-lyric3="`I'm a Barbie girl, in a Barbie world. Life in plastic, it's fantastic.`"
        >
          <div class="lr-title ta-h1">Wake me up when September ends.</div>
          <div class="lr-desc ta-text">
            "Just a small town girl, livin' in a lonely world. She took the
            midnight train goin' anywhere." - Journey, Don't Stop Believin'
            "I've got sunshine on a cloudy day. When it's cold outside, I've got
            the month of May." - The Temptations, My Girl
          </div>
        </div>
        <TestComponent
          :class="{ 'item-text-2-cn': isCN }"
          :title="`I want to break free, I want to break free from your lies.`"
          :desc="`Head and shoulders, knees and toes. Children's song, Head, Shoulders, Knees and Toes`"
          class="lr-right"
          :box-images="boxImages"
        >
          <!-- Test For Comment -->
          <AutoRatioBox
            v-lazy:background-image="`https://picsum.photos/300/400`"
            :ratio="1"
          />
        </TestComponent>
      </div>
    </div>

    <div class="container w1200 padding-120">
      <div class="videos-wrapper flex-rows">
        <div class="video-item">
          <SubComponent2
            :autoplay="false"
            is-passive
            :ratio="0.56"
            :video-data="videoData1"
          />
          <div class="dialog-tip-item">Like a rolling stone.</div>
        </div>
        <div class="video-item">
          <SubComponent2
            :autoplay="false"
            is-passive
            :ratio="0.56"
            :video-data="videoData2"
          />
          <div class="dialog-tip-item">Bob Dylan, Like a Rolling Stone</div>
        </div>
      </div>
    </div>

    <SubComponent1
      class="padding-120"
      title-class="ta-h2"
      :title="`I've talked to nearly 30,000 people on my show`"
      :desc="`And in the words of Maya Angelou, 'People will forget what you said, people will forget what you did, but people will never forget how you made them feel.' So, the real work of your life is to figure out what that is that you're supposed to be doing. And the way you do that is by asking yourself the right questions. And I've told you a couple of them.`"
    >
      <template #box>
        <div class="ndi-feats">
          <div class="row-header">
            <div
              v-for="(col, index) in demoFeats[0]"
              :key="index"
              class="col-item"
            >
              {{ col }}
            </div>
          </div>
          <div
            v-for="(row, index) in demoFeats.slice(1, demoFeats.length)"
            :key="index"
            class="row-content"
          >
            <div
              v-for="(col, colIndex) in row"
              :key="colIndex"
              class="col-item"
            >
              {{ col }}
            </div>
          </div>
        </div>
      </template>
    </SubComponent1>
  </div>
</template>

<style lang="scss" scoped>
.demo-vue-3 {
  color: red;
}
</style>
