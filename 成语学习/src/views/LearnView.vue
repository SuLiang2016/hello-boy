<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'
import { useSession, useContent } from '../store.js'
import Icon from '../components/Icon.vue'
import PinyinText from '../components/PinyinText.vue'

const route = useRoute()
const router = useRouter()
const session = useSession()
const content = useContent()

const item = computed(() => content.byId[route.params.id])
const board = computed(() => content.boardOfItem(item.value) || route.meta.board || 'idiom')
const isPoem = computed(() => board.value === 'poem')
const isShizi = computed(() => board.value === 'shizi')
const group = computed(() => (item.value ? content.groupOf(item.value.group) : null))
const groupsName = computed(() => content.routeName('groups', board.value))
const quizName = computed(() => content.routeName('quiz', board.value))

// 全文注音的记法沿用各板块现状：古诗存本机、成语存孩子档案；识字也存本机。
// 识字默认关着——这一张要练的正是认字形，五句全叠上拼音就把练习抵消了；
// 不认得点一下那个字就有拼音。
const rubyKey = `cyly_${board.value}_pinyin_${session.kid?.id || 'guest'}`
const rubyStored = localStorage.getItem(rubyKey)
// 古诗、识字把开关存本机（没存过时：古诗默认开、识字默认关）；成语沿用孩子档案里的全局设置
const rubyAll = ref(
  isShizi.value || isPoem.value
    ? (rubyStored === null ? !isShizi.value : rubyStored === '1')
    : !!session.kid?.pinyinAll
)
// 点字出的拼音要和卡片上声明的读音一致——多音字尤其不能让 pinyin-pro 现场猜。
// 多音字卡上同一个字会出现多次、读音各不相同，卡片级的表会互相覆盖，所以按例句逐条钉。
const fixesFor = (c) => ({
  ...Object.fromEntries((item.value?.chars || []).map((x) => [x.zi, x.pinyin])),
  [c.zi]: c.pinyin,
})
// 田字格按字归并：多音字卡的 chars 是一条一个读音，直接铺会把同一个字画成两格、看着像渲染 bug。
// 一格只练一个字形，读音并列在格子下面，具体到词怎么读交给「用一用」。
const ziCells = computed(() => {
  const byZi = new Map()
  for (const c of item.value?.chars || []) {
    if (!byZi.has(c.zi)) byZi.set(c.zi, { zi: c.zi, pinyins: [], radical: c.radical, strokes: c.strokes })
    byZi.get(c.zi).pinyins.push(c.pinyin)
  }
  return [...byZi.values()]
})
async function toggleRuby() {
  rubyAll.value = !rubyAll.value
  if (isShizi.value || isPoem.value) {
    localStorage.setItem(rubyKey, rubyAll.value ? '1' : '0')
    return
  }
  try { session.kid = await api('/me', { method: 'PUT', body: { pinyinAll: rubyAll.value } }) } catch {}
}

const myStars = computed(() => session.starsOf(item.value?.id))
// 今天识字学满了 3 张：还能读，但再测不算学会、不给星
const capped = computed(() => {
  const c = session.progress?.caps?.[board.value]
  return !!c && c.reached && myStars.value === 0
})
</script>

