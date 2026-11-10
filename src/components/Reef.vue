<script setup>
import { ref } from 'vue'
import { copy, photos, photoThumb } from '../content.js'
import { openLightbox } from '../lib/state.js'
import Pearl from './Pearl.vue'

const crew = photos.slice(3)
const sizes = [1.25, 0.9, 1.1, 0.8, 1.35, 0.95, 1.15, 0.85, 1.2, 1, 0.9, 1.3, 0.85, 1.1, 0.95, 1.2, 0.8, 1.05, 0.9]
const popping = ref(-1)

function pop(i) {
  popping.value = i
  setTimeout(() => {
    openLightbox(crew, i)
    popping.value = -1
  }, 260)
}
</script>

<template>
  <section class="zone reef" data-zone="The reef">
    <img class="reef__coral reef__coral--l" src="/art/coral-pink.webp" alt="" loading="lazy" />
    <img class="reef__coral reef__coral--r" src="/art/coral-orange-b.webp" alt="" loading="lazy" />
    <div class="zone__inner">
      <h2 class="zone__title">{{ copy.reef.heading }}</h2>
      <p class="zone__body">{{ copy.reef.body }}</p>
      <div class="bubbles">
        <button
          v-for="(p, i) in crew"
          :key="p.id"
          class="bubble"
          :class="{ 'is-popping': popping === i }"
          :style="{ '--s': sizes[i % sizes.length], '--dur': 5 + (i % 5) * 0.9 + 's', '--delay': -(i * 0.7) + 's', '--lift': (i % 3) * 14 + 'px' }"
          :aria-label="'Pop bubble: ' + p.caption"
          @click="pop(i)"
        >
          <img :src="photoThumb(p.id)" :style="{ objectPosition: p.pos }" alt="" loading="lazy" />
        </button>
      </div>
    </div>
    <img class="swim swim--left reef__clown" src="/art/clownfish.webp" alt="" loading="lazy" />
    <Pearl id="reef-a" class="pearl--reef-a" />
    <Pearl id="reef-b" class="pearl--reef-b" />
  </section>
</template>
