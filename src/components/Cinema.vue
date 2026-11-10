<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { copy, photos, photoSrc } from '../content.js'
import { reducedMotion } from '../lib/state.js'
import Pearl from './Pearl.vue'

// A self-playing montage inside a submarine porthole. It only runs while on screen.
const order = ['pink-jacket', 'kimonos', 'costume-crew', 'group-hug', 'big-jump', 'orange-gates', 'giant-boba', 'ball-pit', 'camp-mud', 'boogie-board', 'pizza', 'block-party', 'city-walk', 'beach-sunset']
const reel = order.map((id) => photos.find((p) => p.id === id)).filter(Boolean)

const index = ref(0)
const playing = ref(!reducedMotion)
const visible = ref(false)
const el = ref(null)
let timer, observer

function tick() {
  if (playing.value && visible.value) index.value = (index.value + 1) % reel.length
}

onMounted(() => {
  timer = setInterval(tick, 3600)
  observer = new IntersectionObserver(([e]) => (visible.value = e.isIntersecting), { threshold: 0.35 })
  observer.observe(el.value)
})
onUnmounted(() => {
  clearInterval(timer)
  observer?.disconnect()
})
</script>

<template>
  <section class="zone cinema is-deep" data-zone="The deep">
    <div class="zone__inner">
      <h2 class="zone__title">{{ copy.cinema.heading }}</h2>
      <p class="zone__body">{{ copy.cinema.body }}</p>

      <div ref="el" class="porthole" :class="{ 'is-playing': playing && visible }">
        <div class="porthole__glass">
          <img
            v-for="(p, i) in reel"
            :key="p.id"
            class="porthole__frame"
            :class="{ 'is-on': i === index }"
            :src="photoSrc(p.id)"
            :style="{ objectPosition: p.pos }"
            :alt="i === index ? p.caption : ''"
            loading="lazy"
          />
        </div>
        <span v-for="n in 8" :key="n" class="porthole__bolt" :style="{ '--a': n * 45 + 'deg' }" aria-hidden="true"></span>
      </div>

      <p class="cinema__caption" aria-live="off">{{ reel[index].caption }}</p>
      <div class="cinema__controls">
        <button class="btn btn--small" @click="index = (index - 1 + reel.length) % reel.length">Back</button>
        <button class="btn btn--small" @click="playing = !playing">{{ playing ? 'Pause' : 'Play' }}</button>
        <button class="btn btn--small" @click="index = (index + 1) % reel.length">Next</button>
      </div>
      <a class="btn cinema__movie" href="/movie">Watch the save the date movie</a>
    </div>
    <img class="cinema__turtle" src="/art/turtle.webp" alt="" loading="lazy" />
    <Pearl id="cinema" class="pearl--cinema" />
  </section>
</template>
