<script setup>
// One of Lucy's hiding spots. Put it right before the drawing she hides behind, as a
// sibling, so the drawing paints over her. `dir` is the way she leans out ('up', 'left',
// 'right'). x and y are fractions of the drawing's box: the point her feet line up with.
// reach is how much of her leans out sideways while she peeks ('left' and 'right' only).
// See lib/hideSeek.js for when she peeks.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { copy } from '../content.js'
import { catchLucy, found, hoverIn, hoverOut, peek, register, revealed, setVisible, tapReveal, unregister } from '../lib/hideSeek.js'

const props = defineProps({
  id: { type: String, required: true },
  dir: { type: String, default: 'up' },
  x: { type: Number, default: 0.5 },
  y: { type: Number, default: 0.25 },
  reach: { type: Number, default: 0.48 },
})

// The sprite frame is 40 x 46, drawn at 1.5x so she stays small.
const W = 60
const H = 69

const el = ref(null)
const pos = ref({ left: 0, top: 0 })
// 'caught': popped up with open arms. Once found, she stays out at that spot for good in a
// different pose, hand on her head ('stay').
const phase = computed(() => {
  if (peek.id === props.id) return peek.caught ? 'caught' : 'out'
  return found.value.includes(props.id) ? 'stay' : 'hidden'
})
let observer

// The drawing she hides behind: the next sibling that is not another hiding spot (two spots
// can share one drawing, like the top and the side of the bottle note card).
function artEl() {
  let n = el.value?.nextElementSibling
  while (n?.classList.contains('peek')) n = n.nextElementSibling
  return n
}

// She stays invisible until her drawing has loaded and finished popping in (the top art
// fades and scales in, lazy images arrive late), so she is never seen before it covers her.
const ready = ref(false)
let intersecting = false
let readyTimer = 0
function artSettled(art) {
  if (art.tagName === 'IMG' && !(art.complete && art.naturalWidth)) return false
  if (parseFloat(getComputedStyle(art).opacity) < 0.99) return false
  // Still in the middle of its pop in (a CSS transition; looping animations like a bob are fine).
  const popping = (a) => typeof CSSTransition !== 'undefined' && a instanceof CSSTransition && a.playState === 'running'
  return !(art.getAnimations?.() || []).some(popping)
}
function checkReady(tries = 0) {
  const art = artEl()
  if (!art) return
  if (artSettled(art) || tries > 75) {
    ready.value = true
    place()
    if (intersecting) setVisible(props.id, true)
    return
  }
  readyTimer = setTimeout(() => checkReady(tries + 1), 200)
}

function place() {
  const art = artEl()
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

// Once she has shown herself here, a mouse over the spot (where she leans out, plus a
// margin) brings her back out until it leaves. Touch screens have no hover, so there a
// tap on the spot brings her out for a moment instead, and a second tap on her catches her.
const MARGIN = 18
let hovering = false
let lastPointer = 'mouse'
function inSpot(e) {
  const r = el.value?.getBoundingClientRect()
  return !!r && e.clientX > r.left - MARGIN && e.clientX < r.right + MARGIN && e.clientY > r.top - MARGIN && e.clientY < r.bottom + MARGIN
}
function onPointerDown(e) {
  lastPointer = e.pointerType
}
function onSpotTap(e) {
  // Only while she is hidden; once she is out, onPageClick handles the catch.
  if (lastPointer === 'mouse' || phase.value !== 'hidden' || !revealed.has(props.id) || !inSpot(e)) return
  tapReveal(props.id)
}
function onPointerMove(e) {
  if (e.pointerType !== 'mouse' || !revealed.has(props.id)) return
  const inside = inSpot(e)
  if (inside && !hovering) {
    hovering = true
    hoverIn(props.id)
  } else if (!inside && hovering) {
    hovering = false
    hoverOut(props.id)
  }
}

// She can be clicked while peeking out, and at a found spot (for another hug).
watch(
  phase,
  (p) => {
    if (p === 'out') place()
    if (p === 'out' || p === 'stay') document.addEventListener('click', onPageClick, true)
    else if (p === 'hidden') document.removeEventListener('click', onPageClick, true)
  },
  { immediate: true },
)

onMounted(() => {
  register(props.id)
  place()
  const art = artEl()
  if (art && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(([e]) => {
      intersecting = e.isIntersecting
      if (intersecting) place()
      setVisible(props.id, intersecting && ready.value)
    }, { threshold: 0.6 })
    observer.observe(art)
  }
  window.addEventListener('resize', place)
  document.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true })
  document.addEventListener('click', onSpotTap)
  // The drawing may not have loaded yet, so place her again once it has.
  artEl()?.addEventListener?.('load', place)
  checkReady()
})
onUnmounted(() => {
  clearTimeout(readyTimer)
  observer?.disconnect()
  unregister(props.id)
  window.removeEventListener('resize', place)
  document.removeEventListener('click', onPageClick, true)
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerdown', onPointerDown, { capture: true })
  document.removeEventListener('click', onSpotTap)
})
</script>

<template>
  <div
    ref="el"
    class="peek"
    :data-spot="id"
    :class="['peek--' + dir, 'is-' + phase, { 'is-settled': ready }]"
    :style="{ left: pos.left + 'px', top: pos.top + 'px', width: W + 'px', height: H + 'px', '--reach': reach }"
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
