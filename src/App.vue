<template>
  <div class="app">
    <transition-group name="screen" tag="div" class="screen-container">
      <section
        v-for="(section, i) in sections"
        v-show="i === currentIndex"
        :key="section.id"
        class="screen"
      >
        <h1>{{ section.title }}</h1>
        <p>{{ section.body }}</p>
      </section>
    </transition-group>

    <nav class="nav">
      <button @click="prev" :disabled="currentIndex === 0">↑</button>
      <button @click="next" :disabled="currentIndex === sections.length - 1">↓</button>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

/**
 * EDIT CONTENT HERE
 */
const sections = ref([
  {
    id: "home",
    title: "Tim",
    body: "Computing student. Systems. Architecture. Engineering.",
  },
  {
    id: "about",
    title: "About",
    body: "I build low-level systems, compilers, and performant software.",
  },
  {
    id: "projects",
    title: "Projects",
    body: "ARM emulators, CI pipelines, distributed backends.",
  },
  {
    id: "contact",
    title: "Contact",
    body: "email · github · linkedin",
  },
]);

const currentIndex = ref(0);

const next = () => {
  if (currentIndex.value < sections.value.length - 1) {
    currentIndex.value++;
  }
};

const prev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

const onWheel = (e) => {
  if (e.deltaY > 0) next();
  else prev();
};

const onKey = (e) => {
  if (e.key === "ArrowDown") next();
  if (e.key === "ArrowUp") prev();
};

onMounted(() => {
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("keydown", onKey);
});

onUnmounted(() => {
  window.removeEventListener("wheel", onWheel);
  window.removeEventListener("keydown", onKey);
});
</script>
