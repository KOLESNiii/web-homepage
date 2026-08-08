/**
 * Single source of truth for every piece of content on the site.
 * Edit here — no component hard-codes copy.
 */

/* =========================================================================
   Line palette
   -------------------------------------------------------------------------
   Official TfL line colours. A line is one colour along its whole length —
   nothing on this site draws a single track in two colours.

   The colours themselves live in style.css as `--tube-<key>`, because the
   small-text variant (`--tube-<key>-ink`) has to change between the paper and
   Night Tube grounds and the thick-stroke one does not. `hex` is kept here
   only for the canvas, which resolves the variables itself.
   ========================================================================= */

export interface Line {
  /** Official TfL hex, for reference — components should use `lineColour`. */
  hex: string
  name: string
}

export const lines = {
  central: { hex: '#E32017', name: 'Central' },
  victoria: { hex: '#0098D4', name: 'Victoria' },
  district: { hex: '#00782A', name: 'District' },
  circle: { hex: '#FFD300', name: 'Circle' },
  bakerloo: { hex: '#B36305', name: 'Bakerloo' },
  metropolitan: { hex: '#9B0056', name: 'Metropolitan' },
  elizabeth: { hex: '#6950A1', name: 'Elizabeth' },
  piccadilly: { hex: '#003688', name: 'Piccadilly' },
  overground: { hex: '#EE7C0E', name: 'Overground' },
  dlr: { hex: '#00AFAD', name: 'DLR' },
  jubilee: { hex: '#A0A5A9', name: 'Jubilee' },
  hammersmith: { hex: '#F3A9BB', name: 'Hammersmith & City' },
  waterloo: { hex: '#95CDBA', name: 'Waterloo & City' },
} as const satisfies Record<string, Line>

export type LineKey = keyof typeof lines

/** Thick strokes, bands, fills: the official colour, on either ground. */
export const lineColour = (key: LineKey) => `var(--tube-${key})`
/** Small text and hairlines: the variant that survives the current ground. */
export const lineInk = (key: LineKey) => `var(--tube-${key}-ink)`

/** A line of the site: one section, one colour, one run of the map. */
export interface SectionLine {
  id: string
  label: string
  /** The full name as the legend prints it. */
  line: LineKey
  /** How many platforms it calls at — one panel each. */
  stops: number
  /** The main direction of this content corridor on the overview map. */
  orientation?: 'vertical' | 'horizontal'
  /**
   * Set where a stop is a name rather than a panel. Names need only a line of
   * room, so the line calls at several a screen, the way an inner-city stretch
   * does — panels need a screen each.
   */
  close?: true
}

/* =========================================================================
   Profile
   ========================================================================= */

export const profile = {
  name: 'Timofey Kolesnichenko',
  shortName: 'Tim',
  initials: 'TK',
  role: 'Software Engineer',
  place: 'Imperial College London',
  tagline: 'Compilers, kernels and interfaces — the whole line, end to end.',
  email: 'timkolesnichenko05@gmail.com',
  github: 'https://github.com/KOLESNiii',
  linkedin: 'https://www.linkedin.com/in/tim-kolesnichenko',
  /** Served from public/cv.pdf. */
  cv: '/cv.pdf',
  degree: 'MEng Computing',
  graduates: 'June 2028',
}

export const contact = {
  heading: 'Open to graduate roles.',
  status: 'Good service',
  // TODO: confirm the intake wording once you know which cycle you're applying in.
  note: `Graduating in 2028 and applying through the 2027 cycle. I'm after teams working close to
   the metal — compilers, systems, infrastructure — or on interfaces people actually enjoy using.
   If that sounds like yours, I'd like to hear about it.`,
}

export const about = [
  `I'm a second-year Computing student at Imperial College London with a bias toward the parts of
   a system most people never see: the register allocator underneath the compiler, the eviction
   policy underneath the kernel, the recommendation loop underneath the recipe.`,
  `Most of what I've built has been built with other people — a compiler team, an OS group, a
   product team doing real user research. I care about work that is correct at the bottom and
   legible at the top, and I'd rather ship something small that holds up than something large
   that doesn't.`,
]

/* =========================================================================
   Academic record
   ========================================================================= */

