<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSession, useContent } from '../store.js'
import Icon from '../components/Icon.vue'
import TabBar from '../components/TabBar.vue'

const route = useRoute()
const router = useRouter()
const session = useSession()
const content = useContent()

const board = computed(() => route.meta.board || 'idiom')
const isPoem = computed(() => board.value === 'poem')
const isShizi = computed(() => board.value === 'shizi')
const group = computed(() => content.groupOf(route.params.group))
const items = computed(() => content.ofGroup(route.params.group))
const backName = computed(() => content.routeName('groups', board.value))
const learnName = computed(() => content.routeName('learn', board.value))
</script>

<template>
  <div class="page" v-if="group">
    <div class="topbar">
      <div class="back" @click="router.push({ name: backName })"><Icon name="back" :size="26" /></div>
      <div :style="{ background: group.color, color: '#fff', padding: '4px 16px', borderRadius: 14, fontWeight: 800, fontSize: 20 }">
        {{ group.name }}
      </div>
      <span style="color: var(--muted); margin-left: 4px">{{ group.motto }}</span>
    </div>

    <div class="card" style="padding: 8px">
      <div
        v-for="it in items"
        :key="it.id"
        @click="router.push({ name: learnName, params: { id: it.id } })"
        style="display: flex; align-items: center; gap: 14px; padding: 14px 12px; border-bottom: 2px solid rgba(61,58,54,0.06); cursor: pointer"
      >
        <div :style="{ background: '#FFF3D6', borderRadius: 14, minWidth: 84, height: 62, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', overflow: 'hidden' }">
          <span v-if="it.illustration" class="thumb-illo" v-html="it.illustration"></span>
          <!-- 识字卡没有插图，缩略位直接给字形；多音字卡chars是同字多读音，去重才不会出现「长长」 -->
          <b v-else :style="{ fontSize: 25, fontWeight: 800, color: group.color, letterSpacing: '3px' }">
            {{ [...new Set(it.chars.map((c) => c.zi))].join('') }}
          </b>
        </div>
        <div style="flex: 1; min-width: 0">
          <b style="font-size: 22px">{{ content.titleOf(it) }}</b>
          <div style="color: var(--muted); font-size: 15px">{{ content.metaOf(it) }}</div>
          <div v-if="isPoem" style="color: var(--muted); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ it.lines?.[0] }}{{ it.lines?.[1] }}</div>
          <div v-else-if="isShizi" style="color: var(--muted); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ it.tip }}</div>
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
