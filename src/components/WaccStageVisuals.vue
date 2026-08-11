<template>
  <div class="stage-visual" :class="`stage-visual--${stageId}`">
    <div v-if="stageId === 'source'" class="source-stage">
      <CodeEditor filename="stats.wacc" language="WACC" :code="sourceCode" />
      <p class="visual-note">The lexer identifies tokens; the parser groups them by the WACC grammar.</p>
    </div>

    <div v-else-if="stageId === 'ast'" class="diagram-shell">
      <div class="diagram-toolbar">
        <span>Abstract structure</span><small>punctuation discarded · hierarchy preserved</small>
      </div>
      <div class="ast-canvas">
        <svg class="graph-edges" viewBox="0 0 1000 470" preserveAspectRatio="none" aria-hidden="true">
          <path v-for="(edge, index) in astEdges" :key="edge" :d="edge" :style="{ '--edge-delay': `${index * 90}ms` }" />
        </svg>
        <div
          v-for="(node, index) in astNodes"
          :key="node.label"
          class="graph-node ast-node"
          :class="`graph-node--${node.kind}`"
          :style="{ left: `${node.x}%`, top: `${node.y}%`, '--node-delay': `${140 + index * 95}ms` }"
        >
          <small>{{ node.kind }}</small><strong>{{ node.label }}</strong><span v-if="node.value">{{ node.value }}</span>
        </div>
      </div>
      <p class="visual-note">Each card is an AST node. Parent–child edges encode how the original source fits together.</p>
    </div>

    <div v-else-if="stageId === 'types'" class="diagram-shell type-shell">
      <div class="diagram-toolbar">
        <span>Bidirectional type flow</span>
        <div class="type-legend"><i class="expects"></i> expected down <i class="infers"></i> inferred up</div>
      </div>
      <div class="type-canvas">
        <svg class="type-arrows" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="arrow-expect" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" /></marker>
            <marker id="arrow-infer" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" /></marker>
          </defs>
          <path class="expect-flow flow-a" d="M500 92 C500 135 300 135 300 190" marker-end="url(#arrow-expect)" />
          <path class="expect-flow flow-b" d="M500 92 C500 135 700 135 700 190" marker-end="url(#arrow-expect)" />
          <path class="expect-flow flow-c" d="M300 260 L300 336" marker-end="url(#arrow-expect)" />
          <path class="expect-flow flow-d" d="M700 260 L700 336" marker-end="url(#arrow-expect)" />
          <path class="infer-flow flow-e" d="M340 336 L340 268" marker-end="url(#arrow-infer)" />
          <path class="infer-flow flow-f" d="M740 336 L740 268" marker-end="url(#arrow-infer)" />
          <path class="infer-flow flow-g" d="M340 190 C340 145 480 145 480 100" marker-end="url(#arrow-infer)" />
          <path class="infer-flow flow-h" d="M740 190 C740 145 520 145 520 100" marker-end="url(#arrow-infer)" />
        </svg>
        <div class="type-node type-node--root"><small>expects</small><strong>Add</strong><span>int</span></div>
        <div class="type-node type-node--left"><small>expects int</small><strong>fst stats</strong><span>infers int ✓</span></div>
        <div class="type-node type-node--right"><small>expects int</small><strong>snd stats</strong><span>infers int ✓</span></div>
        <div class="type-node type-node--leaf-left"><small>lookup Γ</small><strong>stats</strong><span>pair(int, int)</span></div>
        <div class="type-node type-node--leaf-right"><small>lookup Γ</small><strong>stats</strong><span>pair(int, int)</span></div>
        <div class="type-verdict"><Check :size="15" aria-hidden="true" /> expression proves <code>int</code></div>
      </div>
      <p class="visual-note">The context pushes expected types downward; child expressions synthesize their inferred types upward.</p>
    </div>

    <div v-else-if="stageId === 'tac'" class="diagram-shell">
      <div class="diagram-toolbar"><span>Architecture-neutral control flow</span><small>one operation per row</small></div>
      <div class="cfg-canvas tac-canvas">
        <template v-for="(block, index) in tacBlocks" :key="block.name">
          <IrBlock :block="block" :index="index" />
          <div v-if="index < tacBlocks.length - 1" class="cfg-arrow" :style="{ '--block-delay': `${480 + index * 220}ms` }">
            <ArrowRight :size="19" aria-hidden="true" /><small>next</small>
          </div>
        </template>
      </div>
      <p class="visual-note">Tree-shaped expressions flatten into ordered basic blocks and explicit temporaries.</p>
    </div>

    <div v-else-if="stageId === 'lowered'" class="diagram-shell lowered-shell">
      <div class="diagram-toolbar">
        <span>AArch64 lowering</span>
        <small>{{ gcEnabled ? 'GC operations injected between selected blocks' : 'plain allocation path' }}</small>
      </div>
      <div class="lowering-canvas">
        <div class="lowering-input">
          <span>TAC block</span>
          <strong>t0 = alloc_pair 8</strong>
          <strong>t3 = add t1, t2</strong>
        </div>
        <div class="lowering-expander"><span>instruction<br />selection</span><i></i></div>
        <TransitionGroup name="inject" tag="div" class="lowered-blocks">
          <div
            v-for="(block, index) in loweredBlocks"
            :key="block.id"
            class="lowered-block"
            :class="{ 'lowered-block--gc': block.gc }"
            :style="{ '--block-delay': `${index * 150}ms` }"
          >
            <span>{{ block.kind }}</span><strong>{{ block.label }}</strong><small>{{ block.detail }}</small>
            <Recycle v-if="block.gc" :size="14" aria-hidden="true" />
          </div>
        </TransitionGroup>
      </div>
      <p class="visual-note">
        {{ gcEnabled ? 'Green runtime widgets are inserted around allocation and safe points; ordinary program blocks stay intact.' : 'Enable GC above to watch allocation, root preservation, stack maps and polling blocks slot into the lowered IR.' }}
      </p>
    </div>

    <div v-else-if="stageId === 'assembly'" class="source-stage assembly-stage">
      <CodeEditor filename="stats.s" language="AARCH64" :code="gcEnabled ? assemblyGcCode : assemblyCode" />
      <div v-if="gcEnabled" class="assembly-widgets">
        <span><Recycle :size="13" /> <code>gc_alloc</code> replaces ordinary allocation</span>
        <span><MapPin :size="13" /> <code>.Lsp0</code> records the live root in <code>x19</code></span>
        <span><Pause :size="13" /> <code>gc_poll</code> creates a safe place to pause</span>
      </div>
      <p v-else class="visual-note">Register allocation and peephole optimisation produce the final textual assembly.</p>
    </div>

    <div v-else-if="stageId === 'assembler'" class="diagram-shell binary-shell">
      <div class="diagram-toolbar"><span>External platform toolchain</span><small>not part of our WACC compiler</small></div>
      <div class="binary-conveyor">
        <div class="conveyor-packet assembly-packet"><small>stats.s</small><strong>stp x29, x30</strong><strong>mov w0, #8</strong><strong>bl gc_alloc</strong></div>
        <div class="conveyor-arrow"><span></span><ArrowRight :size="21" /></div>
        <div class="assembler-machine"><Wrench :size="25" /><strong>GNU as + ld</strong><small>encode · relocate · link</small></div>
        <div class="conveyor-arrow"><span></span><ArrowRight :size="21" /></div>
        <div class="conveyor-packet byte-packet"><small>ELF / AArch64</small><strong>A9 BF 7B FD</strong><strong>52 80 01 00</strong><strong>94 00 00 2A</strong></div>
      </div>
      <div class="toolchain-boundary">
        <p><strong>Boundary:</strong> GNU assembler and linker turn emitted text into the executable binary.</p>
        <RouterLink to="/projects/armv8-emulator-assembler">
          Our ARMv8 Emulator &amp; Assembler <ArrowUpRight :size="15" />
          <small>A separate educational implementation of this neighbouring stage</small>
        </RouterLink>
      </div>
    </div>

    <div v-else class="runtime-shell" :class="{ 'runtime-shell--gc': gcEnabled }">
      <div class="runtime-toolbar">
        <span><Cpu :size="15" /> AArch64 process</span>
        <button v-if="gcEnabled" type="button" @click="$emit('replay')"><RotateCcw :size="14" /> Replay 16s cycle</button>
      </div>
      <div class="runtime-timeline" aria-label="Runtime collection phases">
        <span v-for="(phase, index) in runtimePhases" :key="phase" :style="{ '--phase': index }">{{ phase }}</span>
        <i v-if="gcEnabled" aria-hidden="true"></i>
      </div>
      <div class="runtime-canvas">
        <section class="runtime-stack">
          <p class="runtime-label">Stack roots</p>
          <div class="runtime-frame"><span>main()</span><code>x19 → A</code></div>
          <div class="runtime-frame"><span>work()</span><code>x20 → C</code></div>
          <svg v-if="gcEnabled" class="runtime-root-lines" viewBox="0 0 420 220" preserveAspectRatio="none" aria-hidden="true">
            <path d="M20 55 C150 55 210 40 395 45" />
            <path d="M20 145 C150 145 220 150 395 165" />
          </svg>
        </section>
        <section class="generation generation--young">
          <header><span>Young generation</span><small>frequent minor collections</small></header>
          <div class="generation-space">
            <span class="runtime-object object-a">A<small>live</small></span>
            <span class="runtime-object object-b">B<small>dead</small></span>
            <span class="runtime-object object-c">C<small>live</small></span>
            <span class="runtime-object object-d">D<small>dead</small></span>
            <span class="runtime-object object-e">E<small>new</small></span>
          </div>
        </section>
        <section class="generation generation--old">
          <header><span>Old generation</span><small>promoted survivors</small></header>
          <div class="generation-space">
            <span class="runtime-object old-object old-object-1">P<small>old</small></span>
            <span class="runtime-object old-object old-object-2">Q<small>old</small></span>
            <span v-if="gcEnabled" class="runtime-object promoted-object">A<small>promoted</small></span>
          </div>
        </section>
        <div v-if="gcEnabled" class="world-pause"><Pause :size="18" /><strong>stop the world</strong><small>trace → mark → sweep</small></div>
        <div v-else class="no-gc-warning"><Play :size="14" /><span>running · unreachable objects accumulate</span></div>
      </div>
      <p class="runtime-accuracy">Roots are found from stack maps; unreachable heap objects are reclaimed. Survivors age into the old generation.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, type PropType } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, ArrowUpRight, Check, Cpu, MapPin, Pause, Play, Recycle, RotateCcw, Wrench } from 'lucide-vue-next'

