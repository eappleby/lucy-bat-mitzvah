<script setup>
import { reactive, ref } from 'vue'
import { copy, event } from '../content.js'
import { supabase, friendlyError } from '../lib/supabase.js'
import { invite } from '../lib/state.js'
import Pearl from './Pearl.vue'

const open = ref(false)
const state = ref('idle') // idle | sending | sent
const error = ref('')
const form = reactive({
  name: '', address1: '', address2: '', city: '', state: '', postal: '',
  country: 'United States', email: '', note: '', website: '',
})

async function send() {
  error.value = ''
  if (form.website) return // honeypot
  if (!form.name.trim() || !form.address1.trim() || !form.city.trim()) {
    error.value = 'We need a name, a street address, and a city.'
    return
  }
  state.value = 'sending'
  const { error: err } = await supabase.rpc('submit_address', {
    p_name: form.name,
    p_address1: form.address1,
    p_address2: form.address2,
    p_city: form.city,
    p_state: form.state,
    p_postal_code: form.postal,
    p_country: form.country,
    p_email: form.email,
    p_note: form.note,
    p_token: invite.token || null,
  })
  if (err) {
    error.value = friendlyError(err)
    state.value = 'idle'
    return
  }
  state.value = 'sent'
}
</script>

<template>
  <section class="zone floor is-deep" data-zone="The sea floor">
    <div class="zone__inner floor__inner">
      <h2 class="zone__title">{{ copy.floor.heading }}</h2>
      <p class="zone__body">{{ copy.floor.body }}</p>
      <p v-if="invite.hasAddress" class="zone__body floor__known">{{ copy.floor.known }}</p>

      <button v-if="!open" class="clam" @click="open = true">
        <img src="/art/clam.webp" alt="" />
        <span class="btn btn--big">Open the clam</span>
      </button>

      <form v-else-if="state !== 'sent'" class="address sketch" @submit.prevent="send">
        <img class="address__clam" src="/art/clam.webp" alt="" />
        <h3>Where should we mail it?</h3>
        <label class="field field--wide">
          <span>Name for the envelope</span>
          <input v-model="form.name" type="text" maxlength="200" autocomplete="name" placeholder="The Rivera Family" />
        </label>
        <label class="field field--wide">
          <span>Street address</span>
          <input v-model="form.address1" type="text" maxlength="200" autocomplete="address-line1" />
        </label>
        <label class="field field--wide">
          <span>Apartment or unit (optional)</span>
          <input v-model="form.address2" type="text" maxlength="200" autocomplete="address-line2" />
        </label>
        <label class="field">
          <span>City</span>
          <input v-model="form.city" type="text" maxlength="120" autocomplete="address-level2" />
        </label>
        <label class="field field--small">
          <span>State</span>
          <input v-model="form.state" type="text" maxlength="80" autocomplete="address-level1" />
        </label>
        <label class="field field--small">
          <span>ZIP</span>
          <input v-model="form.postal" type="text" maxlength="30" autocomplete="postal-code" inputmode="text" />
        </label>
        <label class="field">
          <span>Country</span>
          <input v-model="form.country" type="text" maxlength="80" autocomplete="country-name" />
        </label>
        <label class="field field--wide">
          <span>Email (optional, for updates later)</span>
          <input v-model="form.email" type="email" maxlength="200" autocomplete="email" />
        </label>
        <label class="field field--wide">
          <span>Anything to tell Lucy? (optional)</span>
          <textarea v-model="form.note" rows="3" maxlength="2000"></textarea>
        </label>
        <input v-model="form.website" class="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <p v-if="error" class="form-error field--wide" role="alert">{{ error }}</p>
        <button class="btn btn--big field--wide" :disabled="state === 'sending'">
          {{ state === 'sending' ? 'Sending' : 'Send my address' }}
        </button>
      </form>

      <div v-else class="address address--sent sketch">
        <img class="address__turtle" src="/art/turtle.webp" alt="" />
        <h3>Got it! The turtle is on its way to {{ form.city }}.</h3>
        <p>Watch your mailbox for a save the date. See you on {{ event.dateText }}.</p>
      </div>
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
    <p class="credit">Made for Lucy's bat mitzvah, {{ event.dateText }}</p>
  </section>
</template>
