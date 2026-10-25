<script setup>
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'

const route = useRoute()
const tabs = [
  { name: 'home', label: '乐园', icon: 'home' },
  { name: 'groups', label: '成语', icon: 'star' },
  { name: 'stars', label: '我的星星', icon: 'trophy' },
]
</script>

<template>
  <nav class="tabbar">
    <router-link v-for="t in tabs" :key="t.name" :to="{ name: t.name }" class="tab" :class="{ active: route.name === t.name || (t.name === 'groups' && ['group', 'learn', 'quiz'].includes(route.name)) }">
      <Icon :name="t.icon" :size="26" />
      <span>{{ t.label }}</span>
    </router-link>
  </nav>
</template>
