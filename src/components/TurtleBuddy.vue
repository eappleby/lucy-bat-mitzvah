<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { reducedMotion } from '../lib/state.js'

// A turtle that paddles after the cursor. On touch screens it wanders on its own.
// The drawing's head points up and to the left, about 220 degrees on screen.
const HEAD_ANGLE = 220
const el = ref(null)
const show = ref(false)
let x = -200, y = 300, tx = 200, ty = 300, angle = 0, raf = 0, wander = 0
const fine = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches

function onMove(e) {
  tx = e.clientX + 70
  ty = e.clientY + 70
}

function pickSpot() {
  tx = 40 + Math.random() * (window.innerWidth - 80)
  ty = 80 + Math.random() * (window.innerHeight - 160)
}

function frame() {
  const dx = tx - x
  const dy = ty - y
  const dist = Math.hypot(dx, dy)
  if (dist > 4) {
    x += dx * 0.02
    y += dy * 0.02
    const want = (Math.atan2(dy, dx) * 180) / Math.PI - HEAD_ANGLE
    let diff = ((want - angle + 540) % 360) - 180
    angle += diff * 0.06
  }
  if (el.value) el.value.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${angle}deg)`
  raf = requestAnimationFrame(frame)
}

function onScroll() {
  show.value = window.scrollY > window.innerHeight * 0.6
}

onMounted(() => {
  if (reducedMotion) return
  y = window.innerHeight * 0.6
  window.addEventListener('scroll', onScroll, { passive: true })
  if (fine) window.addEventListener('pointermove', onMove, { passive: true })
  else wander = setInterval(pickSpot, 5000)
  pickSpot()
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  clearInterval(wander)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('pointermove', onMove)
})
</script>

<template>
  <img ref="el" class="buddy" :class="{ 'is-on': show }" src="/art/turtle.webp" alt="" aria-hidden="true" />
</template>
