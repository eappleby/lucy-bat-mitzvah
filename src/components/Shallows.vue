<script setup>
import { copy, mainPhoto, timeline, photoSrc, photoThumb } from '../content.js'
import { openLightbox } from '../lib/state.js'
import Pearl from './Pearl.vue'
</script>

<template>
  <section class="zone shallows" data-zone="The shallows">
    <img class="swim swim--right shallows__school" src="/art/fish-blue-school.webp" alt="" />
    <div class="zone__inner shallows__grid">
      <button class="portrait" :aria-label="'Open photo: ' + mainPhoto.caption" @click="openLightbox([mainPhoto], 0)">
        <img :src="photoSrc(mainPhoto.id)" :style="{ objectPosition: mainPhoto.pos }" :alt="mainPhoto.caption" />
      </button>

      <div class="shallows__text">
        <h2 class="zone__title">{{ copy.shallows.heading }}</h2>
        <p v-for="line in copy.shallows.body" :key="line" class="zone__body">{{ line }}</p>
      </div>
    </div>

    <div class="zone__inner years">
      <h3 class="years__title">{{ copy.shallows.timelineHeading }}</h3>
      <ol class="years__strip">
        <li v-for="(p, i) in timeline" :key="p.id" class="years__item" :style="{ '--tilt': [-4, 3, -2, 4, -3, 2, -1][i % 7] + 'deg' }">
          <button class="snap" :aria-label="'Open photo: ' + p.caption" @click="openLightbox(timeline, i)">
            <img :src="photoThumb(p.id)" :style="{ objectPosition: p.pos }" :alt="p.caption" loading="lazy" />
            <span>{{ p.caption }}</span>
          </button>
        </li>
      </ol>
    </div>
    <Pearl id="shallows" class="pearl--shallows" />
  </section>
</template>
