<template>
  <div class="stage-visual" :class="[`stage-visual--${stageId}`, { 'is-gc': gcEnabled }]">
    <div v-if="stageId === 'source'" class="source-stage">
      <WaccCodeEditor filename="stats.wacc" language="WACC" :code="sourceCode" />
      <p class="caption">A deliberately mixed program: declarations, allocation, assignment, branching and output all pass through the same frontend.</p>
    </div>

    <div v-else-if="stageId === 'ast'" class="panel">
      <PanelBar title="Abstract syntax graph" detail="syntax falls away; relationships remain" />
      <div class="ast">
        <svg viewBox="0 0 1000 470" preserveAspectRatio="none" aria-hidden="true">
          <path v-for="(edge, index) in astEdges" :key="edge" :d="edge" :style="{ '--delay': `${index * 80}ms` }" />
        </svg>
        <div v-for="(node, index) in astNodes" :key="node.label" class="ast__node" :class="`ast__node--${node.kind}`" :style="{ left: `${node.x}%`, top: `${node.y}%`, '--delay': `${index * 80 + 100}ms` }">
          <small>{{ node.kind }}</small><strong>{{ node.label }}</strong>
        </div>
      </div>
      <p class="caption">The assignment is now an <code>Assign</code> node with an identifier on the left and an expression tree on the right.</p>
    </div>

    <div v-else-if="stageId === 'types'" class="panel type-panel">
      <PanelBar title="Type-checking one assignment" detail="total = left + right" />
      <div class="type-layout">
        <aside class="type-progress" aria-label="Type-check steps">
          <button v-for="(step, index) in typeSteps" :key="step.title" type="button" :class="{ active: typeStep === index, done: typeStep > index }" @click="setTypeStep(index)">
            <span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ step.short }}</strong>
          </button>
        </aside>
        <div class="type-workbench">
          <div class="assignment"><code>total = left + right</code></div>
          <div class="type-tree" :class="`type-tree--${typeStep}`">
            <svg viewBox="0 0 760 330" preserveAspectRatio="none" aria-hidden="true">
              <path class="tree-line" d="M380 72 L213 146" /><path class="tree-line" d="M380 72 L517 146" />
              <path class="tree-line" d="M517 178 L422 264" /><path class="tree-line" d="M523 178 L621 264" />
              <path class="type-motion" :class="typeSteps[typeStep]?.direction" :d="typeSteps[typeStep]?.path" marker-end="url(#type-arrow)" />
              <defs><marker id="type-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" /></marker></defs>
            </svg>
            <TypeNode class="node-assign" label="Assign" :active="typeSteps[typeStep]?.node === 'assign'" />
            <TypeNode class="node-lhs" label="total" meta="Γ(total) = int" :active="typeSteps[typeStep]?.node === 'lhs'" />
            <TypeNode class="node-add" label="Add" :meta="typeStep >= 2 ? 'expects int' : ''" :result="typeStep >= 5 ? 'infers int ↑' : ''" :active="typeSteps[typeStep]?.node === 'add'" />
            <TypeNode class="node-left" label="left" meta="Γ(left) = int" :result="typeStep >= 3 ? 'int ↑' : ''" :active="typeSteps[typeStep]?.node === 'left'" />
            <TypeNode class="node-right" label="right" meta="Γ(right) = int" :result="typeStep >= 4 ? 'int ↑' : ''" :active="typeSteps[typeStep]?.node === 'right'" />
          </div>
          <div class="type-readout">
            <span :class="typeSteps[typeStep]?.direction">{{ typeSteps[typeStep]?.badge }}</span>
            <strong>{{ typeSteps[typeStep]?.title }}</strong>
            <p>{{ typeSteps[typeStep]?.detail }}</p>
            <div class="mini-controls"><button type="button" :disabled="typeStep === 0" @click="setTypeStep(typeStep - 1)"><ChevronLeft :size="15" /> Back</button><button type="button" :disabled="typeStep === typeSteps.length - 1" @click="setTypeStep(typeStep + 1)">Next <ChevronRight :size="15" /></button></div>
          </div>
        </div>
      </div>
      <p class="caption">This mirrors the checker: resolve the lvalue first, pass its type down as the RHS expectation, then let the expression synthesize its result back up.</p>
    </div>

    <div v-else-if="stageId === 'tac'" class="panel">
      <PanelBar title="Three-address control flow" detail="small blocks; explicit edges" />
      <div class="tac">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M50 38 L29 52" marker-end="url(#cfg-arrow)" />
          <path d="M50 38 L71 52" marker-end="url(#cfg-arrow)" />
          <path d="M29 72 L45 82" marker-end="url(#cfg-arrow)" />
          <path d="M71 72 L55 82" marker-end="url(#cfg-arrow)" />
          <defs><marker id="cfg-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" /></marker></defs>
        </svg>
        <div class="tac__block tac__entry"><b>entry</b><code>left ← 40</code><code>right ← 2</code><code>t0 ← left + right</code><code>total ← t0</code><code class="terminator">br total &gt; 40, then, else</code></div>
        <span class="edge-label edge-label--true">true</span><span class="edge-label edge-label--false">false</span>
        <div class="tac__block tac__then"><b>then</b><code>call println, total</code><code class="terminator">br exit</code></div>
        <div class="tac__block tac__else"><b>else</b><code>nop</code><code class="terminator">br exit</code></div>
        <div class="tac__block tac__exit"><b>exit</b><code>return 0</code></div>
      </div>
      <p class="caption">The assignment and its condition stay inside <code>entry</code>; the branch is that block’s terminator. Both successor blocks converge on <code>exit</code>.</p>
    </div>

    <div v-else-if="stageId === 'lowered'" class="panel">
      <PanelBar title="AArch64-specific IR" :detail="gcEnabled ? 'stack maps + barriers inserted' : 'instruction selection + register constraints'" />
      <div class="lowered">
        <template v-for="(block, index) in loweredBlocks" :key="block.id">
          <div class="lowered__block" :class="{ runtime: block.runtime }" :style="{ '--delay': `${index * 90}ms` }">
            <span>{{ String(index + 1).padStart(2, '0') }}</span><small>{{ block.label }}</small><code v-for="line in block.lines" :key="line">{{ line }}</code><Recycle v-if="block.runtime" :size="15" />
          </div>
          <ArrowRight v-if="index < loweredBlocks.length - 1" class="lowered__arrow" :size="18" aria-hidden="true" />
        </template>
      </div>
      <p class="caption">Each TAC operation expands into backend instructions. With the extension enabled, allocation safe points, live-root metadata and write barriers are interspersed as ordinary IR nodes.</p>
    </div>

    <div v-else-if="stageId === 'assembly'" class="source-stage assembly-stage">
      <WaccCodeEditor filename="stats.s" language="AARCH64" :code="gcEnabled ? assemblyGcCode : assemblyCode" />
      <div v-if="gcEnabled" class="assembly-facts">
        <span><Recycle :size="15" /><code>_gc_malloc_g</code> nursery allocator</span>
        <span><MapPin :size="15" /><code>_gc_stackmap_table</code> live locations</span>
        <span><GitMerge :size="15" /><code>_gc_write_barrier</code> old → young stores</span>
      </div>
      <p class="caption">This is the textual output of your compiler. It is still readable assembly—not machine code yet.</p>
    </div>

    <div v-else-if="stageId === 'assembler'" class="panel link-panel">
      <PanelBar title="Assemble and link" detail="external GNU platform toolchain — not our compiler" />
      <div class="linker">
        <div class="linker__inputs">
          <div><small>compiler output</small><strong>stats.s</strong><code>AArch64 text</code></div>
          <div v-if="gcEnabled" class="linker__runtime"><small>collector runtime</small><strong>secret.o</strong><code>gc.c → object file</code></div>
        </div>
        <div class="linker__arrow"><ArrowRight :size="24" /></div>
        <div class="linker__tool"><Wrench :size="28" /><strong>aarch64-linux-gnu-gcc</strong><small>assemble · relocate · link</small></div>
        <div class="linker__arrow"><ArrowRight :size="24" /></div>
        <div class="linker__binary"><small>ELF / AArch64</small><code>A9 BF 7B FD</code><code>52 80 01 00</code><code>94 00 00 2A</code></div>
      </div>
      <RouterLink class="neighbour-link" to="/projects/armv8-emulator-assembler">Our separate ARMv8 assembler &amp; emulator project <ArrowUpRight :size="16" /><small>A neighbouring educational implementation—not the tool used to build this compiler output.</small></RouterLink>
    </div>

    <div v-else-if="!gcEnabled" class="panel runtime-plain">
      <PanelBar title="Process memory" detail="ordinary allocation and execution" />
      <div class="plain-memory">
        <section class="plain-stack"><h4>Stack</h4><div class="frame"><span>main()</span><code>x19 → pair A</code></div><div class="frame"><span>print()</span><code>w0 = 42</code></div></section>
        <div class="memory-link" aria-hidden="true"><i></i></div>
        <section class="unified-heap"><h4>Heap</h4><div class="heap-track"><span class="allocated">A<small>pair</small></span><span class="allocated">B<small>array</small></span><span class="free-slot"></span><span class="free-slot"></span></div><div class="heap-key"><i></i> allocated <i></i> available</div></section>
      </div>
      <p class="caption">The processor executes the linked binary. A stack-held address points to pair A in one unified heap; arrays and pairs are the allocated heap objects in this example.</p>
    </div>

    <div v-else class="panel gc-runtime" :class="`gc-step-${runtimeStep}`">
      <div class="gc-runtime__bar"><span><Cpu :size="16" /> Generational runtime</span><button type="button" @click="restartRuntime"><RotateCcw :size="15" /> Replay</button></div>
      <div class="gc-scene">
        <div class="gc-root root-a"><small>stack root</small><code>{{ runtimeStep >= 2 ? 'x19 → A′' : 'x19 → A' }}</code></div><div class="gc-root root-c"><small>stack root</small><code>{{ runtimeStep >= 2 ? 'x20 → C′' : 'x20 → C' }}</code></div>
        <section class="gc-generation young"><header><h4>Young · 2 MB</h4><small>nursery</small></header></section>
        <section class="gc-generation old"><header><h4>Old · 14 MB</h4><small>free list</small></header></section>
        <span class="object a">A</span><span class="object b">B</span><span class="object c">C</span><span class="object d">D</span>
        <span class="object p">P</span><span class="object q">Q</span><span class="object r">R</span><span class="object promoted">A′</span><span class="object promoted-c">C′</span><span class="free-hole">free</span>
        <div class="pending-allocation">pending request<br><code>&gt; nursery</code></div>
        <svg class="gc-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path class="root-link link-a" d="M16 18 L13 46"/><path class="root-link link-c" d="M37 18 L35 72"/>
          <path class="promoted-root promoted-root-a" d="M16 18 C34 19 55 49 76 73"/><path class="promoted-root promoted-root-c" d="M37 18 C55 24 72 53 89 73"/>
          <path class="heap-link hop-ap" d="M76 73 C72 62 67 54 62 48"/><path class="heap-link hop-pr" d="M62 48 C60 60 63 68 67 73"/>
        </svg>
        <div class="gc-legend"><span><i></i>unvisited</span><span><i></i>marked</span><span><i></i>reclaimed</span></div>
        <div v-if="runtimeStep >= 1 && runtimeStep <= 6" class="pause-badge"><Pause :size="16" /><span>mutator paused</span></div>
      </div>
      <div class="gc-readout"><span>{{ String(runtimeStep + 1).padStart(2, '0') }} / {{ String(runtimeSteps.length).padStart(2, '0') }}</span><div><strong>{{ runtimeSteps[runtimeStep]?.title }}</strong><p>{{ runtimeSteps[runtimeStep]?.detail }}</p></div><div class="mini-controls"><button type="button" @click="moveRuntime(-1)"><ChevronLeft :size="15" /></button><button type="button" @click="moveRuntime(1)"><ChevronRight :size="15" /></button></div></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Cpu, GitMerge, MapPin, Pause, Recycle, RotateCcw, Wrench } from 'lucide-vue-next'