const props = defineProps<{ stageId: string; gcEnabled: boolean; cycle: number }>()
defineEmits<{ replay: [] }>()

const sourceCode = `begin
  pair(int, int) stats = newpair(42, 6);
  int total = fst stats + snd stats;
  println total
end`

const assemblyCode = `.text
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
  ret`

const assemblyGcCode = `.text
.global main
main:
  stp  x29, x30, [sp, #-32]!
  str  x19, [sp, #16]
  mov  w0, #8
  bl   gc_alloc            // GC widget: allocate in young heap
  mov  x19, x0             // preserve the live pointer
  .stackmap .Lsp0, x19     // GC widget: root metadata
.Lsp0:
  bl   gc_poll             // GC widget: safe point
  ldp  w1, w2, [x19]
  add  w0, w1, w2
  bl   println_i
  ldr  x19, [sp, #16]
  ldp  x29, x30, [sp], #32
  ret`

const astNodes = [
  { label: 'Program', kind: 'root', x: 50, y: 5 },
  { label: 'Sequence', kind: 'sequence', x: 50, y: 21 },
  { label: 'Declare stats', kind: 'statement', x: 20, y: 41 },
  { label: 'NewPair', kind: 'expression', x: 20, y: 60 },
  { label: '42', value: 'int', kind: 'literal', x: 8, y: 80 },
  { label: '6', value: 'int', kind: 'literal', x: 30, y: 80 },
  { label: 'Declare total', kind: 'statement', x: 52, y: 41 },
  { label: 'Add', kind: 'expression', x: 52, y: 60 },
  { label: 'fst stats', kind: 'expression', x: 44, y: 80 },
  { label: 'snd stats', kind: 'expression', x: 62, y: 80 },
  { label: 'Println', kind: 'statement', x: 82, y: 41 },
  { label: 'total', kind: 'identifier', x: 82, y: 65 },
]

