<template>
  <section class="compiler-lab" aria-labelledby="compiler-lab-title">
    <header class="compiler-lab__header">
      <div>
        <p class="compiler-kicker">Interactive compiler trace</p>
        <h2 id="compiler-lab-title">From source to silicon.</h2>
        <p>Follow one small WACC program through every representation the toolchain sees.</p>
      </div>

      <label class="gc-toggle">
        <span class="gc-toggle__copy">
          <span>Garbage collection</span>
          <small>{{ gcEnabled ? 'Stack maps and safe points enabled' : 'Plain allocation path' }}</small>
        </span>
        <input v-model="gcEnabled" type="checkbox" @change="onGcToggle" />
        <span class="gc-toggle__track" aria-hidden="true"><span></span></span>
      </label>
    </header>

    <nav ref="rail" class="compiler-rail" aria-label="Compiler stages">
      <button
        v-for="(stage, index) in stages"
        :key="stage.id"
        :ref="(element) => setStageButton(element, index)"
        type="button"
        class="compiler-stop"
        :class="{
          'is-active': index === activeIndex,
          'is-complete': index < activeIndex,
          'is-gc-affected': gcEnabled && stage.gcAffected,
        }"
        :aria-current="index === activeIndex ? 'step' : undefined"
        @click="goTo(index)"
      >
        <span class="compiler-stop__number">{{ String(index + 1).padStart(2, '0') }}</span>
        <span class="compiler-stop__dot" aria-hidden="true"></span>
        <span class="compiler-stop__label">{{ stage.shortLabel }}</span>
      </button>
    </nav>

    <div class="compiler-window" @keydown.left.prevent="previous" @keydown.right.prevent="next">
      <Transition :name="direction === 'forward' ? 'stage-forward' : 'stage-back'" mode="out-in">
        <article :key="`${currentStage.id}-${gcEnabled}-${executionCycle}`" class="compiler-stage" aria-live="polite">
          <header class="compiler-stage__header">
            <div class="compiler-stage__identity">
              <span>{{ String(activeIndex + 1).padStart(2, '0') }} / {{ String(stages.length).padStart(2, '0') }}</span>
              <div>
                <h3>{{ currentStage.label }}</h3>
                <p>{{ currentStage.description }}</p>
              </div>
            </div>
            <span v-if="gcEnabled && currentStage.gcAffected" class="gc-injection">
              <Recycle :size="14" aria-hidden="true" /> GC modifies this stage
            </span>
          </header>

          <div v-if="currentStage.kind !== 'machine'" class="editor-shell">
            <div class="editor-chrome">
              <span class="editor-dots" aria-hidden="true"><i></i><i></i><i></i></span>
              <span>{{ currentStage.file }}</span>
              <span class="editor-language">{{ currentStage.language }}</span>
            </div>
            <div class="editor-body">
              <div class="editor-gutter" aria-hidden="true">
                <span v-for="line in currentCodeLines" :key="`number-${line.number}`">{{ line.number }}</span>
              </div>
              <pre><code><span
                v-for="line in currentCodeLines"
                :key="`${currentStage.id}-${line.number}`"
                class="code-line"
                :style="{ '--line-delay': `${Math.min(line.number * 24, 260)}ms` }"
                v-html="line.html"
              ></span></code></pre>
            </div>
            <div v-if="currentStage.id === 'assembler'" class="toolchain-boundary">
              <div>
                <strong>Toolchain boundary</strong>
                <p>
                  GNU <code>as</code> and <code>ld</code> perform this encoding and linking step. They are
                  external platform tools, not part of our WACC compiler.
                </p>
              </div>
              <RouterLink class="related-project" to="/projects/armv8-emulator-assembler">
                Our ARMv8 Emulator &amp; Assembler
                <ArrowUpRight :size="16" aria-hidden="true" />
                <small>An educational implementation of this neighbouring stage</small>
              </RouterLink>
            </div>
            <p v-else class="stage-note">{{ currentStage.note }}</p>
          </div>

          <div v-else class="machine-view">
            <div class="machine-toolbar">
              <span><Cpu :size="15" aria-hidden="true" /> AArch64 process</span>
              <button v-if="gcEnabled" type="button" @click="replayCollection">
                <RotateCcw :size="14" aria-hidden="true" /> Replay collection
              </button>
            </div>

            <div class="machine-grid">
              <section class="machine-panel cpu-panel" aria-label="Processor">
                <p class="machine-label">Processor</p>
                <div class="cpu-core">
                  <Cpu :size="30" aria-hidden="true" />
                  <span>PC 0x00401c</span>
                  <strong :class="{ 'is-paused': gcEnabled }">{{ gcEnabled ? 'PAUSED' : 'RUNNING' }}</strong>
                </div>
              </section>

              <section class="machine-panel stack-panel" aria-label="Call stack and roots">
                <p class="machine-label"><MemoryStick :size="13" aria-hidden="true" /> Call stack</p>
                <div class="stack-frame stack-frame--top">
                  <span>main()</span>
                  <code>x19 → object A</code>
                  <i v-if="gcEnabled" class="root-beam" aria-hidden="true"></i>
                </div>
                <div class="stack-frame"><span>println()</span><code>lr 0x004020</code></div>
                <p class="stack-caption">
                  {{ gcEnabled ? 'Stack map identifies x19 as a live heap root.' : 'No stack map is emitted.' }}
                </p>
              </section>

              <section class="machine-panel heap-panel" aria-label="Heap objects">
                <p class="machine-label">Heap</p>
                <div class="heap-grid">
                  <div class="heap-object heap-object--root"><span>A</span><small>root</small></div>
                  <div class="heap-object heap-object--kept"><span>B</span><small>reachable</small></div>
                  <div class="heap-object" :class="gcEnabled ? 'heap-object--garbage' : 'heap-object--leaked'"><span>C</span><small>unreachable</small></div>
                  <div class="heap-object" :class="gcEnabled ? 'heap-object--garbage heap-object--late' : 'heap-object--leaked'"><span>D</span><small>unreachable</small></div>
                </div>
              </section>
            </div>

            <div v-if="gcEnabled" class="gc-cycle" role="status">
              <span class="gc-cycle__pulse"><Pause :size="14" aria-hidden="true" /></span>
              <div class="gc-cycle__copy">
                <strong>Stop-the-world collection</strong>
                <span>pause → walk stack roots → mark reachable heap → sweep C and D → resume</span>
              </div>
              <div class="gc-cycle__progress" aria-hidden="true"><span></span></div>
            </div>
            <div v-else class="gc-cycle gc-cycle--off">
              <span><Play :size="14" aria-hidden="true" /></span>
              <div class="gc-cycle__copy">
                <strong>Execution continues</strong>
                <span>Objects C and D are unreachable, but remain allocated without the collector.</span>
              </div>
            </div>

            <p class="machine-accuracy">
              The collector walks roots from the stack, but reclaims unreachable objects from the heap—not stack frames.
            </p>
          </div>
        </article>
      </Transition>
    </div>

    <footer class="compiler-controls">
      <button type="button" :disabled="activeIndex === 0" @click="previous">
        <ArrowLeft :size="17" aria-hidden="true" />
        <span><small>Previous</small>{{ previousLabel }}</span>
      </button>
      <p>{{ currentStage.transition }}</p>
      <button type="button" :disabled="activeIndex === stages.length - 1" @click="next">
        <span><small>Next</small>{{ nextLabel }}</span>
        <ArrowRight :size="17" aria-hidden="true" />
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Cpu,
  MemoryStick,
  Pause,
  Play,
  Recycle,
  RotateCcw,
} from 'lucide-vue-next'
import { capture } from '../analytics'

