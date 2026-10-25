<script setup>
// 大按钮数字键盘：输满 length 位自动回调
import { ref } from 'vue'

const props = defineProps({
  length: { type: Number, default: 4 },
})
const emit = defineEmits(['complete'])

const buf = ref('')
const shaking = ref(false)

function press(d) {
  if (buf.value.length >= props.length) return
  buf.value += d
  if (buf.value.length === props.length) {
    const pin = buf.value
    setTimeout(() => {
      emit('complete', pin)
      clear()
    }, 180)
  }
}
function back() { buf.value = buf.value.slice(0, -1) }
function clear() { buf.value = '' }

defineExpose({ clear, shake: () => { shaking.value = false; requestAnimationFrame(() => { shaking.value = true; setTimeout(() => (shaking.value = false), 450) }) } })
</script>

<template>
  <div>
    <div class="pin-dots" :class="{ shake: shaking }">
      <span v-for="i in length" :key="i" :class="{ filled: i <= buf.length }"></span>
    </div>
    <div class="pinpad">
      <button v-for="d in [1, 2, 3, 4, 5, 6, 7, 8, 9]" :key="d" @click="press(d)">{{ d }}</button>
      <button @click="back" style="font-size: 22px">⌫</button>
      <button @click="press(0)">0</button>
      <button @click="clear" style="font-size: 20px">清空</button>
    </div>
  </div>
</template>
