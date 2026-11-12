import type { Project } from './types.ts'

export const projects: readonly Project[] = [
  {
    slug: 'movie-app-web',
    title: 'Movie-app-web',
    year: '2026',
    summary:
      'A cinematic movie library with 100 curated films, watchlists, ratings, and a noir-inspired interface. Shipped as a responsive web app and Expo Android build.',
    stack: ['React 19', 'TypeScript', 'Tailwind v4', 'Supabase', 'OMDB'],
    links: [
      { label: 'Live', href: 'https://movie-web9834.netlify.app' },
      {
        label: 'Code',
        href: 'https://github.com/Gopendranath/Movie-app-web',
      },
    ],
    featured: true,
  },
  {
    slug: 'product-management',
    title: 'product-management',
    year: '2026',
    summary:
      'A responsive product dashboard over the DummyJSON API with search, pagination, and CRUD flows in a clean shadcn/ui interface.',
    stack: ['Next.js', 'TypeScript', 'Tailwind', 'shadcn/ui', 'DummyJSON'],
    links: [
      {
        label: 'Live',
        href: 'https://product-management-seven-pied.vercel.app',
      },
      {
        label: 'Code',
        href: 'https://github.com/Gopendranath/product-management',
      },
    ],
  },
  {
    slug: 'terminal-web-vm',
    title: 'terminal-web-vm',
    year: '2026',
    summary:
      'A browser-based lab that runs Debian Linux and Node.js entirely client-side using CheerpX and WebContainers.',
    stack: ['TypeScript', 'WebAssembly', 'CheerpX', 'WebContainers', 'xterm'],
    links: [
      {
        label: 'Code',
        href: 'https://github.com/Gopendranath/terminal-web-vm',
      },
    ],
    featured: true,
  },
  {
    slug: 'rag-pdf-chat',
    title: 'RAG PDF Chat',
    year: '2025',
    summary:
      'A full-stack RAG application for chatting with PDFs and images, pairing a Next.js interface with LangChain ingestion and vector search.',
    stack: ['Next.js', 'TypeScript', 'LangChain', 'Mistral AI', 'Gemini embeddings'],
    links: [
      {
        label: 'Frontend',
        href: 'https://github.com/Gopendranath/frontend-rag-chat-agent',
      },
      {
        label: 'Backend',
        href: 'https://github.com/Gopendranath/Rag-pdf-chat-backend',
      },
    ],
    featured: true,
  },
  {
    slug: 'i-hate-npm',
    title: 'I-hate-NPM',
    year: '2026',
    summary:
      'A Chrome and Firefox extension that replaces npm commands on any webpage with pnpm, yarn, bun, deno, or bit. Published on the Chrome Web Store.',
    stack: ['JavaScript', 'Chrome Extension', 'Firefox', 'npm', 'pnpm', 'Bun', 'Deno', 'Bit'],
    links: [
      {
        label: 'Chrome Web Store',
        href: 'https://chromewebstore.google.com/detail/i-hate-npm/mknigjikipkdnnpeifcgmckobgpbklej',
      },
      { label: 'Code', href: 'https://github.com/Gopendranath/I-hate-NPM' },
    ],
  },
  {
    slug: 'walmart-v1',
    title: 'Walmart_v1',
    year: '2025',
    summary: 'An e-commerce storefront clone with Auth0 authentication and a shadcn/ui interface.',
    stack: ['React', 'TypeScript', 'Auth0', 'shadcn/ui', 'Vercel'],
    links: [
      { label: 'Live', href: 'https://walmart-clone-v1.vercel.app/' },
      {
        label: 'Code',
        href: 'https://github.com/Gopendranath/Walmart_v1',
      },
    ],
  },
]

export const featuredProjects: readonly Project[] = projects.filter((project) => project.featured)
