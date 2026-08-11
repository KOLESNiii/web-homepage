<template>
  <TubeExperience v-if="isTubeView" />
  <RouterView v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const TubeExperience = defineAsyncComponent(() => import('./components/TubeExperience.vue'))
const isTubeView = computed(() => route.path === '/' && route.query.view === 'tube')

function restoreDocumentScroll() {
  document.documentElement.classList.remove('is-map-exploring')
  document.documentElement.style.removeProperty('overflow')
  document.body.style.removeProperty('overflow')
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto'
}

watch(isTubeView, (tube) => {
  if (!tube) restoreDocumentScroll()
}, { immediate: true, flush: 'post' })

onMounted(() => {
  if (!isTubeView.value) restoreDocumentScroll()
})
</script>
