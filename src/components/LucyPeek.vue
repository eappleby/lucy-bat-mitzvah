<script setup>
// One of Lucy's hiding spots. Put it right before the drawing she hides behind, as a
// sibling, so the drawing paints over her. `dir` is the way she leans out ('up', 'left',
// 'right'). x and y are fractions of the drawing's box: the point her feet line up with.
// See lib/hideSeek.js for when she peeks.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { copy } from '../content.js'
import { catchLucy, peek, register, setVisible, unregister } from '../lib/hideSeek.js'

const props = defineProps({
  id: { type: String, required: true },
  dir: { type: String, default: 'up' },
  x: { type: Number, default: 0.5 },
  y: { type: Number, default: 0.25 },
})

// The sprite frame is 40 x 46, drawn at 1.5x so she stays small.
const W = 60
const H = 69

const el = ref(null)
const pos = ref({ left: 0, top: 0 })
const phase = computed(() => (peek.id !== props.id ? 'hidden' : peek.caught ? 'caught' : 'out'))
let observer

function place() {
  const art = el.value?.nextElementSibling
  if (!art) return
  // offset* ignore transforms, so a bobbing or wiggling drawing does not move her spot.
  const ax = art.offsetLeft + art.offsetWidth * props.x
  const ay = art.offsetTop + art.offsetHeight * props.y
  const left = props.dir === 'right' ? ax : props.dir === 'left' ? ax - W : ax - W / 2
  pos.value = { left: Math.round(left), top: Math.round(ay - H) }
}

// The drawing and the section's content sit on top of her, so a click on her never reaches
// her button. While she is out, check every click on the page against the part of her that
// shows (her sprite inside the clipping box, plus a little slack for small fingers).
const SLACK = 8
function onPageClick(e) {
  const box = el.value?.getBoundingClientRect()
  const me = el.value?.firstElementChild?.getBoundingClientRect()
  if (!box || !me) return
  const left = Math.max(box.left, me.left) - SLACK
  const right = Math.min(box.right, me.right) + SLACK
  const top = Math.max(box.top, me.top) - SLACK
  const bottom = Math.min(box.bottom, me.bottom) + SLACK
  if (e.clientX < left || e.clientX > right || e.clientY < top || e.clientY > bottom) return
  e.preventDefault()
  e.stopPropagation()
  catchLucy(props.id)
}

watch(phase, (p) => {
  if (p === 'out') place()
  if (p === 'out') document.addEventListener('click', onPageClick, true)
  else document.removeEventListener('click', onPageClick, true)
})

onMounted(() => {
  register(props.id)
  place()
  const art = el.value?.nextElementSibling
  if (art && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(([e]) => setVisible(props.id, e.isIntersecting), { threshold: 0.6 })
    observer.observe(art)
  }
  window.addEventListener('resize', place)
})
onUnmounted(() => {
  observer?.disconnect()
  unregister(props.id)
  window.removeEventListener('resize', place)
  document.removeEventListener('click', onPageClick, true)
})
</script>

<template>
  <div
    ref="el"
    class="peek"
    :class="['peek--' + dir, 'is-' + phase]"
    :style="{ left: pos.left + 'px', top: pos.top + 'px', width: W + 'px', height: H + 'px' }"
  >
    <button
      type="button"
      class="peek__lucy"
      :tabindex="phase === 'out' ? 0 : -1"
      :aria-label="copy.hideSeek.lucyLabel"
      @click="catchLucy(id)"
    ></button>
  </div>
</template>
