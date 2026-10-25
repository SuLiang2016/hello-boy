import { createRouter, createWebHistory } from 'vue-router'
import { useSession } from './store.js'
import { kidToken } from './api.js'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/setup', name: 'setup', component: () => import('./views/SetupView.vue') },
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
    { path: '/chengyu', name: 'groups', component: () => import('./views/GroupsView.vue'), meta: { board: 'idiom' } },
    { path: '/shici', name: 'poem-groups', component: () => import('./views/GroupsView.vue'), meta: { board: 'poem' } },
    { path: '/chengyu/g/:group', name: 'group', component: () => import('./views/GroupView.vue'), meta: { board: 'idiom' } },
    { path: '/shici/g/:group', name: 'poem-group', component: () => import('./views/GroupView.vue'), meta: { board: 'poem' } },
    { path: '/chengyu/i/:id', name: 'learn', component: () => import('./views/LearnView.vue'), meta: { board: 'idiom' } },
    { path: '/shici/i/:id', name: 'poem-learn', component: () => import('./views/LearnView.vue'), meta: { board: 'poem' } },
    { path: '/chengyu/i/:id/quiz', name: 'quiz', component: () => import('./views/QuizView.vue'), meta: { board: 'idiom' } },
    { path: '/shici/i/:id/quiz', name: 'poem-quiz', component: () => import('./views/QuizView.vue'), meta: { board: 'poem' } },
    { path: '/chain', name: 'chain', component: () => import('./views/ChainView.vue') },
    { path: '/stars', name: 'stars', component: () => import('./views/ProgressView.vue') },
    { path: '/review', name: 'review', component: () => import('./views/ReviewView.vue') },
    { path: '/dressup', name: 'dressup', component: () => import('./views/DressupView.vue') },
    { path: '/parent', name: 'parent', component: () => import('./views/ParentView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

const PUBLIC = ['setup', 'login', 'parent']

router.beforeEach(async (to) => {
  const s = useSession()
  if (!s.booted) {
    try { await s.boot() } catch { s.booted = true }
  }
  if (s.needsSetup) return to.name === 'setup' ? true : { name: 'setup' }
  if (to.name === 'setup') return { name: 'login' }
  if (!PUBLIC.includes(to.name) && !s.isLogin && !kidToken()) return { name: 'login' }
  return true
})