const astEdges = [
  'M500 55 L500 112',
  'M500 142 C500 175 200 170 200 210',
  'M500 142 L520 210',
  'M500 142 C500 175 820 170 820 210',
  'M200 242 L200 300',
  'M200 330 C200 360 80 360 80 392',
  'M200 330 C200 360 300 360 300 392',
  'M520 242 L520 300',
  'M520 330 C520 360 440 360 440 392',
  'M520 330 C520 360 620 360 620 392',
  'M820 242 L820 322',
]

const tacBlocks = [
  { name: 'entry', lines: ['t0 = alloc_pair 8', 'store [t0 + 0], 42', 'store [t0 + 4], 6'] },
  { name: 'pair.read', lines: ['t1 = load [t0 + 0]', 't2 = load [t0 + 4]'] },
  { name: 'sum', lines: ['t3 = add t1, t2'] },
  { name: 'exit', lines: ['call println_i, t3', 'return 0'] },
]

type LoweredBlock = { id: string; kind: string; label: string; detail: string; gc?: boolean }

const baseLoweredBlocks: LoweredBlock[] = [
  { id: 'frame', kind: 'frame', label: 'open frame', detail: 'reserve 16 bytes' },
  { id: 'alloc', kind: 'call', label: 'malloc(8)', detail: 'result → v1' },
  { id: 'stores', kind: 'memory', label: 'store pair fields', detail: '#42 · #6' },
  { id: 'loads', kind: 'memory', label: 'load pair fields', detail: 'v2 · v3' },
  { id: 'add', kind: 'alu', label: 'add v4, v2, v3', detail: 'virtual registers' },
  { id: 'print', kind: 'call', label: 'println_i(v4)', detail: 'runtime call' },
]

