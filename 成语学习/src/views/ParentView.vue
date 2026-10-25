<script setup>
// 家长页：口令登录 -> 各孩子进度总览 + 账号管理
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, parentToken, setParentToken } from '../api.js'
import { useContent, AVATARS } from '../store.js'
import Avatar from '../components/Avatar.vue'
import Icon from '../components/Icon.vue'

const router = useRouter()
const content = useContent()

const authed = ref(false)
const err = ref('')
const pinInput = ref('')
const overview = ref([])
const tab = ref('dash') // dash | manage

onMounted(async () => {
  if (!parentToken()) return
  try { overview.value = await api('/parent/overview', { parent: true }); authed.value = true } catch { setParentToken('') }
})

async function onPin() {
  err.value = ''
  try {
    const r = await api('/login/parent', { method: 'POST', body: { pin: pinInput.value } })
    setParentToken(r.token)
    pinInput.value = ''
    overview.value = await api('/parent/overview', { parent: true })
    authed.value = true
  } catch (e) {
    err.value = e.message
  }
}

function logout() {
  setParentToken('')
  authed.value = false
  router.push({ name: 'login' })
}

// ---- 添加孩子 ----
const newKid = reactive({ name: '', avatar: 'panda', pin: '' })
const addMsg = ref('')
async function addKid() {
  addMsg.value = ''
  try {
    await api('/parent/kids', { method: 'POST', body: { ...newKid }, parent: true })
    newKid.name = ''; newKid.pin = ''
    overview.value = await api('/parent/overview', { parent: true })
    addMsg.value = '加好啦'
  } catch (e) { addMsg.value = e.message }
}

// ---- 修改孩子 ----
const editing = ref(null) // {id, name, avatar, pin}
const editMsg = ref('')
async function saveKid() {
  editMsg.value = ''
  const body = { name: editing.value.name, avatar: editing.value.avatar }
  if (editing.value.pin) body.pin = editing.value.pin
  try {
    await api(`/parent/kids/${editing.value.id}`, { method: 'PUT', body, parent: true })
    editing.value = null
    overview.value = await api('/parent/overview', { parent: true })
  } catch (e) { editMsg.value = e.message }
}

// ---- 改家长口令 ----
const pins = reactive({ oldPin: '', newPin: '' })
const pinMsg = ref('')
async function changePin() {
  pinMsg.value = ''
  try {
    await api('/parent/pin', { method: 'PUT', body: { ...pins }, parent: true })
    pins.oldPin = ''; pins.newPin = ''; pinMsg.value = '改好了'
  } catch (e) { pinMsg.value = e.message }
}

