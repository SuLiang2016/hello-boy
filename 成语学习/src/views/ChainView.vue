<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api.js'
import { useSession, useContent, BADGES } from '../store.js'
import { chime, fanfare } from '../sound.js'
import { buildOptions, pickHintOption } from '../chain-logic.mjs'
import Icon from '../components/Icon.vue'

const router = useRouter()
const session = useSession()
const content = useContent()

const phase = ref('menu') // menu | playing | done
const loading = ref(true)
const error = ref('')
const daily = ref(null)
const mode = ref('daily')
const chainId = ref('')
const playWords = ref([])
const stepIndex = ref(0)
const options = ref([])
const answerIndex = ref(-1)
const picked = ref(-1)
const wrongCount = ref(0)
const solved = ref(false)
const revealed = ref(false)
const removed = ref(new Set())
const hintsLeft = ref(3)
const guide = ref('')
const guideKind = ref('wrong')
const result = ref(null)
const badgeQueue = ref([])
const busy = ref(false)

const LETTERS = ['A', 'B', 'C', 'D']

const isDaily = computed(() => mode.value === 'daily')
const steps = computed(() => Math.max(0, playWords.value.length - 1))
const current = computed(() => playWords.value[stepIndex.value])
const nextWord = computed(() => playWords.value[stepIndex.value + 1])
const lastPy = computed(() => pinyinOf(current.value, 3))
const nextFirstPy = computed(() => pinyinOf(nextWord.value, 0))
const unlocked = computed(() => daily.value?.unlocked ?? session.progress?.chainUnlocked ?? false)
const dailyDone = computed(() => daily.value?.completed ?? session.progress?.chainDailyDone ?? false)
const playCount = computed(() => result.value?.totalPlays ?? daily.value?.totalPlays ?? session.progress?.chainPlayCount ?? 0)
const badgeProgress = computed(() => Math.min(10, playCount.value) * 10)
const currentBadge = computed(() => BADGES.find((b) => b.id === badgeQueue.value[0]) || null)
const modeLabel = computed(() => (isDaily.value ? '每日链' : '自由练习'))

const charsOf = (w) => Array.from(w?.word || '')
const pinyinOf = (w, i) => (w?.pinyinParts || String(w?.pinyin || '').split(/\s+/).filter(Boolean))[i] || ''

onMounted(loadMenu)

async function loadMenu() {
  loading.value = true
  error.value = ''
  try {
    daily.value = await api('/chain/daily')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function begin(m, chain, targetLength) {
  mode.value = m
  chainId.value = chain.id
  playWords.value = chain.words.slice(0, targetLength)
  stepIndex.value = 0
  hintsLeft.value = 3
  result.value = null
  badgeQueue.value = []
  setupStep()
  phase.value = 'playing'
  window.scrollTo({ top: 0 })
}

function startDaily() {
  if (!daily.value?.chain || daily.value.completed) return
  begin('daily', daily.value.chain, daily.value.targetLength)
}

async function startFree() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const r = await api('/chain/free')
    daily.value = { ...(daily.value || {}), totalPlays: r.totalPlays }
    begin('free', r.chain, r.targetLength)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

function setupStep() {
  picked.value = -1
  wrongCount.value = 0
  solved.value = false
  revealed.value = false
  removed.value = new Set()
  guide.value = ''
  guideKind.value = 'wrong'
  const o = buildOptions(playWords.value, content.chainWords, stepIndex.value)
  options.value = o.options
  answerIndex.value = o.answerIndex
}

function choose(i) {
  if (solved.value || revealed.value) return
  const opt = options.value[i]
  if (!opt || removed.value.has(opt.word)) return
  picked.value = i
  if (i === answerIndex.value) {
    solved.value = true
    guideKind.value = 'right'
    guide.value = `接上啦！「${opt.word}」的开头和前面的尾音正好接上。`
    chime(true)
    return
  }

  wrongCount.value++
  chime(false)
  if (wrongCount.value === 1) {
    guideKind.value = 'wrong'
    guide.value = `要接的是「${lastPy.value}」这个音，正确答案开头读「${nextFirstPy.value}」。再试一次！`
  } else {
    revealed.value = true
    guideKind.value = 'reveal'
    guide.value = `正确答案是「${nextWord.value.word}」，开头读「${nextFirstPy.value}」。记住这个音，继续往前接。`
  }
}

function useHint() {
  if (solved.value || revealed.value || hintsLeft.value <= 0) return
  const pick = pickHintOption(options.value, answerIndex.value, removed.value)
  if (!pick) return
  removed.value = new Set([...removed.value, pick.word])
  hintsLeft.value--
  guideKind.value = 'wrong'
  guide.value = `排除了一个不对的：「${pick.word}」。再想想尾音「${lastPy.value}」。`
}

function nextStep() {
  if (!solved.value && !revealed.value) return
  if (stepIndex.value < steps.value - 1) {
    stepIndex.value++
    setupStep()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    finish()
  }
}

async function finish() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const r = await api('/chain/complete', {
      method: 'POST',
      body: { chainId: chainId.value, mode: mode.value, stepsCompleted: steps.value },
    })
    result.value = r
    badgeQueue.value = [...(r.newBadges || [])]
    daily.value = {
      ...(daily.value || {}),
      completed: mode.value === 'daily' ? true : daily.value?.completed,
      totalPlays: r.totalPlays,
    }
    await session.refreshProgress()
    phase.value = 'done'
    fanfare()
    window.scrollTo({ top: 0 })
  } catch (e) {
    if (mode.value === 'daily' && e.message.includes('今天不是这条每日链')) {
      phase.value = 'menu'
      await loadMenu()
      error.value = '今天的每日链已经换新啦，这一局没记上，明天再来。'
    } else {
      error.value = e.message
    }
  } finally {
    busy.value = false
  }
}

