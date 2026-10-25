// 接龙选项：正确项必须唯一（只有正确项的首音能接上当前尾音）
export function shuffle(arr, random = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildOptions(chainWords, allWords, stepIndex, random = Math.random) {
  const current = chainWords[stepIndex]
  const correct = chainWords[stepIndex + 1]
  if (!current || !correct) throw new Error('接龙步数超出范围')

  const used = new Set(chainWords.map((w) => w.word))
  const distractors = allWords.filter((w) => !used.has(w.word) && w.firstKey !== current.lastKey)
  if (distractors.length < 3) throw new Error('接龙干扰项不足')

  const options = shuffle([correct, ...shuffle(distractors, random).slice(0, 3)], random)
  return { options, answerIndex: options.indexOf(correct) }
}

export function pickHintOption(options, answerIndex, removed, random = Math.random) {
  const wrong = options.filter((w, i) => i !== answerIndex && !removed.has(w.word))
  if (!wrong.length) return null
  return wrong[Math.floor(random() * wrong.length)]
}
