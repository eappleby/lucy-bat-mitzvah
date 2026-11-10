<script setup>
import { computed, ref } from 'vue'
import { foundPearls, findPearl } from '../lib/state.js'

const props = defineProps({ id: { type: String, required: true } })
const found = computed(() => foundPearls.value.includes(props.id))
const popping = ref(false)

function grab() {
  if (found.value) return
  popping.value = true
  findPearl(props.id)
}
</script>

<template>
  <button
    class="pearl"
    :class="{ 'is-found': found, 'is-popping': popping }"
    :aria-label="found ? 'Pearl found' : 'A hidden pearl. Grab it!'"
    :disabled="found"
    @click="grab"
  ></button>
</template>
