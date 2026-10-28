<script setup>
// 装扮间：花星星买装扮、给头像换装
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api.js'
import { useSession } from '../store.js'
import { OUTFITS } from '../catalog.mjs'
import Avatar from '../components/Avatar.vue'
import Icon from '../components/Icon.vue'
import Scene from '../components/Scene.vue'
import TabBar from '../components/TabBar.vue'

const router = useRouter()
const session = useSession()

const owned = ref([])
const equipped = reactive({})
const wallet = ref(session.progress?.totalStars ?? 0)
const msg = ref('')
const busy = ref(false)

const SLOT_NAMES = { hat: '帽子', glasses: '眼镜', scarf: '围巾', head: '头饰', scene: '场景' }
const SLOTS = ['hat', 'glasses', 'scarf', 'head', 'scene']

onMounted(async () => {
  const r = await api('/outfits')
  owned.value = r.owned
  Object.assign(equipped, r.equipped)
  wallet.value = r.wallet
})

function itemState(item) {
  if (equipped[item.slot] === item.id) return 'worn'
  if (owned.value.includes(item.id)) return 'owned'
  return 'shop'
}

async function buy(item) {
  msg.value = ''
  busy.value = true
  try {
    const r = await api('/outfits/buy', { method: 'POST', body: { itemId: item.id } })
    owned.value.push(item.id)
    wallet.value = r.wallet
    await toggle(item) // 买了直接穿上
  } catch (e) {
    msg.value = e.message
  } finally {
    busy.value = false
  }
}

async function toggle(item) {
  msg.value = ''
  const next = { ...equipped }
  if (next[item.slot] === item.id) delete next[item.slot]
  else next[item.slot] = item.id
  try {
    const r = await api('/outfits/equip', { method: 'PUT', body: { equipped: next } })
    Object.keys(equipped).forEach((k) => delete equipped[k])
    Object.assign(equipped, r.equipped)
    session.kid.equipped = { ...r.equipped }
  } catch (e) {
    msg.value = e.message
  }
}

function onItem(item) {
  const st = itemState(item)
  if (st === 'shop') buy(item)
  else toggle(item)
}
</script>

<template>
  <div class="page" style="max-width: 680px">
    <div class="topbar">
      <div class="back" @click="router.back()"><Icon name="back" :size="26" /></div>
      <h1 style="margin: 0; font-size: 26px">装扮间</h1>
      <span class="chip" style="margin-left: auto; color: #C79213">
        <Icon name="star" :size="20" />{{ wallet }}
      </span>
    </div>

    <div class="card" style="display: flex; align-items: center; gap: 20px; margin-bottom: 18px">
      <Avatar :kind="session.kid?.avatar" :equipped="equipped" :size="120" />
      <div style="flex: 1">
        <b style="font-size: 22px">{{ session.kid?.name }}的样子</b>
        <p style="color: var(--muted); font-size: 16px; margin: 6px 0 0">
          买的装扮永远是你自己的，随时来换着戴。戴着它到处走，大家都能看到哦。
        </p>
      </div>
    </div>

    <p class="error-tip" style="text-align: center">{{ msg }}</p>

    <div v-for="slot in SLOTS" :key="slot" class="card" style="margin-bottom: 16px; padding: 14px 16px">
      <h2 style="font-size: 18px; margin: 0 0 10px">{{ SLOT_NAMES[slot] }}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px">
        <div
          v-for="item in OUTFITS.filter(i => i.slot === slot)"
          :key="item.id"
          class="dress-item"
          :class="{ worn: itemState(item) === 'worn' }"
          @click="onItem(item)"
        >
          <Scene v-if="item.slot === 'scene'" :scene="item.id" class="scene-thumb" />
          <Avatar v-else :kind="session.kid?.avatar" :equipped="{ [slot]: item.id }" :size="72" />
          <b style="font-size: 16px">{{ item.name }}</b>
          <span v-if="itemState(item) === 'worn'" style="color: #5E8C61; font-weight: 700; font-size: 14px">{{ item.slot === 'scene' ? '用着呢' : '戴着呢' }}</span>
          <span v-else-if="itemState(item) === 'owned'" style="color: var(--muted); font-size: 14px">已拥有 · 点我{{ item.slot === 'scene' ? '用' : '戴' }}</span>
          <span v-else style="color: #C79213; font-weight: 700; font-size: 14px">
            <Icon name="star" :size="14" />{{ item.price }}
          </span>
        </div>
      </div>
    </div>

    <TabBar />
  </div>
</template>

<style scoped>
.dress-item {
  background: #fff;
  border: 3px solid rgba(61, 58, 54, 0.1);
  border-radius: 18px;
  padding: 10px 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(61, 58, 54, 0.08);
}
.dress-item.worn { border-color: #7CA982; background: #F2F8EE; }
.dress-item:active { transform: translateY(3px); box-shadow: none; }
.scene-thumb {
  display: block;
  width: 100%;
  height: 74px;
  border-radius: 12px;
  overflow: hidden;
}
.scene-thumb :deep(svg) { display: block; width: 100%; height: 100%; }
</style>
