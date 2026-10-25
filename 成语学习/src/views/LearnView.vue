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
const board = computed(() => content.boardOfItem(item.value) || (route.meta.board === 'poem' ? 'poem' : 'idiom'))
const isPoem = computed(() => board.value === 'poem')
const group = computed(() => (item.value ? content.groupOf(item.value.group) : null))
const groupsName = computed(() => content.routeName('groups', board.value))
const quizName = computed(() => content.routeName('quiz', board.value))

const poemPinyinKey = `cyly_poem_pinyin_${session.kid?.id || 'guest'}`
const rubyAll = ref(isPoem.value ? localStorage.getItem(poemPinyinKey) !== '0' : !!session.kid?.pinyinAll)
async function toggleRuby() {
  rubyAll.value = !rubyAll.value
  if (isPoem.value) {
    localStorage.setItem(poemPinyinKey, rubyAll.value ? '1' : '0')
    return
  }
  try { session.kid = await api('/me', { method: 'PUT', body: { pinyinAll: rubyAll.value } }) } catch {}
}

const myStars = computed(() => session.starsOf(item.value?.id))
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

    <div class="card illo-card pop-in" v-html="item.illustration"></div>

    <!-- 古诗：全诗 + 注音 -->
    <template v-if="isPoem">
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
      <p style="text-align: center; color: var(--muted); font-size: 15px; margin-top: 10px">答对 3 题里的 2 题就能学会，不着急，可以多试几次</p>
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
</style>