type Stage = {
  id: string
  shortLabel: string
  label: string
  description: string
  file: string
  language: string
  code: string
  gcCode?: string
  gcAffected?: boolean
  kind?: 'code' | 'machine'
  note: string
  transition: string
}

const stages: Stage[] = [
  {
    id: 'source',
    shortLabel: 'Source',
    label: 'WACC source',
    description: 'A human-readable program enters the compiler.',
    file: 'stats.wacc',
    language: 'WACC',
    code: `begin
  pair(int, int) stats = newpair(42, 6);
  int total = fst stats + snd stats;
  println total
end`,
    note: 'The lexer turns characters into tokens; the parser then checks that those tokens fit the WACC grammar.',
    transition: 'Characters become tokens and grammar rules become structure.',
  },
  {
    id: 'ast',
    shortLabel: 'AST',
    label: 'Abstract syntax tree',
    description: 'Parsing removes punctuation and exposes the program’s structure.',
    file: 'stats.ast',
    language: 'TREE',
    code: `Program
└─ Sequence
   ├─ Declare stats : Pair(Int, Int)
   │  └─ NewPair
   │     ├─ IntLiteral 42
   │     └─ IntLiteral 6
   ├─ Declare total : Int
   │  └─ Add
   │     ├─ Fst → stats
   │     └─ Snd → stats
   └─ Println
      └─ Identifier total`,
    note: 'The tree records meaning and nesting, not the exact surface punctuation used to write it.',
    transition: 'Names are resolved and every expression must prove its type.',
  },
  {
    id: 'types',
    shortLabel: 'Types',
    label: 'Renaming and type checking',
    description: 'Identifiers are bound to declarations and invalid operations stop here.',
    file: 'type-check.trace',
    language: 'JUDGEMENTS',
    code: `Γ(stats) = pair(int, int)

Γ ⊢ newpair(42, 6) : pair(int, int)  ✓
Γ ⊢ fst stats      : int             ✓
Γ ⊢ snd stats      : int             ✓
Γ ⊢ fst stats + snd stats : int      ✓
Γ ⊢ println total  : statement       ✓

program is well-typed                 ✓`,
    note: 'Later passes can now rely on the invariant that each node is valid and has a known type.',
    transition: 'Structured expressions flatten into explicit, ordered operations.',
  },
  {
    id: 'tac',
    shortLabel: 'TAC',
    label: 'Three-address IR',
    description: 'Complex expressions become small operations over temporary values.',
    file: 'stats.tac',
    language: 'THREE-ADDRESS CODE',
    code: `entry:
  t0 = alloc_pair 8
  store [t0 + 0], 42
  store [t0 + 4], 6
  t1 = load [t0 + 0]
  t2 = load [t0 + 4]
  t3 = add t1, t2
  call println_i, t3
  return 0`,
    note: 'Constant folding and control-flow optimisation operate on this simpler, architecture-neutral form.',
    transition: 'Virtual operations are selected and assigned to a concrete backend.',
  },
  {
    id: 'lowered',
    shortLabel: 'Lowered IR',
    label: 'Architecture-specific IR',
    description: 'The AArch64 backend selects instructions, registers and a stack-frame layout.',
    file: 'stats.aarch64.ir',
    language: 'LOWERED AARCH64',
    gcAffected: true,
    code: `function main frame=16
  mov  v0, #8
  call malloc(v0) -> v1
  str  #42, [v1, #0]
  str  #6,  [v1, #4]
  ldr  v2, [v1, #0]
  ldr  v3, [v1, #4]
  add  v4, v2, v3
  call println_i(v4)
  ret  #0`,
    gcCode: `function main frame=32
  mov  v0, #8
  call gc_alloc(v0) -> v1
  pin  v1 -> x19
  str  #42, [x19, #0]
  str  #6,  [x19, #4]
  stackmap .Lsp0 roots={x19}
.Lsp0:
  safepoint gc_poll
  ldr  v2, [x19, #0]
  ldr  v3, [x19, #4]
  add  v4, v2, v3
  call println_i(v4)
  ret  #0`,
    note: 'With GC enabled, allocation changes and the compiler emits stack maps describing which locations hold live heap pointers.',
    transition: 'Virtual registers become physical registers and concrete instructions.',
  },
  {
    id: 'assembly',
    shortLabel: 'Assembly',
    label: 'Emitted AArch64 assembly',
    description: 'Register allocation and peephole optimisation produce textual assembly.',
    file: 'stats.s',
    language: 'AARCH64',
    gcAffected: true,
    code: `.text
.global main
main:
  stp  x29, x30, [sp, #-16]!
  mov  w0, #8
  bl   malloc
  mov  w9, #42
  str  w9, [x0]
  mov  w9, #6
  str  w9, [x0, #4]
  ldp  w1, w2, [x0]
  add  w0, w1, w2
  bl   println_i
  ldp  x29, x30, [sp], #16
  ret`,
    gcCode: `.text
.global main
main:
  stp  x29, x30, [sp, #-32]!
  str  x19, [sp, #16]
  mov  w0, #8
  bl   gc_alloc
  mov  x19, x0
  // .Lsp0 maps x19 as a live root
.Lsp0:
  bl   gc_poll
  ldp  w1, w2, [x19]
  add  w0, w1, w2
  bl   println_i
  ldr  x19, [sp, #16]
  ldp  x29, x30, [sp], #32
  ret`,
    note: 'The x86-64 backend follows the same journey, with its own instruction selection and greedy register allocator.',
    transition: 'Textual mnemonics must be encoded into machine-readable bytes.',
  },
  {
    id: 'assembler',
    shortLabel: 'Binary',
    label: 'Assemble and link',
    description: 'External platform tools encode instructions and link the runtime.',
    file: 'terminal',
    language: 'SHELL + BYTES',
    code: `$ aarch64-linux-gnu-as stats.s -o stats.o
$ aarch64-linux-gnu-ld stats.o runtime.o -o stats

$ objdump -d stats
0000000000401000 <main>:
  a9bf7bfd  stp x29, x30, [sp, #-16]!
  52800100  mov w0, #0x8
  9400002a  bl  0x4010b0
  ...

ELF 64-bit LSB executable, ARM aarch64`,
    note: '',
    transition: 'The operating system loads the binary and the processor executes its instructions.',
  },
  {
    id: 'machine',
    shortLabel: 'Execute',
    label: 'Machine execution',
    description: 'The processor runs the binary while the runtime manages memory.',
    file: '',
    language: '',
    code: '',
    gcAffected: true,
    kind: 'machine',
    note: '',
    transition: '48 is printed. Source has become behaviour.',
  },
]