import WaccCodeEditor from './WaccCodeEditor.vue'

const props = defineProps<{ stageId: string; gcEnabled: boolean; cycle: number }>()
defineEmits<{ replay: [] }>()

const PanelBar = defineComponent({ props: { title: String, detail: String }, setup: p => () => h('header', { class: 'panel-bar' }, [h('strong', p.title), h('small', p.detail)]) })
const TypeNode = defineComponent({ props: { label: String, meta: String, result: String, active: Boolean }, setup: p => () => h('div', { class: ['type-node', { active: p.active }] }, [p.meta ? h('small', p.meta) : null, h('strong', p.label), p.result ? h('code', p.result) : null]) })

const sourceCode = `begin
  int left = 40;
  int right = 2;
  int total = 0;
  total = left + right;
  pair(int, int) stats = newpair(total, right);
  if total > 40 then
    println fst stats
  else
    skip
  fi
end`

const assemblyCode = `.text
.global main
main:
  stp  x29, x30, [sp, #-32]!
  mov  w8, #40
  mov  w9, #2
  add  w10, w8, w9
  mov  w0, #24
  bl   malloc
  str  w10, [x0, #8]
  str  w9, [x0, #16]
  cmp  w10, #40
  bgt  .Lprint
  b    .Lexit
.Lprint:
  mov  w0, w10
  bl   _printi
.Lexit:
  ldp  x29, x30, [sp], #32
  ret`

