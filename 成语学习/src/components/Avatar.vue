<script setup>
// 孩子头像：8 种动物脸 + 可穿戴装扮（帽子/眼镜/围巾/头饰）
const props = defineProps({
  kind: { type: String, required: true }, // panda/rabbit/fox/tiger/owl/chick/frog/lion
  size: { type: Number, default: 64 },
  equipped: { type: Object, default: () => ({}) }, // {hat, glasses, scarf, head}
})

const S = 'stroke="#3D3A36" stroke-width="3"'

const FACES = {
  panda: `<circle cx="50" cy="52" r="34" fill="#FFFFFF" ${S}/><circle cx="27" cy="26" r="11" fill="#3D3A36"/><circle cx="73" cy="26" r="11" fill="#3D3A36"/><ellipse cx="37" cy="50" rx="9" ry="11" fill="#3D3A36" transform="rotate(18 37 50)"/><ellipse cx="63" cy="50" rx="9" ry="11" fill="#3D3A36" transform="rotate(-18 63 50)"/><circle cx="39" cy="49" r="3" fill="#FFFFFF"/><circle cx="61" cy="49" r="3" fill="#FFFFFF"/><ellipse cx="50" cy="64" rx="5" ry="4" fill="#3D3A36"/><path d="M44 71 q6 5 12 0" fill="none" ${S} stroke-linecap="round"/>`,
  rabbit: `<ellipse cx="36" cy="20" rx="8" ry="17" fill="#FFFFFF" ${S} transform="rotate(-10 36 20)"/><ellipse cx="64" cy="20" rx="8" ry="17" fill="#FFFFFF" ${S} transform="rotate(10 64 20)"/><ellipse cx="36" cy="21" rx="4" ry="11" fill="#F5B8B8"/><ellipse cx="64" cy="21" rx="4" ry="11" fill="#F5B8B8"/><circle cx="50" cy="58" r="30" fill="#FFFFFF" ${S}/><circle cx="39" cy="54" r="3.2" fill="#3D3A36"/><circle cx="61" cy="54" r="3.2" fill="#3D3A36"/><path d="M50 62 l-4 4 h8 z" fill="#E8604C"/><path d="M43 70 q7 6 14 0" fill="none" ${S} stroke-linecap="round"/>`,
  fox: `<path d="M24 18 L40 34 L26 44 Z" fill="#F09A4A" ${S} stroke-linejoin="round"/><path d="M76 18 L60 34 L74 44 Z" fill="#F09A4A" ${S} stroke-linejoin="round"/><circle cx="50" cy="56" r="30" fill="#F09A4A" ${S}/><path d="M50 46 q-16 4 -14 22 q8 8 14 8 q6 0 14 -8 q2 -18 -14 -22 z" fill="#FFFFFF" ${S}/><circle cx="38" cy="52" r="3.2" fill="#3D3A36"/><circle cx="62" cy="52" r="3.2" fill="#3D3A36"/><circle cx="50" cy="64" r="4" fill="#3D3A36"/>`,
  tiger: `<circle cx="30" cy="28" r="11" fill="#F5B841" ${S}/><circle cx="70" cy="28" r="11" fill="#F5B841" ${S}/><circle cx="50" cy="55" r="31" fill="#F5B841" ${S}/><path d="M30 46 q4 6 0 12 M42 42 q4 8 0 14 M58 42 q-4 8 0 14 M70 46 q-4 6 0 12" fill="none" stroke="#3D3A36" stroke-width="3.5" stroke-linecap="round"/><circle cx="40" cy="54" r="3.2" fill="#3D3A36"/><circle cx="60" cy="54" r="3.2" fill="#3D3A36"/><path d="M47 63 h6 l-3 4 z" fill="#3D3A36"/><path d="M44 70 q6 4 12 0" fill="none" ${S} stroke-linecap="round"/>`,
  owl: `<circle cx="50" cy="52" r="34" fill="#A9744F" ${S}/><path d="M26 38 q10 -14 24 -14 q14 0 24 14 q-24 8 -48 0 z" fill="#8B5A3C"/><circle cx="38" cy="50" r="12" fill="#FFFFFF" ${S}/><circle cx="62" cy="50" r="12" fill="#FFFFFF" ${S}/><circle cx="39" cy="51" r="4.5" fill="#3D3A36"/><circle cx="61" cy="51" r="4.5" fill="#3D3A36"/><path d="M50 55 l-5 7 h10 z" fill="#F09A4A" ${S} stroke-linejoin="round"/>`,
  chick: `<circle cx="50" cy="54" r="32" fill="#F5B841" ${S}/><path d="M44 22 q6 -10 12 -2 l-4 6 z" fill="#E8604C" ${S} stroke-linejoin="round"/><circle cx="40" cy="48" r="3.5" fill="#3D3A36"/><circle cx="60" cy="48" r="3.5" fill="#3D3A36"/><path d="M45 57 h10 l-5 6 z" fill="#F09A4A" ${S} stroke-linejoin="round"/><circle cx="33" cy="58" r="4" fill="#F5B8B8" opacity="0.8"/><circle cx="67" cy="58" r="4" fill="#F5B8B8" opacity="0.8"/>`,
  frog: `<circle cx="34" cy="30" r="12" fill="#7CA982" ${S}/><circle cx="66" cy="30" r="12" fill="#7CA982" ${S}/><circle cx="34" cy="30" r="5" fill="#FFFFFF"/><circle cx="66" cy="30" r="5" fill="#FFFFFF"/><circle cx="34" cy="30" r="2.5" fill="#3D3A36"/><circle cx="66" cy="30" r="2.5" fill="#3D3A36"/><ellipse cx="50" cy="58" rx="33" ry="28" fill="#7CA982" ${S}/><path d="M36 62 q14 12 28 0" fill="none" ${S} stroke-linecap="round"/><circle cx="33" cy="54" r="2.5" fill="#3D3A36"/><circle cx="67" cy="54" r="2.5" fill="#3D3A36"/>`,
  lion: `<circle cx="50" cy="52" r="36" fill="#F09A4A" ${S}/><circle cx="50" cy="55" r="26" fill="#F5B841" ${S}/><circle cx="41" cy="50" r="3.2" fill="#3D3A36"/><circle cx="59" cy="50" r="3.2" fill="#3D3A36"/><circle cx="50" cy="61" r="3.5" fill="#3D3A36"/><path d="M44 68 q6 5 12 0" fill="none" ${S} stroke-linecap="round"/>`,
}

