<script setup>
// Ambient bubbles drifting up behind everything in the sea.
const bubbles = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 61 + 7) % 100,
  size: 14 + ((i * 37) % 30),
  dur: 14 + ((i * 13) % 16),
  delay: -((i * 7) % 20),
}))
</script>

<template>
  <div class="ambient" aria-hidden="true">
    <span
      v-for="(b, i) in bubbles"
      :key="i"
      class="ring"
      :style="{ left: b.left + '%', width: b.size + 'px', height: b.size + 'px', animationDuration: b.dur + 's', animationDelay: b.delay + 's' }"
    ></span>
  </div>
</template>
