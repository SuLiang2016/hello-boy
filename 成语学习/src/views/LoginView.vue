<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setKidToken } from '../api.js'
import { useSession } from '../store.js'
import Avatar from '../components/Avatar.vue'
import PinPad from '../components/PinPad.vue'

const router = useRouter()
const session = useSession()

const kids = ref([])
const picked = ref(null)
const err = ref('')
const pad = ref(null)

onMounted(async () => {
  kids.value = await api('/kids')
})

async function onPin(pin) {
  err.value = ''
  try {
    const r = await api('/login/kid', { method: 'POST', body: { kidId: picked.value.id, pin } })
    setKidToken(r.token)
    session.kid = r.kid
    await session.refreshProgress()
    router.replace({ name: 'home' })
  } catch (e) {
    err.value = e.message
    pad.value?.shake()
  }
}
</script>

<template>
  <div class="page page-no-nav" style="max-width: 560px">
    <h1 style="text-align: center; margin-top: 20px">成语学习乐园</h1>
    <p style="text-align: center; color: var(--muted); margin-bottom: 24px">找到自己，点进去</p>

    <div class="card">
      <template v-if="!picked">
        <div class="avatar-grid" style="grid-template-columns: repeat(3, 1fr)">
          <div v-for="k in kids" :key="k.id" class="pick" style="flex-direction: column; gap: 6px; padding: 14px 6px" @click="picked = k">
            <Avatar :kind="k.avatar" :equipped="k.equipped" :size="64" />
            <b style="font-size: 19px">{{ k.name }}</b>
          </div>
        </div>
        <p v-if="kids.length === 0" style="text-align: center; color: var(--muted)">还没有孩子账号，请家长进「家长入口」添加</p>
      </template>

      <template v-else>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px">
          <Avatar :kind="picked.avatar" :size="52" />
          <b style="font-size: 22px">{{ picked.name }}</b>
          <button class="btn ghost" style="min-height: 44px; margin-left: auto; font-size: 17px; box-shadow: none; border: none" @click="picked = null">换人</button>
        </div>
        <p style="text-align: center; color: var(--muted)">输你的 4 位口令</p>
        <p class="error-tip" style="text-align: center">{{ err }}</p>
        <PinPad ref="pad" @complete="onPin" />
      </template>
    </div>

    <p style="text-align: center; margin-top: 26px">
      <router-link to="/parent" style="color: var(--muted); font-size: 16px">家长入口</router-link>
    </p>
  </div>
</template>
