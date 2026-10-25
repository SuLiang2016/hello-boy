<script setup>
const props = defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 28 },
})

const ICONS = {
  star: '<path fill="currentColor" d="M12 2l2.9 6.2 6.6.9-4.9 4.5 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9.1l6.6-.9z"/>',
  starOutline: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12 3.4l2.5 5.2 5.6.8-4.1 3.9 1.1 5.6L12 16.2l-5.1 2.7 1.1-5.6-4.1-3.9 5.6-.8z"/>',
  flame: '<path fill="currentColor" d="M12 2c1.2 3.4-1.8 4.6-1.8 7.4 0 1.4 1 2.4 2.3 2.4s2.4-1 2.4-2.6c1.9 1.5 3.1 3.7 3.1 5.9A6 6 0 0 1 6 15.1C6 9.2 12 7.4 12 2z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.5" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2.4" d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  check: '<path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M4.5 13l5 5L19.5 6.5"/>',
  back: '<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M14.5 5.5L8 12l6.5 6.5"/>',
  home: '<path fill="currentColor" d="M4 11.2L12 4l8 7.2V20a1 1 0 0 1-1 1h-4.6v-6h-4.8v6H5a1 1 0 0 1-1-1z"/>',
  trophy: '<path fill="currentColor" d="M7 3h10v2h3.5v3A4.5 4.5 0 0 1 16 12.4 5 5 0 0 1 13 14.7V17h3v3H8v-3h3v-2.3a5 5 0 0 1-3-2.3A4.5 4.5 0 0 1 3.5 8V5H7V3zm-1.5 4v1a2.5 2.5 0 0 0 1.6 2.3A9.6 9.6 0 0 1 7 7H5.5zm13 0H17a9.6 9.6 0 0 1-.1 3.3A2.5 2.5 0 0 0 18.5 8V7z"/>',
  crown: '<path fill="currentColor" d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8zm4.5 8h9v1.6h-9z"/>',
  book: '<path fill="currentColor" d="M5 3h13.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a3 3 0 0 0-3 3V4a1 1 0 0 1 1-1zm2 3v2h9V6H7z"/>',
  link: '<path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M9.5 14.5l5-5M8.5 15.5l-1.7 1.7a3.5 3.5 0 0 1-4.9-4.9l2.4-2.4M15.5 8.5l1.7-1.7a3.5 3.5 0 0 1 4.9 4.9l-2.4 2.4"/>',
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS[name]"></svg>
</template>