const assemblyGcCode = `.text
.global main
main:
  stp  x29, x30, [sp, #-48]!
  str  x19, [sp, #32]
  bl   _gc_init
  mov  w8, #40
  mov  w9, #2
  add  w10, w8, w9
  mov  x0, #24
  bl   _gc_malloc_g
.Lsmp_0:
  mov  x19, x0
  str  w10, [x19, #8]
  str  w9, [x19, #16]
  mov  x0, x19
  mov  x1, x19
  bl   _gc_write_barrier
  cmp  w10, #40
  bgt  .Lprint
  b    .Lexit
.Lprint:
  mov  w0, w10
  bl   _printi
.Lexit:
  ldr  x19, [sp, #32]
  ldp  x29, x30, [sp], #48
  ret

.global _gc_stackmap_table
_gc_stackmap_table:
  .quad .Lsmp_0, 1, -16`

const astNodes = [
  { label: 'Program', kind: 'root', x: 50, y: 8 }, { label: 'Sequence', kind: 'sequence', x: 50, y: 23 },
  { label: 'VarDecl ×3', kind: 'statement', x: 13, y: 44 }, { label: 'Assign', kind: 'statement', x: 38, y: 44 },
  { label: 'NewPair', kind: 'expression', x: 63, y: 44 }, { label: 'If', kind: 'statement', x: 86, y: 44 },
  { label: 'total', kind: 'identifier', x: 28, y: 67 }, { label: 'Add', kind: 'expression', x: 45, y: 67 },
  { label: 'left', kind: 'identifier', x: 38, y: 87 }, { label: 'right', kind: 'identifier', x: 53, y: 87 },
  { label: 'total > 40', kind: 'expression', x: 78, y: 68 }, { label: 'Println / Skip', kind: 'statement', x: 91, y: 83 },
]
const astEdges = ['M500 62 L500 110','M500 140 C400 170 130 165 130 205','M500 140 C470 170 380 170 380 205','M500 140 C540 170 630 170 630 205','M500 140 C650 170 860 170 860 205','M380 240 L280 310','M380 240 L450 310','M450 345 L380 405','M450 345 L530 405','M860 240 L780 320','M860 240 L910 385']

