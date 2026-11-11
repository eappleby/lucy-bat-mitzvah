<script setup>
// The "Meet Lucy" page at /. The save the date card links here.
import './styles/dive.css'
import Hero from './components/Hero.vue'
import Shallows from './components/Shallows.vue'
import Reef from './components/Reef.vue'
import Journey from './components/journey/Journey.vue'
import Bottle from './components/Bottle.vue'
import Finale from './components/Finale.vue'
import DepthGauge from './components/DepthGauge.vue'
import TurtleBuddy from './components/TurtleBuddy.vue'
import PearlCounter from './components/PearlCounter.vue'
import Lightbox from './components/Lightbox.vue'
import Bubbles from './components/Bubbles.vue'
</script>

<template>
  <div class="dive">
    <Hero />
    <main id="sea" class="sea">
      <Bubbles />
      <Shallows />
      <Reef />
      <Journey />
      <Bottle />
      <Finale />
    </main>
    <DepthGauge />
    <PearlCounter />
    <TurtleBuddy />
    <Lightbox />
  </div>
</template>
