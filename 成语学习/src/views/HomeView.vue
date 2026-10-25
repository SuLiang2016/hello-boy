<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSession, useContent } from '../store.js'
import Avatar from '../components/Avatar.vue'
import Icon from '../components/Icon.vue'
import TabBar from '../components/TabBar.vue'

const router = useRouter()
const session = useSession()
const content = useContent()

const hello = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深啦'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const total = content.idioms.length
const learned = session.progress ? session.learnedCount : 0
const dueCount = computed(() => session.progress?.due?.length || 0)
const equipped = computed(() => session.kid?.equipped || {})

// 「去学一个」：从已解锁篇章里找第一个还没学会的
function nextOne() {
  const p = session.progress
  if (!p) return router.push({ name: 'groups' })
  for (const g of p.unlocked) {
    const target = content.ofGroup(g).find((i) => !p.learned[i.id])
    if (target) return router.push({ name: 'learn', params: { id: target.id } })
  }
  router.push({ name: 'groups' })
}
</script>

<template>
  <div class="page">
    <div class="topbar" style="margin-bottom: 8px">
      <div style="cursor: pointer" title="点头像去装扮间" @click="router.push({ name: 'dressup' })">
        <Avatar v-if="session.kid" :kind="session.kid.avatar" :equipped="equipped" :size="58" />
      </div>
      <div>
        <h1 style="margin: 0; font-size: 26px">{{ hello }}，{{ session.kid?.name }}</h1>
        <span style="color: var(--muted)">今天想学点什么呢？</span>
      </div>
    </div>

    <div style="display: flex; gap: 12px; margin: 14px 0 20px; flex-wrap: wrap">
      <span class="chip" style="color: #C79213"><Icon name="star" :size="22" />{{ session.progress?.totalStars ?? 0 }} 颗星星</span>
      <span class="chip" style="color: #E8604C"><Icon name="flame" :size="22" />连续 {{ session.progress?.streak ?? 0 }} 天</span>
      <span class="chip" style="color: #5E8C61"><Icon name="check" :size="22" />学会 {{ learned }} / {{ total }}</span>
    </div>

    <div class="card" :style="{ background: session.progress?.todayDone ? 'var(--green-light)' : '#fff' }" style="margin-bottom: 16px; display: flex; align-items: center; gap: 16px">
      <Icon :name="session.progress?.todayDone ? 'check' : 'star'" :size="40" :style="{ color: session.progress?.todayDone ? '#5E8C61' : '#F5B841' }" />
      <div style="flex: 1">
        <b style="font-size: 21px">{{ session.progress?.todayDone ? '今天已经打过卡啦，真棒！' : '今日目标：学会 1 个新成语' }}</b>
        <div style="color: var(--muted); font-size: 16px">{{ session.progress?.todayDone ? '复习旧成语也算天天学习哦' : '读完一个故事、答对题目就能拿到星星' }}</div>
      </div>
      <button v-if="dueCount === 0 && !session.progress?.todayDone" class="btn green" @click="nextOne">去学</button>
    </div>

    <!-- 今日复习 -->
    <div v-if="dueCount > 0" class="card" style="margin-bottom: 20px; display: flex; align-items: center; gap: 16px; border-color: #6FA8DC">
      <Icon name="book" :size="40" style="color: #4A7FB5" />
      <div style="flex: 1">
        <b style="font-size: 21px">今日复习：{{ dueCount }} 个成语到期啦</b>
        <div style="color: var(--muted); font-size: 16px">每个答一题就行，全答完奖励 1 颗星星</div>
      </div>
      <button class="btn blue" @click="router.push({ name: 'review' })">去复习</button>
    </div>

    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px">
      <div class="card" style="cursor: pointer; background: linear-gradient(180deg, #fff 0%, #FFF3D6 100%); border: 3px solid #F5B841" @click="router.push({ name: 'groups' })">
        <div style="font-size: 44px; line-height: 1">🏮</div>
        <h2 style="margin: 10px 0 4px">成语</h2>
        <p style="color: var(--muted); margin: 0 0 10px">故事 · 星星 · 徽章</p>
        <div style="background: #fff; border-radius: 999px; height: 20px; overflow: hidden; border: 3px solid rgba(61,58,54,0.08)">
          <div :style="{ width: (total ? (learned / total) * 100 : 0) + '%', height: '100%', background: '#F5B841', transition: 'width .4s' }"></div>
        </div>
        <b style="font-size: 17px">{{ learned }} / {{ total }} 个</b>
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px">
        <div class="card" style="cursor: pointer; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 6px; border-color: #E8604C" @click="router.push({ name: 'dressup' })">
          <div style="display: flex; justify-content: center"><Avatar :kind="session.kid?.avatar || 'panda'" :equipped="equipped" :size="44" /></div>
          <b>装扮间</b><span style="font-size: 14px; color: var(--muted)">花星星打扮自己</span>
        </div>
        <div class="card" style="opacity: 0.55; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 6px">
          <div style="display: flex; justify-content: center"><Icon name="lock" :size="30" /></div>
          <b>古诗</b><span style="font-size: 14px; color: var(--muted)">即将开放</span>
        </div>
      </div>
    </div>

    <TabBar />
  </div>
</template>