const activeIndex = ref(0)
const direction = ref<'forward' | 'back'>('forward')
const gcEnabled = ref(false)
const executionCycle = ref(0)
const rail = ref<HTMLElement | null>(null)
const stageButtons = ref<Array<HTMLElement | null>>([])

const currentStage = computed(() => stages[activeIndex.value]!)
const previousLabel = computed(() => stages[activeIndex.value - 1]?.shortLabel ?? 'Start')
const nextLabel = computed(() => stages[activeIndex.value + 1]?.shortLabel ?? 'Complete')
const currentCode = computed(() =>
  gcEnabled.value && currentStage.value.gcCode ? currentStage.value.gcCode : currentStage.value.code,
)
const currentCodeLines = computed(() =>
  currentCode.value.split('\n').map((line, index) => ({
    number: index + 1,
    html: highlight(line, currentStage.value.language),
  })),
)

function setStageButton(element: Element | ComponentPublicInstance | null, index: number) {
  stageButtons.value[index] = element instanceof HTMLElement ? element : null
}

function goTo(index: number) {
  if (index < 0 || index >= stages.length || index === activeIndex.value) return
  direction.value = index > activeIndex.value ? 'forward' : 'back'
  activeIndex.value = index
  if (stages[index]?.kind === 'machine' && gcEnabled.value) executionCycle.value += 1
  capture('wacc_stage_viewed', {
    view_mode: 'sleek',
    stage_id: stages[index]?.id,
    stage_index: index,
    gc_enabled: gcEnabled.value,
  })
  nextTick(() => stageButtons.value[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }))
}

