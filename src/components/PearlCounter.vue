<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { foundPearls, allPearlsFound, PEARL_TOTAL } from '../lib/state.js'

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
  () => foundPearls.value.length,
  () => {
    bump.value = true
    setTimeout(() => (bump.value = false), 500)
  },
)
watch(allPearlsFound, (v) => {
  if (v) party.value = true
})
</script>

<template>
  <div class="pearl-counter" :class="{ 'is-bump': bump, 'is-on': under }" aria-live="polite">
    <span class="pearl-counter__dot" aria-hidden="true"></span>
    {{ foundPearls.length }} of {{ PEARL_TOTAL }} pearls
  </div>

  <div v-if="party" class="party" role="dialog" aria-label="All pearls found">
    <div class="party__fish" aria-hidden="true">
      <img v-for="n in 9" :key="n" :src="['/art/fish-orange.webp', '/art/fish-blue.webp', '/art/fish-red.webp'][n % 3]" :style="{ '--i': n }" alt="" />
    </div>
    <div class="party__card sketch">
      <img src="/art/clam.webp" alt="" />
      <h2>All 7 pearls!</h2>
      <p>You have sharp eyes. Lucy owes you a high five on March 20.</p>
      <button class="btn" @click="party = false">Keep swimming</button>
    </div>
  </div>
</template>
