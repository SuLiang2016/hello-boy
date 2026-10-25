<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'

const route = useRoute()
const tabs = [
  { name: 'home', label: '乐园', icon: 'home' },
  { name: 'groups', label: '成语', icon: 'star' },
  { name: 'poem-groups', label: '古诗', icon: 'book' },
  { name: 'stars', label: '我的星星', icon: 'trophy' },
]
const active = computed(() => {
  if (route.meta.board === 'poem') return 'poem-groups'
  if (route.meta.board === 'idiom') return 'groups'
  return route.name
})
</script>

<template>
  <nav class="tabbar">
    <router-link v-for="t in tabs" :key="t.name" :to="{ name: t.name }" class="tab" :class="{ active: active === t.name }">
      <Icon :name="t.icon" :size="26" />
      <span>{{ t.label }}</span>
    </router-link>
  </nav>
</template>
