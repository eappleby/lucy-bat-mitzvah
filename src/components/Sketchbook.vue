<script setup>
import { onMounted, ref } from 'vue'
import { copy } from '../content.js'
import { supabase, artUrl } from '../lib/supabase.js'
import Pearl from './Pearl.vue'

const posts = ref([])
const loaded = ref(false)
const open = ref(null)

onMounted(async () => {
  const { data } = await supabase
    .from('lucy_posts')
    .select('id, kind, title, body, image_path')
    .eq('published', true)
    .order('sort')
    .order('created_at', { ascending: false })
  posts.value = data || []
  loaded.value = true
})
</script>

<template>
  <section class="zone sketchbook is-deep" data-zone="Lucy's sketchbook">
    <div class="zone__inner">
      <h2 class="zone__title">{{ copy.sketchbook.heading }}</h2>
      <p class="zone__body">{{ copy.sketchbook.body }}</p>

      <div v-if="posts.length" class="pages">
        <button v-for="(p, i) in posts" :key="p.id" class="page" :class="['page--' + p.kind, 'page--tilt' + (i % 4)]" @click="open = p">
          <img v-if="p.image_path" :src="artUrl(p.image_path)" :alt="p.title" loading="lazy" />
          <span class="page__title">{{ p.title }}</span>
          <span v-if="!p.image_path && p.body" class="page__excerpt">{{ p.body }}</span>
        </button>
      </div>
      <div v-else-if="loaded" class="page page--empty">
        <img src="/art/starfish.webp" alt="" />
        <span class="page__title">{{ copy.sketchbook.empty }}</span>
      </div>
    </div>
    <img class="swim swim--right sketchbook__fish" src="/art/fish-orange-trio.webp" alt="" loading="lazy" />
    <img class="sketchbook__weed" src="/art/seaweed-a.webp" alt="" loading="lazy" />
    <Pearl id="sketchbook" class="pearl--sketchbook" />

    <div v-if="open" class="modal" role="dialog" aria-modal="true" :aria-label="open.title" @click.self="open = null">
      <article class="modal__card modal__card--page">
        <button class="modal__close" aria-label="Close" @click="open = null">Close</button>
        <h3>{{ open.title }}</h3>
        <img v-if="open.image_path" :src="artUrl(open.image_path)" :alt="open.title" />
        <p v-if="open.body" class="modal__story">{{ open.body }}</p>
      </article>
    </div>
  </section>
</template>
