<template>
  <div class="editor" role="region" :aria-label="`${filename} code`">
    <header class="editor__chrome">
      <span class="editor__lights" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="editor__filename">{{ filename }}</span>
      <span class="editor__language">{{ language }}</span>
    </header>
    <div class="editor__viewport">
      <span class="editor__gutter" aria-hidden="true">
        <span v-for="line in lines" :key="line.number">{{ line.number }}</span>
      </span>
      <pre><code><span
        v-for="line in lines"
        :key="line.number"
        class="editor__line"
        :style="{ '--line': line.number }"
        v-html="line.html"
      ></span></code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ filename: string; language: 'WACC' | 'AARCH64'; code: string }>()

const lines = computed(() => props.code.split('\n').map((line, index) => ({
  number: index + 1,
  html: highlight(line, props.language),
})))

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(line: string, language: 'WACC' | 'AARCH64') {
  let value = escapeHtml(line)
  const comments: string[] = []
  value = value.replace(/(#|\/\/).*$/, (match) => {
    comments.push(match)
    return `@@COMMENT${comments.length - 1}@@`
  })
  value = value.replace(/(&quot;.*?&quot;|'.*?')/g, '<span class="tok-string">$1</span>')
  value = value.replace(/\b(\d+)\b/g, '<span class="tok-number">$1</span>')

  if (language === 'WACC') {
    value = value.replace(/\b(begin|end|int|bool|char|string|pair|newpair|fst|snd|if|then|else|fi|while|do|done|println|print|skip|free|return|exit|true|false)\b/g, '<span class="tok-keyword">$1</span>')
    value = value.replace(/\b(total|left|right|stats)\b/g, '<span class="tok-name">$1</span>')
  } else {
    value = value.replace(/\b(stp|ldp|str|ldr|mov|add|sub|bl|ret|cmp|b|bgt|adrp)\b/g, '<span class="tok-instruction">$1</span>')
    value = value.replace(/\b(x(?:[0-9]|[12][0-9]|30)|w(?:[0-9]|[12][0-9]|30)|sp|lr|fp)\b/g, '<span class="tok-register">$1</span>')
    value = value.replace(/(^|\s)(\.[A-Za-z_][\w.]*)/g, '$1<span class="tok-directive">$2</span>')
    value = value.replace(/(^|\s)([._A-Za-z][\w.]*:)/g, '$1<span class="tok-label">$2</span>')
  }

  return value.replace(/@@COMMENT(\d+)@@/g, (_, index: string) => `<span class="tok-comment">${comments[Number(index)]}</span>`)
}
</script>

<style scoped>
.editor {
  overflow: hidden;
  border: 1px solid #2d3932;
  border-radius: 7px;
  background: #0d1210;
  color: #dce5df;
  box-shadow: 0 22px 60px rgb(0 0 0 / 24%);
}

.editor__chrome {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 46px;
  padding: 0 15px;
  border-bottom: 1px solid #29342e;
  background: #171e1a;
  color: #aab5ae;
  font: 11px 'JetBrains Mono', monospace;
}

.editor__lights { display: flex; gap: 7px; }
.editor__lights i { width: 9px; height: 9px; border-radius: 50%; background: #e36f5d; }
.editor__lights i:nth-child(2) { background: #dcb553; }
.editor__lights i:nth-child(3) { background: #70b287; }
.editor__filename { justify-self: center; }
.editor__language { justify-self: end; color: #718078; font-size: 9px; letter-spacing: .08em; }

.editor__viewport {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  min-height: 390px;
  max-height: 500px;
  overflow: auto;
  padding: 25px 0;
}

.editor__gutter {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-right: 15px;
  border-right: 1px solid #243029;
  color: #59675e;
  font: 12px/1.8 'JetBrains Mono', monospace;
  user-select: none;
}

pre { min-width: max-content; margin: 0; padding: 0 24px; font: 13px/1.8 'JetBrains Mono', monospace; tab-size: 2; }
.editor__line { display: block; min-height: 1.8em; white-space: pre; animation: line-in .5s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--line) * 45ms); }

:deep(.tok-keyword), :deep(.tok-directive) { color: #8fb0ff; }
:deep(.tok-number) { color: #f19a83; }
:deep(.tok-name), :deep(.tok-label) { color: #dfc47d; }
:deep(.tok-string) { color: #9dcaad; }
:deep(.tok-instruction) { color: #c59af1; }
:deep(.tok-register) { color: #78c19a; }
:deep(.tok-comment) { color: #718078; font-style: italic; }

@keyframes line-in { from { opacity: 0; transform: translateX(-8px); } }

@media (max-width: 560px) {
  .editor__viewport { grid-template-columns: 42px minmax(0, 1fr); min-height: 350px; }
  .editor__gutter { padding-right: 10px; font-size: 11px; }
  pre { padding: 0 14px; font-size: 11px; }
}

@media (prefers-reduced-motion: reduce) {
  .editor__line { animation: none; }
}
</style>
