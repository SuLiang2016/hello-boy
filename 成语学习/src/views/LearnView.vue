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

const idiom = content.byId[route.params.id]
const group = idiom ? content.groupOf(idiom.group) : null

const rubyAll = ref(session.kid?.pinyinAll || false)
async function toggleRuby() {
  rubyAll.value = !rubyAll.value
  try { await api('/me', { method: 'PUT', body: { pinyinAll: rubyAll.value } }) } catch {}
}

const myStars = computed(() => session.starsOf(idiom?.id))
</script>

<template>
  <div class="page" style="max-width: 700px" v-if="idiom">
    <div class="topbar">
      <div class="back" @click="router.back()"><Icon name="back" :size="26" /></div>
      <div style="flex: 1">
        <b style="font-size: 26px">{{ idiom.word }}</b>
        <div style="color: var(--muted)">{{ idiom.pinyin }}　·　{{ idiom.origin }}</div>
      </div>
      <div style="display: flex; gap: 2px; align-items: center">
        <Icon v-if="session.isRemembered(idiom.id)" name="crown" :size="24" style="color: #C79213" />
        <Icon v-for="n in 2" :key="n" name="star" :size="26" :style="{ color: myStars >= n ? '#F5B841' : '#E8DFC8' }" />
      </div>
    </div>

    <div class="card illo-card pop-in" v-html="idiom.illustration"></div>

    <div class="card" style="margin-top: 16px">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px">
        <h2 style="margin: 0; flex: 1">📖 故事</h2>
        <button class="btn ghost" style="min-height: 44px; font-size: 16px; padding: 4px 16px" @click="toggleRuby">
          {{ rubyAll ? '拼音：开' : '拼音：关' }}
        </button>
      </div>
      <p style="margin: 0; color: var(--muted); font-size: 15px" v-if="!rubyAll">遇到不认识的字，点一下它就有拼音</p>
      <PinyinText :text="idiom.story" :ruby="rubyAll" />
    </div>

    <div class="card" :style="{ borderColor: group?.color, background: '#FFFDF6' }" style="margin-top: 16px">
      <h2 style="margin: 0 0 6px">💡 总结</h2>
      <p style="margin: 0; font-size: 20px; line-height: 1.8">{{ idiom.summary }}</p>
    </div>

    <div style="margin-top: 22px">
      <button class="btn big" @click="router.push({ name: 'quiz', params: { id: idiom.id } })">
        {{ myStars > 0 ? (myStars === 2 ? '再测一次玩玩' : '再测一次，全对拿两颗星！') : '开始测验' }}
      </button>
      <p style="text-align: center; color: var(--muted); font-size: 15px; margin-top: 10px">答对 3 题里的 2 题就能学会，不着急，可以多试几次</p>
    </div>
  </div>
  <div class="page" v-else>
    <div class="card">没有找到这个成语，<router-link to="/chengyu">回篇章看看</router-link></div>
  </div>
</template>