function previous() {
  goTo(activeIndex.value - 1)
}

function next() {
  goTo(activeIndex.value + 1)
}

function onGcToggle() {
  executionCycle.value += 1
  capture('wacc_gc_toggled', { view_mode: 'sleek', enabled: gcEnabled.value, stage_id: currentStage.value.id })
}

function replayCollection() {
  executionCycle.value += 1
  capture('wacc_gc_replayed', { view_mode: 'sleek' })
}

watch(activeIndex, () => {
  rail.value?.style.setProperty('--active-progress', `${(activeIndex.value / (stages.length - 1)) * 100}%`)
}, { immediate: true, flush: 'post' })

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(line: string, language: string) {
  const escaped = escapeHtml(line)
  const commentPrefix = language === 'AARCH64' ? '\\/\\/' : language === 'SHELL + BYTES' ? '#' : '(?!)'
  const keywords = [
    'begin', 'end', 'pair', 'int', 'newpair', 'fst', 'snd', 'println', 'Program', 'Sequence',
    'Declare', 'NewPair', 'IntLiteral', 'Add', 'Println', 'Identifier', 'function', 'frame', 'call',
    'return', 'entry', 'store', 'load', 'stackmap', 'roots', 'safepoint', 'pin', 'global', 'main',
  ].join('|')
  const registers = '\\b(?:x(?:[0-9]|[12][0-9]|30)|w(?:[0-9]|[12][0-9]|30)|sp|lr|v\\d+|t\\d+)\\b'
  const pattern = new RegExp(`("[^"\\n]*")|(${commentPrefix}.*$)|(\\b(?:${keywords})\\b)|(\\b(?:0x[0-9a-fA-F]+|\\d+)\\b)|(${registers})|(✓|Γ|⊢|→)`, 'g')
  return escaped.replace(pattern, (
    match: string,
    stringToken?: string,
    comment?: string,
    keyword?: string,
    number?: string,
    register?: string,
    symbol?: string,
  ) => {
    const tokenClass = stringToken
      ? 'token-string'
      : comment
        ? 'token-comment'
        : keyword
          ? 'token-keyword'
          : number
            ? 'token-number'
            : register
              ? 'token-register'
              : symbol
                ? 'token-symbol'
                : ''
    return tokenClass ? `<span class="${tokenClass}">${match}</span>` : match
  })
}
</script>