export interface Module {
  code?: string
  title: string
  mark: number | string
  grade?: string
  registrationStatus?: string
}

export interface AcademicResults {
  year: string
  average: number
  classification?: string
  recognition?: string
  modules: Module[]
}

export const academics: AcademicResults = {
  year: 'Year 2',
  average: 80.81,
  classification: 'First Class',
  recognition: 'Dean’s List · Top 10% of cohort',
  modules: [
    { code: 'COMP50008', title: 'Probability and Statistics', mark: 87.34 },
    { code: 'COMP50002', title: 'Software Engineering Design', mark: 86.84 },
    { code: 'COMP50013', title: 'Machine Learning', mark: 86.59 },
    { code: 'COMP50007', title: 'Computing Practical 2', mark: 82.09 },
    { code: 'COMP50001', title: 'Algorithm Design and Analysis', mark: 82.0 },
    { code: 'COMP50011', title: 'Computational Techniques', mark: 81.5 },
    { code: 'COMP50003', title: 'Models of Computation', mark: 79.49 },
    { code: 'COMP50004', title: 'Operating Systems', mark: 76.98 },
    { code: 'COMP50005', title: 'Networks and Communications', mark: 73.6 },
    { code: 'COMP50010', title: 'Designing for Real People', mark: 69.15 },
  ] satisfies Module[],
}

export const firstYearAcademics: AcademicResults = {
  year: 'Year 1',
  average: 86.38,
  classification: 'First Class',
  recognition: 'Dean’s List · Top 10% of cohort',
  modules: [
    {
      title: 'Introduction to Computer Systems',
      mark: 98.13,
    },
    {
      title: 'Graphs and Algorithms',
      mark: 93.33,
    },
    {
      title: 'Computing Practical 1',
      mark: 92.59,
    },
    {
      title: 'Linear Algebra',
      mark: 85.75,
    },
    {
      title: 'Discrete Mathematics, Logic and Reasoning',
      mark: 85.67,
    },
    {
      title: 'Introduction to Databases',
      mark: 83.34,
    },
    {
      title: 'Calculus',
      mark: 69.75,
    },
    {
      title: 'Introduction to Computer Architecture',
      mark: 64.5,
    },
    {
      title: 'Introduction to Philosophy',
      mark: 'Pass with Distinction',
      registrationStatus: 'Registered for extra credit',
    },
  ],
}

/* =========================================================================
   Timeline
   ========================================================================= */

export interface TimelineEntry {
  period: string
  title: string
  org: string
  detail: string
  kind: 'education' | 'work'
  /** Renders the white interchange circle instead of a plain station dash. */
  interchange?: boolean
}

export const timeline: TimelineEntry[] = [
  {
    period: 'Summer 2026 — Present',
    title: 'Software Engineering Intern',
    org: 'LCP Delta · Tech & Data (AI Innovation)',
    detail:
      'Building an agentic web scraper that can be pointed at arbitrary datasets and work out how to extract them, rather than being hand-written per source.',
    kind: 'work',
    interchange: true,
  },
  {
    period: 'Feb 2025 — Present',
    title: 'Data Cleanser',
    org: 'The River Restoration Centre',
    detail:
      'Rebuilt a legacy Microsoft Access database end to end — data structures, UI overhaul and workflow streamlining — working with the manager on requirements while owning design, implementation and testing.',
    kind: 'work',
  },
  {
    period: 'Sept 2024 — June 2028',
    title: 'MEng Computing',
    org: 'Imperial College London',
    detail:
      'Year 2 average 80.81% (First Class) and Year 1 average 86.38% — both on the Dean’s List (top 10% of cohort). Operating systems, compilers, machine learning, networks and human-centred design.',
    kind: 'education',
    interchange: true,
  },
  {
    period: 'Aug 2023',
    title: 'Data Science Intern',
    org: 'Hartree Centre, STFC',
    detail:
      'Worked with a team identifying re-identifying PII combinations in the National Survey dataset, then wrote up and presented the findings to the Data Science group.',
    kind: 'work',
  },
  {
    period: '2017 — 2024',
    title: 'A Levels & GCSEs',
    org: 'Altrincham Grammar School for Boys',
    detail:
      'A* in Mathematics, Further Mathematics, Computer Science, Physics and Chemistry. Eleven GCSEs at grades 9–8.',
    kind: 'education',
  },
]