// 装扮图层：画在 100x100 头像坐标系上
const OUTFIT_SVGS = {
  'straw-hat': `<ellipse cx="50" cy="20" rx="34" ry="9" fill="#F5B841" ${S}/><path d="M32 20 q0 -16 18 -16 q18 0 18 16 z" fill="#F5B841" ${S}/><path d="M32 16 h36" stroke="#A9744F" stroke-width="3"/>`,
  'tiger-hat': `<path d="M24 22 q0 -18 26 -18 q26 0 26 18 z" fill="#F09A4A" ${S}/><path d="M26 12 l-4 -10 10 4 M74 12 l4 -10 -10 4" fill="#F09A4A" ${S} stroke-linejoin="round"/><path d="M42 8 h16 M50 4 v14" stroke="#3D3A36" stroke-width="3.5" stroke-linecap="round"/>`,
  'magic-hat': `<path d="M22 26 q28 8 56 0 l-16 -34 q-12 -8 -24 0 z" fill="#A67AB5" ${S} stroke-linejoin="round"/><circle cx="58" cy="2" r="5" fill="#F5B841"/>`,
  'dr-hat': `<path d="M28 22 q22 8 44 0 l0 -4 q-22 8 -44 0 z" fill="#3D3A36"/><path d="M18 22 L50 8 L82 22 L50 34 Z" fill="#3D3A36"/><path d="M78 24 q6 6 0 12" stroke="#E8604C" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="78" cy="38" r="3.4" fill="#E8604C"/>`,
  'crown': `<path d="M28 24 L28 8 L39 17 L50 4 L61 17 L72 8 L72 24 Z" fill="#F5B841" ${S} stroke-linejoin="round"/><circle cx="50" cy="15" r="3" fill="#E8604C"/>`,
  'round-glasses': `<circle cx="37" cy="52" r="11" fill="#BDD9F2" fill-opacity="0.5" ${S}/><circle cx="63" cy="52" r="11" fill="#BDD9F2" fill-opacity="0.5" ${S}/><path d="M48 52 h4 M26 50 l-6 -3 M74 50 l6 -3" stroke="#3D3A36" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  'sunglasses': `<rect x="25" y="45" width="22" height="14" rx="6" fill="#3D3A36"/><rect x="53" y="45" width="22" height="14" rx="6" fill="#3D3A36"/><path d="M47 50 h6 M25 48 l-6 -4 M75 48 l6 -4" stroke="#3D3A36" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  'red-scarf': `<path d="M22 80 q28 12 56 0 l0 -8 q-28 10 -56 0 z" fill="#E8604C" ${S}/><path d="M62 84 l10 14 l-8 2 l-8 -13" fill="#E8604C" ${S} stroke-linejoin="round"/>`,
  'rainbow-scarf': `<path d="M22 80 q28 12 56 0 l0 -8 q-28 10 -56 0 z" fill="#E8604C" ${S}/><path d="M24 76 q26 9 52 0" stroke="#F5B841" stroke-width="3" fill="none"/><path d="M26 80 q24 8 48 0" stroke="#6FA8DC" stroke-width="3" fill="none"/><path d="M62 84 l10 14 l-8 2 l-8 -13" fill="#E8604C" ${S} stroke-linejoin="round"/>`,
  bow: `<path d="M22 26 L36 20 L36 34 Z" fill="#F5B8B8" ${S} stroke-linejoin="round"/><path d="M50 27 L36 20 L36 34 Z" fill="#F5B8B8" ${S} stroke-linejoin="round"/><path d="M50 27 L64 21 L64 35 Z" fill="#F5B8B8" ${S} stroke-linejoin="round"/><path d="M78 26 L64 21 L64 35 Z" fill="#F5B8B8" ${S} stroke-linejoin="round"/><circle cx="50" cy="27" r="5" fill="#E8604C" ${S}/>`,
  'star-headband': `<path d="M22 30 Q50 18 78 30" fill="none" stroke="#F5B841" stroke-width="6" stroke-linecap="round"/><path d="M50 17 l2.6 5.2 5.8 .8 -4.2 4.1 1 5.7 -5.2 -2.7 -5.2 2.7 1 -5.7 -4.2 -4.1 5.8 -.8 z" fill="#F5B841" ${S} stroke-linejoin="round"/><circle cx="28" cy="27" r="3" fill="#E8604C"/><circle cx="72" cy="27" r="3" fill="#E8604C"/>`,
}

// 叠戴顺序：围巾在最下、头饰其次、眼镜、帽子最上
const ORDER = ['scarf', 'head', 'glasses', 'hat']
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" aria-hidden="true">
    <g v-html="FACES[kind]"></g>
    <template v-for="slot in ORDER" :key="slot">
      <g v-if="OUTFIT_SVGS[equipped[slot]]" v-html="OUTFIT_SVGS[equipped[slot]]"></g>
    </template>
  </svg>
</template>
