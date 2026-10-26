<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSession, useContent, BOARDS } from '../store.js'
import Avatar from '../components/Avatar.vue'
import Icon from '../components/Icon.vue'
import Scene from '../components/Scene.vue'
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

// 首页卡片的外观是每个板块各自的，不进注册表
const HOME_STYLE = {
  idiom: { icon: '🏮', color: '#F5B841', bg: 'linear-gradient(180deg, #fff 0%, #FFF3D6 100%)', desc: '故事 · 星星 · 徽章' },
  poem: { icon: '📜', color: '#6FA8DC', bg: 'linear-gradient(180deg, #fff 0%, #EAF3FB 100%)', desc: '读诗 · 听故事 · 答三题' },
  shizi: { icon: '✏️', color: '#5E8C61', bg: 'linear-gradient(180deg, #fff 0%, #EAF6EC 100%)', desc: '长得像的字 · 一字多音' },
}

const liveBoards = computed(() => BOARDS.filter((b) => HOME_STYLE[b.board] && content.groupsOf(b.board).length > 0))
const totalAll = computed(() => liveBoards.value.reduce((n, b) => n + content.totalOf(b.board), 0))
const learnedTotal = computed(() =>
  liveBoards.value.reduce((n, b) => n + (session.progress?.boardCounts?.[b.board] || 0), 0)
)
const dueCount = computed(() => session.progress?.due?.length || 0)
const dueDeferred = computed(() => session.progress?.dueDeferred || 0)
const dueCounts = computed(() => {
  const counts = {}
  for (const b of liveBoards.value) counts[b.board] = 0
  for (const id of session.progress?.due || []) {
    const board = content.boardOfItem(content.byId[id])
    if (board && counts[board] !== undefined) counts[board]++
  }
  return counts
})
// 「成语 3 个 · 古诗 2 首」，只有真的有到期的板块才列出来
const dueBrief = computed(() =>
  liveBoards.value
    .filter((b) => (dueCounts.value[b.board] || 0) > 0)
    .map((b) => `${b.name} ${dueCounts.value[b.board]} ${b.unit}`)
    .join(' · ')
)
const shiziCap = computed(() => session.progress?.caps?.shizi || null)

const equipped = computed(() => session.kid?.equipped || {})
const sceneId = computed(() => equipped.value.scene || '')

const boardCards = computed(() => liveBoards.value.map((b) => ({
  key: b.board,
  name: b.name,
  unit: b.unit,
  route: b.routes.groups,
  learned: session.progress?.boardCounts?.[b.board] || 0,
  total: content.totalOf(b.board),
  ...HOME_STYLE[b.board],
})))

// 「去学一个」：从各板块已解锁的篇章里找第一个还没学会的
function nextOne() {
  const p = session.progress
  if (!p) return router.push({ name: 'groups' })
  for (const g of p.unlocked) {
    const target = content.ofGroup(g).find((i) => !p.learned[i.id])
    if (target) return router.push({ name: content.routeName('learn', content.boardOfGroup(g)), params: { id: target.id } })
  }
  if (p.unlocked.length) return router.push({ name: content.routeName('groups', content.boardOfGroup(p.unlocked[0])) })
  router.push({ name: 'groups' })
}

const percent = (n, total) => (total ? Math.round((n / total) * 100) : 0)

function openChain() {
  if (session.chainUnlocked) router.push({ name: 'chain' })
  else router.push({ name: 'groups' })
}
</script>

