/**
 * Fill the demo database with a believable Yarmouk research community, for
 * presenting the platform.
 *
 *   npm run seed:demo
 *   npm run seed:demo -- --db yu-demo-2      (any name containing "demo")
 *
 * It never touches the real data:
 * - It writes only to a database whose name contains "demo", on the cluster
 *   MONGODB_URI points at, and checks the name again after connecting.
 * - Every run empties that database first, so the demo can be reset right
 *   before a presentation.
 * - Every account uses the reserved .test domain, and sendEmail never sends
 *   there, so nothing done in the demo can email a real person.
 *
 * All accounts share one password: DEMO_PASSWORD if set, otherwise a random
 * one printed at the end. Times are relative to the moment it runs, so the
 * activity always looks recent.
 */
import { loadEnvConfig } from '@next/env'
import mongoose, { Types, type Model } from 'mongoose'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { connectDB } from '@/lib/db/connect'
import { User } from '@/lib/db/models/user'
import Project from '@/lib/db/models/Project'
import Task from '@/lib/db/models/Task'
import TaskComment from '@/lib/db/models/TaskComment'
import Message from '@/lib/db/models/Message'
import Notification from '@/lib/db/models/Notification'
import JoinRequest from '@/lib/db/models/JoinRequest'
import ProjectFile from '@/lib/db/models/ProjectFile'
import Conversation, { pairKeyFor, sortedPair } from '@/lib/db/models/Conversation'
import DirectMessage from '@/lib/db/models/DirectMessage'
import PasswordResetToken from '@/lib/db/models/PasswordResetToken'
import type { Department } from '@/lib/departments'
import { DEFAULT_DEMO_DB, demoDatabaseUri } from './demo-env'

loadEnvConfig(process.cwd())

const EMAIL_DOMAIN = 'yu-demo.test'

// ---------------------------------------------------------------- time helpers

const NOW = Date.now()
const MINUTE = 60_000
const ago    = (days: number, hours = 0, minutes = 0) => new Date(NOW - ((days * 24 + hours) * 60 + minutes) * MINUTE)
const inDays = (days: number) => new Date(NOW + days * 24 * 60 * MINUTE)

// ---------------------------------------------------------------- people

type Role = 'Student' | 'Faculty' | 'Staff' | 'Researcher' | 'Admin'

interface Person {
  name:       string
  role:       Role
  department?: Department
  position:   string
  interests:  string[]
  bio:        string
  status?:    'active' | 'pending'
  joined:     Date
}

