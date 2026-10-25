<script setup>
import { useRouter } from 'vue-router'
import { api, setKidToken } from '../api.js'
import { useSession, useContent, BADGES } from '../store.js'
import Avatar from '../components/Avatar.vue'
import Icon from '../components/Icon.vue'
import TabBar from '../components/TabBar.vue'

const router = useRouter()
const session = useSession()
const content = useContent()

async function logout() {
  try { await api('/logout', { method: 'POST' }) } catch {}
  setKidToken('')
  session.kid = null
  session.progress = null
  session.booted = false
  router.replace({ name: 'login' })
}

const earned = (id) => session.progress?.badges?.includes(id)
const weekday = (dateStr) => '日一二三四五六'[new Date(dateStr + 'T00:00:00').getDay()]
const boardLearned = (board) => session.progress?.boardCounts?.[board] || 0

const BOARDS = [
  { key: 'idiom', label: '学会的成语' },
  { key: 'poem', label: '学会的古诗' },
]
</script>

<template>
  <div class="page" v-if="session.kid">
    <div class="topbar">
      <Avatar :kind="session.kid.avatar" :equipped="session.kid.equipped" :size="58" />
      <div>
        <h1 style="margin: 0; font-size: 26px">{{ session.kid.name }}的星星</h1>
        <span style="color: var(--muted)">每一颗都是自己挣来的</span>
      </div>
      <button class="btn ghost" style="margin-left: auto; min-height: 46px; font-size: 16px; box-shadow: none" @click="router.push({ name: 'dressup' })">装扮间</button>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 14px; margin-bottom: 20px">
      <div class="card" style="text-align: center; padding: 16px 8px">
        <Icon name="star" :size="30" style="color: #F5B841" />
        <div style="font-size: 28px; font-weight: 800">{{ session.progress?.totalStars ?? 0 }}</div>
        <div style="color: var(--muted); font-size: 14px">星星钱包</div>
      </div>
      <div class="card" style="text-align: center; padding: 16px 8px">
        <Icon name="check" :size="30" style="color: #F5B841" />
        <div style="font-size: 28px; font-weight: 800">{{ boardLearned('idiom') }}</div>
        <div style="color: var(--muted); font-size: 14px">学会的成语</div>
      </div>
      <div class="card" style="text-align: center; padding: 16px 8px">
        <Icon name="book" :size="30" style="color: #6FA8DC" />
        <div style="font-size: 28px; font-weight: 800">{{ boardLearned('poem') }}</div>
        <div style="color: var(--muted); font-size: 14px">学会的古诗</div>
      </div>
      <div class="card" style="text-align: center; padding: 16px 8px">
        <Icon name="flame" :size="30" style="color: #E8604C" />
        <div style="font-size: 28px; font-weight: 800">{{ session.progress?.streak ?? 0 }}</div>
        <div style="color: var(--muted); font-size: 14px">连续天数</div>
      </div>
      <div class="card" style="text-align: center; padding: 16px 8px">
        <Icon name="crown" :size="30" style="color: #C79213" />
        <div style="font-size: 28px; font-weight: 800">{{ session.progress?.rememberedCount ?? 0 }}</div>
        <div style="color: var(--muted); font-size: 14px">已牢记</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px">
      <h2 style="font-size: 20px">这两周</h2>
      <div class="cal-grid">
        <div
          v-for="d in session.progress?.recent14 || []"
          :key="d.date"
          class="day"
          :class="{ hit: d.newLearned > 0 || d.reviews > 0, today: d.date === (session.progress?.recent14 || []).slice(-1)[0]?.date }"
        >
          <span>{{ weekday(d.date) }}</span>
          <span v-if="d.newLearned > 0" style="font-size: 16px">+{{ d.newLearned }}</span>
          <span v-else-if="d.reviews > 0" style="font-size: 13px; color: #4A7FB5">复习</span>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px">
      <h2 style="font-size: 20px">徽章（{{ (session.progress?.badges || []).length }} / {{ BADGES.length }}）</h2>
      <div class="badge-grid">
        <div v-for="b in BADGES" :key="b.id" class="badge-cell" :class="{ locked: !earned(b.id) }">
          <div :style="{ width: 64, height: 64, margin: '0 auto 8px', borderRadius: '50%', background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }">
            <Icon name="trophy" :size="34" style="color: #fff" />
          </div>
          <div class="name">{{ b.name }}</div>
          <div class="hint">{{ earned(b.id) ? '已拿到' : b.hint }}</div>
        </div>
      </div>
    </div>

    <div v-for="b in BOARDS" :key="b.key" class="card" style="margin-bottom: 20px" v-show="boardLearned(b.key) > 0">
      <h2 style="font-size: 20px">{{ b.label }}</h2>
      <template v-for="g in content.groupsOf(b.key)" :key="g.key">
        <div v-if="(session.progress?.groupCounts?.[g.key] || 0) > 0" style="margin-bottom: 12px">
          <b :style="{ color: g.color }">{{ g.name }}</b>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px">
            <span v-for="it in content.ofGroup(g.key).filter(i => session.starsOf(i.id) > 0)" :key="it.id"
              class="chip" :style="{ fontSize: '16px', padding: '4px 12px', borderColor: session.isRemembered(it.id) ? '#F5B841' : undefined }">
              <Icon v-if="session.isRemembered(it.id)" name="crown" :size="16" style="color: #C79213" />
              {{ content.titleOf(it) }}
              <Icon name="star" :size="16" :style="{ color: '#F5B841' }" />{{ session.starsOf(it.id) }}
            </span>
          </div>
        </div>
      </template>
    </div>

    <div class="card" v-if="session.learnedCount === 0">
      <p style="color: var(--muted); margin: 0">还没有学会的内容，去乐园里学第一个吧！</p>
    </div>

    <div style="text-align: center; margin: 26px 0 10px">
      <button class="btn ghost" style="min-height: 46px; font-size: 17px" @click="logout">退出登录</button>
    </div>

    <TabBar />
  </div>
</template>
