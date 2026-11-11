<script setup>
import { onMounted, reactive, ref } from 'vue'
import { copy } from '../content.js'
import { supabase, friendlyError } from '../lib/supabase.js'
import Pearl from './Pearl.vue'

const form = reactive({ name: '', message: '', website: '' })
const state = ref('idle') // idle | sending | sent
const error = ref('')
const bottles = ref([])
const reading = ref(null)

onMounted(async () => {
  const { data } = await supabase.rpc('get_public_bottles')
  bottles.value = data || []
})

async function send() {
  error.value = ''
  if (form.website) return // honeypot: real people never see this field
  if (!form.name.trim() || !form.message.trim()) {
    error.value = 'Add your name and a note first.'
    return
  }
  state.value = 'sending'
  const { error: err } = await supabase.rpc('send_bottle', {
    p_name: form.name,
    p_message: form.message,
  })
  if (err) {
    error.value = friendlyError(err)
    state.value = 'idle'
    return
  }
  state.value = 'sent'
}

function again() {
  form.message = ''
  state.value = 'idle'
}
</script>

<template>
  <section class="zone bottle-bay is-deep" data-zone="Bottle bay">
    <div class="zone__inner bottle-bay__grid">
      <div>
        <h2 class="zone__title">{{ copy.bottle.heading }}</h2>
        <p class="zone__body">{{ copy.bottle.body }}</p>

        <div v-if="bottles.length" class="floaters">
          <button v-for="(b, i) in bottles.slice(0, 12)" :key="b.id" class="floater" :style="{ '--delay': -(i * 0.8) + 's' }" @click="reading = b">
            <span class="floater__glass" aria-hidden="true"></span>
            <span class="floater__from">from {{ b.from_name }}</span>
          </button>
        </div>
      </div>

      <form v-if="state !== 'sent'" class="note sketch" @submit.prevent="send">
        <label class="field">
          <span>Your name</span>
          <input v-model="form.name" type="text" maxlength="120" autocomplete="name" />
        </label>
        <label class="field">
          <span>Your note to Lucy</span>
          <textarea v-model="form.message" rows="5" maxlength="1000"></textarea>
        </label>
        <input v-model="form.website" class="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="btn" :disabled="state === 'sending'">{{ state === 'sending' ? 'Tossing it in' : 'Toss it in' }}</button>
      </form>
      <div v-else class="note note--sent sketch">
        <span class="floater__glass floater__glass--big" aria-hidden="true"></span>
        <h3>Splash! Your bottle is on its way to Lucy.</h3>
        <button class="btn btn--small" @click="again">Write another</button>
      </div>
    </div>
    <img class="swim swim--right bottle-bay__fish" src="/art/fish-red.webp" alt="" loading="lazy" />
    <img class="bottle-bay__shell" src="/art/shell-pearls.webp" alt="" loading="lazy" />
    <Pearl id="bottle" class="pearl--bottle" />

    <div v-if="reading" class="modal" role="dialog" aria-modal="true" aria-label="Message in a bottle" @click.self="reading = null">
      <article class="modal__card modal__card--page">
        <button class="modal__close" aria-label="Close" @click="reading = null">Close</button>
        <p class="modal__story">{{ reading.message }}</p>
        <p class="modal__from">from {{ reading.from_name }}</p>
      </article>
    </div>
  </section>
</template>