<template>
  <div class="page home-page">
    <Scene v-if="sceneId" :scene="sceneId" class="home-scene" />

    <div class="home-content">
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
        <span class="chip" style="color: #5E8C61"><Icon name="check" :size="22" />学会 {{ learnedTotal }} / {{ totalAll }}</span>
        <span v-if="session.progress?.chainDailyDone" class="chip" style="color: #A67AB5">
          <Icon name="link" :size="22" />今日接龙完成
        </span>
      </div>

      <div class="card" :style="{ background: session.progress?.todayDone ? 'var(--green-light)' : '#fff' }" style="margin-bottom: 16px; display: flex; align-items: center; gap: 16px">
        <Icon :name="session.progress?.todayDone ? 'check' : 'star'" :size="40" :style="{ color: session.progress?.todayDone ? '#5E8C61' : '#F5B841' }" />
        <div style="flex: 1">
          <b style="font-size: 21px">{{ session.progress?.todayDone ? '今天已经打过卡啦，真棒！' : '今日目标：学会 1 个新内容' }}</b>
          <div style="color: var(--muted); font-size: 16px">{{ session.progress?.todayDone ? '复习旧内容也算天天学习哦' : '一个成语、一首古诗或一组字都算，读完答对题就能拿到星星' }}</div>
        </div>
        <button v-if="dueCount === 0 && !session.progress?.todayDone" class="btn green" @click="nextOne">去学</button>
      </div>

      <!-- 今日复习（成语、古诗混排） -->
      <div v-if="dueCount > 0" class="card" style="margin-bottom: 20px; display: flex; align-items: center; gap: 16px; border-color: #6FA8DC">
        <Icon name="book" :size="40" style="color: #4A7FB5" />
        <div style="flex: 1">
          <b style="font-size: 21px">今日复习：{{ dueCount }} 个内容到期啦</b>
          <div style="color: var(--muted); font-size: 16px">
            {{ dueBrief }}，每个答一题就行，全答完奖励 1 颗星星
            <template v-if="dueDeferred > 0">　还有 {{ dueDeferred }} 条今天排不下，明天先做它们</template>
          </div>
        </div>
        <button class="btn blue" @click="router.push({ name: 'review' })">去复习</button>
      </div>

      <div class="board-grid">
        <div v-for="b in boardCards" :key="b.key" class="card board-card" :style="{ borderColor: b.color, background: b.bg }" @click="router.push({ name: b.route })">
          <div style="font-size: 42px; line-height: 1">{{ b.icon }}</div>
          <h2 style="margin: 8px 0 2px">{{ b.name }}</h2>
          <p style="color: var(--muted); margin: 0 0 10px">{{ b.desc }}</p>
          <div class="bar"><div :style="{ width: percent(b.learned, b.total) + '%', background: b.color }"></div></div>
          <b style="font-size: 17px">{{ b.learned }} / {{ b.total }} {{ b.unit }}</b>
          <div v-if="b.key === 'shizi' && shiziCap" class="cap-mini" :class="{ full: shiziCap.reached }">
            <Icon name="check" :size="16" />
            <span v-if="shiziCap.reached">今天 {{ shiziCap.cap }} {{ b.unit }}已学满，明天接着学</span>
            <span v-else>今天已学 {{ shiziCap.learnedToday }} / {{ shiziCap.cap }} {{ b.unit }}</span>
          </div>
          <div v-if="b.key === 'idiom'" class="chain-mini" @click.stop="openChain">
            <Icon name="link" :size="17" />
            <span v-if="!session.chainUnlocked">学会 1 个成语解锁接龙</span>
            <span v-else-if="session.progress?.chainDailyDone">今日接龙完成</span>
            <span v-else>去玩成语接龙</span>
            <Icon v-if="!session.chainUnlocked" name="lock" :size="14" />
          </div>
        </div>

        <div class="card board-card small-card" style="border-color: #E8604C" @click="router.push({ name: 'dressup' })">
          <div style="display: flex; justify-content: center"><Avatar :kind="session.kid?.avatar || 'panda'" :equipped="equipped" :size="46" /></div>
          <b>装扮间</b>
          <span style="font-size: 14px; color: var(--muted)">花星星打扮自己</span>
        </div>
      </div>

      <TabBar />
    </div>
  </div>
</template>

<style scoped>
.home-page { position: relative; }
.home-scene {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
.home-content { position: relative; z-index: 1; }
.board-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.board-card { cursor: pointer; }
.small-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}
.bar {
  background: #fff;
  border-radius: 999px;
  height: 20px;
  overflow: hidden;
  border: 3px solid rgba(61, 58, 54, 0.08);
  margin-bottom: 8px;
}
.bar > div { height: 100%; transition: width 0.4s; }
.chain-mini {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 12px;
  background: #F3EDF8;
  color: #A67AB5;
  font-size: 14px;
  font-weight: 700;
}
.cap-mini {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 12px;
  background: #EAF6EC;
  color: #5E8C61;
  font-size: 14px;
  font-weight: 700;
}
.cap-mini.full { background: #F3EDF8; color: #A67AB5; }
@media (max-width: 520px) {
  .board-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
  .board-card { padding: 16px 14px; }
}
</style>
