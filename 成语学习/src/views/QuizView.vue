<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'
import { useSession, useContent, BADGES } from '../store.js'
import { chime, fanfare } from '../sound.js'
import Icon from '../components/Icon.vue'

const route = useRoute()
const router = useRouter()
const session = useSession()
const content = useContent()

const item = computed(() => content.byId[route.params.id])
const board = computed(() => content.boardOfItem(item.value) || route.meta.board || 'idiom')
const againLabel = computed(() => content.boardDef(board.value)?.again || '内容')
const learnName = computed(() => content.routeName('learn', board.value))
const groupName = computed(() => content.routeName('group', board.value))

// ---------- 出题（选项打乱） ----------
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const questions = computed(() => item.value ? item.value.quiz.map((q) => {
  const correct = q.options[q.answer]
  const options = shuffle(q.options)
  return {
    type: q.type,
    prompt: q.question || content.meaningPrompt(item.value),
    options,
    answerIndex: options.indexOf(correct),
    explain: q.explain,
  }
}) : [])

// ---------- 答题状态 ----------
const idx = ref(0)
const picked = ref(null) // 选中的选项下标
const correctCount = ref(0)
const finished = ref(false)

const q = computed(() => questions.value[idx.value])
const isRight = computed(() => picked.value === q.value?.answerIndex)

function pick(i) {
  if (picked.value !== null) return
  picked.value = i
  if (i === q.value.answerIndex) {
    correctCount.value++
    chime(true)
  } else {
    chime(false)
  }
}

function next() {
  if (idx.value < questions.value.length - 1) {
    idx.value++
    picked.value = null
  } else {
    submit()
  }
}

// ---------- 提交与结果 ----------
const result = ref(null)
const submitting = ref(false)
const badgeQueue = ref([])

async function submit() {
  finished.value = true
  submitting.value = true
  try {
    result.value = await api('/quiz-result', {
      method: 'POST',
      body: { idiomId: item.value.id, correct: correctCount.value },
    })
    await session.refreshProgress()
    if (result.value.passed && result.value.starsDelta > 0) fanfare()
    badgeQueue.value = [...(result.value.newBadges || [])]
  } catch (e) {
    result.value = { error: e.message }
  } finally {
    submitting.value = false
  }
}

function retry() {
  idx.value = 0
  picked.value = null
  correctCount.value = 0
  finished.value = false
  result.value = null
}

const LETTERS = ['A', 'B', 'C', 'D']
</script>