const PEOPLE = {
  rana: {
    name: 'Dr. Rana Obeidat', role: 'Admin', position: 'Director, Deanship of Scientific Research',
    interests: ['research policy', 'research funding'], joined: ago(120),
    bio: 'Oversees research funding and collaboration across the university.',
  },
  omar: {
    name: 'Prof. Omar Al-Momani', role: 'Faculty', department: 'Faculty of Science', position: 'Professor of Hydrology',
    interests: ['water resources', 'irrigation', 'climate adaptation'], joined: ago(110),
    bio: 'Works on water management for arid regions, with field sites across northern Jordan.',
  },
  laith: {
    name: 'Dr. Laith Bani Hani', role: 'Faculty', department: 'Hijjawi Faculty for Engineering Technology',
    position: 'Associate Professor of Electrical Power Engineering',
    interests: ['renewable energy', 'iot', 'smart grids'], joined: ago(105),
    bio: 'Designs low-cost sensing and solar systems for rural communities.',
  },
  sara: {
    name: 'Sara Haddad', role: 'Student', department: 'Faculty of Information Technology and Computer Science',
    position: 'MSc Student in Data Science', interests: ['data visualisation', 'machine learning'], joined: ago(60),
    bio: 'Building dashboards that turn field sensor data into decisions.',
  },
  yazan: {
    name: 'Yazan Al-Zoubi', role: 'Student', department: 'Hijjawi Faculty for Engineering Technology',
    position: 'MSc Student in Mechatronics', interests: ['embedded systems', 'robotics'], joined: ago(75),
    bio: 'Deploys and maintains sensor networks in the field.',
  },
  hiba: {
    name: 'Prof. Hiba Al-Qudah', role: 'Faculty', department: 'Faculty of Archaeology and Anthropology',
    position: 'Professor of Classical Archaeology', interests: ['decapolis cities', 'heritage conservation'], joined: ago(100),
    bio: 'Has excavated at Umm Qais for two decades.',
  },
  majd: {
    name: 'Majd Khasawneh', role: 'Researcher', department: 'Faculty of Fine Arts',
    position: 'Research Associate in Digital Heritage', interests: ['photogrammetry', '3d modelling'], joined: ago(90),
    bio: 'Creates 3D records of monuments for study and virtual visits.',
  },
  ahmad: {
    name: 'Dr. Ahmad Jaradat', role: 'Faculty', department: 'Faculty of Information Technology and Computer Science',
    position: 'Assistant Professor of Computer Science', interests: ['arabic nlp', 'speech recognition'], joined: ago(95),
    bio: 'Builds language technology for Arabic dialects.',
  },
  ruba: {
    name: 'Dr. Ruba Al-Sharman', role: 'Researcher', department: 'Faculty of Arts',
    position: 'Researcher in Arabic Linguistics', interests: ['dialectology', 'phonetics'], joined: ago(85),
    bio: 'Documents the dialects of northern Jordan.',
  },
  zaid: {
    name: 'Dr. Zaid Al-Rousan', role: 'Researcher', department: 'Faculty of Information Technology and Computer Science',
    position: 'Postdoctoral Researcher in Machine Learning', interests: ['deep learning', 'computer vision'], joined: ago(70),
    bio: 'Applies deep learning to images, audio and cultural heritage.',
  },
  maha: {
    name: 'Dr. Maha Al-Shdaifat', role: 'Faculty', department: 'Faculty of Nursing',
    position: 'Associate Professor of Community Health Nursing', interests: ['refugee health', 'mental health'], joined: ago(98),
    bio: 'Leads community health programmes in Irbid and Mafraq.',
  },
  faris: {
    name: 'Dr. Faris Tahat', role: 'Faculty', department: 'Faculty of Medicine',
    position: 'Assistant Professor of Psychiatry', interests: ['adolescent psychiatry', 'trauma'], joined: ago(92),
    bio: 'Clinician researcher in adolescent mental health.',
  },
  lana: {
    name: 'Dr. Lana Al-Omari', role: 'Faculty', department: 'Faculty of Educational Sciences',
    position: 'Assistant Professor of Counseling Psychology', interests: ['school counseling', 'resilience'], joined: ago(88),
    bio: 'Studies resilience and wellbeing in schools.',
  },
  salma: {
    name: 'Salma Gharaibeh', role: 'Staff', department: 'Faculty of Educational Sciences',
    position: 'Research Coordinator', interests: ['survey methods', 'fieldwork'], joined: ago(65),
    bio: 'Coordinates fieldwork and ethics approvals.',
  },
  khaled: {
    name: 'Dr. Khaled Rawashdeh', role: 'Faculty', department: 'Faculty of Pharmacy',
    position: 'Associate Professor of Pharmaceutical Microbiology', interests: ['antimicrobial resistance', 'wastewater'], joined: ago(97),
    bio: 'Tracks antibiotic resistance in the environment.',
  },
  aya: {
    name: 'Aya Bataineh', role: 'Student', department: 'Faculty of Pharmacy',
    position: 'PhD Student', interests: ['microbiology', 'genomics'], joined: ago(55),
    bio: 'Sequencing resistant bacteria from hospital wastewater.',
  },
  dana: {
    name: 'Dr. Dana Al-Azzam', role: 'Faculty', department: 'Faculty of Mass Communication',
    position: 'Assistant Professor of Journalism', interests: ['media literacy', 'misinformation'], joined: ago(80),
    bio: 'Researches how young people judge news online.',
  },
  mohammad: {
    name: 'Dr. Mohammad Al-Hamad', role: 'Faculty', department: 'Faculty of Business',
    position: 'Associate Professor of Marketing', interests: ['consumer behaviour', 'tourism marketing'], joined: ago(99),
    bio: 'Studies how households and tourists make decisions.',
  },
  nisreen: {
    name: 'Prof. Nisreen Al-Masri', role: 'Faculty', department: 'Faculty of Tourism and Hotels',
    position: 'Professor of Tourism Management', interests: ['sustainable tourism', 'destination management'], joined: ago(115),
    bio: 'Advises on tourism strategy for northern Jordan.',
  },
  hamza: {
    name: 'Dr. Hamza Al-Qaisi', role: 'Faculty', department: 'Faculty of Science',
    position: 'Assistant Professor of Analytical Chemistry', interests: ['spectroscopy', 'food chemistry'], joined: ago(94),
    bio: 'Develops fast, low-cost tests for food quality.',
  },
  tamara: {
    name: 'Tamara Smadi', role: 'Student', department: 'Faculty of Science',
    position: 'MSc Student in Chemistry', interests: ['spectroscopy', 'chemometrics'], joined: ago(50),
    bio: 'Working on olive oil authentication.',
  },
  ali: {
    name: 'Dr. Ali Al-Khateeb', role: 'Faculty', department: 'Faculty of Law',
    position: 'Associate Professor of Commercial Law', interests: ['data protection', 'e-commerce law'], joined: ago(96),
    bio: 'Writes on privacy and technology law in Jordan.',
  },
  bayan: {
    name: 'Bayan Al-Fayez', role: 'Researcher', department: 'Faculty of Law',
    position: 'Legal Researcher', interests: ['comparative law', 'gdpr'], joined: ago(62),
    bio: 'Compares data protection regimes across the region.',
  },
  yousef: {
    name: 'Yousef Obeidat', role: 'Student', department: 'Hijjawi Faculty for Engineering Technology',
    position: 'BSc Student in Computer Engineering', interests: ['iot', 'electronics'], joined: ago(20),
    bio: 'Final-year student interested in field sensing.',
  },
  // Waiting for an administrator, for the approval part of the demo.
  nour: {
    name: 'Nour Al-Hasan', role: 'Student', department: 'Faculty of Pharmacy', status: 'pending',
    position: 'MSc Student in Clinical Pharmacy', interests: ['pharmacovigilance'], joined: ago(1, 5),
    bio: 'Interested in medication safety research.',
  },
  tariq: {
    name: 'Dr. Tariq Abu Hassan', role: 'Faculty', department: 'Faculty of Law', status: 'pending',
    position: 'Assistant Professor of Public Law', interests: ['administrative law'], joined: ago(0, 20),
    bio: 'Joining the Faculty of Law this semester.',
  },
  leen: {
    name: 'Leen Batayneh', role: 'Researcher', department: 'Faculty of Fine Arts', status: 'pending',
    position: 'Research Assistant in Visual Arts', interests: ['digital art', 'heritage'], joined: ago(0, 3),
    bio: 'Looking for heritage projects to join.',
  },
} satisfies Record<string, Person>

