<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { lightbox } from '../lib/state.js'
import { photoSrc } from '../content.js'

const current = computed(() => lightbox.items[lightbox.index])

function step(n) {
  const len = lightbox.items.length
  lightbox.index = (lightbox.index + n + len) % len
}
function close() {
  lightbox.open = false
}
function onKey(e) {
  if (!lightbox.open) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowRight') step(1)
  if (e.key === 'ArrowLeft') step(-1)
}

watch(() => lightbox.open, (open) => {
  document.documentElement.style.overflow = open ? 'hidden' : ''
})
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <div v-if="lightbox.open && current" class="modal modal--photo" role="dialog" aria-modal="true" :aria-label="current.caption" @click.self="close">
    <figure :key="current.id" class="polaroid">
      <img :src="photoSrc(current.id)" :alt="current.caption" />
      <figcaption>{{ current.caption }}</figcaption>
    </figure>
    <div class="modal__nav">
      <button class="btn btn--small" @click="step(-1)">Back</button>
      <button class="btn btn--small" @click="close">Close</button>
      <button class="btn btn--small" @click="step(1)">Next</button>
    </div>
  </div>
</template>
