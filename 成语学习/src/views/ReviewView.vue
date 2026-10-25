<script setup>
// 今日复习：每个到期内容随机一题，答错不惩罚（成语、古诗混排）
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api.js'
import { useSession, useContent } from '../store.js'
import { chime } from '../sound.js'
import Icon from '../components/Icon.vue'

const router = useRouter()
const session = useSession()
const content = useContent()

// 到期清单（进入页面时快照）
const queue = ref([...(session.progress?.due || [])])
const idx = ref(0)
const picked = ref(null)
const finished = ref(false)
const done = ref([]) // {idiomId, correct, remembered, bonusStar}

const item = computed(() => content.byId[queue.value[idx.value]])

// 每个内容随机抽一题，选项打乱
const q = computed(() => {
  if (!item.value) return null
  const src = item.value.quiz[Math.floor(Math.random() * item.value.quiz.length)]
  const correct = src.options[src.answer]
  const options = [...src.options].sort(() => Math.random() - 0.5)
  return {
    type: src.type,
    prompt: src.question || content.meaningPrompt(item.value),
    options,
    answerIndex: options.indexOf(correct),
    explain: src.explain,
  }
})
const isRight = computed(() => picked.value === q.value?.answerIndex)

function pick(i) {
  if (picked.value !== null) return
  picked.value = i
  chime(i === q.value.answerIndex)
}

async function next() {
  const id = item.value.id
  const correct = isRight.value
  try {
    const r = await api('/review-result', { method: 'POST', body: { idiomId: id } })
    done.value.push({ idiomId: id, correct, remembered: r.remembered, bonusStar: r.bonusStar, stage: r.stage })
  } catch (e) {
    done.value.push({ idiomId: id, correct, error: e.message })
  }
  if (idx.value < queue.value.length - 1) {
    idx.value++
    picked.value = null
  } else {
    finished.value = true
    await session.refreshProgress()
  }
}

const totalRight = computed(() => done.value.filter((d) => d.correct).length)
const anyRemembered = computed(() => done.value.some((d) => d.remembered))
</script>

<template>
  <div class="page" style="max-width: 640px">
    <div class="topbar">
      <div class="back" @click="router.push({ name: 'home' })"><Icon name="back" :size="26" /></div>
      <b style="font-size: 22px; flex: 1">今日复习</b>
      <span style="color: var(--muted)">{{ finished ? queue.length : Math.min(idx + 1, queue.length) }} / {{ queue.length }}</span>
    </div>

    <div v-if="!queue.length" class="card" style="text-align: center; padding: 30px">
      <div style="font-size: 48px">🌤️</div>
      <h2>今天没有要复习的内容</h2>
      <p style="color: var(--muted)">到期了会在这里提醒你，先去学点新的吧</p>
      <button class="btn" @click="router.push({ name: 'home' })">回乐园</button>
    </div>

    <template v-else-if="!finished">
      <div class="quiz-dots">
        <span v-for="(n, i) in queue.length" :key="i" :class="{ done: i < idx, now: i === idx }"></span>
      </div>

      <div class="card" :key="item?.id">
        <div style="text-align: center; margin-bottom: 6px">
          <b style="font-size: 30px">{{ content.titleOf(item) }}</b>
          <div style="color: var(--muted)">{{ content.metaOf(item) }}</div>
        </div>

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
          <span class="badge-letter">{{ q.type === 'usage' ? (i === 0 ? '对' : '错') : 'ABCD'[i] }}</span>
          <span>{{ opt }}</span>
        </button>

        <div v-if="picked !== null" class="card pop-in" :style="{ background: isRight ? 'var(--green-light)' : '#FDE8E4', border: 'none', margin: '6px 0 0' }">
          <b>{{ isRight ? '答对啦！' : '没关系，绿色那个才是对的' }}</b>
          <div style="font-size: 17px">{{ q.explain }}</div>
        </div>

        <button v-if="picked !== null" class="btn big blue" style="margin-top: 14px" @click="next">
          {{ idx === queue.length - 1 ? '完成复习' : '下一个' }}
        </button>
      </div>
    </template>

    <template v-else>
      <div class="card pop-in" style="text-align: center; padding: 30px 22px">
        <div style="font-size: 52px">🌞</div>
        <h1>复习完成！</h1>
        <p style="font-size: 19px">一口气复习了 {{ queue.length }} 个内容，答对 {{ totalRight }} 个</p>
        <p v-if="done.some(d => d.bonusStar)" style="color: #C79213; font-weight: 700">
          <Icon name="star" :size="20" /> 今天的复习全部完成，奖励 1 颗星星！
        </p>
        <p v-if="anyRemembered" style="color: #C79213; font-weight: 700">
          <Icon name="crown" :size="20" /> 有内容五轮复习全过，已经牢记啦！
        </p>
        <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: center; flex-wrap: wrap">
          <button class="btn" @click="router.push({ name: 'home' })">回乐园</button>
          <button class="btn ghost" @click="router.push({ name: 'dressup' })">去装扮间</button>
        </div>
      </div>
    </template>
  </div>
</template>