type PersonKey = keyof typeof PEOPLE

const userId = Object.fromEntries(
  Object.keys(PEOPLE).map((key) => [key, new Types.ObjectId()])
) as Record<PersonKey, Types.ObjectId>

function emailOf(key: PersonKey) {
  const plain = PEOPLE[key].name.replace(/^(Prof|Dr)\.\s+/, '').toLowerCase()
  return `${plain.replace(/[^a-z\s-]/g, '').trim().replace(/[\s-]+/g, '.')}@${EMAIL_DOMAIN}`
}

// ---------------------------------------------------------------- projects

type MemberRole = 'pi' | 'co-pi' | 'contributor' | 'observer'

interface ProjectSeed {
  title:       string
  abstract:    string
  department:  Department
  tags:        string[]
  status:      'active' | 'seeking' | 'paused' | 'completed'
  visibility:  'public' | 'university' | 'private'
  members:     [PersonKey, MemberRole, Date][]
  openPositions?: string[]
  funding?:    [string, number]
  started:     Date
  ended?:      Date
}

const PROJECTS = {
  water: {
    title: 'Smart Irrigation for Water-Scarce Farms in Northern Jordan',
    abstract:
      'Jordan is among the most water-scarce countries in the world, and agriculture uses over half of its water. ' +
      'We are deploying low-cost soil-moisture sensors on pilot farms in Ramtha and Irbid, and using the readings ' +
      'to schedule irrigation. The aim is to cut water use by a quarter without reducing yield, and to give farmers ' +
      'a simple dashboard they can use on a phone.',
    department: 'Faculty of Science', tags: ['water', 'agriculture', 'iot', 'climate adaptation'],
    status: 'active', visibility: 'university',
    members: [['omar', 'pi', ago(90)], ['laith', 'co-pi', ago(88)], ['yazan', 'contributor', ago(70)], ['sara', 'contributor', ago(45)]],
    openPositions: ['Field technician', 'Data analyst'],
    funding: ['Scientific Research and Innovation Support Fund', 45000],
    started: ago(90),
  },
  heritage: {
    title: 'Digital Documentation of Umm Qais (Gadara) Heritage Sites',
    abstract:
      'Umm Qais holds some of the best-preserved Decapolis remains in the region. Using drone photogrammetry and ' +
      'laser scanning, we are building accurate 3D records of the theatre, basilica terrace and colonnaded street, ' +
      'for conservation planning, teaching and virtual visits.',
    department: 'Faculty of Archaeology and Anthropology', tags: ['heritage', 'archaeology', '3d scanning', 'tourism'],
    status: 'active', visibility: 'public',
    members: [['hiba', 'pi', ago(85)], ['majd', 'co-pi', ago(84)], ['zaid', 'contributor', ago(40)]],
    started: ago(85),
  },
  speech: {
    title: 'Arabic Speech Recognition for Jordanian Dialects',
    abstract:
      'Speech recognition systems work poorly on spoken Jordanian Arabic. We are recording and transcribing a corpus ' +
      'of northern Jordanian speech and training models that understand it, for applications from accessibility to ' +
      'e-government services.',
    department: 'Faculty of Information Technology and Computer Science', tags: ['arabic nlp', 'speech', 'machine learning'],
    status: 'seeking', visibility: 'university',
    members: [['ahmad', 'pi', ago(60)], ['ruba', 'co-pi', ago(58)], ['zaid', 'contributor', ago(50)]],
    openPositions: ['Arabic dialect annotator', 'Speech data engineer'],
    started: ago(60),
  },
  refugee: {
    title: 'Mental Health Support for Refugee Adolescents in Irbid',
    abstract:
      'A community-based programme, run with local schools, that screens refugee and host-community adolescents for ' +
      'anxiety and depression and offers group sessions led by trained counsellors. We are measuring outcomes over ' +
      'one school year.',
    department: 'Faculty of Nursing', tags: ['refugee health', 'mental health', 'adolescents'],
    status: 'active', visibility: 'university',
    members: [['maha', 'pi', ago(80)], ['faris', 'co-pi', ago(79)], ['lana', 'contributor', ago(75)], ['salma', 'contributor', ago(60)]],
    funding: ['International partnership grant', 120000],
    started: ago(80),
  },
  solar: {
    title: 'Rooftop Solar Adoption in Jordanian Households',
    abstract:
      'Why do some households install rooftop solar and others not? We combine a survey of 1,200 households with ' +
      'metered data from 40 installations to model payback periods and the barriers that matter most.',
    department: 'Hijjawi Faculty for Engineering Technology', tags: ['renewable energy', 'solar', 'households'],
    status: 'active', visibility: 'public',
    members: [['laith', 'pi', ago(70)], ['mohammad', 'co-pi', ago(69)], ['yazan', 'contributor', ago(65)]],
    started: ago(70),
  },
  resistance: {
    title: 'Antibiotic Resistance in Hospital Wastewater',
    abstract:
      'We sample wastewater from three hospitals in Irbid each month and sequence the resistant bacteria we find, to ' +
      'give public health authorities an early warning of resistance spreading in the community.',
    department: 'Faculty of Pharmacy', tags: ['antimicrobial resistance', 'public health', 'genomics'],
    status: 'active', visibility: 'university',
    members: [['khaled', 'pi', ago(75)], ['aya', 'contributor', ago(55)], ['faris', 'contributor', ago(50)]],
    started: ago(75),
  },
  media: {
    title: 'Media Literacy Among Jordanian University Students',
    abstract:
      'How well do students tell reliable news from misinformation? A survey and a set of classroom experiments ' +
      'across four universities, leading to a short media literacy module that any faculty can teach.',
    department: 'Faculty of Mass Communication', tags: ['media literacy', 'misinformation', 'education'],
    status: 'seeking', visibility: 'public',
    members: [['dana', 'pi', ago(40)], ['lana', 'contributor', ago(38)]],
    openPositions: ['Survey designer', 'Data analyst'],
    started: ago(40),
  },
  tourism: {
    title: 'Tourism Recovery Strategies for Northern Jordan',
    abstract:
      'A study of how tourism in Irbid, Ajloun and Jerash recovered after the pandemic, with recommendations for ' +
      'marketing the north as a destination in its own right.',
    department: 'Faculty of Tourism and Hotels', tags: ['tourism', 'marketing', 'regional development'],
    status: 'completed', visibility: 'public',
    members: [['nisreen', 'pi', ago(110)], ['mohammad', 'contributor', ago(108)]],
    started: ago(110), ended: ago(12),
  },
  olive: {
    title: 'Olive Oil Quality Profiling Using Spectroscopy',
    abstract:
      'A rapid, low-cost spectroscopic test to grade olive oil and detect adulteration at the press, instead of ' +
      'sending samples to a laboratory.',
    department: 'Faculty of Science', tags: ['food chemistry', 'spectroscopy', 'agriculture'],
    status: 'paused', visibility: 'university',
    members: [['hamza', 'pi', ago(95)], ['tamara', 'contributor', ago(48)], ['omar', 'observer', ago(30)]],
    started: ago(95),
  },
  privacy: {
    title: 'Legal Frameworks for Data Protection in Jordan',
    abstract:
      "An analysis of Jordan's 2023 Personal Data Protection Law against international standards, with practical " +
      'guidance for universities and hospitals that hold personal data.',
    department: 'Faculty of Law', tags: ['data protection', 'law', 'privacy'],
    status: 'active', visibility: 'university',
    members: [['ali', 'pi', ago(50)], ['bayan', 'co-pi', ago(49)], ['ahmad', 'contributor', ago(30)]],
    started: ago(50),
  },
} satisfies Record<string, ProjectSeed>

