<template>
  <section
    :id="section"
    class="route"
    :data-active="active"
    :aria-label="`${label} section`"
  >
    <slot />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sections } from '../data/portfolio'
import { useMap } from '../map/useMap'

/**
 * One section's line: a wrapper with no box of its own, so the panels inside
 * it are positioned against the map plane rather than against this element.
 * It exists to carry the section's id for anchors, and to say whether this is
 * the line currently being ridden.
 */

const props = defineProps<{ section: string }>()

const map = useMap()
const active = computed(() => map.activeIndex.value === map.indexOf(props.section))
const label = computed(() => sections[map.indexOf(props.section)]?.label ?? props.section)
</script>

<style scoped>
.route {
  /* Keep a real section in the accessibility tree without becoming the
     containing block for the absolute-positioned panels. */
  display: block;
  width: 0;
  height: 0;
}
</style>
