<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { event } from '../content.js'

const ready = ref(false)
const now = ref(Date.now())
let timer

onMounted(() => {
  requestAnimationFrame(() => (ready.value = true))
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onUnmounted(() => clearInterval(timer))

const left = computed(() => {
  const ms = Math.max(0, new Date(event.startsAt).getTime() - now.value)
  const s = Math.floor(ms / 1000)
  return [
    { n: Math.floor(s / 86400), label: 'days' },
    { n: Math.floor((s % 86400) / 3600), label: 'hours' },
    { n: Math.floor((s % 3600) / 60), label: 'minutes' },
    { n: s % 60, label: 'seconds' },
  ]
})

// The border art from the save the date, placed around the edges like the card.
const frame = [
  'coral-orange-a', 'turtle', 'starfish', 'fish-blue-school', 'shell-pearls', 'coral-pink',
  'fish-orange-trio', 'seaweed-a', 'coral-orange-b', 'shell-big', 'clownfish', 'seaweed-pearls', 'coral-mix',
]

let letterIndex = 0
const words = event.title.map((w) => [...w].map((ch) => ({ ch, i: letterIndex++ })))

function dive() {
  document.getElementById('sea')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <header class="hero" :class="{ 'is-ready': ready }">
    <img
      v-for="(name, i) in frame"
      :key="name"
      class="hero-art"
      :class="'hero-art--' + name"
      :src="`/art/${name}.webp`"
      :style="{ '--i': i }"
      alt=""
    />

    <div class="hero-center">
      <p class="hero-whose">{{ event.whose }}</p>
      <h1 class="hero-title" :aria-label="event.title.join(' ')">
        <span v-for="(word, w) in words" :key="w" class="hero-word" aria-hidden="true">
          <span v-for="l in word" :key="l.i" class="hero-letter" :style="{ '--n': l.i }">{{ l.ch }}</span>
        </span>
      </h1>
      <img class="hero-wave" src="/art/wave.webp" alt="" />
      <p class="hero-date">{{ event.dateText }}</p>
      <p class="hero-place">{{ event.placeText }}</p>

      <div class="countdown" role="timer" aria-label="Time until the big day">
        <div v-for="part in left" :key="part.label" class="countdown__part">
          <span class="countdown__ring">{{ part.n }}</span>
          <span class="countdown__label">{{ part.label }}</span>
        </div>
      </div>

      <button class="btn btn--big" @click="dive">
        Dive in
        <span class="btn__arrow" aria-hidden="true"></span>
      </button>
    </div>

    <div class="surface" aria-hidden="true">
      <svg viewBox="0 0 2400 120" preserveAspectRatio="none">
        <path class="surface__water" d="M0 60 C 100 20, 200 20, 300 60 S 500 100, 600 60 S 800 20, 900 60 S 1100 100, 1200 60 S 1400 20, 1500 60 S 1700 100, 1800 60 S 2000 20, 2100 60 S 2300 100, 2400 60 V120 H0 Z" />
        <path class="surface__line" d="M0 60 C 100 20, 200 20, 300 60 S 500 100, 600 60 S 800 20, 900 60 S 1100 100, 1200 60 S 1400 20, 1500 60 S 1700 100, 1800 60 S 2000 20, 2100 60 S 2300 100, 2400 60" />
      </svg>
    </div>
  </header>
</template>
