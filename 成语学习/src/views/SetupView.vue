<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setKidToken } from '../api.js'
import { AVATARS, useSession } from '../store.js'
import Avatar from '../components/Avatar.vue'

const router = useRouter()
const session = useSession()

const step = ref(1)
const parentPin = ref('')
const parentPin2 = ref('')
const kidName = ref('')
const kidAvatar = ref('panda')
const kidPin = ref('')
const kidPin2 = ref('')
const err = ref('')
const busy = ref(false)

async function next() {
  err.value = ''
  if (!/^\d{4,12}$/.test(parentPin.value)) return (err.value = '家长口令要 4-12 位数字')
  if (parentPin.value !== parentPin2.value) return (err.value = '两次输入的家长口令不一样')
  step.value = 2
}

async function start() {
  err.value = ''
  const name = kidName.value.trim()
  if (!name || name.length > 8) return (err.value = '孩子的名字（或小名）写 1-8 个字')
  if (!/^\d{4}$/.test(kidPin.value)) return (err.value = '孩子的口令要 4 位数字')
  if (kidPin.value !== kidPin2.value) return (err.value = '两次输入的孩子口令不一样')
  busy.value = true
  try {
    const r = await api('/setup', {
      method: 'POST',
      body: {
        parentPin: parentPin.value,
        kid: { name, avatar: kidAvatar.value, pin: kidPin.value },
      },
    })
    setKidToken(r.token)
    session.needsSetup = false
    session.kid = r.kid
    await session.refreshProgress()
    router.replace({ name: 'home' })
  } catch (e) {
    err.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page page-no-nav" style="max-width: 560px">
    <div class="card">
      <h1 style="text-align: center">欢迎来到成语学习乐园 🏮</h1>
      <p style="text-align: center; color: var(--muted)">第一次使用，请家长先做两步设置</p>

      <div v-if="step === 1">
        <h2>① 设一个家长口令</h2>
        <p style="color: var(--muted); font-size: 16px">以后查看学习进度、管理账号时要用，请家长记住它。</p>
        <div class="field">
          <label>家长口令（4-12 位数字）</label>
          <input v-model="parentPin" type="password" inputmode="numeric" maxlength="12" placeholder="比如 6 位数" />
        </div>
        <div class="field">
          <label>再输一遍</label>
          <input v-model="parentPin2" type="password" inputmode="numeric" maxlength="12" @keyup.enter="next" />
        </div>
        <p class="error-tip">{{ err }}</p>
        <button class="btn big blue" @click="next">下一步</button>
      </div>

      <div v-else>
        <h2>② 建孩子的档案</h2>
        <div class="field">
          <label>孩子叫什么？</label>
          <input v-model="kidName" maxlength="8" placeholder="名字或小名" />
        </div>
        <div class="field">
          <label>选一个头像</label>
          <div class="avatar-grid">
            <div v-for="a in AVATARS" :key="a" class="pick" :class="{ sel: kidAvatar === a }" @click="kidAvatar = a">
              <Avatar :kind="a" :size="56" />
            </div>
          </div>
        </div>
        <div class="field">
          <label>孩子的口令（4 位数字，孩子自己输的那种）</label>
          <input v-model="kidPin" type="password" inputmode="numeric" maxlength="4" placeholder="4 位数字" />
        </div>
        <div class="field">
          <label>再输一遍</label>
          <input v-model="kidPin2" type="password" inputmode="numeric" maxlength="4" @keyup.enter="start" />
        </div>
        <p class="error-tip">{{ err }}</p>
        <button class="btn big" :disabled="busy" @click="start">{{ busy ? '正在准备…' : '开始学习！' }}</button>
      </div>
    </div>
  </div>
</template>