<style scoped>
.compiler-lab {
  scroll-margin-top: 72px;
  margin: 0 0 clamp(64px, 8vw, 100px);
  border-top: 1px solid var(--sleek-rule);
  border-bottom: 1px solid var(--sleek-rule);
  color: var(--sleek-text);
}

.compiler-lab__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 40px;
  padding: 30px 0;
}

.compiler-kicker,
.machine-label {
  color: var(--sleek-accent);
  font: 500 10px/1.4 'JetBrains Mono', monospace;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.compiler-lab__header h2 {
  margin-top: 8px;
  font: 400 clamp(40px, 5vw, 68px)/.95 'Instrument Serif', Georgia, serif;
}

.compiler-lab__header > div > p:last-child {
  max-width: 620px;
  margin-top: 14px;
  color: var(--sleek-muted);
}

.gc-toggle {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 0 0 auto;
  cursor: pointer;
}

.gc-toggle__copy {
  display: grid;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
}

.gc-toggle__copy small {
  color: var(--sleek-muted);
  font: 9px/1.5 'JetBrains Mono', monospace;
}

.gc-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.gc-toggle__track {
  position: relative;
  width: 48px;
  height: 26px;
  border: 1px solid var(--sleek-rule);
  border-radius: 999px;
  background: var(--sleek-surface);
  transition: border-color .25s ease, background-color .25s ease;
}

.gc-toggle__track span {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--sleek-muted);
  transition: transform .32s cubic-bezier(.2, .8, .2, 1), background-color .25s ease;
}

.gc-toggle input:checked + .gc-toggle__track {
  border-color: var(--sleek-green);
  background: color-mix(in srgb, var(--sleek-green) 18%, var(--sleek-surface));
}

.gc-toggle input:checked + .gc-toggle__track span {
  transform: translateX(22px);
  background: var(--sleek-green);
}

.gc-toggle input:focus-visible + .gc-toggle__track {
  outline: 2px solid var(--sleek-accent);
  outline-offset: 3px;
}

.compiler-rail {
  --active-progress: 0%;
  position: relative;
  display: grid;
  grid-template-columns: repeat(8, minmax(100px, 1fr));
  overflow-x: auto;
  border-top: 1px solid var(--sleek-rule);
  border-bottom: 1px solid var(--sleek-rule);
  scrollbar-width: none;
}

.compiler-rail::-webkit-scrollbar { display: none; }

.compiler-rail::before,
.compiler-rail::after {
  content: '';
  position: absolute;
  z-index: 0;
  top: 45px;
  left: 6.25%;
  height: 1px;
  pointer-events: none;
}

.compiler-rail::before {
  right: 6.25%;
  background: var(--sleek-rule);
}

.compiler-rail::after {
  width: calc(var(--active-progress) * .875);
  background: var(--sleek-accent);
  transition: width .5s cubic-bezier(.2, .8, .2, 1);
}

.compiler-stop {
  position: relative;
  z-index: 1;
  min-height: 118px;
  padding: 14px 10px 16px;
  border: 0;
  background: transparent;
  color: var(--sleek-muted);
  text-align: left;
  cursor: pointer;
}

.compiler-stop:hover,
.compiler-stop:focus-visible,
.compiler-stop.is-active {
  color: var(--sleek-text);
}

