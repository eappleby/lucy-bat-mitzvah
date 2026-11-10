<script setup>
// A 32 second animated save the date. Everything is CSS animation on one fixed
// 1080 x 1920 stage, so it plays the same on any screen and can be exported
// frame by frame (see scripts/render-movie.cjs).
import { onMounted, onUnmounted, ref } from 'vue'
import { event, photos, photoSrc } from './content.js'
import './styles/movie.css'

const order = ['beach-sunset', 'big-jump', 'giant-boba', 'camp-mud', 'orange-gates', 'costume-crew', 'ball-pit', 'block-party', 'boogie-board']
const reel = order.map((id) => photos.find((p) => p.id === id)).filter(Boolean)

const cardArt = [
  'coral-orange-a', 'fish-blue-school', 'turtle', 'starfish', 'shell-pearls', 'fish-orange-trio', 'coral-pink',
  'seaweed-a', 'coral-orange-b', 'clownfish', 'shell-big', 'seaweed-pearls', 'coral-mix',
]
let n = 0
const words = event.title.map((w) => [...w].map((ch) => ({ ch, n: n++ })))
const rings = Array.from({ length: 14 }, (_, i) => ({ left: (i * 79 + 40) % 1040, size: 26 + ((i * 37) % 44), dur: 5 + (i % 5), delay: -(i * 1.3) }))

const capture = new URLSearchParams(window.location.search).has('capture')
const scale = ref(1)
const run = ref(0)

function fit() {
  scale.value = capture ? 1 : Math.min(window.innerWidth / 1080, window.innerHeight / 1920)
}
onMounted(() => {
  document.title = "Lucy's Bat Mitzvah: the movie"
  fit()
  window.addEventListener('resize', fit)
})
onUnmounted(() => window.removeEventListener('resize', fit))
</script>

<template>
  <div class="mv" :class="{ 'mv--capture': capture }">
    <div :key="run" class="mv-stage" :style="{ transform: `scale(${scale})` }">
      <!-- Scene 1: the card -->
      <div class="mv-card">
        <img v-for="(name, i) in cardArt" :key="name" class="mv-art" :class="'mv-art--' + name" :src="`/art/${name}.webp`" :style="{ '--i': i }" alt="" />
        <p class="mv-whose">{{ event.whose }}</p>
        <p class="mv-title">
          <span v-for="(word, w) in words" :key="w" class="mv-word" :class="'mv-word--' + w">
            <span v-for="l in word" :key="l.n" class="mv-letter" :style="{ '--n': l.n }">{{ l.ch }}</span>
          </span>
        </p>
        <img class="mv-wave" src="/art/wave.webp" alt="" />
        <p class="mv-date">{{ event.dateText }}</p>
        <p class="mv-place">{{ event.placeText }}</p>
      </div>

      <!-- Scene 2: the water rises -->
      <div class="mv-water">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 60 C 100 10, 200 10, 300 60 S 500 110, 600 60 S 800 10, 900 60 S 1100 110, 1200 60 V120 H0 Z" />
        </svg>
      </div>

      <!-- Scene 3: photos in bubbles -->
      <div class="mv-sea">
        <span v-for="(r, i) in rings" :key="i" class="mv-ring" :style="{ left: r.left + 'px', width: r.size + 'px', height: r.size + 'px', animationDuration: r.dur + 's', animationDelay: r.delay + 's' }"></span>
        <img class="mv-swim mv-swim--school" src="/art/fish-blue-school.webp" alt="" />
        <img class="mv-swim mv-swim--turtle" src="/art/turtle.webp" alt="" />
        <img class="mv-swim mv-swim--trio" src="/art/fish-orange-trio.webp" alt="" />
        <img class="mv-swim mv-swim--clown" src="/art/clownfish.webp" alt="" />
        <img class="mv-reef mv-reef--l" src="/art/coral-pink.webp" alt="" />
        <img class="mv-reef mv-reef--r" src="/art/coral-orange-b.webp" alt="" />

        <figure v-for="(p, i) in reel" :key="p.id" class="mv-photo" :style="{ '--i': i, '--x': (i % 2 ? 1 : -1) }">
          <span class="mv-photo__glass"><img :src="photoSrc(p.id)" :style="{ objectPosition: p.pos }" alt="" /></span>
          <figcaption>{{ p.caption }}</figcaption>
        </figure>
      </div>

      <!-- Scene 4: the sea floor -->
      <div class="mv-floor">
        <div class="mv-sand">
          <img class="mv-sand__a" src="/art/seaweed-a.webp" alt="" />
          <img class="mv-sand__b" src="/art/shell-big.webp" alt="" />
          <img class="mv-sand__c" src="/art/coral-mix.webp" alt="" />
          <img class="mv-sand__d" src="/art/starfish.webp" alt="" />
          <img class="mv-sand__e" src="/art/seaweed-pearls.webp" alt="" />
        </div>
        <p class="mv-end mv-end--1">Save the date!</p>
        <img class="mv-clam" src="/art/clam.webp" alt="" />
        <p class="mv-end mv-end--2">{{ event.whose }} {{ event.title.join(' ') }}</p>
        <p class="mv-end mv-end--3">{{ event.dateText }}</p>
        <p class="mv-end mv-end--4">{{ event.placeText }}</p>
      </div>
    </div>

    <div v-if="!capture" class="mv-controls">
      <button class="btn btn--small" @click="run++">Play again</button>
      <a class="btn btn--small" href="/">Visit the site</a>
    </div>
  </div>
</template>