/* =========================================================================
   Skills — each group is a line, each item a stop along it
   ========================================================================= */

export interface SkillGroup {
  label: string
  line: LineKey
  items: string[]
}

export const skills: SkillGroup[] = [
  {
    label: 'Languages',
    line: 'central',
    items: ['C', 'Scala', 'Python', 'TypeScript', 'C#', 'Haskell', 'Kotlin', 'Java', 'AArch64 asm'],
  },
  {
    label: 'Frameworks',
    line: 'piccadilly',
    items: ['React', 'Next.js', 'Vue', 'FastAPI', 'Jetpack Compose', 'Flask', 'Keras', 'Unity'],
  },
  {
    label: 'Platforms & tooling',
    line: 'district',
    items: [
      'Linux',
      'Git / GitLab CI',
      'Postgres',
      'Docker',
      'Firebase',
      'Convex',
      'QEMU',
      'Playwright',
    ],
  },
  {
    label: 'Foundations',
    line: 'elizabeth',
    items: [
      'Compilers',
      'Operating systems',
      'Concurrency',
      'Computer architecture',
      'Algorithms',
      'Machine learning',
      'Human-centred design',
    ],
  },
]

/**
 * The Skills line, flattened: one stop per skill, in order, with the group name
 * carried by the first stop of each group the way a map labels a stretch of
 * line. The section renders one of these per platform.
 */
export interface SkillStop {
  item: string
  /** Set on the first stop of a group, blank on the rest. */
  group: string
}

export const skillStops: SkillStop[] = skills.flatMap((group) =>
  group.items.map((item, index) => ({ item, group: index === 0 ? group.label : '' })),
)

/* =========================================================================
   Projects — stations along the Work line, in the order you meet them
   ========================================================================= */

export interface Project {
  title: string
  blurb: string
  description: string
  year: string
  /** Shown as stops along the card's route diagram. */
  tech: string[]
  /** Optional — renders a "Source" link when set. */
  repo?: string
  /** Optional — renders a "Live" link when set. */
  demo?: string
}