<template>
  <div class="page" style="max-width: 640px" v-if="item">
    <!-- 答题中 -->
    <template v-if="!finished">
      <div class="topbar">
        <div class="back" @click="router.push({ name: learnName, params: { id: item.id } })"><Icon name="back" :size="26" /></div>
        <b style="font-size: 22px; flex: 1">{{ content.titleOf(item) }}</b>
        <span style="color: var(--muted)">第 {{ idx + 1 }} / {{ questions.length }} 题</span>
      </div>

      <div class="quiz-dots">
        <span v-for="(n, i) in questions" :key="i" :class="{ done: i < idx, now: i === idx }"></span>
      </div>

      <div class="card" key="q">
        <h2 style="line-height: 1.5">{{ q.prompt }}</h2>

        <button
          v-for="(opt, i) in q.options"
          :key="i"
          class="option-btn pop-in"
          :class="{
            right: picked !== null && i === q.answerIndex,
            wrong: picked === i && i !== q.answerIndex,
            dim: picked !== null && i !== q.answerIndex && picked !== i,
          }"
          :style="{ animationDelay: i * 0.06 + 's' }"
          @click="pick(i)"
        >
          <span class="badge-letter">{{ q.type === 'usage' ? (i === 0 ? '对' : '错') : LETTERS[i] }}</span>
          <span>{{ opt }}</span>
        </button>

        <div v-if="picked !== null" class="card pop-in" :style="{ background: isRight ? 'var(--green-light)' : '#FDE8E4', border: 'none', margin: '6px 0 0' }">
          <b>{{ isRight ? '答对啦！' : '不是这个哦' }}</b>
          <div style="font-size: 17px">{{ q.explain }}</div>
        </div>

        <button v-if="picked !== null" class="btn big blue" style="margin-top: 14px" @click="next">
          {{ idx === questions.length - 1 ? '看结果' : '下一题' }}
        </button>
      </div>
    </template>

    <!-- 结果 -->
    <template v-else>
      <div class="card pop-in" style="text-align: center; padding: 34px 22px">
        <template v-if="result?.error">
          <p class="error-tip">{{ result.error }}</p>
          <button class="btn ghost" @click="retry">再试一次</button>
        </template>

        <template v-else-if="result?.capped">
          <div style="font-size: 52px">🌙</div>
          <h1>今天学满啦！</h1>
          <p style="font-size: 19px">
            {{ content.nameOf(board) }}一天最多算学会 {{ result.dailyCap }} {{ content.unitOf(board) }}，你今天已经学满了。<br>
            这一张还没记下，明天来接着学正好。
          </p>
        </template>

        <template v-else-if="result?.passed">
          <div style="display: flex; justify-content: center; gap: 10px; margin: 10px 0 16px">
            <Icon v-for="n in result.starsDelta" :key="n" name="star" :size="64" class="burst" :style="{ color: '#F5B841', animationDelay: n * 0.18 + 's' }" />
          </div>
          <h1>学会「{{ content.titleOf(item) }}」啦！</h1>
          <p style="font-size: 19px">答对 {{ correctCount }} / {{ questions.length }} 题，得到 {{ result.starsDelta }} 颗星星</p>
          <p v-if="result.streak > 1" style="color: #E8604C; font-weight: 700">
            <Icon name="flame" :size="20" /> 已经连续学习 {{ result.streak }} 天，真厉害！
          </p>
        </template>

        <template v-else>
          <div style="font-size: 52px">🌱</div>
          <h1>差一点点！</h1>
          <p style="font-size: 19px">答对 {{ correctCount }} / {{ questions.length }} 题，再读一遍{{ againLabel }}就来试，肯定行</p>
        </template>

        <div style="display: flex; gap: 12px; margin-top: 22px; flex-wrap: wrap; justify-content: center">
          <button v-if="!result?.passed || result?.capped" class="btn blue" @click="router.push({ name: learnName, params: { id: item.id } })">再读一遍{{ againLabel }}</button>
          <button v-if="!result?.passed && !result?.capped" class="btn ghost" @click="retry">直接再测</button>
          <button v-if="result?.passed && !result?.capped && correctCount < questions.length" class="btn blue" @click="retry">冲两颗星</button>
          <button v-if="result?.passed" class="btn ghost" @click="router.push({ name: groupName, params: { group: item.group } })">回篇章</button>
        </div>
      </div>
    </template>

    <!-- 新徽章庆祝 -->
    <div v-if="badgeQueue.length" style="position: fixed; inset: 0; background: rgba(61,58,54,0.55); display: flex; align-items: center; justify-content: center; z-index: 99" @click="badgeQueue.shift()">
      <div class="card pop-in" style="text-align: center; max-width: 340px; padding: 30px 24px">
        <div style="font-size: 20px; color: var(--muted); font-weight: 700">叮！收到新徽章</div>
        <div class="burst" :style="{ width: 110, height: 110, margin: '14px auto', borderRadius: '50%', background: BADGES.find(b => b.id === badgeQueue[0])?.color || '#F5B841', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
          <Icon name="trophy" :size="56" style="color: #fff" />
        </div>
        <h2 style="margin: 0">{{ BADGES.find(b => b.id === badgeQueue[0])?.name }}</h2>
        <p style="color: var(--muted)">{{ BADGES.find(b => b.id === badgeQueue[0])?.hint }}</p>
        <button class="btn big blue">继续</button>
      </div>
    </div>
  </div>
</template>