type ProjectKey = keyof typeof PROJECTS

const projectId = Object.fromEntries(
  Object.keys(PROJECTS).map((key) => [key, new Types.ObjectId()])
) as Record<ProjectKey, Types.ObjectId>

const projectLink = (key: ProjectKey) => `/projects/${projectId[key]}`

// ---------------------------------------------------------------- tasks

type Status = 'todo' | 'in-progress' | 'in-review' | 'done'
type Priority = 'low' | 'medium' | 'high'

interface TaskSeed {
  key?:     string
  title:    string
  description?: string
  status:   Status
  priority: Priority
  assignee?: PersonKey
  due?:     Date
  created:  Date
}

const TASKS: Record<ProjectKey, TaskSeed[]> = {
  water: [
    { title: 'Literature review: deficit irrigation in arid climates', status: 'done', priority: 'low', assignee: 'laith', created: ago(85) },
    { title: 'Ethics approval for farmer interviews', status: 'done', priority: 'medium', assignee: 'omar', created: ago(80) },
    { key: 'sensors', title: 'Install soil-moisture sensors at the Ramtha pilot farm', status: 'in-progress', priority: 'high', assignee: 'yazan', due: inDays(5), created: ago(20),
      description: 'Twelve sensors across three plots, at 20 cm and 40 cm depth. Check the LoRa coverage from the pump house first.' },
    { key: 'clean', title: 'Clean and merge the 2025 sensor readings', status: 'in-review', priority: 'medium', assignee: 'sara', due: inDays(2), created: ago(14),
      description: 'Remove gaps and spikes, resample to hourly, and join with the weather station data.' },
    { key: 'dashboard', title: 'Build the farmer-facing dashboard prototype', status: 'in-progress', priority: 'medium', assignee: 'sara', due: inDays(10), created: ago(1, 2),
      description: 'Phone-first. One screen per plot: soil moisture today, and whether to irrigate tomorrow.' },
    { title: 'Draft the irrigation scheduling model', status: 'todo', priority: 'high', assignee: 'omar', due: inDays(14), created: ago(6) },
    { title: 'Order two replacement LoRa gateways', status: 'todo', priority: 'low', assignee: 'yazan', due: inDays(7), created: ago(3) },
    { title: 'Plan the farmer workshop in Irbid', status: 'todo', priority: 'medium', created: ago(2) },
  ],
  heritage: [
    { title: 'Drone survey of the West Theatre', status: 'done', priority: 'high', assignee: 'majd', created: ago(70) },
    { title: 'Process photogrammetry for the basilica terrace', status: 'in-progress', priority: 'high', assignee: 'majd', due: inDays(6), created: ago(15) },
    { title: 'Train a model to flag cracks in the 3D meshes', status: 'in-progress', priority: 'medium', assignee: 'zaid', due: inDays(20), created: ago(12) },
    { title: 'Permit renewal with the Department of Antiquities', status: 'in-review', priority: 'high', assignee: 'hiba', due: inDays(3), created: ago(9) },
    { title: 'Publish the virtual tour of the colonnaded street', status: 'todo', priority: 'medium', created: ago(4) },
  ],
  speech: [
    { title: 'Recording protocol and consent forms', status: 'done', priority: 'high', assignee: 'ruba', created: ago(55) },
    { title: 'Record 50 hours of Irbid speech', status: 'in-progress', priority: 'high', assignee: 'ruba', due: inDays(25), created: ago(40) },
    { title: 'Baseline model on public Arabic datasets', status: 'in-review', priority: 'medium', assignee: 'zaid', due: inDays(4), created: ago(20) },
    { title: 'Annotation guidelines for dialect features', status: 'todo', priority: 'medium', assignee: 'ahmad', due: inDays(9), created: ago(5) },
  ],
  refugee: [
    { title: 'Agreements with partner schools', status: 'done', priority: 'high', assignee: 'maha', created: ago(75) },
    { title: 'Train counsellors on the group session guide', status: 'done', priority: 'high', assignee: 'lana', created: ago(60) },
    { title: 'Baseline screening, first term', status: 'in-progress', priority: 'high', assignee: 'faris', due: inDays(8), created: ago(30) },
    { title: 'Parent information evenings', status: 'todo', priority: 'medium', assignee: 'salma', due: inDays(12), created: ago(7) },
    { title: 'Mid-year report to the funder', status: 'todo', priority: 'high', assignee: 'maha', due: inDays(30), created: ago(2) },
  ],
  solar: [
    { title: 'Household survey questionnaire', status: 'done', priority: 'high', assignee: 'mohammad', created: ago(60) },
    { title: 'Install meters on 40 rooftop systems', status: 'in-progress', priority: 'high', assignee: 'yazan', due: inDays(15), created: ago(25) },
    { title: 'Payback period model', status: 'todo', priority: 'medium', assignee: 'laith', due: inDays(21), created: ago(10) },
  ],
  resistance: [
    { title: 'Monthly sampling, three hospitals', status: 'in-progress', priority: 'high', assignee: 'aya', due: inDays(9), created: ago(35) },
    { title: 'Sequencing run for the September samples', status: 'in-review', priority: 'high', assignee: 'khaled', due: inDays(1), created: ago(10) },
    { title: 'Data sharing agreement with the Ministry of Health', status: 'todo', priority: 'medium', assignee: 'faris', due: inDays(18), created: ago(6) },
  ],
  media: [
    { title: 'Survey instrument, first draft', status: 'in-progress', priority: 'high', assignee: 'dana', due: inDays(7), created: ago(20) },
    { title: 'Recruit partner universities', status: 'todo', priority: 'medium', assignee: 'lana', due: inDays(14), created: ago(10) },
  ],
  tourism: [
    { title: 'Visitor survey in Jerash and Ajloun', status: 'done', priority: 'high', assignee: 'mohammad', created: ago(100) },
    { title: 'Interviews with tour operators', status: 'done', priority: 'medium', assignee: 'nisreen', created: ago(80) },
    { title: 'Final report and policy brief', status: 'done', priority: 'high', assignee: 'nisreen', created: ago(40) },
  ],
  olive: [
    { title: 'Collect samples from ten presses', status: 'done', priority: 'high', assignee: 'tamara', created: ago(60) },
    { title: 'Calibrate the handheld spectrometer', status: 'in-progress', priority: 'medium', assignee: 'hamza', created: ago(35) },
  ],
  privacy: [
    { title: 'Map the 2023 law against GDPR principles', status: 'in-progress', priority: 'high', assignee: 'bayan', due: inDays(10), created: ago(30) },
    { title: 'Interview data protection officers', status: 'todo', priority: 'medium', assignee: 'ali', due: inDays(20), created: ago(12) },
    { title: 'Technical guidance for university systems', status: 'todo', priority: 'medium', assignee: 'ahmad', due: inDays(28), created: ago(8) },
  ],
}

