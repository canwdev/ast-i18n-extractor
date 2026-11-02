<script setup lang="ts">
import { computed, ref } from 'vue'

interface Member {
  id: number
  name: string
  role: string
}

// as const 数组同样会被遍历，末尾数字不同则合并为 `Role {0}`
const ROLES = ['Role 1', 'Role 2', 'Role 3'] as const

const members = ref<Member[]>([])
const pending = ref(false)
const activeRole = ref<string>(ROLES[0])

const emptyHint = computed(() => 'Invite a teammate to get started')
const summary = computed(() => `We have ${members.value.length} active members`)
const roleHint = computed(() =>
  activeRole.value === ROLES[0]
    ? 'Owners can transfer the workspace'
    : 'Admins manage members and billing',
)
// 已有 $t 调用不重复生成 key
const cardTitle = computed(() => $t('team.card_title'))

function invite(email: string) {
  // console 参数属于调试信息，不抽取
  console.log('debug only, console arguments are skipped')
  members.value.push({ id: members.value.length + 1, name: email, role: activeRole.value })
}
</script>

<template>
  <section class="team-card" data-testid="team-card">
    <h2 title="Workspace members">{{ cardTitle }}</h2>

    <!-- 三个分支的静态文案都会被抽取 -->
    <p v-if="pending">Loading members...</p>
    <p v-else-if="members.length === 0">{{ emptyHint }}</p>
    <p v-else>{{ summary }}</p>

    <input :placeholder="'Invite by email'" />
    <p>{{ roleHint }}</p>

    <ul>
      <li v-for="member in members" :key="member.id">{{ member.name }}</li>
    </ul>

    <button type="button" @click="invite('')">Send invite</button>
  </section>
</template>

<style scoped>
.team-card {
  padding: 16px;
}
</style>
