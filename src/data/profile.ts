import type { Profile } from './types.ts'

export const profile: Profile = {
  name: 'Gopendranath Sasmal',
  firstName: 'Gopendranath',
  lastName: 'Sasmal',
  role: 'Full Stack Developer',
  location: 'BTM Layout, Bengaluru, India',
  locationUrl:
    'https://www.google.com/maps/search/?api=1&query=BTM%20Layout%2C%20Bengaluru%2C%20Karnataka%2C%20India',
  timezone: 'IST (UTC+5:30)',
  email: 'gopendranathsasmal7@gmail.com',
  availability: 'Open to work',
  bio: 'Full-stack developer building web products with React, TypeScript, Node.js, Java, Spring Boot, and AI. Open to roles in Bengaluru or remote.',
  about: [
    'I’m a full-stack developer who likes the whole path: a sharp interface, a clear API, and the infrastructure that keeps it running. My work spans React and Next.js on the front end; Node.js, Python, and Java with Spring Boot on the back end; and recent projects in RAG, LangGraph, Spring AI, and browser-based tooling.',
    'I learn by building. That has meant shipping a cinematic movie library, running Linux in the browser with WebAssembly, and writing browser extensions for everyday developer annoyances. Outside code, I am usually trekking or exploring something new in open source.',
  ],
  socials: [
    {
      id: 'github',
      label: 'GitHub',
      href: 'https://github.com/Gopendranath',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: 'https://linkedin.com/in/gns99',
    },
    {
      id: 'x',
      label: 'X',
      href: 'https://x.com/AssassinsEmper1',
    },
    {
      id: 'coffee',
      label: 'Buy Me a Coffee',
      href: 'https://coff.ee/gopendranath',
    },
    {
      id: 'email',
      label: 'gopendranathsasmal7@gmail.com',
      href: 'mailto:gopendranathsasmal7@gmail.com',
    },
  ],
  stack: [
    {
      title: 'Frontend',
      items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'shadcn/ui', 'Redux', 'Zustand'],
    },
    {
      title: 'Backend',
      items: ['Node.js', 'Express', 'REST APIs', 'JWT', 'OAuth 2.0', '2FA'],
    },
    {
      title: 'Databases',
      items: [
        'PostgreSQL',
        'MySQL',
        'SQLite',
        'MongoDB',
        'Firebase',
        'Supabase',
        'Redis',
        'Vector DB',
      ],
    },
    {
      title: 'Java & Spring',
      items: [
        'Java',
        'Spring Boot',
        'Spring AI',
        'Spring Data JPA',
        'Spring Security',
        'Hibernate',
        'Maven',
        'JUnit',
      ],
    },
    {
      title: 'AI',
      items: ['LangChain', 'LangGraph', 'RAG', 'Mistral AI', 'Gemini embeddings'],
    },
    {
      title: 'Cloud & DevOps',
      items: ['AWS', 'Docker', 'Vercel', 'Netlify', 'Git', 'Linux'],
    },
  ],
  resumeAvailable: false,
}
