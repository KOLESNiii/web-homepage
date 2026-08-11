import { strict as assert } from 'node:assert'
import profileJson from '../public/profile.json' with { type: 'json' }
import { academics, about, contact, firstYearAcademics, profile, projects, skills, timeline } from '../src/data/portfolio'

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()

assert.equal(profileJson.name, profile.name)
assert.equal(profileJson.jobTitle, profile.role)
assert.equal(profileJson.email, profile.email)
assert.deepEqual(profileJson.about.map(normalize), about.map(normalize))
assert.equal(profileJson.availability.heading, contact.heading)
assert.equal(profileJson.availability.status, contact.status)
assert.equal(normalize(profileJson.availability.note), normalize(contact.note))
assert.equal(profileJson.projects.length, projects.length)
assert.deepEqual(profileJson.projects.map((project) => project.title), projects.map((project) => project.title))
assert.deepEqual(profileJson.projects.map((project) => normalize(project.description)), projects.map((project) => normalize(project.description)))
assert.deepEqual(profileJson.skills.map((group) => group.skills), skills.map((group) => group.items))
assert.equal(profileJson.experience.length, timeline.length - 1)
assert.deepEqual(profileJson.experience.map((entry) => entry.title), timeline.filter((entry) => entry.kind === 'work' || entry.title === 'A Levels & GCSEs').map((entry) => entry.title))
assert.equal(academics.modules.length, profileJson.education[0].modules.length)
assert.equal(firstYearAcademics.modules.length, profileJson.education[1].modules.length)

console.log(`Content parity passed: ${projects.length} projects, ${timeline.length} timeline entries, ${academics.modules.length + firstYearAcademics.modules.length} modules.`)
