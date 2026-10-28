import { defineStore } from 'pinia'
import { api, kidToken, setKidToken } from './api.js'
import content from './assets/content.json'
import { BOARDS } from './catalog.mjs'

// 内容查找工具（内容是静态打包的）
export function useContent() {
  const boards = BOARDS.filter((b) => Array.isArray(content[b.itemsKey]))
  const itemsOfBoard = Object.fromEntries(boards.map((b) => [b.board, content[b.itemsKey] || []]))
  const groupsOfBoard = Object.fromEntries(boards.map((b) => [b.board, content[b.groupsKey] || []]))
  const groups = content.groups
  const poemGroups = groupsOfBoard.poem || []
  const idioms = itemsOfBoard.idiom || []
  const poems = itemsOfBoard.poem || []
  const shiziGroups = groupsOfBoard.shizi || []
  const shiziItems = itemsOfBoard.shizi || []
  const chainWords = content.chain?.words || []
  const byId = Object.fromEntries(boards.flatMap((b) => itemsOfBoard[b.board]).map((i) => [i.id, i]))

  // groupKey -> 所属板块定义，一次建好，后面全是查表
  const ownerOfGroup = {}
  for (const b of boards) for (const g of groupsOfBoard[b.board]) ownerOfGroup[g.key] = b

  const boardDef = (board) => boards.find((b) => b.board === board) || null
  const groupsOf = (board) => groupsOfBoard[board] || []
  const ofGroup = (key) => {
    const b = ownerOfGroup[key]
    return b ? itemsOfBoard[b.board].filter((i) => i.group === key) : []
  }
  const boardOfGroup = (key) => ownerOfGroup[key]?.board || null
  const boardOfItem = (item) => (item ? boardOfGroup(item.group) : null)
  const groupOf = (key) => boards.flatMap((b) => groupsOfBoard[b.board]).find((g) => g.key === key) || null
  const unitOf = (board) => boardDef(board)?.unit || '个'
  const nameOf = (board) => boardDef(board)?.name || '内容'
  const totalOf = (board) => groupsOf(board).reduce((n, g) => n + ofGroup(g.key).length, 0)
  const titleOf = (item) => item?.word || item?.title || ''
  const metaOf = (item) => (item?.word ? item.pinyin : `${item?.dynasty || ''} · ${item?.author || ''}`)
  const meaningPrompt = (item) => (item?.lines ? `《${item.title}》这首诗讲了什么？` : `「${item?.word}」是什么意思？`)
  const routeName = (kind, board) => boardDef(board)?.routes?.[kind] || 'groups'

  return {
    groups, poemGroups, idioms, poems, shiziGroups, shiziItems, byId,
    chainWords,
    groupsOf, boardOfGroup, boardOfItem, ofGroup, groupOf,
    boardDef, unitOf, nameOf, totalOf, groupsOfBoard,
    titleOf, metaOf, meaningPrompt, routeName,
  }
}