<template>
  <div class="page" style="max-width: 700px" v-if="item">
    <div class="topbar">
      <div class="back" @click="router.back()"><Icon name="back" :size="26" /></div>
      <div style="flex: 1; min-width: 0">
        <b style="font-size: 26px">{{ content.titleOf(item) }}</b>
        <div style="color: var(--muted)">{{ content.metaOf(item) }}<template v-if="group">　·　{{ group.name }}</template></div>
      </div>
      <div style="display: flex; gap: 2px; align-items: center">
        <Icon v-if="session.isRemembered(item.id)" name="crown" :size="24" style="color: #C79213" />
        <Icon v-for="n in 2" :key="n" name="star" :size="26" :style="{ color: myStars >= n ? '#F5B841' : '#E8DFC8' }" />
      </div>
    </div>

    <div class="card illo-card pop-in" v-if="item.illustration" v-html="item.illustration"></div>

    <!-- 识字：字形 + 区分口诀，再用一用 -->
    <template v-if="isShizi">
      <div class="card pop-in" style="margin-top: 16px">
        <div class="zi-row">
          <div v-for="g in ziCells" :key="g.zi" class="zi-cell">
            <div class="tian" :style="{ borderColor: group?.color || '#E8DFC8' }">
              <span class="tian-h"></span><span class="tian-v"></span>
              <b class="tian-zi">{{ g.zi }}</b>
            </div>
            <div class="zi-pinyin">{{ g.pinyins.join(' / ') }}</div>
            <div class="zi-meta">部首 {{ g.radical }} · {{ g.strokes }} 画</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px">
          <button class="btn ghost" style="min-height: 44px; font-size: 16px; padding: 4px 16px; margin: 0 auto" @click="toggleRuby">
            {{ rubyAll ? '拼音：开' : '拼音：关' }}
          </button>
        </div>
      </div>

      <div class="card" :style="{ borderColor: group?.color, background: '#FFFDF6' }" style="margin-top: 16px">
        <h2 style="margin: 0 0 6px">💡 怎么分</h2>
        <p style="margin: 0; font-size: 20px; line-height: 1.8">{{ item.tip }}</p>
      </div>

      <div class="card" style="margin-top: 16px">
        <h2 style="margin: 0 0 10px">✏️ 用一用</h2>
        <p style="margin: 0 0 8px; color: var(--muted); font-size: 15px" v-if="!rubyAll">遇到不认识的字，点一下它就有拼音</p>
        <div v-for="c in item.chars" :key="c.zi + c.pinyin" class="zi-usage">
          <div class="zi-word"><b>{{ c.word }}</b><span style="color: var(--muted); font-size: 15px; margin-left: 8px">{{ c.pinyin }}</span></div>
          <PinyinText :text="c.sentence" :ruby="rubyAll" :fixes="fixesFor(c)" />
        </div>
      </div>
    </template>

    <!-- 古诗：全诗 + 注音 -->
    <template v-else-if="isPoem">
      <div class="card" style="margin-top: 16px">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px">
          <div style="flex: 1; text-align: center">
            <h2 style="margin: 0">{{ item.title }}</h2>
            <div style="color: var(--muted)">{{ item.dynasty }} · {{ item.author }}</div>
          </div>
          <button class="btn ghost" style="min-height: 44px; font-size: 16px; padding: 4px 16px" @click="toggleRuby">
            {{ rubyAll ? '拼音：开' : '拼音：关' }}
          </button>
        </div>
        <div class="poem-text">
          <div v-for="(line, i) in item.lines" :key="i" class="poem-line">
            <PinyinText :text="line" :ruby="rubyAll" :fixes="item.fixes" />
          </div>
        </div>
        <p style="margin: 10px 0 0; color: var(--muted); font-size: 15px; text-align: center" v-if="!rubyAll">遇到不认识的字，点一下它就有拼音</p>
      </div>

      <div class="card" :style="{ borderColor: group?.color, background: '#FFFDF6' }" style="margin-top: 16px">
        <h2 style="margin: 0 0 6px">🌿 诗意讲解</h2>
        <p class="poem-note" style="margin: 0">{{ item.explanation }}</p>
      </div>

      <div class="card" style="margin-top: 16px">
        <h2 style="margin: 0 0 6px">📖 诗人小故事</h2>
        <p class="poem-note" style="margin: 0">{{ item.poetStory }}</p>
      </div>
    </template>

    <!-- 成语：故事 + 总结 -->
    <template v-else>
      <div class="card" style="margin-top: 16px">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px">
          <h2 style="margin: 0; flex: 1">📖 故事</h2>
          <button class="btn ghost" style="min-height: 44px; font-size: 16px; padding: 4px 16px" @click="toggleRuby">
            {{ rubyAll ? '拼音：开' : '拼音：关' }}
          </button>
        </div>
        <p style="margin: 0; color: var(--muted); font-size: 15px" v-if="!rubyAll">遇到不认识的字，点一下它就有拼音</p>
        <PinyinText :text="item.story" :ruby="rubyAll" />
      </div>

      <div class="card" :style="{ borderColor: group?.color, background: '#FFFDF6' }" style="margin-top: 16px">
        <h2 style="margin: 0 0 6px">💡 总结</h2>
        <p style="margin: 0; font-size: 20px; line-height: 1.8">{{ item.summary }}</p>
      </div>
    </template>

    <div style="margin-top: 22px">
      <button class="btn big" @click="router.push({ name: quizName, params: { id: item.id } })">
        {{ myStars > 0 ? (myStars === 2 ? '再测一次玩玩' : '再测一次，全对拿两颗星！') : '开始测验' }}
      </button>
      <p v-if="capped" style="text-align: center; color: #C79213; font-size: 16px; margin-top: 10px">
        今天 {{ session.progress.caps[board].cap }} {{ content.unitOf(board) }}识字已经学满了——这一张还能读，但今天再测不算学会，明天来正好。
      </p>
      <p v-else style="text-align: center; color: var(--muted); font-size: 15px; margin-top: 10px">答对 3 题里的 2 题就能学会，不着急，可以多试几次</p>
    </div>
  </div>
  <div class="page" v-else>
    <div class="card">没有找到这个内容，<router-link :to="{ name: groupsName }">回篇章看看</router-link></div>
  </div>
</template>

<style scoped>
.poem-text {
  text-align: center;
}
.poem-line {
  font-size: 26px;
  line-height: 2.3;
  font-weight: 600;
}
.poem-note { font-size: 20px; line-height: 1.9; }

/* 田字格：识字卡的视觉主体是字形本身，不靠插图 */
.zi-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
}
.zi-cell {
  text-align: center;
  min-width: 96px;
}
.tian {
  position: relative;
  width: 96px;
  height: 96px;
  margin: 0 auto;
  border: 3px solid #E8DFC8;
  border-radius: 10px;
  background: #FFFDF6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.tian-h, .tian-v { position: absolute; }
.tian-h { left: 0; right: 0; top: 50%; border-top: 2px dashed #DCC8A0; }
.tian-v { top: 0; bottom: 0; left: 50%; border-left: 2px dashed #DCC8A0; }
.tian-zi {
  position: relative;
  font-size: 62px;
  font-weight: 700;
  line-height: 1;
}
.zi-pinyin { font-size: 19px; font-weight: 700; margin-top: 6px; }
.zi-meta { font-size: 14px; color: var(--muted); }
.zi-usage { padding: 10px 0; border-bottom: 1px dashed #E8DFC8; }
.zi-usage:last-child { border-bottom: 0; }
.zi-word { font-size: 21px; margin-bottom: 2px; }
</style>