.compiler-stop:focus-visible {
  outline: 2px solid var(--sleek-accent);
  outline-offset: -2px;
}

.compiler-stop__number {
  display: block;
  font: 9px 'JetBrains Mono', monospace;
}

.compiler-stop__dot {
  display: block;
  width: 10px;
  height: 10px;
  margin: 16px 0 15px;
  border: 2px solid var(--sleek-rule);
  border-radius: 50%;
  background: var(--sleek-bg);
  transition: transform .3s ease, border-color .3s ease, background-color .3s ease;
}

.compiler-stop.is-complete .compiler-stop__dot,
.compiler-stop.is-active .compiler-stop__dot {
  border-color: var(--sleek-accent);
  background: var(--sleek-accent);
}

.compiler-stop.is-active .compiler-stop__dot {
  transform: scale(1.45);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--sleek-accent) 16%, transparent);
}

.compiler-stop.is-gc-affected .compiler-stop__dot {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--sleek-green) 20%, transparent);
}

.compiler-stop__label {
  font: 500 10px/1.3 'JetBrains Mono', monospace;
}

.compiler-window {
  position: relative;
  min-height: 650px;
  overflow: hidden;
  background: var(--sleek-surface);
}

.compiler-stage {
  min-height: 650px;
  padding: clamp(24px, 4vw, 48px);
}

.compiler-stage__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 30px;
  min-height: 100px;
  margin-bottom: 26px;
}

.compiler-stage__identity {
  display: flex;
  gap: 20px;
}

.compiler-stage__identity > span {
  padding-top: 7px;
  color: var(--sleek-accent);
  font: 10px 'JetBrains Mono', monospace;
}

.compiler-stage h3 {
  font: 500 clamp(25px, 3vw, 38px)/1.1 Manrope, sans-serif;
}

.compiler-stage__identity p {
  max-width: 650px;
  margin-top: 8px;
  color: var(--sleek-muted);
  font-size: 13px;
}

.gc-injection {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--sleek-green) 55%, var(--sleek-rule));
  color: var(--sleek-green);
  font: 9px 'JetBrains Mono', monospace;
  text-transform: uppercase;
  animation: gc-signal 1.8s ease-in-out infinite;
}

.editor-shell {
  overflow: hidden;
  border: 1px solid var(--sleek-rule);
  border-radius: 7px;
  background: #111714;
  color: #d9e1db;
  box-shadow: 0 24px 70px color-mix(in srgb, #000 22%, transparent);
}

.editor-chrome {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 44px;
  padding: 0 14px;
  border-bottom: 1px solid #2a342e;
  background: #171e1a;
  color: #a5b0a8;
  font: 9px 'JetBrains Mono', monospace;
}

.editor-dots {
  display: flex;
  gap: 6px;
}

.editor-dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4c5851;
}

