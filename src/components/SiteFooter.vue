<template>
  <footer class="footer">
    <div class="footer__inner">
      <p class="footer__note">
        <span class="footer__terminus" aria-hidden="true"></span>
        © {{ year }} {{ profile.name }}
      </p>
      <p class="footer__meta">Built with Vue · no trackers</p>
      <a class="footer__top" href="#top">Back to the start ↑</a>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { profile } from '../data/portfolio'

const year = new Date().getFullYear()
</script>

<style scoped>
.footer {
  border-top: 1px solid var(--rule);
  padding: 2.25rem 0;
}

.footer__inner {
  max-width: var(--measure);
  margin: 0 auto;
  padding: 0 var(--gutter);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 2rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: var(--faint);
}

.footer__note {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

/* End of the line. */
.footer__terminus {
  width: 1.75rem;
  height: var(--track);
  background: var(--tube-bakerloo);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 60%);
  mask-image: linear-gradient(90deg, transparent, #000 60%);
}

.footer__top {
  margin-left: auto;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.3s var(--ease);
}

.footer__top:hover {
  color: var(--accent);
}

@media (max-width: 560px) {
  .footer__top {
    margin-left: 0;
  }
}
</style>