const typeSteps = [
  { short: 'Assignment', title: 'Enter the assignment statement', detail: 'The checker visits Assign(total, left + right). It must establish a type for the lvalue before checking the rvalue.', badge: 'visit', direction: 'neutral', node: 'assign', path: 'M380 27 L380 42' },
  { short: 'Resolve lhs', title: 'Look up the destination', detail: 'typecheckLValue resolves total in Γ and returns int.', badge: 'infers int ↑', direction: 'infer', node: 'lhs', path: 'M218 144 C270 120 326 96 363 78' },
  { short: 'Expect rhs', title: 'Pass the lvalue type into the RHS', detail: 'The checker calls typecheckRValue(left + right, expected = Some(int)).', badge: 'expects int ↓', direction: 'expect', node: 'add', path: 'M397 78 C438 98 478 117 508 138' },
  { short: 'Check left', title: 'Resolve the left operand', detail: 'Γ(left) is int. Arithmetic operands are checked as integers.', badge: 'infers int ↑', direction: 'infer', node: 'left', path: 'M422 262 C454 234 485 210 509 186' },
  { short: 'Check right', title: 'Resolve the right operand', detail: 'Γ(right) is int, so both Add operands satisfy the arithmetic rule.', badge: 'infers int ↑', direction: 'infer', node: 'right', path: 'M620 262 C590 235 557 210 531 186' },
  { short: 'Synthesize', title: 'The Add expression synthesizes int', detail: 'The RHS result flows upward and matches the int expectation supplied by the assignment.', badge: 'int ↑ = int ↓', direction: 'infer', node: 'add', path: 'M508 138 C470 114 430 94 397 78' },
  { short: 'Accept', title: 'Assignment accepted', detail: 'Both sides agree: total : int and left + right : int. The typed Assign node is emitted.', badge: 'well typed ✓', direction: 'infer', node: 'assign', path: 'M508 138 C468 110 428 91 397 78' },
]
const typeStep = ref(0)
let typeTimer: number | undefined
function setTypeStep(step: number) { typeStep.value = Math.max(0, Math.min(typeSteps.length - 1, step)); startTypeTimer() }
function startTypeTimer() { window.clearInterval(typeTimer); if (props.stageId === 'types' && !matchMedia('(prefers-reduced-motion: reduce)').matches) typeTimer = window.setInterval(() => { typeStep.value = (typeStep.value + 1) % typeSteps.length }, 2600) }

type LoweredBlock = { id: string; label: string; lines: string[]; runtime?: boolean }
const baseLowered: LoweredBlock[] = [
  { id: 'entry', label: 'entry', lines: ['mov w8, #40', 'mov w9, #2'] }, { id: 'add', label: 'assign', lines: ['add w10, w8, w9'] },
  { id: 'alloc', label: 'allocate pair', lines: ['mov x0, #24', 'call Malloc'] }, { id: 'store', label: 'initialise', lines: ['str w10, [x0,#8]', 'str w9, [x0,#16]'] },
  { id: 'branch', label: 'branch', lines: ['cmp w10, #40', 'b.gt print'] }, { id: 'exit', label: 'exit', lines: ['call PrintInt', 'ret'] },
]
const gcLowered: LoweredBlock[] = [
  { id: 'init', label: 'runtime widget', lines: ['call GCInit'], runtime: true }, ...baseLowered.slice(0, 2),
  { id: 'map', label: 'allocation safe point', lines: ['StackMapPoint(0)', 'call Malloc'], runtime: true },
  { id: 'store', label: 'initialise', lines: ['str w10, [x0,#8]', 'str x19, [x0,#16]'] },
  { id: 'barrier', label: 'pointer store', lines: ['call GCWriteBarrier'], runtime: true }, ...baseLowered.slice(4),
]
const loweredBlocks = computed(() => props.gcEnabled ? gcLowered : baseLowered)

const runtimeSteps = [
  { title: 'Nursery is full', detail: '_gc_malloc_g cannot satisfy the pending allocation in the 2 MB nursery. A minor collection always happens first.' },
  { title: 'Minor collection traces roots', detail: 'Stack maps identify x19 → A and x20 → C. The collector follows those roots into the nursery.' },
  { title: 'Survivors move to old generation', detail: 'A and C are copied into old-generation free-list space. Root slots are updated through forwarding pointers; the other nursery cells clear.' },
  { title: 'Retry the pending allocation', detail: 'The nursery is reset and allocation retries there. In this illustrated edge case, the pending request still cannot fit.' },
  { title: 'Escalate to a full collection', detail: 'Only after that failed post-minor retry does the collector trace the whole heap, beginning again at stack roots.' },
  { title: 'Mark through heap links', detail: 'The traversal jumps from the promoted root A′ to P and then R. Mark colour spreads along each followed object edge.' },
  { title: 'Sweep the unmarked object', detail: 'Q was never reached, so its old-generation slot is returned to the free list. Marked objects remain.' },
  { title: 'Allocation resumes', detail: 'The pending allocation now uses reclaimed space and execution continues.' },
]
const runtimeStep = ref(0)
let runtimeTimer: number | undefined
function startRuntime() { window.clearInterval(runtimeTimer); if (props.stageId === 'machine' && props.gcEnabled && !matchMedia('(prefers-reduced-motion: reduce)').matches) runtimeTimer = window.setInterval(() => { runtimeStep.value = (runtimeStep.value + 1) % runtimeSteps.length }, 3100) }
function restartRuntime() { runtimeStep.value = 0; startRuntime() }
function moveRuntime(delta: number) { runtimeStep.value = (runtimeStep.value + delta + runtimeSteps.length) % runtimeSteps.length; startRuntime() }

