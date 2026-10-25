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

const board = computed(() => (route.meta.board === 'poem' ? 'poem' : 'idiom'))
const groups = computed(() => content.groupsOf(board.value))
const isPoem = computed(() => board.value === 'poem')

// 上一篇学完 80% 解锁下一篇（成语 8/10、古诗 12/15）
function needFor(g) {
  const i = groups.value.findIndex((x) => x.key === g.key)
  if (i <= 0) return 0
  return Math.ceil(content.ofGroup(groups.value[i - 1].key).length * 0.8)
}

function openChain() {
  if (session.chainUnlocked) router.push({ name: 'chain' })
  else if (groups.value.length) router.push({ name: 'group', params: { group: groups.value[0].key } })
}
</script>

<template>
  <div class="page">
    <div class="topbar">
      <div class="back" @click="router.push({ name: 'home' })"><Icon name="back" :size="26" /></div>
      <h1 style="margin: 0">{{ isPoem ? '古诗篇章' : '成语篇章' }}</h1>
      <span class="chip" style="margin-left: auto; color: #C79213">
        <Icon name="star" :size="20" />{{ session.progress?.totalStars ?? 0 }}
      </span>
    </div>

    <div
      v-if="!isPoem"
      class="card chain-entry"
      :class="{ locked: !session.chainUnlocked }"
      @click="openChain"
    >
      <div class="chain-entry-icon"><Icon name="link" :size="30" /></div>
      <div style="flex: 1; min-width: 0">
        <b style="font-size: 20px">成语接龙</b>
        <div style="color: var(--muted); font-size: 15px">
          <template v-if="!session.chainUnlocked">学会 1 个成语就解锁</template>
          <template v-else>每天一条链，首尾拼音接下去</template>
        </div>
      </div>
      <Icon v-if="!session.chainUnlocked" name="lock" :size="24" style="color: var(--muted)" />
      <span v-else class="chain-entry-go">去接龙</span>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px">
      <div
        v-for="g in groups"
        :key="g.key"
        class="card"
        :class="{ locked: !session.groupUnlocked(g.key) }"
        :style="{ borderColor: g.color, position: 'relative', cursor: session.groupUnlocked(g.key) ? 'pointer' : 'default', overflow: 'hidden' }"
        @click="session.groupUnlocked(g.key) && router.push({ name: content.routeName('group', board), params: { group: g.key } })"
      >
        <div style="display: flex; align-items: center; gap: 12px">
          <div :style="{ background: g.color, color: '#fff', width: 56, height: 56, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800 }">
            {{ g.name[0] }}
          </div>
          <div>
            <b style="font-size: 21px">{{ g.name }}</b>
            <div style="color: var(--muted); font-size: 15px">{{ g.motto }}</div>
          </div>
        </div>

        <div style="display: flex; gap: 6px; margin-top: 14px; flex-wrap: wrap">
          <span
            v-for="it in content.ofGroup(g.key)"
            :key="it.id"
            :style="{
              width: 20, height: 20, borderRadius: '50%',
              background: session.starsOf(it.id) === 2 ? g.color : session.starsOf(it.id) === 1 ? '#E8DFC8' : '#F2ECDC',
              border: '2px solid rgba(61,58,54,0.15)',
            }"
          ></span>
        </div>
        <div style="margin-top: 10px; font-size: 16px; color: var(--muted)">
          {{ session.progress?.groupCounts?.[g.key] ?? 0 }} / {{ session.progress?.groupTotals?.[g.key] ?? content.ofGroup(g.key).length }} {{ isPoem ? '首' : '个' }}
        </div>

        <div v-if="!session.groupUnlocked(g.key)" :style="{ position: 'absolute', inset: 0, background: '#FFF7E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }">
          <span style="font-weight: 800; font-size: 19px; color: var(--muted)">{{ g.name }}</span>
          <Icon name="lock" :size="30" />
          <span style="font-weight: 700">学完上一篇的 {{ needFor(g) }} {{ isPoem ? '首' : '个' }}就开啦</span>
        </div>
      </div>
    </div>

    <TabBar />
  </div>
</template>

<style scoped>
.chain-entry {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  cursor: pointer;
  border-color: #A67AB5;
  background: linear-gradient(90deg, #fff 0%, #F3EDF8 100%);
}
.chain-entry.locked { border-color: rgba(61, 58, 54, 0.12); background: #fff; opacity: 0.78; }
.chain-entry-icon {
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: #A67AB5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chain-entry.locked .chain-entry-icon { background: #E8DFC8; color: var(--muted); }
.chain-entry-go { color: #A67AB5; font-weight: 800; font-size: 16px; flex: none; }
</style>
