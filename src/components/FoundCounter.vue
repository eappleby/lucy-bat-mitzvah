<script setup>
// Hide and seek tally. Stays out of sight until Lucy has been found once, then sits
// small in the corner. Finding every spot brings out the fish party.
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { copy } from '../content.js'
import { allFound, found, SPOTS } from '../lib/hideSeek.js'

const bump = ref(false)
const party = ref(false)
const under = ref(false)

// Stay out of the way of the hero art until the visitor is under water.
function onScroll() {
  under.value = window.scrollY > window.innerHeight * 0.5
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

watch(
  () => found.value.length,
  () => {
    bump.value = true
    setTimeout(() => (bump.value = false), 500)
  },
)
watch(allFound, (v) => {
  if (v) party.value = true
})

const label = () => copy.hideSeek.counter.replace('{found}', found.value.length).replace('{total}', SPOTS.length)
</script>

<template>
  <div v-if="found.length" class="found-counter" :class="{ 'is-bump': bump, 'is-on': under }" aria-live="polite">
    <span class="found-counter__face" aria-hidden="true"></span>
    {{ label() }}
  </div>

  <div v-if="party" class="party" role="dialog" :aria-label="copy.hideSeek.allHeading">
    <div class="party__fish" aria-hidden="true">
      <img v-for="n in 9" :key="n" :src="['/art/fish-orange.webp', '/art/fish-blue.webp', '/art/fish-red.webp'][n % 3]" :style="{ '--i': n }" alt="" />
    </div>
    <div class="party__card sketch">
      <span class="party__lucy" aria-hidden="true"></span>
      <h2>{{ copy.hideSeek.allHeading }}</h2>
      <p>{{ copy.hideSeek.allBody }}</p>
      <button class="btn" @click="party = false">{{ copy.hideSeek.close }}</button>
    </div>
  </div>
</template>