function back() {
  if (phase.value === 'playing') {
    if (!window.confirm('现在退出，这一局就不算啦。确定吗？')) return
    phase.value = 'menu'
    loadMenu()
    return
  }
  if (phase.value === 'done') {
    phase.value = 'menu'
    loadMenu()
    return
  }
  router.push({ name: 'home' })
}

function playAnother() {
  startFree()
}

function goHome() {
  router.push({ name: 'home' })
}

function goLearn(cardId) {
  router.push({ name: 'learn', params: { id: cardId } })
}
</script>

<template>
  <div class="page chain-page">
    <div class="topbar">
      <div class="back" @click="back"><Icon name="back" :size="26" /></div>
      <div style="flex: 1">
        <h1 style="margin: 0; font-size: 26px">成语接龙</h1>
        <span style="color: var(--muted)">{{ phase === 'playing' ? modeLabel : '首尾拼音接下去' }}</span>
      </div>
      <span v-if="phase !== 'menu'" class="chip" style="color: #A67AB5; font-size: 16px">
        <Icon name="link" :size="18" />{{ phase === 'playing' ? `第 ${stepIndex + 1} / ${steps} 步` : `已完成 ${playCount} 局` }}
      </span>
    </div>

    <p v-if="error && phase !== 'playing'" class="error-tip" style="text-align: center">{{ error }}</p>

    <!-- 入口 -->
    <template v-if="phase === 'menu'">
      <div v-if="loading" class="card" style="text-align: center; padding: 30px">
        <b>正在准备今天的链…</b>
      </div>

      <template v-else-if="!unlocked">
        <div class="card locked-chain">
          <div class="locked-icon"><Icon name="lock" :size="42" /></div>
          <h2>接龙还锁着呢</h2>
          <p>先学会 1 个成语，接龙的门就开啦。</p>
          <button class="btn big blue" @click="router.push({ name: 'groups' })">去学一个成语</button>
        </div>
      </template>

      <template v-else>
        <div class="card chain-intro">
          <div class="intro-icon"><Icon name="link" :size="34" /></div>
          <div>
            <b style="font-size: 21px">尾音接首音，声调不同也能接</b>
            <p style="color: var(--muted); font-size: 16px; margin: 4px 0 0">
              每题 4 个选项，只有 1 个能接上。每局 3 次提示，每次排除一个错误选项。
            </p>
          </div>
        </div>

        <div class="mode-grid">
          <div class="card mode-card daily" :class="{ finished: dailyDone }">
            <div class="mode-head">
              <span class="mode-badge">每日链</span>
              <span class="chip" style="font-size: 14px">6 个成语</span>
            </div>
            <h2>今天的链</h2>
            <p v-if="daily?.chain" class="mode-desc">从「{{ daily.chain.words[0].word }}」开始，所有孩子今天都接这一条。</p>
            <p v-else class="mode-desc">今天的链还没准备好，稍后再来看看。</p>
            <div v-if="dailyDone" class="done-line">
              <Icon name="check" :size="22" />
              <b>今日接龙完成</b>
              <span>明天再来接新的</span>
            </div>
            <button v-else class="btn blue big" :disabled="!daily?.chain || busy" @click="startDaily">接今天的链</button>
          </div>

          <div class="card mode-card free">
            <div class="mode-head">
              <span class="mode-badge free">自由练习</span>
              <span class="chip" style="font-size: 14px">6-8 个成语</span>
            </div>
            <h2>随便接一条</h2>
            <p class="mode-desc">从链库里随机抽一条，想玩几次都行。</p>
            <button class="btn green big" :disabled="busy" @click="startFree">{{ busy ? '抽链中…' : '抽一条来玩' }}</button>
          </div>
        </div>

        <div class="card badge-progress-card">
          <div class="badge-progress-head">
            <Icon name="trophy" :size="28" style="color: #A67AB5" />
            <b style="font-size: 19px">接龙高手</b>
            <span style="margin-left: auto; color: var(--muted)">已完成 {{ playCount }} 局</span>
          </div>
          <div class="progress-track"><div class="progress-fill" :style="{ width: badgeProgress + '%' }"></div></div>
          <p style="margin: 8px 0 0; color: var(--muted); font-size: 15px">
            {{ playCount >= 10 ? '这枚徽章已经拿到啦，随时可以再玩。' : `再完成 ${10 - playCount} 局就能拿到「接龙高手」。` }}
          </p>
        </div>

        <p class="chain-note">
          接龙只记录局数，不给星星，也不算学会、复习和打卡。想拿星星，还是去学成语卡片哦。
        </p>
      </template>
    </template>

    <!-- 接龙中 -->
    <template v-else-if="phase === 'playing' && current">
      <div class="quiz-dots">
        <span v-for="(n, i) in steps" :key="i" :class="{ done: i < stepIndex, now: i === stepIndex }"></span>
      </div>

      <div class="card chain-current">
        <div class="chain-label">当前成语</div>
        <div class="char-row">
          <div v-for="(ch, i) in charsOf(current)" :key="i" class="char-tile" :class="{ tail: i === 3 }">
            <span class="char-py">{{ i === 3 ? pinyinOf(current, 3) : '' }}</span>
            <span class="char-ch">{{ ch }}</span>
          </div>
        </div>
        <p class="chain-prompt">
          下一个成语，开头要读 <b class="tail-sound">「{{ lastPy }}」</b>。
          <span class="tone-tip">声调不同也能接！</span>
        </p>
      </div>

      <div class="card" style="margin-top: 16px">
        <div class="options-head">
          <b style="font-size: 20px">选一个能接上的</b>
          <span style="color: var(--muted); font-size: 15px">4 个里只有 1 个对</span>
        </div>

        <button
          v-for="(opt, i) in options"
          :key="opt.word"
          class="option-btn chain-option"
          :class="{
            right: (solved || revealed) && i === answerIndex,
            wrong: picked === i && i !== answerIndex,
            dim: (solved || revealed) && i !== answerIndex,
            removed: removed.has(opt.word),
          }"
          :disabled="solved || revealed || removed.has(opt.word)"
          @click="choose(i)"
        >
          <span class="badge-letter">{{ LETTERS[i] }}</span>
          <span class="opt-body">
            <span class="opt-first">
              <span class="opt-py">{{ pinyinOf(opt, 0) }}</span>
              <span class="opt-ch">{{ charsOf(opt)[0] }}</span>
            </span>
            <span class="opt-rest">{{ charsOf(opt).slice(1).join('') }}</span>
          </span>
          <span v-if="removed.has(opt.word)" class="removed-tag">已排除</span>
        </button>

        <div v-if="guide" class="card pop-in feedback" :class="guideKind">
          <b>{{ guideKind === 'right' ? '接对啦！' : guideKind === 'reveal' ? '这次看答案' : '再想想' }}</b>
          <div style="font-size: 17px">{{ guide }}</div>
        </div>

        <div class="play-actions">
          <button class="btn ghost" :disabled="solved || revealed || hintsLeft <= 0" @click="useHint">
            提示 · 还剩 {{ hintsLeft }} 次
          </button>
          <button v-if="solved || revealed" class="btn big blue" :disabled="busy" @click="nextStep">
            {{ stepIndex === steps - 1 ? (busy ? '记录中…' : '完成接龙') : '接下一个' }}
          </button>
        </div>
        <p v-if="error" class="error-tip" style="margin-bottom: 0">{{ error }}</p>
      </div>

      <p class="chain-note">接龙不花星星，也不算学习和打卡。</p>
    </template>

    <!-- 完成 -->
    <template v-else-if="phase === 'done'">
      <div class="card done-hero pop-in">
        <div class="done-icon burst"><Icon name="link" :size="52" /></div>
        <h1>{{ isDaily ? '今天的接龙完成啦！' : '这条链接完啦！' }}</h1>
        <p style="font-size: 19px; margin: 4px 0 2px">{{ modeLabel }} · 接上了 {{ playWords.length }} 个成语</p>
        <p v-if="isDaily" style="color: var(--muted); margin: 0">明天还有新的每日链，记得回来。</p>
        <p v-else style="color: var(--muted); margin: 0">这一局已经记到「接龙高手」的进度里啦。</p>
        <div class="done-stats">
          <span class="chip">已完成 {{ result?.totalPlays ?? playCount }} 局</span>
          <span class="chip" style="color: #A67AB5">不计星星</span>
        </div>
        <p v-if="result?.already" style="color: var(--muted); font-size: 15px; margin: 10px 0 0">今天这一局之前已经记过啦。</p>
      </div>

      <div class="card" style="margin-top: 16px">
        <h2 style="font-size: 21px">这条链上的成语</h2>
        <div v-for="(w, i) in playWords" :key="w.word" class="chain-line">
          <span class="chain-num">{{ i + 1 }}</span>
          <div class="chain-line-main">
            <div class="chain-word-line">
              <b style="font-size: 21px">{{ w.word }}</b>
              <span style="color: var(--muted); font-size: 15px">{{ w.pinyin }}</span>
            </div>
            <div v-if="!w.cardId" class="chain-meaning">{{ w.meaning }}</div>
            <button v-else class="link-btn" @click="goLearn(w.cardId)">去看「{{ w.word }}」的学习卡片 ›</button>
          </div>
        </div>
      </div>

      <div class="done-actions">
        <button class="btn blue big" :disabled="busy" @click="playAnother">
          {{ isDaily ? '再玩一条自由练习' : '再抽一条' }}
        </button>
        <button class="btn ghost big" @click="goHome">回乐园</button>
      </div>
      <p class="chain-note">接龙不给星星，也不影响学习和复习进度。</p>
    </template>

    <!-- 新徽章庆祝 -->
    <div v-if="badgeQueue.length" style="position: fixed; inset: 0; background: rgba(61,58,54,0.55); display: flex; align-items: center; justify-content: center; z-index: 99; padding: 20px" @click="badgeQueue.shift()">
      <div class="card pop-in" style="text-align: center; max-width: 340px; padding: 30px 24px">
        <div style="font-size: 20px; color: var(--muted); font-weight: 700">叮！收到新徽章</div>
        <div class="burst" :style="{ width: 110, height: 110, margin: '14px auto', borderRadius: '50%', background: currentBadge?.color || '#F5B841', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
          <Icon name="trophy" :size="56" style="color: #fff" />
        </div>
        <h2 style="margin: 0">{{ currentBadge?.name }}</h2>
        <p style="color: var(--muted)">{{ currentBadge?.hint }}</p>
        <button class="btn big blue">继续</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chain-page { max-width: 700px; }

