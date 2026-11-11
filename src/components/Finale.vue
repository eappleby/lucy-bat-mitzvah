<script setup>
import { copy, event } from '../content.js'
import Pearl from './Pearl.vue'
</script>

<template>
  <section class="zone finale is-deep" data-zone="The sea floor">
    <div class="zone__inner finale__inner">
      <img class="finale__clam" src="/art/clam.webp" alt="" />
      <h2 class="finale__title">{{ copy.finale.heading }}</h2>
      <p class="finale__body">{{ copy.finale.body }}</p>
      <p class="finale__date">{{ event.whose }} {{ event.title.join(' ') }}, {{ event.dateText }}</p>
    </div>

    <div class="floor__sand" aria-hidden="true">
      <img class="floor__art floor__art--a" src="/art/seaweed-a.webp" alt="" loading="lazy" />
      <img class="floor__art floor__art--b" src="/art/shell-big.webp" alt="" loading="lazy" />
      <img class="floor__art floor__art--c" src="/art/coral-mix.webp" alt="" loading="lazy" />
      <img class="floor__art floor__art--d" src="/art/starfish.webp" alt="" loading="lazy" />
      <img class="floor__art floor__art--e" src="/art/seaweed-pearls.webp" alt="" loading="lazy" />
      <img class="floor__art floor__art--f" src="/art/shell-purple.webp" alt="" loading="lazy" />
    </div>
    <Pearl id="floor" class="pearl--floor" />
  </section>
</template>