.editor-dots i:first-child { background: #e27662; }
.editor-dots i:nth-child(2) { background: #ddb858; }
.editor-dots i:last-child { background: #72af87; }
.editor-language { justify-self: end; color: #6f7d74; }

.editor-body {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  min-height: 360px;
  max-height: 460px;
  overflow: auto;
  padding: 22px 0;
}

.editor-gutter {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
  padding-right: 14px;
  border-right: 1px solid #253029;
  color: #56635b;
  font: 12px/1.72 'JetBrains Mono', monospace;
  user-select: none;
}

.editor-body pre {
  min-width: max-content;
  margin: 0;
  padding: 0 22px;
  font: 13px/1.72 'JetBrains Mono', monospace;
  tab-size: 2;
}

.code-line {
  display: block;
  min-height: 1.72em;
  white-space: pre;
  animation: code-line-in .42s cubic-bezier(.2, .8, .2, 1) both;
  animation-delay: var(--line-delay);
}

:deep(.token-keyword) { color: #7ea7ff; }
:deep(.token-number) { color: #f08a73; }
:deep(.token-register) { color: #78b997; }
:deep(.token-comment) { color: #69776f; font-style: italic; }
:deep(.token-string) { color: #e4bc74; }
:deep(.token-symbol) { color: #cf8cff; }

.stage-note,
.toolchain-boundary {
  border-top: 1px solid #2a342e;
  background: #171e1a;
  color: #96a39a;
  font: 11px/1.6 'JetBrains Mono', monospace;
}

.stage-note { padding: 15px 20px; }

.toolchain-boundary {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(240px, .8fr);
  gap: 30px;
  padding: 18px 20px;
}

.toolchain-boundary strong { color: #f0f4f1; }
.toolchain-boundary p { margin-top: 4px; }
.toolchain-boundary code { color: #78b997; }

.related-project {
  display: grid;
  grid-template-columns: 1fr auto;
  align-content: center;
  gap: 3px 10px;
  color: #7ea7ff;
  text-decoration: none;
}

.related-project small {
  grid-column: 1 / -1;
  color: #76847b;
  font-size: 9px;
}

.machine-view {
  overflow: hidden;
  border: 1px solid var(--sleek-rule);
  border-radius: 7px;
  background: #111714;
  color: #d9e1db;
  box-shadow: 0 24px 70px color-mix(in srgb, #000 22%, transparent);
}

.machine-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 44px;
  padding: 0 15px;
  border-bottom: 1px solid #2a342e;
  background: #171e1a;
  font: 10px 'JetBrains Mono', monospace;
}

.machine-toolbar span,
.machine-toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.machine-toolbar button {
  border: 0;
  background: transparent;
  color: #7ea7ff;
  font: inherit;
  cursor: pointer;
}

.machine-grid {
  display: grid;
  grid-template-columns: .72fr 1fr 1.35fr;
  min-height: 360px;
}

.machine-panel {
  padding: 20px;
  border-right: 1px solid #2a342e;
}

.machine-panel:last-child { border-right: 0; }
.machine-label { display: flex; align-items: center; gap: 6px; color: #718078; }

.cpu-core {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 260px;
  color: #7ea7ff;
  font: 10px 'JetBrains Mono', monospace;
}

.cpu-core strong {
  padding: 5px 8px;
  border: 1px solid #78b997;
  color: #78b997;
  font-size: 9px;
}

.cpu-core strong.is-paused {
  border-color: #f08a73;
  color: #f08a73;
  animation: pause-blink .8s steps(2, end) 3;
}

.stack-frame {
  position: relative;
  display: grid;
  gap: 7px;
  margin-top: 14px;
  padding: 15px;
  border: 1px solid #334039;
  background: #171e1a;
  font: 11px 'JetBrains Mono', monospace;
}

.stack-frame code { color: #78b997; }
.stack-frame--top { border-color: #526b5c; }

.root-beam {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 100%;
  width: clamp(45px, 7vw, 105px);
  height: 1px;
  background: #78b997;
  transform-origin: left;
  animation: root-scan 1s .5s ease both;
}

.root-beam::after {
  content: '';
  position: absolute;
  right: -3px;
  top: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #78b997;
}

.stack-caption {
  margin-top: 16px;
  color: #718078;
  font: 9px/1.5 'JetBrains Mono', monospace;
}

.heap-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 14px;
}

.heap-object {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 92px;
  padding: 14px;
  border: 1px solid #3c4941;
  background: #171e1a;
  font: 10px 'JetBrains Mono', monospace;
}

.heap-object span {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #2b3730;
  color: #fff;
}

.heap-object small { color: #718078; }
.heap-object--root,
.heap-object--kept { border-color: #557862; }
.heap-object--root span,
.heap-object--kept span { background: #3f7d64; }

.heap-object--garbage {
  border-color: #74483f;
  animation: sweep-away 1s 1.7s cubic-bezier(.55, 0, .8, .2) both;
}

.heap-object--garbage span { background: #8b493d; }
.heap-object--late { animation-delay: 2s; }
.heap-object--leaked { border-color: #795e41; animation: leak-pulse 2s ease-in-out infinite; }

.gc-cycle {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 12px 18px;
  border-top: 1px solid #2a342e;
  background: #171e1a;
  overflow: hidden;
}

.gc-cycle__pulse {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: color-mix(in srgb, #f08a73 18%, transparent);
  color: #f08a73;
}

.gc-cycle__copy { display: grid; gap: 3px; font: 9px/1.5 'JetBrains Mono', monospace; }
.gc-cycle__copy strong { color: #f0f4f1; font-size: 10px; }
.gc-cycle__copy span { color: #7d8a82; }

.gc-cycle__progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: #29332d;
}

.gc-cycle__progress span {
  display: block;
  width: 100%;
  height: 100%;
  background: #78b997;
  transform-origin: left;
  animation: gc-progress 3.2s ease both;
}

.gc-cycle--off > span { color: #78b997; }

.machine-accuracy {
  padding: 10px 18px;
  border-top: 1px solid #2a342e;
  color: #718078;
  font: 9px/1.5 'JetBrains Mono', monospace;
}

.compiler-controls {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(200px, 1.2fr) minmax(150px, 1fr);
  align-items: center;
  gap: 24px;
  padding: 22px 0;
}

.compiler-controls > p {
  color: var(--sleek-muted);
  font: 9px/1.5 'JetBrains Mono', monospace;
  text-align: center;
}

.compiler-controls button {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  color: var(--sleek-text);
  cursor: pointer;
  text-align: left;
}

.compiler-controls button:last-child {
  justify-content: flex-end;
  text-align: right;
}

.compiler-controls button span { display: grid; font-size: 12px; font-weight: 600; }
.compiler-controls button small { color: var(--sleek-muted); font: 8px/1.5 'JetBrains Mono', monospace; text-transform: uppercase; }
.compiler-controls button:hover:not(:disabled) { color: var(--sleek-accent); }
.compiler-controls button:disabled { opacity: .28; cursor: not-allowed; }

.stage-forward-enter-active,
.stage-forward-leave-active,
.stage-back-enter-active,
.stage-back-leave-active {
  transition: opacity .34s ease, transform .48s cubic-bezier(.2, .8, .2, 1);
}

.stage-forward-enter-from { opacity: 0; transform: translateX(42px); }
.stage-forward-leave-to { opacity: 0; transform: translateX(-28px); }
.stage-back-enter-from { opacity: 0; transform: translateX(-42px); }
.stage-back-leave-to { opacity: 0; transform: translateX(28px); }

@keyframes code-line-in {
  from { opacity: 0; transform: translateY(7px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes gc-signal {
  50% { border-color: var(--sleek-green); box-shadow: 0 0 0 4px color-mix(in srgb, var(--sleek-green) 10%, transparent); }
}

@keyframes root-scan {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 1; transform: scaleX(1); }
}

@keyframes sweep-away {
  0%, 45% { opacity: 1; transform: translate(0) rotate(0); }
  100% { opacity: 0; transform: translate(36px, 70px) rotate(9deg) scale(.72); }
}

@keyframes leak-pulse {
  50% { border-color: #b27b4d; }
}

@keyframes pause-blink {
  50% { opacity: .35; }
}

@keyframes gc-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@media (max-width: 800px) {
  .compiler-lab__header { align-items: flex-start; flex-direction: column; }
  .gc-toggle__copy { text-align: left; }
  .compiler-rail { grid-template-columns: repeat(8, 112px); }
  .compiler-rail::before { left: 56px; right: 56px; }
  .compiler-rail::after { left: 56px; }
  .machine-grid { grid-template-columns: 1fr 1fr; }
  .cpu-panel { display: none; }
  .toolchain-boundary { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .compiler-lab { scroll-margin-top: 62px; }
  .compiler-stage { padding: 20px 14px; }
  .compiler-stage__header { min-height: 125px; flex-direction: column; gap: 12px; }
  .compiler-stage__identity { gap: 10px; }
  .editor-body { grid-template-columns: 42px minmax(0, 1fr); min-height: 330px; }
  .editor-body pre { padding: 0 14px; font-size: 11px; }
  .editor-gutter { padding-right: 10px; font-size: 11px; }
  .machine-grid { grid-template-columns: 1fr; }
  .machine-panel { border-right: 0; border-bottom: 1px solid #2a342e; }
  .root-beam { display: none; }
  .compiler-controls { grid-template-columns: 1fr 1fr; }
  .compiler-controls > p { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .compiler-stop__dot,
  .compiler-rail::after,
  .gc-toggle__track,
  .gc-toggle__track span,
  .stage-forward-enter-active,
  .stage-forward-leave-active,
  .stage-back-enter-active,
  .stage-back-leave-active {
    transition: none;
  }

  .code-line,
  .gc-injection,
  .root-beam,
  .heap-object--garbage,
  .heap-object--leaked,
  .cpu-core strong.is-paused,
  .gc-cycle__progress span {
    animation: none;
  }

  .heap-object--garbage { opacity: .35; }
}
</style>