watch(() => [props.stageId, props.gcEnabled, props.cycle], () => { typeStep.value = 0; runtimeStep.value = 0; startTypeTimer(); startRuntime() }, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { window.clearInterval(typeTimer); window.clearInterval(runtimeTimer) })
</script>

<style scoped>
.stage-visual { min-height: 500px; overflow: hidden; border: 1px solid var(--sleek-rule); border-radius: 7px; background: #101512; color: #dbe4de; box-shadow: 0 24px 70px rgb(0 0 0 / 20%); }
.panel-bar, .gc-runtime__bar { display:flex; align-items:center; justify-content:space-between; min-height:48px; padding:0 18px; border-bottom:1px solid #2a342e; background:#171e1a; font:11px 'JetBrains Mono',monospace; }
.panel-bar small { color:#78867d; }
.caption { min-height:64px; padding:17px 20px; border-top:1px solid #2a342e; background:#171e1a; color:#a6b1aa; font:13px/1.55 Manrope,sans-serif; }
.caption code { color:#8fb0ff; font:12px 'JetBrains Mono',monospace; }

.ast { position:relative; height:470px; background-image:radial-gradient(#2a352e 1px,transparent 1px); background-size:24px 24px; }
.ast svg { position:absolute; inset:0; width:100%; height:100%; }
.ast svg path { fill:none; stroke:#53645a; stroke-width:2; stroke-dasharray:800; stroke-dashoffset:800; animation:draw 1s ease forwards; animation-delay:var(--delay); }
.ast__node { position:absolute; min-width:105px; padding:9px 12px; border:1px solid #46554b; border-radius:5px; background:#171e1a; opacity:0; transform:translate(-50%,-50%) scale(.7); animation:node-in .6s cubic-bezier(.2,.85,.2,1.2) forwards; animation-delay:var(--delay); }
.ast__node small { display:block; color:#77857c; font:8px 'JetBrains Mono',monospace; text-transform:uppercase; }.ast__node strong { font:600 11px Manrope,sans-serif; }.ast__node code { display:block;color:#ef927b;font-size:9px}.ast__node--root{border-color:#7ea7ff}.ast__node--statement{border-color:#78b997}.ast__node--expression{border-color:#ae86df}

.type-layout { display:grid; grid-template-columns:180px minmax(0,1fr); min-height:510px; }.type-progress { padding:12px; border-right:1px solid #2a342e; background:#131916; }.type-progress button { display:grid; grid-template-columns:28px 1fr; width:100%; padding:12px 8px; border:0; border-left:2px solid #2d3932; background:transparent; color:#6e7c73; text-align:left; cursor:pointer; }.type-progress button.active{border-color:#7ea7ff;background:#1a2220;color:#edf2ee}.type-progress button.done{color:#8cb39a}.type-progress span{font:9px 'JetBrains Mono',monospace}.type-progress strong{font:10px Manrope,sans-serif}.type-workbench{display:grid;grid-template-rows:auto 1fr auto;min-width:0}.assignment{padding:15px;text-align:center;border-bottom:1px solid #2a342e;background:#0e1311}.assignment code{color:#e8eee9;font:15px 'JetBrains Mono',monospace}.type-tree{position:relative;min-height:330px;background-image:radial-gradient(#29332d 1px,transparent 1px);background-size:22px 22px}.type-tree svg{position:absolute;inset:0;width:100%;height:100%}.tree-line{fill:none;stroke:#37443d;stroke-width:2}.type-motion{fill:none;stroke:#7ea7ff;stroke-width:3;stroke-dasharray:9 7;animation:flow 1.5s linear infinite}.type-motion.infer{stroke:#78b997}.type-motion.neutral{stroke:#d9b966}.type-motion+defs marker path,#type-arrow path{fill:#7ea7ff}.type-node{position:absolute;display:grid;min-width:130px;padding:10px 12px;border:1px solid #415047;border-radius:5px;background:#171e1a;transform:translate(-50%,-50%);font:10px 'JetBrains Mono',monospace;transition:box-shadow .4s,transform .4s,border-color .4s}.type-node.active{border-color:#8fb0ff;box-shadow:0 0 0 5px rgb(126 167 255 / 13%);transform:translate(-50%,-50%) scale(1.06)}.type-node small{color:#8fb0ff;font-size:8px}.type-node code{margin-top:5px;color:#78b997;font-size:9px}.node-assign{left:50%;top:15%}.node-lhs{left:28%;top:49%}.node-add{left:68%;top:49%}.node-left{left:55%;top:85%}.node-right{left:82%;top:85%}.type-readout{display:grid;grid-template-columns:auto 1fr auto;gap:5px 14px;align-items:center;min-height:100px;padding:14px 18px;border-top:1px solid #2a342e;background:#171e1a}.type-readout>span{grid-row:1/3;padding:7px 9px;border:1px solid #596a60;color:#d9b966;font:9px 'JetBrains Mono',monospace}.type-readout>span.expect{border-color:#5578c2;color:#8fb0ff}.type-readout>span.infer{border-color:#47795b;color:#78b997}.type-readout strong{font-size:12px}.type-readout p{color:#9ba79f;font-size:11px}.mini-controls{display:flex;gap:6px;grid-row:1/3;grid-column:3}.mini-controls button{display:flex;align-items:center;gap:3px;padding:7px 8px;border:1px solid #3b4941;background:#101512;color:#b6c0ba;font:9px 'JetBrains Mono',monospace;cursor:pointer}.mini-controls button:disabled{opacity:.35;cursor:not-allowed}

.tac{position:relative;min-height:500px;overflow:hidden;background-image:radial-gradient(#29332d 1px,transparent 1px);background-size:24px 24px}.tac>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.tac>svg path{fill:none;stroke:#78b997;stroke-width:.35}.tac>svg marker path{fill:#78b997;stroke:none}.tac__block{position:absolute;display:grid;gap:7px;width:220px;padding:13px;border:1px solid #46554b;border-radius:5px;background:#171e1a;transform:translate(-50%,-50%);animation:block-in-centered .6s ease both}.tac__block b{color:#8fb0ff;font:10px 'JetBrains Mono',monospace}.tac__block code{padding-top:6px;border-top:1px solid #2b3730;color:#ced8d1;font:9px/1.35 'JetBrains Mono',monospace}.tac__block .terminator{border-color:#496154;color:#78b997}.tac__entry{left:50%;top:22%}.tac__then{left:29%;top:63%;width:180px}.tac__else{left:71%;top:63%;width:180px}.tac__exit{left:50%;top:91%;width:170px}.edge-label{position:absolute;color:#78b997;font:8px 'JetBrains Mono',monospace}.edge-label--true{left:37%;top:45%}.edge-label--false{right:35%;top:45%}

.lowered{display:flex;align-items:center;gap:10px;min-height:470px;padding:35px 24px;overflow-x:auto;background-image:linear-gradient(90deg,transparent 49%,#1c2620 50%,transparent 51%);background-size:44px 100%}.lowered__block{position:relative;display:grid;align-content:center;flex:0 0 155px;gap:7px;min-height:145px;padding:14px;border:1px solid #46554b;background:#171e1a;animation:block-in .55s ease both;animation-delay:var(--delay)}.lowered__block>span{position:absolute;left:10px;top:9px;color:#617068;font:8px 'JetBrains Mono',monospace}.lowered__block small{margin-top:16px;color:#7b8980;font:8px 'JetBrains Mono',monospace;text-transform:uppercase}.lowered__block code{font:9px/1.45 'JetBrains Mono',monospace}.lowered__block.runtime{border-color:#47795b;background:#142019;color:#8bc5a0}.lowered__block>svg{position:absolute;right:10px;top:10px}.lowered__arrow{flex:0 0 auto;color:#78b997}
.assembly-facts{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #2a342e;background:#142019}.assembly-facts span{display:flex;align-items:center;gap:8px;padding:13px;border-right:1px solid #2a342e;color:#98bba4;font:10px/1.4 'JetBrains Mono',monospace}.assembly-facts code{color:#78b997}

.linker{display:grid;grid-template-columns:1fr 55px 1fr 55px 1fr;gap:12px;align-items:center;min-height:410px;padding:35px}.linker__inputs{display:grid;gap:12px}.linker__inputs>div,.linker__tool,.linker__binary{display:grid;gap:8px;padding:17px;border:1px solid #46554b;background:#171e1a}.linker__runtime{border-color:#47795b!important;color:#78b997}.linker small{color:#7b8980;font:8px 'JetBrains Mono',monospace}.linker strong{font-size:11px}.linker code{font:9px 'JetBrains Mono',monospace}.linker__arrow{color:#78b997;text-align:center}.linker__tool{place-items:center;text-align:center}.linker__tool svg{color:#dfbd65}.linker__binary{border-color:#5578c2}.neighbour-link{display:grid;grid-template-columns:1fr auto;gap:4px 8px;padding:17px 20px;border-top:1px solid #2a342e;background:#171e1a;color:#8fb0ff;text-decoration:none;font-size:12px}.neighbour-link small{grid-column:1/-1;color:#8d9991;font:10px 'JetBrains Mono',monospace}

.plain-memory{display:grid;grid-template-columns:minmax(190px,.8fr) 170px minmax(330px,1.4fr);align-items:center;min-height:460px;padding:42px}.plain-memory h4,.gc-scene h4{color:#8b998f;font:9px 'JetBrains Mono',monospace;text-transform:uppercase}.frame{display:grid;gap:5px;margin-top:13px;padding:13px;border:1px solid #46554b;background:#171e1a;font:10px 'JetBrains Mono',monospace}.frame code{color:#8fb0ff}.memory-link{position:relative;height:2px;margin:0 18px;background:#8fb0ff}.memory-link::before{content:'';position:absolute;left:-3px;top:-3px;width:8px;height:8px;border-radius:50%;background:#8fb0ff}.memory-link::after{content:'';position:absolute;right:-1px;top:-5px;border-left:10px solid #8fb0ff;border-top:6px solid transparent;border-bottom:6px solid transparent}.heap-track{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;min-height:150px;margin-top:14px;padding:20px;border:1px solid #46554b;background:#0d1210}.heap-track span{display:grid;place-items:center;min-height:78px;border:1px dashed #354139;border-radius:5px;color:#8fb0ff;font:11px 'JetBrains Mono',monospace}.heap-track .allocated{border-style:solid;border-color:#5578c2;background:#1b2635}.heap-track small{font-size:7px;color:#9aa89f}.heap-key{display:flex;align-items:center;gap:7px;margin-top:10px;color:#7d8a82;font:8px 'JetBrains Mono',monospace}.heap-key i{width:10px;height:10px;border:1px solid #5578c2;background:#1b2635}.heap-key i:nth-of-type(2){margin-left:8px;border-style:dashed;border-color:#354139;background:transparent}

.gc-runtime__bar span,.gc-runtime__bar button{display:flex;align-items:center;gap:7px}.gc-runtime__bar button{border:0;background:transparent;color:#8fb0ff;font:inherit;cursor:pointer}.gc-scene{position:relative;min-height:500px;overflow:hidden;background-image:radial-gradient(#27322c 1px,transparent 1px);background-size:24px 24px}.gc-root{position:absolute;z-index:5;top:8%;display:grid;gap:3px;width:145px;padding:10px 12px;border:1px solid #46554b;background:#171e1a;transform:translateX(-50%);font:9px 'JetBrains Mono',monospace}.gc-root small{color:#7f8c84;font-size:7px;text-transform:uppercase}.gc-root code{color:#8fb0ff}.root-a{left:16%}.root-c{left:37%}.gc-generation{position:absolute;z-index:1;top:28%;bottom:8%;border:1px dashed #3a473f;background:#0d1210}.gc-generation.young{left:3%;width:45%}.gc-generation.old{left:52%;width:45%}.gc-generation header{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #28342d}.gc-generation header small{color:#657269;font:8px 'JetBrains Mono',monospace}.object{position:absolute;z-index:3;display:grid;place-items:center;width:54px;height:54px;border:1px solid #5578c2;border-radius:5px;background:#1b2635;color:#8fb0ff;font:11px 'JetBrains Mono',monospace;transform:translate(-50%,-50%);transition:opacity .65s,transform .9s,background-color .5s,border-color .5s,box-shadow .5s}.object.a{left:13%;top:46%}.object.b{left:34%;top:47%}.object.c{left:35%;top:72%}.object.d{left:14%;top:74%}.object.p{left:62%;top:48%}.object.q{left:84%;top:48%}.object.r{left:67%;top:73%}.object.promoted{left:76%;top:73%;opacity:0}.free-hole{position:absolute;z-index:2;left:84%;top:48%;display:grid;place-items:center;width:58px;height:58px;border:1px dashed #78b997;color:#78b997;opacity:0;transform:translate(-50%,-50%);font:8px 'JetBrains Mono',monospace}.gc-links{position:absolute;z-index:4;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}.gc-links path{fill:none;stroke:#78b997;stroke-width:.35;stroke-dasharray:1.2 1;opacity:0;transition:opacity .5s;animation:flow-fine 1.8s linear infinite}.gc-legend{position:absolute;z-index:5;right:4%;bottom:2%;display:flex;gap:12px;color:#7e8b83;font:7px 'JetBrains Mono',monospace}.gc-legend span{display:flex;align-items:center;gap:5px}.gc-legend i{width:9px;height:9px;border:1px solid #5578c2;background:#1b2635}.gc-legend span:nth-child(2) i{border-color:#78b997;background:#193324}.gc-legend span:nth-child(3) i{border-style:dashed;border-color:#58635c;background:transparent}.pause-badge{position:absolute;z-index:6;left:50%;top:8%;display:flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid #d97764;background:#241916;color:#ef927b;font:9px 'JetBrains Mono',monospace}.gc-readout{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;min-height:100px;padding:15px 18px;border-top:1px solid #2a342e;background:#171e1a}.gc-readout>span{color:#78b997;font:10px 'JetBrains Mono',monospace}.gc-readout strong{font-size:13px}.gc-readout p{margin-top:4px;color:#a5b0a9;font-size:12px;line-height:1.5}.gc-step-0 .young{box-shadow:inset -7px 0 #d97764}.gc-step-1 .link-a,.gc-step-1 .link-c,.gc-step-2 .link-a,.gc-step-2 .link-c,.gc-step-4 .link-a,.gc-step-4 .link-c{opacity:1}.gc-step-1 .a,.gc-step-1 .c{border-color:#78b997;background:#193324}.gc-step-2 .a,.gc-step-2 .c{opacity:0}.gc-step-2 .promoted{opacity:1}.gc-step-2 .b,.gc-step-2 .d,.gc-step-3 .b,.gc-step-3 .d{opacity:0}.gc-step-4 .promoted,.gc-step-5 .promoted,.gc-step-6 .promoted,.gc-step-7 .promoted{opacity:1}.gc-step-4 .link-a,.gc-step-5 .link-a,.gc-step-5 .hop-ap,.gc-step-5 .hop-pr{opacity:1}.gc-step-4 .promoted,.gc-step-5 .promoted,.gc-step-5 .p,.gc-step-5 .r,.gc-step-6 .promoted,.gc-step-6 .p,.gc-step-6 .r,.gc-step-7 .promoted,.gc-step-7 .p,.gc-step-7 .r{border-color:#78b997;background:#193324;box-shadow:0 0 0 5px rgb(120 185 151 / 12%)}.gc-step-5 .q{opacity:.35}.gc-step-6 .q,.gc-step-7 .q{opacity:0}.gc-step-6 .free-hole,.gc-step-7 .free-hole{opacity:1}

.lowered{scrollbar-width:none}.lowered::-webkit-scrollbar{display:none}.lowered__block{flex:1 0 140px}.object.promoted-c{left:89%;top:73%;opacity:0}.gc-step-1 .link-a,.gc-step-1 .link-c{opacity:1}.gc-step-2 .link-a,.gc-step-2 .link-c,.gc-step-3 .link-a,.gc-step-3 .link-c,.gc-step-4 .link-a,.gc-step-4 .link-c,.gc-step-5 .link-a,.gc-step-5 .link-c,.gc-step-6 .link-a,.gc-step-6 .link-c,.gc-step-7 .link-a,.gc-step-7 .link-c{opacity:0}.gc-step-2 .promoted-root,.gc-step-3 .promoted-root,.gc-step-4 .promoted-root,.gc-step-5 .promoted-root,.gc-step-6 .promoted-root,.gc-step-7 .promoted-root{opacity:1}.gc-step-2 .a,.gc-step-2 .b,.gc-step-2 .c,.gc-step-2 .d,.gc-step-3 .a,.gc-step-3 .b,.gc-step-3 .c,.gc-step-3 .d,.gc-step-4 .a,.gc-step-4 .b,.gc-step-4 .c,.gc-step-4 .d,.gc-step-5 .a,.gc-step-5 .b,.gc-step-5 .c,.gc-step-5 .d,.gc-step-6 .a,.gc-step-6 .b,.gc-step-6 .c,.gc-step-6 .d,.gc-step-7 .a,.gc-step-7 .b,.gc-step-7 .c,.gc-step-7 .d{opacity:0}.gc-step-2 .promoted-c,.gc-step-3 .promoted-c,.gc-step-4 .promoted-c,.gc-step-5 .promoted-c,.gc-step-6 .promoted-c,.gc-step-7 .promoted-c{opacity:1}.gc-step-5 .promoted-c,.gc-step-6 .promoted-c,.gc-step-7 .promoted-c{border-color:#78b997;background:#193324;box-shadow:0 0 0 5px rgb(120 185 151 / 12%)}
@keyframes draw{to{stroke-dashoffset:0}}@keyframes node-in{to{opacity:1;transform:translate(-50%,-50%) scale(1)}}@keyframes flow{to{stroke-dashoffset:-34}}@keyframes flow-fine{to{stroke-dashoffset:-4}}@keyframes block-in{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:none}}@keyframes block-in-centered{from{opacity:0;transform:translate(-50%,-45%)}to{opacity:1;transform:translate(-50%,-50%)}}
@media(max-width:800px){.type-layout{grid-template-columns:1fr}.type-progress{display:flex;overflow-x:auto;border-right:0;border-bottom:1px solid #2a342e}.type-progress button{flex:0 0 105px}.linker{grid-template-columns:1fr 40px 1fr}.linker__arrow:nth-of-type(2),.linker__binary{display:none}.plain-memory{grid-template-columns:1fr 90px 1.4fr;padding:24px}.gc-root{width:120px}.object{width:48px;height:48px}}
@media(max-width:560px){.panel-bar{align-items:flex-start;flex-direction:column;justify-content:center;gap:3px;padding:9px 13px}.ast{min-width:720px}.stage-visual--ast .panel{overflow-x:auto}.type-progress{scrollbar-width:none}.type-progress::-webkit-scrollbar{display:none}.type-workbench{overflow:hidden}.type-tree{min-width:0;min-height:350px}.type-node{min-width:88px;max-width:105px;padding:8px;font-size:9px}.type-node small{font-size:7px}.node-lhs{left:22%}.node-add{left:70%}.node-left{left:28%}.node-right{left:75%}.type-readout{grid-template-columns:1fr;padding:13px}.type-readout>span{grid-row:auto;justify-self:start}.type-readout .mini-controls{grid-row:auto;grid-column:auto}.tac{min-width:650px}.tac__entry{width:200px}.tac__then,.tac__else{width:155px}.lowered{padding:25px 18px}.assembly-facts{grid-template-columns:1fr}.assembly-facts span{border-right:0;border-bottom:1px solid #2a342e}.linker{grid-template-columns:1fr;padding:22px}.linker__arrow{transform:rotate(90deg)}.plain-memory{grid-template-columns:1fr;padding:24px}.memory-link{width:2px;height:70px;margin:15px auto}.memory-link::before{left:-3px;top:-2px}.memory-link::after{left:-5px;right:auto;top:auto;bottom:-1px;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid #8fb0ff;border-bottom:0}.gc-scene{min-width:650px}.gc-readout{grid-template-columns:1fr}.gc-readout .mini-controls{grid-column:auto;grid-row:auto}}
@media(prefers-reduced-motion:reduce){.ast svg path,.ast__node,.type-motion,.tac__block,.lowered__block,.gc-links path{animation:none!important}.ast svg path{stroke-dashoffset:0}.ast__node{opacity:1;transform:translate(-50%,-50%)}}
.pending-allocation{position:absolute;z-index:5;left:25.5%;top:60%;display:none;width:35%;padding:14px;border:1px solid #d97764;background:rgb(36 25 22 / 92%);color:#ef927b;transform:translate(-50%,-50%);text-align:center;font:8px/1.5 'JetBrains Mono',monospace;text-transform:uppercase}.pending-allocation code{color:#f1b09f}.gc-step-3 .pending-allocation{display:block}
</style>
