<script setup>
import { onMounted, watch } from 'vue'
import { loadInvite } from './lib/state.js'
import './styles/dive.css'
import Hero from './components/Hero.vue'
import Shallows from './components/Shallows.vue'
import Reef from './components/Reef.vue'
import Cinema from './components/Cinema.vue'
import Sketchbook from './components/Sketchbook.vue'
import Bottle from './components/Bottle.vue'
import SeaFloor from './components/SeaFloor.vue'
import DepthGauge from './components/DepthGauge.vue'
import TurtleBuddy from './components/TurtleBuddy.vue'
import PearlCounter from './components/PearlCounter.vue'
import Lightbox from './components/Lightbox.vue'
import Bubbles from './components/Bubbles.vue'

const props = defineProps({ token: { type: String, default: '' } })

onMounted(() => loadInvite(props.token))
watch(() => props.token, (t) => loadInvite(t))
</script>

<template>
  <div class="dive">
    <Hero />
    <main id="sea" class="sea">
      <Bubbles />
      <Shallows />
      <Reef />
      <Cinema />
      <Sketchbook />
      <Bottle />
      <SeaFloor />
    </main>
    <DepthGauge />
    <PearlCounter />
    <TurtleBuddy />
    <Lightbox />
  </div>
</template>
