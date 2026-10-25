<script setup>
// 故事文字：点汉字弹拼音；开了「全文注音」就在每个字上方显示拼音
import { computed, ref } from 'vue'
import { pinyin } from 'pinyin-pro'

const props = defineProps({
  text: { type: String, required: true },
  ruby: { type: Boolean, default: false },
  fixes: { type: Object, default: () => ({}) },
})

const isHan = (ch) => /\p{Script=Han}/u.test(ch)

// 按汉字连续段切分，段内整体转拼音（多音字按词定音更准）
const tokens = computed(() => {
  const chars = Array.from(props.text || '')
  const out = []
  let run = []
  const flush = () => {
    if (!run.length) return
    let pys = []
    try { pys = pinyin(run.join(''), { type: 'array' }) } catch { pys = run.map(() => '') }
    run.forEach((ch, i) => out.push({ ch, py: props.fixes[ch] || pys[i] || '' }))
    run = []
  }
  for (const ch of chars) {
    if (isHan(ch)) run.push(ch)
    else { flush(); out.push({ ch, py: null }) }
  }
  flush()
  return out
})

const popup = ref(null)
let timer = null
function tap(tok) {
  if (!tok.py) return
  popup.value = tok
  clearTimeout(timer)
  timer = setTimeout(() => (popup.value = null), 1600)
}
</script>

<template>
  <span class="story-text">
    <template v-if="ruby">
      <ruby v-for="(t, i) in tokens" :key="i"><span class="han" @click="tap(t)">{{ t.ch }}</span><rt v-if="t.py">{{ t.py }}</rt></ruby>
    </template>
    <template v-else>
      <span v-for="(t, i) in tokens" :key="i" :class="{ han: t.py }" @click="tap(t)">{{ t.ch }}</span>
    </template>

    <teleport to="body">
      <div v-if="popup" class="pinyin-pop pop-in" @click="popup = null">
        <span style="font-size: 30px; font-weight: 800">{{ popup.ch }}</span>
        <span class="py">{{ popup.py }}</span>
      </div>
    </teleport>
  </span>
</template>
