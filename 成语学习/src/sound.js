// 小音效：无外部资源，第一次用户操作时懒创建 AudioContext
let actx = null

function tone(freq, start, dur, type = 'sine', gain = 0.12) {
  const t = actx.currentTime + start
  const o = actx.createOscillator()
  const g = actx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(actx.destination)
  o.start(t)
  o.stop(t + dur)
}

export function chime(ok) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)()
    if (ok) { tone(660, 0, 0.18); tone(880, 0.09, 0.22) }
    else tone(200, 0, 0.3, 'triangle', 0.08)
  } catch {}
}

export function fanfare() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)()
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'sine', 0.14))
  } catch {}
}
