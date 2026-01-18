<template>
  <div class="portfolio">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-gradient"></div>
      <div class="hero-content">
        <h1 class="hero-title">John Doe</h1>
        <p class="hero-subtitle">Full Stack Developer & Creative Technologist</p>
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
          I'm a passionate developer who crafts digital experiences that merge cutting-edge
          technology with thoughtful design. With over 8 years of experience, I specialize in
          building scalable applications that solve real-world problems.
        </p>
        <p class="about-text">
          My approach combines technical excellence with creative innovation, ensuring every project
          not only functions flawlessly but also delivers an exceptional user experience.
        </p>
        <div class="stats-grid">
          <div class="stat-item">
            <h3 class="stat-number">50+</h3>
            <p class="stat-label">Projects Delivered</p>
          </div>
          <div class="stat-item">
            <h3 class="stat-number">8+</h3>
            <p class="stat-label">Years Experience</p>
          </div>
          <div class="stat-item">
            <h3 class="stat-number">25+</h3>
            <p class="stat-label">Happy Clients</p>
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

    <!-- Contact Section -->
    <section class="contact-section">
      <div class="contact-content">
        <h2 class="section-title">Let's Work Together</h2>
        <p class="contact-text">
          I'm always interested in hearing about new projects and opportunities.
        </p>
        <a href="mailto:hello@johndoe.com" class="contact-button"> Get In Touch </a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p>© 2026 John Doe. All rights reserved.</p>
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
    title: 'E-Commerce Platform',
    description:
      'A modern, scalable e-commerce solution built with microservices architecture. Features real-time inventory management and AI-powered recommendations.',
    image: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=600&h=400&fit=crop',
    tech: ['React', 'Node.js', 'MongoDB'],
  },
  {
    title: 'AI Analytics Dashboard',
    description:
      'Real-time analytics platform leveraging machine learning to provide actionable business insights. Processes millions of data points per second.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    tech: ['Vue.js', 'Python', 'TensorFlow'],
  },
  {
    title: 'Mobile Fitness App',
    description:
      'Cross-platform fitness application with personalized workout plans and nutrition tracking. Used by over 100k active users.',
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop',
    tech: ['React Native', 'Firebase', 'Swift'],
  },
  {
    title: 'Blockchain Wallet',
    description:
      'Secure cryptocurrency wallet with multi-signature support and hardware integration. Manages over $50M in digital assets.',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=400&fit=crop',
    tech: ['TypeScript', 'Web3.js', 'Solidity'],
  },
  {
    title: 'Video Streaming Platform',
    description:
      'Netflix-style streaming service with adaptive bitrate streaming and content delivery optimization across global CDN.',
    image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&h=400&fit=crop',
    tech: ['Next.js', 'AWS', 'Redis'],
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
