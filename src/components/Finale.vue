<script setup>
import { copy } from '../content.js'
import LucyPeek from './LucyPeek.vue'
</script>

<template>
  <section class="zone finale is-deep" data-zone="The sea floor">
    <div class="zone__inner finale__inner">
      <LucyPeek id="clam" :y="0.05" />
      <img class="finale__clam" src="/art/clam.webp" alt="" />
      <h2 class="finale__title">{{ copy.finale.heading }}</h2>
      <p class="finale__body">{{ copy.finale.body }}</p>
    </div>

    <div class="floor__sand" aria-hidden="true">
      <img class="floor__art floor__art--a" src="/art/seaweed-a.webp" alt="" loading="lazy" />
      <LucyPeek id="floor" :y="0.07" />
      <img class="floor__art floor__art--b" src="/art/shell-big.webp" alt="" loading="lazy" />
      <img class="floor__art floor__art--c" src="/art/coral-mix.webp" alt="" loading="lazy" />
      <img class="floor__art floor__art--d" src="/art/starfish.webp" alt="" loading="lazy" />
      <img class="floor__art floor__art--e" src="/art/seaweed-pearls.webp" alt="" loading="lazy" />
      <img class="floor__art floor__art--f" src="/art/shell-purple.webp" alt="" loading="lazy" />
    </div>
  </section>
</template>
