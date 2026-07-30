<template>
  <section :id="section" class="route" :data-active="active">
    <slot />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<style scoped>
.route {
  display: contents;
}
</style>