export const BADGES = [
  { id: 'learn-10', name: '成语小书生', hint: '学会 10 个成语', color: '#F5B841' },
  { id: 'learn-30', name: '成语小达人', hint: '学会 30 个成语', color: '#F5B841' },
  { id: 'learn-60', name: '成语大王', hint: '学会全部 60 个成语', color: '#F5B841' },
  { id: 'streak-3', name: '三天小火苗', hint: '连续打卡 3 天', color: '#E8604C' },
  { id: 'streak-7', name: '一鼓作气', hint: '连续打卡 7 天', color: '#E8604C' },
  { id: 'streak-14', name: '锲而不舍', hint: '连续打卡 14 天', color: '#E8604C' },
  { id: 'streak-30', name: '恒心传奇', hint: '连续打卡 30 天', color: '#E8604C' },
  { id: 'group-dongwu', name: '动物大师', hint: '学完「动物伙伴」', color: '#F09A4A' },
  { id: 'group-shuzi', name: '数字大师', hint: '学完「神奇的数字」', color: '#6FA8DC' },
  { id: 'group-ziran', name: '自然大师', hint: '学完「大自然」', color: '#7CA982' },
  { id: 'group-renwu', name: '人物大师', hint: '学完「了不起的人」', color: '#E8604C' },
  { id: 'group-jizhi', name: '智慧大师', hint: '学完「聪明办法」', color: '#A67AB5' },
  { id: 'group-shenhua', name: '神话大师', hint: '学完「神话传说」', color: '#F5B841' },
  { id: 'poem-10', name: '古诗小书生', hint: '学会 10 首古诗', color: '#6FA8DC' },
  { id: 'poem-30', name: '古诗小达人', hint: '学会 30 首古诗', color: '#6FA8DC' },
  { id: 'poem-75', name: '古诗大王', hint: '学会全部 75 首古诗', color: '#6FA8DC' },
  { id: 'group-siji', name: '四季大师', hint: '学完「四季风光」', color: '#6FA8DC' },
  { id: 'group-shanshui', name: '山水大师', hint: '学完「山水田园」', color: '#7CA982' },
  { id: 'group-huaren', name: '情谊大师', hint: '学完「思念与送别」', color: '#A67AB5' },
  { id: 'group-yongwu', name: '明理大师', hint: '学完「咏物明理」', color: '#F09A4A' },
  { id: 'group-jiaguo', name: '家国大师', hint: '学完「家国与童年」', color: '#E8604C' },
  // 五期：识字板块 7 枚（与服务端 badges.js 同步）
  { id: 'shizi-10', name: '识字小书生', hint: '学会 10 组字', color: '#5E8C61' },
  { id: 'shizi-30', name: '识字小达人', hint: '学会 30 组字', color: '#5E8C61' },
  { id: 'shizi-100', name: '识字大王', hint: '学会全部 100 组字', color: '#5E8C61' },
  { id: 'group-xingjin', name: '形近大师', hint: '学完「形近字」', color: '#4A7FB5' },
  { id: 'group-duoyin', name: '多音大师', hint: '学完「多音字」', color: '#F5B841' },
  { id: 'group-tongyin', name: '同音大师', hint: '学完「同音字」', color: '#5E8C61' },
  { id: 'group-yicuo', name: '易错大师', hint: '学完「易错字」', color: '#A67AB5' },
  { id: 'chain-10', name: '接龙高手', hint: '完成 10 局接龙', color: '#A67AB5' },
]

export const AVATARS = ['panda', 'rabbit', 'fox', 'tiger', 'owl', 'chick', 'frog', 'lion']

// 并发调用 boot() 时复用同一个请求；否则路由守卫可能拿到还没加载完的进度
let bootPromise = null

export const useSession = defineStore('session', {
  state: () => ({
    booted: false,
    needsSetup: false,
    kid: null,     // {id, name, avatar, pinyinAll, equipped}
    progress: null // /api/progress 的返回
  }),
  getters: {
    isLogin: (s) => !!s.kid,
    learnedCount: (s) => s.progress ? Object.keys(s.progress.learned).length : 0,
    starsOf: (s) => (id) => s.progress?.learned?.[id]?.stars || 0,
    stageOf: (s) => (id) => s.progress?.learned?.[id]?.stage || 0,
    isRemembered: (s) => (id) => (s.progress?.learned?.[id]?.stage || 0) >= 5,
    groupUnlocked: (s) => (g) => s.progress?.unlocked?.includes(g) || false,
    chainUnlocked: (s) => s.progress?.chainUnlocked ?? ((s.progress?.boardCounts?.idiom || 0) > 0)
  },
  actions: {
    async boot() {
      if (this.booted) return
      if (bootPromise) return bootPromise
      bootPromise = (async () => {
        const b = await api('/bootstrap')
        this.needsSetup = b.needsSetup
        if (!b.needsSetup && kidToken()) {
          try {
            this.kid = await api('/me')
            this.progress = await api('/progress')
          } catch {
            setKidToken('')
            this.kid = null
          }
        }
        this.booted = true
      })()
      try { await bootPromise } finally { bootPromise = null }
    },
    async refreshProgress() {
      if (this.kid) {
        this.progress = await api('/progress')
        this.kid = await api('/me')
      }
    }
  }
})