export const projects: Project[] = [
  {
    title: 'Fed Up',
    blurb: 'Food planning built around plans failing',
    description:
      'A food planner for students under deadline pressure: give it your budget, your effort ceiling and the week you are dreading, and it proposes a plan you will actually follow — then recalculates the cost and the rest of the week the moment you swap a meal because the day went wrong. A FastAPI service over Postgres and pgvector ranks recipes on taste similarity from sentence-transformer embeddings, ability match, novelty and budget fit, reweighting the lot when you flag a high-stress week. I built the accounts and cross-device session layer, the shopping list, and cost estimation from ingredients.',
    year: '2026',
    tech: ['React', 'TypeScript', 'FastAPI', 'Postgres / pgvector', 'Firebase'],
    repo: 'https://github.com/KOLESNiii/Fed-Up',
  },
  {
    title: 'WACC Compiler',
    blurb: 'A compiler, and a garbage collector under it',
    description:
      'A compiler for the WACC language in Scala: Parsley lexer and parser, renamer and type checker, a three-address IR, and two backends — AArch64 and x86-64, the latter with a greedy register allocator — plus a peephole pass over the emitted assembly. My extension was garbage collection: ~900 lines of C behind stack maps emitted by the compiler, doing a stop-the-world mark and sweep over the walked stack, with generational young and old heaps, promotion and forwarding pointers. I also wrote the constant-folding and control-flow optimisation passes.',
    year: '2026',
    tech: ['Scala', 'Parsley', 'C', 'AArch64', 'x86-64', 'Garbage collection'],
  },
  {
    title: 'PintOS',
    blurb: 'Where the concurrency bugs live',
    description:
      'A term inside a teaching kernel, most of it spent in virtual memory. I worked on the frame table and a global frame table that shares file-backed frames between processes, second-chance clock eviction with swap, reentrant pinning so user buffers survive a syscall, and mmap. Most of the difficulty was concurrency: locking the global frame table against stale reads, a use-after-free where a shared frame outlived the file pointer keying it, and a race between the evictor and the page-fault handler. I also set the CI pipeline up.',
    year: '2025',
    tech: ['C', 'x86', 'QEMU', 'Concurrency', 'Operating Systems'],
  },
  {
    title: 'Roomie',
    blurb: 'Flatmate matching, end to end',
    description:
      'An Android app that matches prospective flatmates and lets the formed group submit a joint rental offer. Built on the Amazon Undergraduate Engagement Programme: I designed the Firestore structures behind profiles, messaging and compatibility scoring, and worked in agile sprints with code review from Amazon engineers.',
    year: '2025',
    tech: ['Kotlin', 'Jetpack Compose', 'Firebase', 'TypeScript'],
    repo: 'https://github.com/dorianturner/Roomie',
  },
  {
    title: 'ARMv8 Emulator & Assembler',
    blurb: 'Silicon, simulated',
    description:
      'An ARMv8 emulator and a two-pass assembler written in C. The emulator decodes and executes the instruction set against a modelled register file and memory; the assembler produces the binaries it runs. Between them they close the loop from source to execution with nothing in the middle you did not write.',
    year: '2025',
    tech: ['C', 'ARMv8 Assembly', 'Systems Programming'],
  },
  {
    title: 'Classy Unit Mixer',
    blurb: 'A cocktail machine that had to work live',
    description:
      'The final stage of the same ARMv8 project, on real hardware: a Raspberry Pi cocktail machine driven by C at the GPIO level, with an I2C LCD, button input, pumps and a custom CAD chassis. I owned the software for that stage, and it was demoed to university staff and Arm engineers in a room where it had to work first time.',
    year: '2025',
    tech: ['C', 'GPIO / I2C', 'CAD', 'Raspberry Pi'],
  },
  {
    title: 'DemocraTune',
    blurb: 'The queue, decided by the room',
    description:
      'A fork of the open-source SongUp queue where the room picks what plays. I wrote the scheduling layer that replaced first-come-first-served: round-robin across contributors, and a variant weighted by each user’s voting record. Also added per-client personal queues, play history and export of that history into a YouTube Music playlist, then moved the FastAPI service out of its nested layout and got it deploying properly behind the Next.js app.',
    year: '2025',
    tech: ['TypeScript', 'Next.js', 'React', 'Convex', 'FastAPI'],
    repo: 'https://github.com/KOLESNiii/DemocraTune',
  },
  {
    title: 'Interview Practice',
    blurb: 'Feedback on how you answer, not just what',
    description:
      'Built at ICHack 2025: a web app that simulates technical interviews with facial-cue detection, live transcription and analytics, so you get feedback on delivery as well as content. Flask backend doing video processing and inference, with results fed back into the front end in real time. Demoed to Helsing engineers and university staff.',
    year: '2025',
    tech: ['Python', 'Flask', 'Keras', 'JavaScript'],
    repo: 'https://github.com/KOLESNiii/ichack25',
  },
  {
    title: 'Guitar Scar',
    blurb: 'Learn guitar by clearing dungeons',
    description:
      'A Unity dungeon crawler with procedurally generated levels, built so that progressing through the game teaches you to actually play the guitar rather than press the right button at the right time.',
    year: '2024',
    tech: ['C#', 'Unity', 'Procedural Generation'],
    repo: 'https://github.com/KOLESNiii/Guitar-Scar',
  },
]

/* =========================================================================
   The lines of the site
   -------------------------------------------------------------------------
   One section, one line, one official colour, end to end. `stops` is how many
   platforms the line calls at, which is how many panels the section renders —
   it is derived from the content above so the two can never disagree.

   The order here is the order of the journey. The network builder composes
   those routes into protected horizontal and vertical content corridors.
   ========================================================================= */

export const sections = [
  { id: 'about', label: 'About', line: 'victoria', stops: 4 },
  {
    id: 'path',
    label: 'Path',
    line: 'central',
    stops: timeline.length + 2,
    orientation: 'horizontal',
  },
  // Every item is its own stop, close together, rather than four panels of lists.
  { id: 'skills', label: 'Skills', line: 'district', stops: skillStops.length, close: true },
  { id: 'work', label: 'Work', line: 'elizabeth', stops: projects.length },
  { id: 'contact', label: 'Contact', line: 'bakerloo', stops: 3, orientation: 'horizontal' },
] as const satisfies readonly SectionLine[]
