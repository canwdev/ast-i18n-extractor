<template>
  <section class="billing-card" data-testid="billing-card">
    <h2 :title="cardTitle">{{ cardTitle }}</h2>

    <!-- v-if / v-else-if / v-else 三个分支的文案都会被抽取 -->
    <p v-if="loading">Loading your invoices...</p>
    <p v-else-if="error">{{ 'We could not load your invoices' }}</p>
    <p v-else>Your invoices are up to date.</p>

    <!-- 静态属性与 :attr="'字面量'" 都会抽取；href / data-* 不会 -->
    <input :placeholder="'Filter invoices'" />
    <a :href="helpLink" target="_blank">Open help center</a>

    <!-- SVG path 属于绘制数据，不会被当作文案 -->
    <svg class="icon" viewBox="0 0 16 16">
      <path d="M4 9l3 3 6-6" />
    </svg>

    <ul>
      <li v-for="row in rows" :key="row.id">{{ row.label }}</li>
    </ul>

    <button type="button" @click="retry">{{ retryLabel }}</button>
  </section>
</template>

<script>
export default {
  name: 'BillingCard',
  data() {
    return {
      loading: false,
      error: null,
      helpLink: '/help',
      // 末尾数字不同的文案会合并为 `Invoice {0}`
      rows: [
        { id: 1, label: 'Invoice 1' },
        { id: 2, label: 'Invoice 2' },
        { id: 3, label: 'Invoice 3' },
      ],
    }
  },
  computed: {
    cardTitle() {
      return 'Billing overview'
    },
    retryLabel() {
      return 'Retry loading'
    },
    // 已有 $t 调用会被识别为「已有 Key」，不重复生成
    sectionTitle() {
      return this.$t('billing.section_title')
    },
  },
  methods: {
    retry() {
      this.$message.error('Retry is not available yet')
      // console 参数属于调试信息，不抽取
      console.log('debug only, console arguments are skipped')
      alert(`Retried ${this.rows.length} times`)
    },
    formatAmount(amount) {
      return `Amount due is ${amount}`
    },
  },
}
</script>

<style scoped>
.billing-card {
  padding: 16px;
}
</style>