const gcLoweredBlocks: LoweredBlock[] = [
  { id: 'frame', kind: 'frame', label: 'open frame', detail: 'reserve 32 bytes' },
  { id: 'gc-alloc', kind: 'GC widget', label: 'gc_alloc(8)', detail: 'young generation', gc: true },
  { id: 'gc-root', kind: 'GC widget', label: 'preserve root', detail: 'v1 → x19', gc: true },
  { id: 'stores', kind: 'memory', label: 'store pair fields', detail: '#42 · #6' },
  { id: 'gc-map', kind: 'GC widget', label: 'emit stack map', detail: '.Lsp0 roots={x19}', gc: true },
  { id: 'gc-poll', kind: 'GC widget', label: 'safe-point poll', detail: 'collector may pause', gc: true },
  { id: 'loads', kind: 'memory', label: 'load pair fields', detail: 'v2 · v3' },
  { id: 'add', kind: 'alu', label: 'add v4, v2, v3', detail: 'virtual registers' },
  { id: 'print', kind: 'call', label: 'println_i(v4)', detail: 'runtime call' },
]

const loweredBlocks = computed(() => (props.gcEnabled ? gcLoweredBlocks : baseLoweredBlocks))

const runtimePhases = ['allocate', 'minor GC', 'trace roots', 'mark', 'sweep', 'promote', 'resume']

