<script setup>
import { copy, photos, photoSrc, photoThumb } from '../content.js'
import { openLightbox } from '../lib/state.js'
import Pearl from './Pearl.vue'

const featured = photos.slice(0, 3)
</script>

<template>
  <section class="zone shallows" data-zone="The shallows">
    <img class="swim swim--right shallows__school" src="/art/fish-blue-school.webp" alt="" />
    <div class="zone__inner shallows__grid">
      <button class="portrait" :aria-label="'Open photo: ' + featured[0].caption" @click="openLightbox(featured, 0)">
        <img :src="photoSrc(featured[0].id)" :style="{ objectPosition: featured[0].pos }" :alt="featured[0].caption" />
      </button>

      <div class="shallows__text">
        <h2 class="zone__title">{{ copy.shallows.heading }}</h2>
        <p v-for="line in copy.shallows.body" :key="line" class="zone__body">{{ line }}</p>
        <div class="snaps">
          <button
            v-for="(p, i) in featured.slice(1)"
            :key="p.id"
            class="snap"
            :class="'snap--' + i"
            :aria-label="'Open photo: ' + p.caption"
            @click="openLightbox(featured, i + 1)"
          >
            <img :src="photoThumb(p.id)" :style="{ objectPosition: p.pos }" :alt="p.caption" loading="lazy" />
            <span>{{ p.caption }}</span>
          </button>
        </div>
      </div>
    </div>
    <Pearl id="shallows" class="pearl--shallows" />
  </section>
</template>
