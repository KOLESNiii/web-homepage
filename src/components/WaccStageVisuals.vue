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
              <path class="tree-line" d="M380 68 L210 155" /><path class="tree-line" d="M380 68 L520 155" />
              <path class="tree-line" d="M520 205 L420 278" /><path class="tree-line" d="M520 205 L625 278" />
              <path class="type-motion" :class="typeSteps[typeStep]?.direction" :d="typeSteps[typeStep]?.path" marker-end="url(#type-arrow)" />
              <defs><marker id="type-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" /></marker></defs>
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
        <div class="tac__block"><b>entry</b><code>left ← 40</code><code>right ← 2</code></div><FlowArrow />
        <div class="tac__block"><b>assign</b><code>t0 ← left + right</code><code>total ← t0</code></div><FlowArrow />
        <div class="tac__block tac__branch"><b>branch</b><code>t1 ← total &gt; 40</code><code>br t1, print, exit</code></div>
        <div class="tac__fork"><span></span><span></span></div>
        <div class="tac__ends"><div class="tac__block"><b>print</b><code>println total</code></div><div class="tac__block"><b>exit</b><code>return 0</code></div></div>
      </div>
      <p class="caption">The expression tree has flattened into a short chain of basic blocks; branches are now explicit edges.</p>
    </div>

    <div v-else-if="stageId === 'lowered'" class="panel">
      <PanelBar title="AArch64-specific IR" :detail="gcEnabled ? 'stack maps + barriers inserted' : 'instruction selection + register constraints'" />
      <div class="lowered">
        <div v-for="(block, index) in loweredBlocks" :key="block.id" class="lowered__block" :class="{ runtime: block.runtime }" :style="{ '--delay': `${index * 90}ms` }">
          <small>{{ block.label }}</small><code v-for="line in block.lines" :key="line">{{ line }}</code><Recycle v-if="block.runtime" :size="15" />
        </div>
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
        <section><h4>Stack references</h4><div class="frame"><span>main()</span><code>x19 → A</code></div><div class="frame"><span>print()</span><code>x0 = 42</code></div></section>
        <svg viewBox="0 0 260 300" preserveAspectRatio="none" aria-hidden="true"><path d="M15 95 C110 95 145 90 245 85" marker-end="url(#plain-arrow)"/><defs><marker id="plain-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" /></marker></defs></svg>
        <section class="unified-heap"><h4>Heap</h4><div class="heap-track"><span>A<small>pair</small></span><span>B<small>array</small></span><span>C<small>string</small></span><i></i></div><p>bump / allocate</p></section>
      </div>
      <p class="caption">The processor executes the linked binary. Stack references point into one continuous heap while allocations advance through available memory.</p>
    </div>

    <div v-else class="panel gc-runtime" :class="`gc-step-${runtimeStep}`">
      <div class="gc-runtime__bar"><span><Cpu :size="16" /> Generational runtime</span><button type="button" @click="restartRuntime"><RotateCcw :size="15" /> Replay</button></div>
      <div class="gc-scene">
        <section class="gc-stack"><h4>Stack roots</h4><div class="frame root-a"><span>main()</span><code>x19 → A</code></div><div class="frame root-c"><span>work()</span><code>x20 → C</code></div></section>
        <svg class="gc-links" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true"><path class="link-a" d="M180 105 C310 105 315 100 445 115"/><path class="link-c" d="M180 230 C300 230 335 245 485 270"/><path class="forward" d="M460 115 C620 100 705 95 795 120"/></svg>
        <section class="gc-generation young"><header><h4>Young generation</h4><small>2 MB · bump allocated</small></header><div class="space"><span class="object a">A<small>live</small></span><span class="object b">B<small>dead</small></span><span class="object c">C<small>live</small></span><span class="object d">D<small>dead</small></span><i class="bump"></i></div></section>
        <section class="gc-generation old"><header><h4>Old generation</h4><small>14 MB · free list</small></header><div class="space"><span class="object p">P<small>live</small></span><span class="object q">Q<small>dead</small></span><span class="object r">R<small>live</small></span><span class="object promoted">A′<small>promoted</small></span><span class="free-hole">free</span></div></section>
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
const FlowArrow = defineComponent({ setup: () => () => h('span', { class: 'flow-arrow', 'aria-hidden': 'true' }, '→') })

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
  { short: 'Assignment', title: 'Enter the assignment statement', detail: 'The checker visits Assign(total, left + right). It must establish a type for the lvalue before checking the rvalue.', badge: 'visit', direction: 'neutral', node: 'assign', path: 'M380 30 L380 60' },
  { short: 'Resolve lhs', title: 'Look up the destination', detail: 'typecheckLValue resolves total in Γ and returns int.', badge: 'infers int ↑', direction: 'infer', node: 'lhs', path: 'M365 72 C320 95 260 120 220 150' },
  { short: 'Expect rhs', title: 'Pass the lvalue type into the RHS', detail: 'The checker calls typecheckRValue(left + right, expected = Some(int)).', badge: 'expects int ↓', direction: 'expect', node: 'add', path: 'M225 160 C320 125 435 125 510 160' },
  { short: 'Check left', title: 'Resolve the left operand', detail: 'Γ(left) is int. Arithmetic operands are checked as integers.', badge: 'infers int ↑', direction: 'infer', node: 'left', path: 'M420 278 C450 250 485 225 510 205' },
  { short: 'Check right', title: 'Resolve the right operand', detail: 'Γ(right) is int, so both Add operands satisfy the arithmetic rule.', badge: 'infers int ↑', direction: 'infer', node: 'right', path: 'M625 278 C600 250 560 225 530 205' },
  { short: 'Synthesize', title: 'The Add expression synthesizes int', detail: 'The RHS result flows upward and matches the int expectation supplied by the assignment.', badge: 'int ↑ = int ↓', direction: 'infer', node: 'add', path: 'M520 155 C485 125 430 100 385 72' },
  { short: 'Accept', title: 'Assignment accepted', detail: 'Both sides agree: total : int and left + right : int. The typed Assign node is emitted.', badge: 'well typed ✓', direction: 'infer', node: 'assign', path: 'M520 155 C470 110 420 85 385 68' },
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
  { title: 'Nursery fills', detail: '_gc_malloc_g reaches the end of the 2 MB bump-allocated nursery, so the mutator pauses.' },
  { title: 'Trace stack roots', detail: 'Stack maps identify x19 → A and x20 → C. The collector follows only those live young-generation roots.' },
  { title: 'Mark survivors', detail: 'A and C are reachable; B and D are not. Forwarding begins with the rooted objects.' },
  { title: 'Promotion asks for old-gen space', detail: 'A is ready to copy, but the 14 MB old-generation free list cannot satisfy the request.' },
  { title: 'Full collection', detail: 'The collector traces roots across young and old generations, marks P and R, then sweeps unreachable Q.' },
  { title: 'Promotion succeeds', detail: 'The freed old-generation hole receives A′. A forwarding pointer updates x19 and any object fields that referenced A.' },
  { title: 'Minor collection finishes', detail: 'C is promoted through the same Cheney work list; dead nursery objects disappear and the remembered set clears.' },
  { title: 'Bump allocation resumes', detail: 'The nursery pointer resets to its start, then advances for the pending allocation. The program continues.' },
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

