<template>
  <div class="portfolio">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-gradient"></div>
      <div class="hero-content">
        <h1 class="hero-title">Tim Kolesnichenko</h1>
        <p class="hero-subtitle">Full Stack Developer</p>
        <div class="hero-divider"></div>
      </div>
      <div class="scroll-indicator">
        <div class="scroll-indicator-inner">
          <div class="scroll-indicator-dot"></div>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section class="about-section">
      <div class="about-content">
        <h2 class="section-title">About Me</h2>
        <p class="about-text">
          I'm a passionate Computing student at Imperial College London with strong software
          engineering and mathematical foundations. Several years of experience in collaborative
          software projects, problem-solving and delivering end-to-end technical solutions.
        </p>
        <p class="about-text">
          My approach combines technical excellence with creative solutions, ensuring every project
          not only functions flawlessly but also delivers an exceptional user experience.
        </p>
        <div class="stats-grid">
          <div class="stat-item">
            <h3 class="stat-number">9</h3>
            <p class="stat-label">Projects</p>
          </div>
          <div class="stat-item">
            <h3 class="stat-number">3+</h3>
            <p class="stat-label">Years Experience</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Projects Wheel Section -->
    <section ref="containerRef" class="projects-section">
      <div class="projects-sticky">
        <div class="projects-container">
          <!-- Project Images Wheel -->
          <div
            v-for="(project, index) in projects"
            :key="index"
            :style="getProjectStyle(index)"
            class="project-image"
          >
            <img :src="project.image" :alt="project.title" />
          </div>

          <!-- Project Description -->
          <div class="project-descriptions">
            <div
              v-for="(project, index) in projects"
              :key="index"
              class="project-description"
              :style="{
                opacity: activeProject === index ? 1 : 0,
                pointerEvents: activeProject === index ? 'auto' : 'none',
              }"
            >
              <h3 class="project-title">{{ project.title }}</h3>
              <p class="project-text">{{ project.description }}</p>
              <div class="project-tech">
                <span v-for="(tech, i) in project.tech" :key="i" class="tech-tag">
                  {{ tech }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p>© 2026 Tim Kolesnichenko. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { CSSProperties } from 'vue'

interface Project {
  title: string
  description: string
  image: string
  tech: string[]
}

const scrollProgress = ref(0)
const activeProject = ref(0)
const containerRef = ref<HTMLElement | null>(null)

const projects = ref<Project[]>([
  {
    title: 'Roomie',
    description: 'Android App to match flatmates and submit joint rental offers.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    tech: ['Kotlin', 'Jetpack Compose', 'Firebase, TypeScript'],
  },
  {
    title: 'ARMv8 Emulator & Assembler',
    description: 'Built an ARMv8 emulator and assembler in C',
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop',
    tech: ['C', 'ARMv8 Assembly'],
  },
  {
    title: 'Classy Unit Mixer',
    description:
      'Cocktail-making machine running on a Raspberry Pi 3B with software in C. Presented to Arm engineers.',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=400&fit=crop',
    tech: ['C', 'CAD', 'Electronics'],
  },
  {
    title: 'Technical Interview Practice App',
    description:
      'Web app with AI-driven facial-cue detection, transcription and analytics to simulate technical interviews and provide instant feedback.',
    image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&h=400&fit=crop',
    tech: ['HTML/CSS', 'JavaScript', 'Python', 'Flask', 'Keras'],
  },
  {
    title: 'Guitar Scar',
    description:
      'Unity dungeon-crawler game with procedurally-generated dungeons designed to help learn guitar playing.',
    image: '',
    tech: ['C#', 'Unity'],
  },
  {
    title: 'PintOS',
    description:
      'Improved a base OS by implementing priority inversion, user programs and virtual memory.',
    image: '',
    tech: ['C', 'QEMU'],
  },
  {
    title: 'DemocraTune',
    description: 'Fork of SongUp, with support for voting and alternate music queues.',
    image: '',
    tech: ['TypeScript', 'React', 'Convex', 'Python', 'FastAPI'],
  },
])

const getProjectStyle = (index: number): CSSProperties => {
  const totalProjects = projects.value.length
  const anglePerProject = (Math.PI * 2) / totalProjects
  const baseAngle = index * anglePerProject
  const rotationOffset = scrollProgress.value * Math.PI * 2
  const angle = baseAngle - rotationOffset

  const radius = 300
  const centerX = window.innerWidth * 0.75
  const centerY = window.innerHeight * 0.5

  const x = centerX + Math.cos(angle - Math.PI) * radius
  const y = centerY + Math.sin(angle - Math.PI) * radius

  const isMain = Math.abs(((angle + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.3
  const scale = isMain ? 1.2 : 0.6
  const opacity = isMain ? 1 : 0.3
  const zIndex = isMain ? 10 : 1

  return {
    position: 'absolute' as const,
    left: `${x}px`,
    top: `${y}px`,
    transform: `translate(-50%, -50%) scale(${scale})`,
    opacity: opacity.toString(),
    zIndex: zIndex.toString(),
    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '280px',
    height: '180px',
  }
}

const handleScroll = () => {
  if (!containerRef.value) return

  const container = containerRef.value
  const rect = container.getBoundingClientRect()
  const windowHeight = window.innerHeight

  const start = rect.top - windowHeight
  const end = rect.bottom
  const progress = Math.max(0, Math.min(1, -start / (end - windowHeight)))

  scrollProgress.value = progress

  const projectIndex = Math.floor(progress * projects.value.length)
  activeProject.value = Math.min(projectIndex, projects.value.length - 1)
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