type CodeEditorProps = { filename: string; language: string; code: string }
const CodeEditor = defineComponent({
  props: {
    filename: { type: String, required: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
  },
  setup(editorProps: CodeEditorProps) {
    const lines = computed(() => editorProps.code.split('\n').map((line, index) => ({ number: index + 1, html: highlight(line, editorProps.language) })))
    return () => h('div', { class: 'code-editor' }, [
      h('div', { class: 'code-editor__chrome' }, [h('span', { class: 'code-editor__dots' }, [h('i'), h('i'), h('i')]), h('span', editorProps.filename), h('span', { class: 'code-editor__language' }, editorProps.language)]),
      h('div', { class: 'code-editor__body' }, [
        h('div', { class: 'code-editor__gutter', 'aria-hidden': 'true' }, lines.value.map((line) => h('span', line.number))),
        h('pre', [h('code', lines.value.map((line) => h('span', { class: 'code-editor__line', style: { '--line': line.number }, innerHTML: line.html })))]),
      ]),
    ])
  },
})

type IrBlockData = { name: string; lines: string[] }
const IrBlock = defineComponent({
  props: {
    block: { type: Object as PropType<IrBlockData>, required: true },
    index: { type: Number, required: true },
  },
  setup(blockProps) {
    return () => h('div', { class: 'ir-block', style: { '--block-delay': `${blockProps.index * 220}ms` } }, [
      h('strong', blockProps.block.name),
      ...blockProps.block.lines.map((line) => h('code', line)),
    ])
  },
})

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(line: string, language: string) {
  const escaped = escapeHtml(line)
  const commentPrefix = language === 'AARCH64' ? '\\/\\/' : '(?!)'
  const keywords = ['begin', 'end', 'pair', 'int', 'newpair', 'fst', 'snd', 'println', 'global', 'main'].join('|')
  const registers = '\\b(?:x(?:[0-9]|[12][0-9]|30)|w(?:[0-9]|[12][0-9]|30)|sp|lr)\\b'
  const pattern = new RegExp(`(${commentPrefix}.*$)|(\\b(?:${keywords})\\b)|(\\b(?:0x[0-9a-fA-F]+|\\d+)\\b)|(${registers})`, 'g')
  return escaped.replace(pattern, (match: string, comment?: string, keyword?: string, number?: string, register?: string) => {
    const tokenClass = comment ? 'token-comment' : keyword ? 'token-keyword' : number ? 'token-number' : register ? 'token-register' : ''
    return tokenClass ? `<span class="${tokenClass}">${match}</span>` : match
  })
}
</script>

<style scoped>
.stage-visual {
  min-height: 470px;
  overflow: hidden;
  border: 1px solid var(--sleek-rule);
  border-radius: 7px;
  background: #111714;
  color: #d9e1db;
  box-shadow: 0 24px 70px color-mix(in srgb, #000 22%, transparent);
}

.visual-note,
.runtime-accuracy {
  min-height: 48px;
  padding: 14px 18px;
  border-top: 1px solid #2a342e;
  background: #171e1a;
  color: #829087;
  font: 10px/1.6 'JetBrains Mono', monospace;
}

.diagram-toolbar,
.runtime-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid #2a342e;
  background: #171e1a;
  font: 10px 'JetBrains Mono', monospace;
}

.diagram-toolbar small { color: #718078; }

.code-editor__chrome {
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

.code-editor__dots { display: flex; gap: 6px; }
.code-editor__dots i { width: 8px; height: 8px; border-radius: 50%; background: #4c5851; }
.code-editor__dots i:first-child { background: #e27662; }
.code-editor__dots i:nth-child(2) { background: #ddb858; }
.code-editor__dots i:last-child { background: #72af87; }
.code-editor__language { justify-self: end; color: #6f7d74; }

.code-editor__body {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  min-height: 380px;
  max-height: 470px;
  overflow: auto;
  padding: 24px 0;
}

.code-editor__gutter { display: flex; flex-direction: column; align-items: flex-end; padding-right: 14px; border-right: 1px solid #253029; color: #56635b; font: 12px/1.72 'JetBrains Mono', monospace; }
.code-editor__body pre { min-width: max-content; margin: 0; padding: 0 22px; font: 13px/1.72 'JetBrains Mono', monospace; }
.code-editor__line { display: block; min-height: 1.72em; white-space: pre; animation: source-line-arrive .75s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--line) * 110ms); }
:global(.stage-forward-leave-active) .stage-visual--source .code-editor__line { animation: source-break-left .7s cubic-bezier(.4,0,.8,.3) both; animation-delay:calc(var(--line) * 35ms); }
:global(.stage-forward-leave-active) .stage-visual--source .code-editor__line:nth-child(even) { animation-name:source-break-right; }
:deep(.token-keyword) { color: #7ea7ff; }
:deep(.token-number) { color: #f08a73; }
:deep(.token-register) { color: #78b997; }
:deep(.token-comment) { color: #69776f; font-style: italic; }

.ast-canvas,
.type-canvas {
  position: relative;
  height: 470px;
  overflow: hidden;
  background-image: radial-gradient(#2a352e 1px, transparent 1px);
  background-size: 24px 24px;
}

.graph-edges,
.type-arrows { position: absolute; inset: 0; width: 100%; height: 100%; }
.graph-edges path { fill: none; stroke: #53645a; stroke-width: 2; stroke-dasharray: 800; stroke-dashoffset: 800; animation: draw-edge 1.1s ease forwards; animation-delay: var(--edge-delay); }
.graph-node { position: absolute; min-width: 110px; padding: 9px 12px; border: 1px solid #44534a; border-radius: 5px; background: #171e1a; transform: translate(-50%, -50%) scale(.65); opacity: 0; animation: node-pop .7s cubic-bezier(.2,.9,.2,1.25) forwards; animation-delay: var(--node-delay); }
.graph-node small { display: block; color: #718078; font: 8px 'JetBrains Mono', monospace; text-transform: uppercase; }
.graph-node strong { display: block; margin-top: 3px; font: 600 11px Manrope, sans-serif; }
.graph-node span { color: #f08a73; font: 9px 'JetBrains Mono', monospace; }
.graph-node--root { border-color: #7ea7ff; }
.graph-node--statement { border-color: #78b997; }
.graph-node--expression { border-color: #9c7de0; }

.type-legend { display: flex; align-items: center; gap: 7px; color: #718078; font-size: 8px; }
.type-legend i { width: 22px; height: 2px; }
.type-legend .expects { background: #7ea7ff; }
.type-legend .infers { background: #78b997; }
.type-arrows path { fill: none; stroke-width: 2.5; stroke-dasharray: 8 8; }
.type-arrows marker path { stroke: none; }
.expect-flow { stroke: #7ea7ff; animation: type-flow-down 4.8s linear infinite; }
.infer-flow { stroke: #78b997; animation: type-flow-up 4.8s 2.4s linear infinite; }
#arrow-expect path { fill: #7ea7ff; }
#arrow-infer path { fill: #78b997; }
.type-node { position: absolute; display: grid; min-width: 170px; padding: 12px 15px; border: 1px solid #46554b; border-radius: 5px; background: #171e1a; transform: translate(-50%, -50%); font: 10px 'JetBrains Mono', monospace; }
.type-node small { color: #7ea7ff; }
.type-node span { margin-top: 6px; color: #78b997; }
.type-node--root { left: 50%; top: 17%; }
.type-node--left { left: 30%; top: 50%; }
.type-node--right { left: 70%; top: 50%; }
.type-node--leaf-left { left: 30%; top: 82%; }
.type-node--leaf-right { left: 70%; top: 82%; }
.type-verdict { position: absolute; right: 18px; top: 18px; display: flex; align-items: center; gap: 7px; color: #78b997; font: 9px 'JetBrains Mono', monospace; }

.cfg-canvas { min-height: 470px; padding: 74px 28px; display: flex; align-items: center; justify-content: center; gap: 13px; overflow-x: auto; background-image: linear-gradient(90deg, transparent 49%, #202a24 50%, transparent 51%); background-size: 48px 100%; }
.ir-block { flex: 0 0 185px; min-height: 190px; padding: 15px; border: 1px solid #47574d; border-radius: 5px; background: #171e1a; opacity: 0; transform: translateY(-50px) rotate(-2deg); animation: flatten-block .85s cubic-bezier(.2,.8,.2,1) forwards; animation-delay: var(--block-delay); }
.ir-block strong { display: block; margin-bottom: 14px; color: #7ea7ff; font: 10px 'JetBrains Mono', monospace; }
.ir-block code { display: block; padding: 7px 0; border-top: 1px solid #2a342e; color: #c7d1ca; font: 9px/1.4 'JetBrains Mono', monospace; }
.cfg-arrow { display: grid; place-items: center; color: #78b997; opacity: 0; animation: arrow-arrive .55s ease forwards; animation-delay: var(--block-delay); }
.cfg-arrow small { font: 7px 'JetBrains Mono', monospace; text-transform: uppercase; }

.lowering-canvas { display: grid; grid-template-columns: 210px 90px minmax(0,1fr); gap: 22px; align-items: center; min-height: 470px; padding: 34px; }
.lowering-input { display: grid; gap: 10px; padding: 16px; border: 1px solid #47574d; background: #171e1a; }
.lowering-input span { color: #7ea7ff; font: 8px 'JetBrains Mono', monospace; text-transform: uppercase; }
.lowering-input strong { font: 9px 'JetBrains Mono', monospace; }
.lowering-expander { display: grid; place-items: center; gap: 10px; color: #718078; font: 8px/1.4 'JetBrains Mono', monospace; text-align: center; }
.lowering-expander i { width: 60px; height: 1px; background: #78b997; position: relative; }
.lowering-expander i::after { content:''; position:absolute; right:0; top:-3px; border-left:6px solid #78b997; border-top:3px solid transparent; border-bottom:3px solid transparent; }
.lowered-blocks { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 9px; }
.lowered-block { position: relative; display: grid; align-content: center; min-height: 92px; padding: 11px; border: 1px solid #46554b; background: #171e1a; animation: expand-block .75s cubic-bezier(.2,.8,.2,1) both; animation-delay: var(--block-delay); }
.lowered-block span { color: #718078; font: 7px 'JetBrains Mono', monospace; text-transform: uppercase; }
.lowered-block strong { margin-top: 5px; font-size: 10px; }
.lowered-block small { margin-top: 4px; color: #819087; font: 8px 'JetBrains Mono', monospace; }
.lowered-block > svg { position: absolute; right: 8px; top: 8px; }
.lowered-block--gc { border-color: #3f7d64; color: #78b997; background: #15221b; }
.inject-enter-active,.inject-leave-active { transition: all .75s cubic-bezier(.2,.8,.2,1); }
.inject-enter-from { opacity:0; transform:scale(.6) translateY(-30px); }
.inject-leave-to { opacity:0; transform:scale(.6) translateY(30px); }

.assembly-widgets { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid #2a342e; background:#15221b; }
.assembly-widgets span { display:flex; align-items:center; gap:8px; padding:12px; border-right:1px solid #2a342e; color:#8eb89c; font:8px/1.4 'JetBrains Mono',monospace; }
.assembly-widgets code { color:#78b997; }

.binary-conveyor { min-height:390px; display:grid; grid-template-columns:1fr 70px .8fr 70px 1fr; gap:15px; align-items:center; padding:42px; }
.conveyor-packet,.assembler-machine { display:grid; gap:10px; padding:18px; border:1px solid #46554b; background:#171e1a; animation:packet-arrive .9s ease both; }
.conveyor-packet small,.assembler-machine small { color:#718078; font:8px 'JetBrains Mono',monospace; }
.conveyor-packet strong { font:10px 'JetBrains Mono',monospace; }
.byte-packet { animation-delay:1.8s; border-color:#7ea7ff; }
.assembler-machine { place-items:center; text-align:center; animation-delay:.9s; }
.assembler-machine svg { color:#ddb858; }
.conveyor-arrow { display:flex; align-items:center; color:#78b997; overflow:hidden; }
.conveyor-arrow span { flex:1; height:1px; background:#78b997; transform-origin:left; animation:conveyor-line .8s .6s ease both; }
.toolchain-boundary { display:grid; grid-template-columns:1fr auto; gap:25px; align-items:center; padding:15px 18px; border-top:1px solid #2a342e; background:#171e1a; font:9px/1.5 'JetBrains Mono',monospace; }
.toolchain-boundary p { color:#829087; }
.toolchain-boundary a { display:grid; grid-template-columns:1fr auto; gap:3px 7px; color:#7ea7ff; text-decoration:none; }
.toolchain-boundary a small { grid-column:1/-1; color:#718078; font-size:7px; }

.runtime-toolbar button,.runtime-toolbar > span { display:flex; align-items:center; gap:7px; }
.runtime-toolbar button { border:0; background:transparent; color:#7ea7ff; font:inherit; cursor:pointer; }
.runtime-timeline { position:relative; display:grid; grid-template-columns:repeat(7,1fr); gap:4px; padding:13px 16px; border-bottom:1px solid #2a342e; }
.runtime-timeline span { position:relative; z-index:1; padding:6px 3px; color:#647168; font:7px 'JetBrains Mono',monospace; text-align:center; text-transform:uppercase; }
.runtime-shell--gc .runtime-timeline span { animation:phase-highlight 16s linear infinite; animation-delay:calc(var(--phase) * 2s); }
.runtime-timeline i { position:absolute; left:16px; bottom:0; width:calc(100% - 32px); height:2px; background:#78b997; transform-origin:left; animation:runtime-progress 16s linear infinite; }
.runtime-canvas { position:relative; display:grid; grid-template-columns:.72fr 1fr 1fr; min-height:390px; }
.runtime-stack,.generation { position:relative; padding:18px; border-right:1px solid #2a342e; overflow:hidden; }
.runtime-label,.generation header { color:#718078; font:8px 'JetBrains Mono',monospace; text-transform:uppercase; }
.generation header { display:grid; gap:3px; }
.generation header small { color:#536159; font-size:7px; text-transform:none; }
.runtime-frame { display:grid; gap:5px; margin-top:14px; padding:12px; border:1px solid #46554b; background:#171e1a; font:9px 'JetBrains Mono',monospace; }
.runtime-frame code { color:#78b997; }
.runtime-root-lines { position:absolute; z-index:3; left:55%; top:45px; width:210%; height:230px; pointer-events:none; overflow:visible; }
.runtime-root-lines path { fill:none; stroke:#78b997; stroke-width:2; stroke-dasharray:10 8; opacity:0; animation:root-trace 16s linear infinite; }
.generation-space { position:relative; min-height:300px; margin-top:13px; border:1px dashed #344139; background:#0f1411; }
.runtime-object { position:absolute; display:grid; place-items:center; width:48px; height:48px; border:1px solid #7a4f47; border-radius:50%; background:#39231f; color:#f08a73; font:10px 'JetBrains Mono',monospace; opacity:0; animation:young-object-cycle 16s linear infinite; }
.runtime-object small { display:block; font-size:6px; color:#b58379; }
.object-a { left:12%; top:18%; animation-delay:0s; }
.object-b { left:56%; top:12%; animation-delay:.7s; }
.object-c { left:30%; top:58%; animation-delay:1.4s; }
.object-d { left:68%; top:55%; animation-delay:2.1s; }
.object-e { left:48%; top:35%; animation-delay:2.8s; }
.object-a,.object-c { border-color:#4e8060; background:#1c3627; color:#78b997; }
.old-object { opacity:1; border-color:#586478; background:#202735; color:#9cadd0; animation:none; }
.old-object-1 { left:15%; top:24%; }
.old-object-2 { left:58%; top:55%; }
.promoted-object { left:55%; top:18%; border-color:#78b997; background:#1c3627; color:#78b997; animation:promote-object 16s linear infinite; }
.world-pause { position:absolute; z-index:5; left:50%; top:50%; display:grid; place-items:center; gap:3px; width:170px; padding:14px; border:1px solid #f08a73; background:rgba(17,23,20,.94); color:#f08a73; transform:translate(-50%,-50%); opacity:0; animation:world-pause 16s linear infinite; font:8px 'JetBrains Mono',monospace; text-transform:uppercase; }
.world-pause small { color:#a6786e; }
.no-gc-warning { position:absolute; left:50%; bottom:18px; display:flex; align-items:center; gap:7px; padding:8px 11px; border:1px solid #795e41; background:#211b14; color:#ddb858; transform:translateX(-50%); font:8px 'JetBrains Mono',monospace; }

@keyframes source-line-arrive { from{opacity:0;transform:translateX(-22px)} to{opacity:1;transform:none} }
@keyframes source-break-left { to{opacity:0;transform:translate(-70px,22px) rotate(-2deg) scale(.9)} }
@keyframes source-break-right { to{opacity:0;transform:translate(80px,-18px) rotate(2deg) scale(.9)} }
@keyframes draw-edge { to{stroke-dashoffset:0} }
@keyframes node-pop { to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
@keyframes type-flow-down { from{stroke-dashoffset:90} to{stroke-dashoffset:0} }
@keyframes type-flow-up { from{stroke-dashoffset:-90} to{stroke-dashoffset:0} }
@keyframes flatten-block { to{opacity:1;transform:none} }
@keyframes arrow-arrive { to{opacity:1} }
@keyframes expand-block { from{opacity:0;transform:scale(.65)} to{opacity:1;transform:none} }
@keyframes packet-arrive { from{opacity:0;transform:translateX(-35px)} to{opacity:1;transform:none} }
@keyframes conveyor-line { from{transform:scaleX(0)} to{transform:scaleX(1)} }
@keyframes phase-highlight { 0%,12%{color:#f1f4f0;background:#26342c} 18%,100%{color:#647168;background:transparent} }
@keyframes runtime-progress { from{transform:scaleX(0)} to{transform:scaleX(1)} }
@keyframes root-trace { 0%,27%{opacity:0;stroke-dashoffset:120} 32%,52%{opacity:1;stroke-dashoffset:0} 60%,100%{opacity:0} }
@keyframes young-object-cycle { 0%,4%{opacity:0;transform:scale(.4)} 12%,48%{opacity:1;transform:scale(1)} 60%,88%{opacity:0;transform:scale(.55)} 100%{opacity:0} }
@keyframes promote-object { 0%,50%{opacity:0;transform:translate(-180px,120px) scale(.5)} 62%,88%{opacity:1;transform:none} 100%{opacity:0} }
@keyframes world-pause { 0%,25%{opacity:0;transform:translate(-50%,-50%) scale(.9)} 30%,62%{opacity:1;transform:translate(-50%,-50%) scale(1)} 68%,100%{opacity:0;transform:translate(-50%,-50%) scale(.95)} }

@media(max-width:800px){
  .ast-canvas,.type-canvas{height:430px;overflow:auto}
  .graph-node{min-width:90px;padding:7px;font-size:9px}
  .cfg-canvas{justify-content:flex-start}
  .lowering-canvas{grid-template-columns:1fr;gap:14px;padding:20px}
  .lowering-input{display:none}.lowering-expander{display:none}
  .lowered-blocks{grid-template-columns:repeat(2,1fr)}
  .binary-conveyor{grid-template-columns:1fr 45px 1fr;padding:25px}.binary-conveyor .conveyor-arrow:nth-of-type(2),.byte-packet{display:none}
  .toolchain-boundary{grid-template-columns:1fr}
  .runtime-canvas{grid-template-columns:1fr 1fr}.runtime-stack{display:none}
}

@media(max-width:560px){
  .stage-visual--ast .diagram-shell,.stage-visual--types .diagram-shell{overflow-x:auto}
  .diagram-toolbar{align-items:flex-start;flex-direction:column;justify-content:center;gap:4px;padding:8px 12px}
  .type-legend{display:none}
  .ast-canvas{min-width:720px}.type-canvas{min-width:620px}
  .code-editor__body{grid-template-columns:42px minmax(0,1fr);min-height:350px}.code-editor__body pre{padding:0 14px;font-size:11px}.code-editor__gutter{padding-right:10px;font-size:11px}
  .assembly-widgets{grid-template-columns:1fr}.assembly-widgets span{border-right:0;border-bottom:1px solid #2a342e}
  .binary-conveyor{grid-template-columns:1fr;gap:12px}.conveyor-arrow{transform:rotate(90deg);justify-self:center;width:40px}.assembler-machine{min-height:120px}
  .runtime-timeline{grid-template-columns:repeat(7,82px);overflow-x:auto}.runtime-canvas{grid-template-columns:1fr}.generation{border-right:0;border-bottom:1px solid #2a342e}.generation-space{min-height:230px}
}

@media(prefers-reduced-motion:reduce){
  .code-editor__line,.graph-edges path,.graph-node,.expect-flow,.infer-flow,.ir-block,.cfg-arrow,.lowered-block,.conveyor-packet,.assembler-machine,.conveyor-arrow span,.runtime-timeline span,.runtime-timeline i,.runtime-root-lines path,.runtime-object,.promoted-object,.world-pause{animation:none!important;opacity:1!important;transform:none!important}
  .world-pause{display:none}.runtime-object{position:relative;display:inline-grid;left:auto;top:auto;margin:8px}.generation-space{padding:12px}
}
</style>