.tac{position:relative;display:flex;align-items:center;justify-content:center;gap:12px;min-height:470px;padding:45px 24px 140px;overflow-x:auto}.tac__block{flex:0 0 170px;display:grid;gap:8px;padding:14px;border:1px solid #46554b;border-radius:5px;background:#171e1a;animation:block-in .6s ease both}.tac__block b{color:#8fb0ff;font:10px 'JetBrains Mono',monospace}.tac__block code{padding-top:7px;border-top:1px solid #2b3730;color:#ced8d1;font:9px/1.4 'JetBrains Mono',monospace}.flow-arrow{color:#78b997;font-size:26px}.tac__fork{position:absolute;left:71%;top:58%;width:180px;height:50px;border-left:1px solid #78b997;border-right:1px solid #78b997;border-top:1px solid #78b997}.tac__ends{position:absolute;left:calc(71% - 85px);top:70%;display:flex;gap:25px}.tac__ends .tac__block{min-height:auto}

.lowered{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;min-height:470px;padding:30px}.lowered__block{position:relative;display:grid;align-content:center;gap:7px;min-height:115px;padding:14px;border:1px solid #46554b;background:#171e1a;animation:block-in .55s ease both;animation-delay:var(--delay)}.lowered__block small{color:#7b8980;font:8px 'JetBrains Mono',monospace;text-transform:uppercase}.lowered__block code{font:10px 'JetBrains Mono',monospace}.lowered__block.runtime{border-color:#47795b;background:#142019;color:#8bc5a0}.lowered__block>svg{position:absolute;right:10px;top:10px}
.assembly-facts{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #2a342e;background:#142019}.assembly-facts span{display:flex;align-items:center;gap:8px;padding:13px;border-right:1px solid #2a342e;color:#98bba4;font:10px/1.4 'JetBrains Mono',monospace}.assembly-facts code{color:#78b997}

.linker{display:grid;grid-template-columns:1fr 55px 1fr 55px 1fr;gap:12px;align-items:center;min-height:410px;padding:35px}.linker__inputs{display:grid;gap:12px}.linker__inputs>div,.linker__tool,.linker__binary{display:grid;gap:8px;padding:17px;border:1px solid #46554b;background:#171e1a}.linker__runtime{border-color:#47795b!important;color:#78b997}.linker small{color:#7b8980;font:8px 'JetBrains Mono',monospace}.linker strong{font-size:11px}.linker code{font:9px 'JetBrains Mono',monospace}.linker__arrow{color:#78b997;text-align:center}.linker__tool{place-items:center;text-align:center}.linker__tool svg{color:#dfbd65}.linker__binary{border-color:#5578c2}.neighbour-link{display:grid;grid-template-columns:1fr auto;gap:4px 8px;padding:17px 20px;border-top:1px solid #2a342e;background:#171e1a;color:#8fb0ff;text-decoration:none;font-size:12px}.neighbour-link small{grid-column:1/-1;color:#8d9991;font:10px 'JetBrains Mono',monospace}

.plain-memory{display:grid;grid-template-columns:.8fr 260px 1.3fr;align-items:center;min-height:460px;padding:35px}.plain-memory h4,.gc-scene h4{color:#8b998f;font:9px 'JetBrains Mono',monospace;text-transform:uppercase}.frame{display:grid;gap:5px;margin-top:13px;padding:13px;border:1px solid #46554b;background:#171e1a;font:10px 'JetBrains Mono',monospace}.frame code{color:#8fb0ff}.plain-memory svg{width:100%;height:300px}.plain-memory svg path{fill:none;stroke:#8fb0ff;stroke-width:2;stroke-dasharray:9 7;animation:flow 2s linear infinite}.plain-memory marker path{fill:#8fb0ff}.heap-track{position:relative;display:flex;align-items:center;gap:10px;min-height:150px;margin-top:14px;padding:18px;border:1px solid #46554b;background:#0d1210}.heap-track span,.object{display:grid;place-items:center;width:58px;height:58px;border:1px solid #5578c2;border-radius:5px;background:#1b2635;color:#8fb0ff;font:11px 'JetBrains Mono',monospace}.heap-track small,.object small{font-size:7px;color:#9aa89f}.heap-track i{flex:1;height:2px;background:#78b997;animation:bump 3s ease-in-out infinite}.unified-heap p{margin-top:9px;color:#78b997;font:9px 'JetBrains Mono',monospace}

.gc-runtime__bar span,.gc-runtime__bar button{display:flex;align-items:center;gap:7px}.gc-runtime__bar button{border:0;background:transparent;color:#8fb0ff;font:inherit;cursor:pointer}.gc-scene{position:relative;display:grid;grid-template-columns:.7fr 1fr 1fr;min-height:420px}.gc-stack,.gc-generation{position:relative;z-index:2;padding:20px;border-right:1px solid #2a342e}.gc-generation header{display:grid;gap:3px}.gc-generation header small{color:#657269;font:8px 'JetBrains Mono',monospace}.gc-generation .space{position:relative;min-height:320px;margin-top:14px;border:1px dashed #3a473f;background:#0d1210;overflow:hidden}.object{position:absolute;transition:opacity .7s,transform 1.1s,background .5s,border-color .5s}.object.a{left:12%;top:12%}.object.b{left:57%;top:13%}.object.c{left:24%;top:58%}.object.d{left:63%;top:61%}.object.p{left:12%;top:13%}.object.q{left:58%;top:17%}.object.r{left:25%;top:61%}.object.promoted{left:58%;top:56%;opacity:0;transform:translateX(-240px)}.bump{position:absolute;left:8%;right:8%;bottom:20px;height:3px;background:linear-gradient(90deg,#78b997 84%,#e5806b 84%)}.free-hole{position:absolute;left:57%;top:15%;display:grid;place-items:center;width:62px;height:62px;border:1px dashed #78b997;color:#78b997;opacity:0;font:8px 'JetBrains Mono',monospace}.gc-links{position:absolute;z-index:4;inset:0;width:100%;height:100%;pointer-events:none}.gc-links path{fill:none;stroke:#78b997;stroke-width:2.2;stroke-dasharray:10 8;opacity:0;transition:opacity .5s;animation:flow 2s linear infinite}.pause-badge{position:absolute;z-index:6;left:50%;top:12px;display:flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid #d97764;background:#241916;color:#ef927b;font:9px 'JetBrains Mono',monospace}.gc-readout{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;min-height:100px;padding:15px 18px;border-top:1px solid #2a342e;background:#171e1a}.gc-readout>span{color:#78b997;font:10px 'JetBrains Mono',monospace}.gc-readout strong{font-size:13px}.gc-readout p{margin-top:4px;color:#a5b0a9;font-size:12px;line-height:1.5}.gc-step-0 .young .space{box-shadow:inset -8px 0 #d97764}.gc-step-1 .link-a,.gc-step-1 .link-c,.gc-step-2 .link-a,.gc-step-2 .link-c,.gc-step-4 .link-a,.gc-step-4 .link-c,.gc-step-5 .link-a,.gc-step-5 .forward{opacity:1}.gc-step-2 .a,.gc-step-2 .c,.gc-step-4 .a,.gc-step-4 .c,.gc-step-4 .p,.gc-step-4 .r{border-color:#78b997;background:#193324;box-shadow:0 0 0 5px rgb(120 185 151 / 13%)}.gc-step-2 .b,.gc-step-2 .d,.gc-step-4 .q{opacity:.25}.gc-step-3 .promoted{opacity:.4}.gc-step-3 .old .space{box-shadow:inset 0 0 0 2px #d97764}.gc-step-4 .q{opacity:.15}.gc-step-5 .q{opacity:0}.gc-step-5 .free-hole{opacity:1}.gc-step-5 .promoted,.gc-step-6 .promoted,.gc-step-7 .promoted{opacity:1;transform:none}.gc-step-5 .a,.gc-step-6 .a,.gc-step-6 .b,.gc-step-6 .c,.gc-step-6 .d,.gc-step-7 .a,.gc-step-7 .b,.gc-step-7 .c,.gc-step-7 .d{opacity:0}.gc-step-7 .bump{animation:bump 1.8s ease-in-out infinite}

@keyframes draw{to{stroke-dashoffset:0}}@keyframes node-in{to{opacity:1;transform:translate(-50%,-50%) scale(1)}}@keyframes flow{to{stroke-dashoffset:-34}}@keyframes block-in{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:none}}@keyframes bump{0%,20%{transform:scaleX(.1);transform-origin:left}80%,100%{transform:scaleX(1);transform-origin:left}}
@media(max-width:800px){.type-layout{grid-template-columns:1fr}.type-progress{display:flex;overflow-x:auto;border-right:0;border-bottom:1px solid #2a342e}.type-progress button{flex:0 0 105px}.lowered{grid-template-columns:repeat(2,1fr)}.linker{grid-template-columns:1fr 40px 1fr}.linker__arrow:nth-of-type(2),.linker__binary{display:none}.plain-memory{grid-template-columns:1fr 130px 1fr;padding:20px}.gc-scene{grid-template-columns:1fr 1fr}.gc-stack{display:none}}
@media(max-width:560px){.panel-bar{align-items:flex-start;flex-direction:column;justify-content:center;gap:3px;padding:9px 13px}.ast{min-width:720px}.stage-visual--ast .panel{overflow-x:auto}.type-progress{scrollbar-width:none}.type-progress::-webkit-scrollbar{display:none}.type-workbench{overflow:hidden}.type-tree{min-width:0;min-height:350px}.type-node{min-width:88px;max-width:105px;padding:8px;font-size:9px}.type-node small{font-size:7px}.node-lhs{left:22%}.node-add{left:70%}.node-left{left:28%}.node-right{left:75%}.type-readout{grid-template-columns:1fr;padding:13px}.type-readout>span{grid-row:auto;justify-self:start}.type-readout .mini-controls{grid-row:auto;grid-column:auto}.tac{justify-content:flex-start;min-width:850px}.lowered{grid-template-columns:1fr}.assembly-facts{grid-template-columns:1fr}.assembly-facts span{border-right:0;border-bottom:1px solid #2a342e}.linker{grid-template-columns:1fr;padding:22px}.linker__arrow{transform:rotate(90deg)}.plain-memory{grid-template-columns:1fr}.plain-memory svg{display:none}.gc-scene{grid-template-columns:1fr}.gc-generation{border-right:0;border-bottom:1px solid #2a342e}.gc-readout{grid-template-columns:1fr}.gc-readout .mini-controls{grid-column:auto;grid-row:auto}.gc-links{display:none}}
@media(prefers-reduced-motion:reduce){.ast svg path,.ast__node,.type-motion,.tac__block,.lowered__block,.plain-memory svg path,.heap-track i,.gc-links path,.bump{animation:none!important}.ast svg path{stroke-dashoffset:0}.ast__node{opacity:1;transform:translate(-50%,-50%)}}
</style>
