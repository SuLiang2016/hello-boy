// 统一 fetch 封装：自动带登录 token
const KID_KEY = 'cyly_kid_token'
const PARENT_KEY = 'cyly_parent_token'

export function kidToken() { return localStorage.getItem(KID_KEY) || '' }
export function parentToken() { return localStorage.getItem(PARENT_KEY) || '' }
export function setKidToken(t) { t ? localStorage.setItem(KID_KEY, t) : localStorage.removeItem(KID_KEY) }
export function setParentToken(t) { t ? localStorage.setItem(PARENT_KEY, t) : localStorage.removeItem(PARENT_KEY) }

export async function api(path, { method = 'GET', body, token, parent = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const t = token ?? (parent ? parentToken() : kidToken())
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await res.json() } catch {}
  if (!res.ok) {
    const err = new Error(data?.error || `请求失败（${res.status}）`)
    err.status = res.status
    throw err
  }
  return data
}