// ---- 备份 / 恢复 ----
const backupMsg = ref('')
const restoreInput = ref(null)
function downloadBackup() {
  backupMsg.value = ''
  const url = '/api/parent/export'
  fetch(url, { headers: { Authorization: 'Bearer ' + parentToken() } })
    .then((r) => {
      if (!r.ok) throw new Error('导出失败')
      return r.blob()
    })
    .then((blob) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `成语乐园备份-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      backupMsg.value = '备份文件已下载，记得放到安全的地方'
    })
    .catch((e) => (backupMsg.value = e.message))
}
async function onRestoreFile(ev) {
  backupMsg.value = ''
  const file = ev.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    await api('/parent/restore', { method: 'POST', body: data, parent: true })
    overview.value = await api('/parent/overview', { parent: true })
    backupMsg.value = '恢复完成。孩子端的登录还在，但平板上如果登着孩子账号，需要退出重登一次'
  } catch (e) {
    backupMsg.value = '恢复失败：' + e.message
  } finally {
    ev.target.value = ''
  }
}
</script>

<template>
  <div class="page page-no-nav" style="max-width: 760px">
    <!-- 登录 -->
    <template v-if="!authed">
      <h1 style="text-align: center; margin-top: 30px">家长入口</h1>
      <div class="card" style="max-width: 420px; margin: 0 auto">
        <p style="text-align: center; color: var(--muted)">输入家长口令</p>
        <div class="field">
          <input v-model="pinInput" type="password" inputmode="numeric" maxlength="12" placeholder="家长口令" @keyup.enter="onPin" />
        </div>
        <p class="error-tip" style="text-align: center">{{ err }}</p>
        <button class="btn big blue" @click="onPin">进入</button>
        <p style="text-align: center; margin-top: 18px"><router-link to="/login" style="color: var(--muted)">返回</router-link></p>
      </div>
    </template>

    <!-- 总览 -->
    <template v-else>
      <div class="topbar">
        <h1 style="margin: 0">家长中心</h1>
        <div style="margin-left: auto; display: flex; gap: 10px">
          <button class="btn ghost" :style="{ minHeight: 44, fontSize: 17, boxShadow: 'none' }" :class="{ '': tab === 'dash' }" @click="tab = 'dash'">进度</button>
          <button class="btn ghost" :style="{ minHeight: 44, fontSize: 17, boxShadow: 'none' }" @click="tab = 'manage'">管理</button>
          <button class="btn ghost" :style="{ minHeight: 44, fontSize: 17, boxShadow: 'none' }" @click="logout">退出</button>
        </div>
      </div>

      <template v-if="tab === 'dash'">
        <div class="card" v-for="k in overview" :key="k.id" style="margin-bottom: 16px">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px">
            <Avatar :kind="k.avatar" :equipped="k.equipped" :size="52" />
            <b style="font-size: 22px">{{ k.name }}</b>
            <div style="margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap">
              <span class="chip" style="color: #5E8C61; font-size: 16px">本周新学 {{ k.week?.newLearned ?? 0 }}</span>
              <span class="chip" style="color: #4A7FB5; font-size: 16px">复习 {{ k.week?.reviews ?? 0 }} 次</span>
              <span class="chip" style="color: #C79213; font-size: 16px"><Icon name="crown" :size="16" />牢记 {{ k.rememberedCount ?? 0 }}</span>
            </div>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; color: var(--muted); font-size: 16px">
            <span>学会 {{ k.learnedCount }} / 60</span>
            <span style="color: #C79213"><Icon name="star" :size="15" />钱包 {{ k.totalStars }}</span>
            <span style="color: #E8604C"><Icon name="flame" :size="15" />连续 {{ k.streak }} 天</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 10px">
            <div v-for="g in content.groups" :key="g.key" style="text-align: center">
              <div :style="{ background: '#F2ECDC', borderRadius: 10, overflow: 'hidden', height: 12 }">
                <div :style="{ width: ((k.groupCounts?.[g.key] || 0) / 10) * 100 + '%', height: '100%', background: g.color }"></div>
              </div>
              <span style="font-size: 13px; color: var(--muted)">{{ g.name }} {{ k.groupCounts?.[g.key] || 0 }}</span>
            </div>
          </div>

          <div style="color: var(--muted); font-size: 16px">
            最近学会：<b v-for="r in k.recent.slice(0, 5)" :key="r.idiomId" style="color: var(--ink); margin-right: 8px">{{ content.byId[r.idiomId]?.word || r.idiomId }}</b>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="card" style="margin-bottom: 16px">
          <h2 style="font-size: 20px">孩子账号</h2>
          <div v-for="k in overview" :key="k.id" style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 2px solid rgba(61,58,54,0.06)">
            <Avatar :kind="k.avatar" :size="44" />
            <b>{{ k.name }}</b>
            <button class="btn ghost" style="margin-left: auto; min-height: 42px; font-size: 16px; box-shadow: none" @click="editing = { id: k.id, name: k.name, avatar: k.avatar, pin: '' }">修改</button>
          </div>

          <div v-if="editing" class="card" style="margin-top: 14px; background: #FFFDF6">
            <div class="field">
              <label>名字</label>
              <input v-model="editing.name" maxlength="8" />
            </div>
            <div class="field">
              <label>头像</label>
              <div class="avatar-grid">
                <div v-for="a in AVATARS" :key="a" class="pick" :class="{ sel: editing.avatar === a }" @click="editing.avatar = a">
                  <Avatar :kind="a" :size="48" />
                </div>
              </div>
            </div>
            <div class="field">
              <label>新口令（留空表示不改）</label>
              <input v-model="editing.pin" type="password" inputmode="numeric" maxlength="4" placeholder="4 位数字" />
            </div>
            <p class="error-tip">{{ editMsg }}</p>
            <div style="display: flex; gap: 10px">
              <button class="btn blue" style="min-height: 48px; font-size: 18px" @click="saveKid">保存</button>
              <button class="btn ghost" style="min-height: 48px; font-size: 18px; box-shadow: none" @click="editing = null">取消</button>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 16px">
          <h2 style="font-size: 20px">加一个孩子</h2>
          <div class="field">
            <label>名字</label>
            <input v-model="newKid.name" maxlength="8" placeholder="名字或小名" />
          </div>
          <div class="field">
            <label>头像</label>
            <div class="avatar-grid">
              <div v-for="a in AVATARS" :key="a" class="pick" :class="{ sel: newKid.avatar === a }" @click="newKid.avatar = a">
                <Avatar :kind="a" :size="48" />
              </div>
            </div>
          </div>
          <div class="field">
            <label>口令（4 位数字）</label>
            <input v-model="newKid.pin" type="password" inputmode="numeric" maxlength="4" />
          </div>
          <p class="error-tip">{{ addMsg }}</p>
          <button class="btn blue" style="min-height: 50px; font-size: 18px" @click="addKid">添加</button>
        </div>

        <div class="card">
          <h2 style="font-size: 20px">改家长口令</h2>
          <div class="field">
            <label>原口令</label>
            <input v-model="pins.oldPin" type="password" inputmode="numeric" maxlength="12" />
          </div>
          <div class="field">
            <label>新口令（4-12 位数字）</label>
            <input v-model="pins.newPin" type="password" inputmode="numeric" maxlength="12" />
          </div>
          <p class="error-tip">{{ pinMsg }}</p>
          <button class="btn blue" style="min-height: 50px; font-size: 18px" @click="changePin">修改</button>
        </div>

        <div class="card" style="margin-top: 16px">
          <h2 style="font-size: 20px">备份与恢复</h2>
          <p style="color: var(--muted); font-size: 16px">
            备份会下载一个文件，包含所有孩子账号、学习进度、星星和装扮。恢复会把现在的数据整个换成备份文件里的。
            另外服务每次启动都会自动备一份（保留最近 7 份，在 data/backup 文件夹里）。
          </p>
          <p class="error-tip">{{ backupMsg }}</p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap">
            <button class="btn blue" style="min-height: 50px; font-size: 18px" @click="downloadBackup">下载备份</button>
            <button class="btn ghost" style="min-height: 50px; font-size: 18px; box-shadow: none" @click="restoreInput?.click()">从备份恢复…</button>
            <input ref="restoreInput" type="file" accept="application/json,.json" style="display: none" @change="onRestoreFile" />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