.locked-chain { text-align: center; padding: 34px 22px; }
.locked-icon {
  width: 86px; height: 86px; margin: 0 auto 14px; border-radius: 50%;
  background: #F2ECDC; color: var(--muted);
  display: flex; align-items: center; justify-content: center;
}
.locked-chain p { color: var(--muted); font-size: 18px; }

.chain-intro { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.intro-icon {
  flex: none; width: 64px; height: 64px; border-radius: 22px;
  background: #F3EDF8; color: #A67AB5;
  display: flex; align-items: center; justify-content: center;
}
.mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.mode-card { display: flex; flex-direction: column; }
.mode-card.daily { border-color: #6FA8DC; background: linear-gradient(180deg, #fff 0%, #EAF3FB 100%); }
.mode-card.free { border-color: #7CA982; background: linear-gradient(180deg, #fff 0%, #F2F8EE 100%); }
.mode-card h2 { margin: 12px 0 4px; font-size: 24px; }
.mode-desc { color: var(--muted); font-size: 16px; flex: 1; margin: 0 0 16px; }
.mode-head { display: flex; align-items: center; gap: 8px; }
.mode-badge {
  background: #4A7FB5; color: #fff; border-radius: 999px;
  padding: 3px 12px; font-size: 14px; font-weight: 800;
}
.mode-badge.free { background: #5E8C61; }
.done-line {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  background: var(--green-light); border-radius: 16px; padding: 12px 14px;
  color: #3D3A36; font-size: 16px;
}
.done-line span { color: #5E8C61; font-size: 14px; }

.badge-progress-card { margin-top: 16px; }
.badge-progress-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.progress-track { height: 16px; border-radius: 999px; background: #F2ECDC; overflow: hidden; }
.progress-fill { height: 100%; background: #A67AB5; border-radius: 999px; transition: width 0.4s; }
.chain-note { text-align: center; color: var(--muted); font-size: 15px; margin: 18px 4px 0; }

.chain-current { padding: 22px 18px; }
.chain-label { text-align: center; color: var(--muted); font-size: 14px; font-weight: 700; margin-bottom: 8px; }
.char-row { display: flex; justify-content: center; gap: 8px; }
.char-tile {
  width: 64px; height: 82px; border-radius: 18px;
  background: #FFF3D6; border: 3px solid rgba(61,58,54,0.08);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.char-tile.tail { background: #F5B841; border-color: #C79213; }
.char-py { height: 20px; font-size: 15px; font-weight: 700; color: #4A7FB5; }
.char-tile.tail .char-py { color: #3D3A36; }
.char-ch { font-size: 36px; font-weight: 800; line-height: 1.1; }
.chain-prompt { text-align: center; font-size: 18px; margin: 16px 0 0; }
.tail-sound { color: #C79213; font-size: 21px; }
.tone-tip { display: block; color: var(--muted); font-size: 15px; margin-top: 4px; }

.options-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.chain-option { align-items: center; }
.chain-option.removed { opacity: 0.4; filter: grayscale(1); }
.opt-body { display: flex; align-items: center; gap: 4px; flex: 1; }
.opt-first {
  display: inline-flex; flex-direction: column; align-items: center;
  background: #FFF3D6; border-radius: 12px; padding: 0 8px; min-width: 44px;
}
.opt-py { font-size: 12px; font-weight: 700; color: #4A7FB5; line-height: 1.4; }
.opt-ch { font-size: 25px; font-weight: 800; line-height: 1.15; }
.opt-rest { font-size: 23px; font-weight: 700; letter-spacing: 1px; }
.removed-tag { margin-left: auto; font-size: 13px; color: var(--muted); flex: none; }
.option-btn.right .opt-first { background: #FFFFFF; }
.feedback { border: none; margin: 6px 0 14px; }
.feedback.right { background: var(--green-light); }
.feedback.wrong { background: #FDE8E4; }
.feedback.reveal { background: #FFF3D6; }
.play-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.play-actions .btn.ghost { width: 100%; }

.done-hero { text-align: center; padding: 30px 22px; }
.done-icon {
  width: 100px; height: 100px; margin: 0 auto 14px; border-radius: 50%;
  background: #A67AB5; color: #fff;
  display: flex; align-items: center; justify-content: center;
}
.done-stats { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 14px; }

.chain-line {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px 0; border-bottom: 2px solid rgba(61,58,54,0.06);
}
.chain-line:last-child { border-bottom: none; padding-bottom: 0; }
.chain-num {
  flex: none; width: 34px; height: 34px; border-radius: 50%;
  background: #F3EDF8; color: #A67AB5; font-weight: 800;
  display: flex; align-items: center; justify-content: center; font-size: 16px;
}
.chain-line-main { flex: 1; min-width: 0; }
.chain-word-line { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.chain-meaning { color: var(--muted); font-size: 15px; margin-top: 2px; }
.link-btn {
  background: none; border: none; padding: 4px 0 0;
  color: #4A7FB5; font-family: inherit; font-size: 15px; font-weight: 700;
  cursor: pointer; text-align: left;
}
.link-btn:active { color: #3D3A36; }
.done-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 18px; }

@media (max-width: 560px) {
  .mode-grid { grid-template-columns: 1fr; }
  .char-tile { width: 56px; height: 74px; }
  .char-ch { font-size: 31px; }
  .char-py { font-size: 14px; }
  .opt-rest { font-size: 21px; }
}
</style>
