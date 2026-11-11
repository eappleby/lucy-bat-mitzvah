<script setup>
// What visitors see at / while the Meet Lucy page is switched off in the admin.
import { onMounted } from 'vue'
import { copy, event } from './content.js'
import PearlDive from './components/coming-soon/PearlDive.vue'
import './styles/address.css'

onMounted(() => (document.title = "Lucy's Bat Mitzvah"))
</script>

<template>
  <div class="ap">
    <div class="ap-card cs-card">
      <img class="ap-art ap-art--coral" src="/art/coral-orange-a.webp" alt="" />
      <img class="ap-art ap-art--turtle" src="/art/turtle.webp" alt="" />
      <img class="ap-art ap-art--star" src="/art/starfish.webp" alt="" />
      <img class="ap-art ap-art--shell" src="/art/shell-big.webp" alt="" />
      <img class="ap-art ap-art--weed" src="/art/seaweed-pearls.webp" alt="" />
      <img class="ap-art ap-art--coral2" src="/art/coral-orange-b.webp" alt="" />

      <header class="ap-head">
        <p class="cs-whose">{{ event.whose }}</p>
        <h1 class="cs-title">{{ event.title.join(' ') }}</h1>
        <p class="cs-soon">{{ copy.comingSoon.heading }}</p>
        <img class="ap-wave" src="/art/wave.webp" alt="" />
        <p class="ap-intro">{{ copy.comingSoon.body }}</p>
      </header>

      <main class="ap-body">
        <PearlDive />
      </main>
    </div>
  </div>
</template>
