<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const depth = ref(0)
const zone = ref('The surface')
const progress = ref(0)
// The cartoon fills the screen, so the gauge steps aside while it plays.
const inJourney = ref(false)
const MAX_DEPTH = 200
let raf = 0

function measure() {
  raf = 0
  const sea = document.getElementById('sea')
  if (!sea) return
  const rect = sea.getBoundingClientRect()
  const travelled = Math.min(Math.max(window.innerHeight * 0.5 - rect.top, 0), rect.height)
  progress.value = rect.height ? travelled / rect.height : 0
  depth.value = Math.round(progress.value * MAX_DEPTH)

  let current = 'The surface'
  for (const el of sea.querySelectorAll('[data-zone]')) {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.5) current = el.dataset.zone
  }
  zone.value = current
  const stage = document.querySelector('.journey__stage')
  if (stage) {
    const r = stage.getBoundingClientRect()
    inJourney.value = r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.5
  }
}

function onScroll() {
  if (!raf) raf = requestAnimationFrame(measure)
}

onMounted(() => {
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <aside class="gauge" :class="{ 'is-under': depth > 0 && !inJourney }" aria-label="Depth gauge">
    <div class="gauge__track" aria-hidden="true">
      <span class="gauge__diver" :style="{ top: progress * 100 + '%' }"></span>
    </div>
    <div class="gauge__read">
      <strong>{{ depth }} m</strong>
      <span>{{ zone }}</span>
    </div>
  </aside>
</template>
