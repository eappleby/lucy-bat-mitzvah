import { reactive } from 'vue'

// Hide and seek lives in lib/hideSeek.js.

// The photo lightbox is shared by every section.
export const lightbox = reactive({ open: false, items: [], index: 0 })

export function openLightbox(items, index = 0) {
  lightbox.items = items
  lightbox.index = index
  lightbox.open = true
}

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