// ---------------------------------------------------------------- inserting

/**
 * Validate each row against its schema, then insert with the given timestamps.
 * Mongoose would otherwise stamp everything with the moment of seeding, and a
 * demo where every message arrived in the same second does not look alive.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insert(model: Model<any>, rows: (Record<string, unknown> & { at: Date; updated?: Date })[]) {
  const docs = []
  for (const { at, updated, ...row } of rows) {
    const doc = new model(row)
    await doc.validate()
    docs.push({ ...doc.toObject(), createdAt: at, updatedAt: updated ?? at })
  }
  if (docs.length) await model.collection.insertMany(docs)
  return docs.length
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i === -1 ? undefined : process.argv[i + 1]
}

async function main() {
  const dbName = argValue('--db') ?? DEFAULT_DEMO_DB
  process.env.MONGODB_URI = demoDatabaseUri(process.env.MONGODB_URI, dbName)

  const connection = await connectDB()
  const connectedTo = connection.connection.db?.databaseName ?? ''
  if (!/demo/i.test(connectedTo)) {
    throw new Error(`Connected to "${connectedTo}", which is not a demo database. Nothing was changed.`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const models: Model<any>[] = [User, Project, Task, TaskComment, Message, Notification, JoinRequest, ProjectFile, Conversation, DirectMessage, PasswordResetToken]

  // Empty it, then make sure every index exists before anything goes in.
  for (const model of models) await model.deleteMany({})
  for (const model of models) await model.syncIndexes()

  const password = process.env.DEMO_PASSWORD || randomBytes(9).toString('base64url')
  const passwordHash = await bcrypt.hash(password, 12)

  const counts: Record<string, number> = {}

  // Users
  counts.users = await insert(User, (Object.keys(PEOPLE) as PersonKey[]).map((key, i) => {
    const p: Person = PEOPLE[key]
    return {
      _id: userId[key], name: p.name, email: emailOf(key), role: p.role,
      universityId: `YU-DEMO-${String(i + 1).padStart(4, '0')}`,
      status: p.status ?? 'active', department: p.department, position: p.position,
      researchInterests: p.interests, bio: p.bio, isPublic: true, passwordHash,
      at: p.joined,
    }
  }))

  // Projects
  counts.projects = await insert(Project, (Object.keys(PROJECTS) as ProjectKey[]).map((key) => {
    const p: ProjectSeed = PROJECTS[key]
    const pi = p.members.find(([, role]) => role === 'pi')![0]
    return {
      _id: projectId[key], title: p.title, abstract: p.abstract, department: p.department, tags: p.tags,
      status: p.status, visibility: p.visibility, openPositions: p.openPositions ?? [],
      fundingSource: p.funding?.[0], fundingAmount: p.funding?.[1],
      startDate: p.started, endDate: p.ended, createdBy: userId[pi],
      members: p.members.map(([who, role, joinedAt]) => ({ userId: userId[who], role, joinedAt })),
      at: p.started, updated: ago(0, 2),
    }
  }))

  // Tasks, ordered within each column
  const taskId: Record<string, Types.ObjectId> = {}
  const taskRows = (Object.keys(TASKS) as ProjectKey[]).flatMap((project) => {
    const order: Record<string, number> = {}
    const pi = PROJECTS[project].members.find(([, role]) => role === 'pi')![0]
    return TASKS[project].map((t) => {
      const _id = new Types.ObjectId()
      if (t.key) taskId[t.key] = _id
      order[t.status] = (order[t.status] ?? -1) + 1
      return {
        _id, projectId: projectId[project], title: t.title, description: t.description,
        status: t.status, priority: t.priority, assigneeId: t.assignee && userId[t.assignee],
        createdBy: userId[pi], dueDate: t.due, order: order[t.status],
        at: t.created, updated: t.status === 'todo' ? t.created : ago(Math.floor(Math.random() * 4), 3),
      }
    })
  })
  counts.tasks = await insert(Task, taskRows)

  // Comments on the showcase project's tasks
  const comment = (task: string, author: PersonKey, content: string, at: Date) =>
    ({ taskId: taskId[task], projectId: projectId.water, authorId: userId[author], content, at })
  counts.taskComments = await insert(TaskComment, [
    comment('clean', 'sara', 'Merged all twelve sensors. About 3% of readings were spikes after the rain on the 4th, so I flagged rather than deleted them.', ago(1, 6)),
    comment('clean', 'omar', 'Good call keeping the flags. Can you add the weather station rainfall as a column so we can see the cause?', ago(1, 3)),
    comment('clean', 'sara', 'Done, and the hourly file is in the shared drive. Ready for review.', ago(0, 0, 40)),
    comment('sensors', 'yazan', 'Plot B is in. The gateway on the pump house only reaches two of the three plots, so we may need a repeater.', ago(2, 4)),
    comment('sensors', 'laith', 'A solar repeater on the fence post should do it. I have one spare in the lab.', ago(2, 1)),
    comment('dashboard', 'sara', 'First mock-up: green, amber or red per plot, with one sentence of advice. Farmers in the pilot liked it best.', ago(0, 5)),
  ])

  // Project chat
  const chat = (project: ProjectKey, rows: [PersonKey, string, Date][]) =>
    rows.map(([who, content, at]) => ({
      projectId: projectId[project], senderId: userId[who], content, at,
      // Everyone has read everything except the last few messages.
      readBy: PROJECTS[project].members.map(([m]) => userId[m]).filter((id) => at < ago(0, 3) || id.equals(userId[who])),
    }))
  counts.messages = await insert(Message, [
    ...chat('water', [
      ['omar', 'Welcome to the project workspace, everyone. Tasks and files will live here from now on.', ago(40)],
      ['laith', 'Sensor order confirmed: 12 units arrive next week.', ago(30)],
      ['yazan', 'Sensors arrived. Starting the bench tests today.', ago(22)],
      ['omar', 'The Ramtha farm owner agreed to the pilot. We can start installing on Sunday.', ago(21)],
      ['sara', 'I set up the data pipeline, so readings show up within five minutes of being taken.', ago(8)],
      ['laith', 'Nice. Can we get an alert when a sensor stops reporting?', ago(8, -2)],
      ['sara', 'Yes, it emails us after two hours of silence.', ago(7)],
      ['yazan', 'Plot B is installed. Coverage issue on plot C, details on the task.', ago(2, 4)],
      ['omar', 'Reminder: progress meeting Thursday at 11 in the Science building, room 204.', ago(0, 6)],
      ['sara', 'The cleaned dataset is ready for review, see the task.', ago(0, 0, 40)],
    ]),
    ...chat('heritage', [
      ['hiba', 'The Department of Antiquities has renewed our access for the autumn season.', ago(20)],
      ['majd', 'Theatre model finished: 48 million points. Uploading a preview now.', ago(10)],
      ['zaid', 'I can try crack detection on it. Could you export the mesh at a lower resolution first?', ago(9)],
      ['majd', 'Exported. It is about 2 GB.', ago(8)],
      ['hiba', 'Excellent work. This will be very useful for the conservation plan.', ago(1, 2)],
    ]),
    ...chat('speech', [
      ['ahmad', 'We are recruiting an annotator with a linguistics background. Please share with your students.', ago(15)],
      ['ruba', 'Recorded 18 hours so far, mostly from Irbid and Ramtha.', ago(6)],
      ['zaid', 'The baseline model gets a 41% word error rate on our test set. Plenty of room to improve.', ago(3)],
    ]),
    ...chat('refugee', [
      ['maha', 'All six partner schools have signed.', ago(50)],
      ['faris', 'Screening is 60% done in the first two schools.', ago(5)],
      ['salma', 'Parent evenings are booked for the 20th and 27th.', ago(1)],
    ]),
    ...chat('resistance', [
      ['aya', 'September samples are in the freezer.', ago(6)],
      ['khaled', 'Sequencing slot booked for Monday.', ago(4)],
    ]),
  ])

  // Join requests: two waiting for review, and the history behind current members
  counts.joinRequests = await insert(JoinRequest, [
    {
      projectId: projectId.water, userId: userId.yousef, status: 'pending', position: 'Field technician',
      message: 'I am a final-year computer engineering student and built a LoRa sensor node for my graduation project. I would love to help with installation on the pilot farms.',
      at: ago(0, 3),
    },
    {
      projectId: projectId.media, userId: userId.salma, status: 'pending', position: 'Survey designer',
      message: 'I coordinate survey fieldwork for the Faculty of Educational Sciences and can help design and pilot the instrument.',
      at: ago(1, 8),
    },
    {
      projectId: projectId.water, userId: userId.sara, status: 'approved', position: 'Data analyst',
      message: 'My thesis is on sensor data visualisation, and this project is a perfect fit.',
      reviewedBy: userId.omar, reviewedAt: ago(45), at: ago(47), updated: ago(45),
    },
  ])

  // Direct messages
  const conversations: [PersonKey, PersonKey, [PersonKey, string, Date][]][] = [
    ['omar', 'sara', [
      ['omar', 'Sara, thank you for the quick turnaround on the cleaned data.', ago(0, 2)],
      ['sara', 'You are welcome! Should I start on the dashboard charts next?', ago(0, 1, 50)],
      ['omar', 'Yes please. Keep it simple: farmers will read it on their phones.', ago(0, 1, 45)],
      ['omar', 'Also, could you present the dashboard at the Thursday meeting?', ago(0, 0, 25)],
    ]],
    ['omar', 'laith', [
      ['laith', 'Omar, the Innovation Fund call closes at the end of next month. Shall we apply for phase two?', ago(3)],
      ['omar', 'Definitely. Let us draft the outline after Thursday.', ago(2, 20)],
    ]],
    ['ahmad', 'zaid', [
      ['ahmad', 'Great result on the baseline. Can you write it up for the group meeting?', ago(2)],
      ['zaid', 'Will do, slides by Wednesday.', ago(1, 22)],
    ]],
  ]
  counts.conversations = 0
  counts.directMessages = 0
  const conversationId: Record<string, Types.ObjectId> = {}
  for (const [a, b, messages] of conversations) {
    const id = new Types.ObjectId()
    conversationId[`${a}:${b}`] = id
    counts.conversations += await insert(Conversation, [{
      _id: id, participants: sortedPair(userId[a], userId[b]), pairKey: pairKeyFor(userId[a], userId[b]),
      lastMessageAt: messages[messages.length - 1][2], at: messages[0][2], updated: messages[messages.length - 1][2],
    }])
    counts.directMessages += await insert(DirectMessage, messages.map(([who, content, at], i) => ({
      conversationId: id, senderId: userId[who], content, at,
      // The newest message in each thread is still unread by its recipient.
      readBy: i === messages.length - 1 ? [userId[who]] : [userId[a], userId[b]],
    })))
  }

  // Notifications, so the bell has something to show
  const notify = (who: PersonKey, type: string, title: string, body: string, link: string, at: Date, read = false) =>
    ({ userId: userId[who], type, title, body, link, read, at })
  counts.notifications = await insert(Notification, [
    // Same link format the messages API uses, so it opens the conversation.
    notify('sara', 'new-message', `New message from ${PEOPLE.omar.name}`, 'Also, could you present the dashboard at the Thursday meeting?',
      `/messages?conversation=${conversationId['omar:sara']}`, ago(0, 0, 25)),
    notify('omar', 'join-request', 'New join request', `${PEOPLE.yousef.name} wants to join "${PROJECTS.water.title}" as Field technician.`, projectLink('water'), ago(0, 3)),
    notify('omar', 'task-comment', 'New comment', `${PEOPLE.sara.name} commented on "Clean and merge the 2025 sensor readings".`, projectLink('water'), ago(0, 0, 40)),
    notify('omar', 'task-moved', 'Task moved to In Review', '"Clean and merge the 2025 sensor readings" is ready for review.', projectLink('water'), ago(0, 0, 41), true),
    notify('omar', 'member-joined', 'New project member', `${PEOPLE.sara.name} joined "${PROJECTS.water.title}".`, projectLink('water'), ago(45), true),
    notify('sara', 'task-assigned', 'Task assigned to you', '"Build the farmer-facing dashboard prototype" in Smart Irrigation.', projectLink('water'), ago(1, 2)),
    notify('sara', 'join-approved', 'Request approved', `You are now a contributor on "${PROJECTS.water.title}".`, projectLink('water'), ago(45), true),
    notify('dana', 'join-request', 'New join request', `${PEOPLE.salma.name} wants to join "${PROJECTS.media.title}" as Survey designer.`, projectLink('media'), ago(1, 8)),
    notify('laith', 'task-comment', 'New comment', `${PEOPLE.yazan.name} commented on "Install soil-moisture sensors at the Ramtha pilot farm".`, projectLink('water'), ago(2, 4), true),
  ])

  const faculties = new Set(Object.values(PEOPLE).map((p: Person) => p.department).filter(Boolean)).size

  console.log(`Seeded "${connectedTo}":`)
  for (const [name, n] of Object.entries(counts)) console.log(`  ${name.padEnd(15)} ${n}`)
  console.log(`  faculties       ${faculties}`)
  console.log('\nAccounts for the demo (all share one password):')
  for (const [key, label] of [
    ['rana', 'administrator: approvals, dashboard'],
    ['omar', 'project lead: join request waiting, unread comment'],
    ['sara', 'student: team member, unread message from Omar'],
    ['yousef', 'student who asked to join the irrigation project'],
  ] as [PersonKey, string][]) {
    console.log(`  ${emailOf(key).padEnd(34)} ${label}`)
  }
  console.log(`\nPassword: ${process.env.DEMO_PASSWORD ? '(the DEMO_PASSWORD you set)' : password}`)
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
