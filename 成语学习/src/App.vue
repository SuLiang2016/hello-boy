<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSession } from './store.js'

const session = useSession()
const router = useRouter()

onMounted(async () => {
  try {
    await session.boot()
    if (session.needsSetup) router.replace({ name: 'setup' })
    else if (!session.isLogin) router.replace({ name: 'login' })
  } catch {
    // 服务没起来时界面照常渲染，各页面的请求会给出错误提示
  }
})
</script>

<template>
  <router-view :key="$route.fullPath" />
</template>
