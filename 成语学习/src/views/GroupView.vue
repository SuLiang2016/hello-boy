<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useSession, useContent } from '../store.js'
import Icon from '../components/Icon.vue'
import TabBar from '../components/TabBar.vue'

const route = useRoute()
const router = useRouter()
const session = useSession()
const content = useContent()

const group = content.groupOf(route.params.group)
const idioms = content.ofGroup(route.params.group)
</script>

<template>
  <div class="page" v-if="group">
    <div class="topbar">
      <div class="back" @click="router.push({ name: 'groups' })"><Icon name="back" :size="26" /></div>
      <div :style="{ background: group.color, color: '#fff', padding: '4px 16px', borderRadius: 14, fontWeight: 800, fontSize: 20 }">
        {{ group.name }}
      </div>
      <span style="color: var(--muted); margin-left: 4px">{{ group.motto }}</span>
    </div>

    <div class="card" style="padding: 8px">
      <div
        v-for="it in idioms"
        :key="it.id"
        @click="router.push({ name: 'learn', params: { id: it.id } })"
        style="display: flex; align-items: center; gap: 14px; padding: 14px 12px; border-bottom: 2px solid rgba(61,58,54,0.06); cursor: pointer"
      >
        <div :style="{ background: '#FFF3D6', borderRadius: 14, width: 84, height: 62, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', overflow: 'hidden' }">
          <span class="thumb-illo" v-html="it.illustration"></span>
        </div>
        <div style="flex: 1">
          <b style="font-size: 22px">{{ it.word }}</b>
          <div style="color: var(--muted); font-size: 15px">{{ it.pinyin }}</div>
        </div>
        <div style="display: flex; gap: 2px; flex: none; align-items: center">
          <Icon v-if="session.isRemembered(it.id)" name="crown" :size="20" style="color: #C79213" />
          <Icon v-for="n in 2" :key="n" name="star" :size="24" :style="{ color: session.starsOf(it.id) >= n ? '#F5B841' : '#E8DFC8' }" />
        </div>
      </div>
    </div>

    <TabBar />
  </div>
</template>

<style scoped>
.row-illo :deep(svg) { width: 100%; height: 100%; }
</style>
