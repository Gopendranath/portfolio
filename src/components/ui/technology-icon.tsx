import type { CSSProperties, SVGProps } from 'react'
import type { IconType } from 'react-icons'
import { FaAws, FaJava, FaLinux } from 'react-icons/fa6'
import { FiCode, FiLayers, FiShare2, FiShield, FiZap } from 'react-icons/fi'
import {
  SiApachemaven,
  SiAuth0,
  SiBun,
  SiDeno,
  SiDocker,
  SiExpress,
  SiFirebase,
  SiFirefoxbrowser,
  SiGit,
  SiGooglechrome,
  SiGooglegemini,
  SiHibernate,
  SiJavascript,
  SiJsonwebtokens,
  SiJunit5,
  SiLangchain,
  SiLanggraph,
  SiMistralai,
  SiMongodb,
  SiMysql,
  SiNetlify,
  SiNextdotjs,
  SiNodedotjs,
  SiNpm,
  SiOpenid,
  SiPnpm,
  SiPostgresql,
  SiReact,
  SiReactquery,
  SiRedis,
  SiRedux,
  SiShadcnui,
  SiSpring,
  SiSpringboot,
  SiSpringsecurity,
  SiSqlite,
  SiSupabase,
  SiTailwindcss,
  SiTanstack,
  SiTypescript,
  SiVercel,
  SiVite,
  SiVitest,
  SiWebassembly,
} from 'react-icons/si'

/**
 * Tech-stack marks from `react-icons` (free: Simple Icons CC0-1.0, Font
 * Awesome Free, Feather MIT). Names and logos are trademarks of their
 * respective owners. Conceptual items with no brand mark (state, REST,
 * OAuth, 2FA, vector DB, RAG) use Feather generics in the accent colour.
 */
const libraryMarks = {
  react: { Icon: SiReact, color: '#61DAFB' },
  nextjs: { Icon: SiNextdotjs, color: 'var(--color-ink)' },
  typescript: { Icon: SiTypescript, color: '#3178C6' },
  tailwind: { Icon: SiTailwindcss, color: '#06B6D4' },
  shadcn: { Icon: SiShadcnui, color: 'var(--color-ink)' },
  redux: { Icon: SiRedux, color: '#764ABC' },
  zustand: { Icon: FiLayers, color: 'var(--color-accent)' },
  nodejs: { Icon: SiNodedotjs, color: '#5FA04E' },
  express: { Icon: SiExpress, color: 'var(--color-ink)' },
  restApi: { Icon: FiCode, color: 'var(--color-accent)' },
  jwt: { Icon: SiJsonwebtokens, color: 'var(--color-ink)' },
  oauth: { Icon: SiOpenid, color: 'var(--color-accent)' },
  twoFactor: { Icon: FiShield, color: 'var(--color-accent)' },
  postgresql: { Icon: SiPostgresql, color: '#4169E1' },
  mysql: { Icon: SiMysql, color: '#4479A1' },
  sqlite: { Icon: SiSqlite, color: '#63b3d8' },
  mongodb: { Icon: SiMongodb, color: '#47A248' },
  firebase: { Icon: SiFirebase, color: '#DD2C00' },
  supabase: { Icon: SiSupabase, color: '#3FCF8E' },
  redis: { Icon: SiRedis, color: '#FF4438' },
  vectorDb: { Icon: FiShare2, color: 'var(--color-accent)' },
  java: { Icon: FaJava, color: '#0074BD' },
  springboot: { Icon: SiSpringboot, color: '#6DB33F' },
  spring: { Icon: SiSpring, color: '#6DB33F' },
  springSecurity: { Icon: SiSpringsecurity, color: '#6DB33F' },
  hibernate: { Icon: SiHibernate, color: '#9aa8b0' },
  maven: { Icon: SiApachemaven, color: '#C71A36' },
  junit: { Icon: SiJunit5, color: '#25A162' },
  langchain: { Icon: SiLangchain, color: '#7FC8FF' },
  langgraph: { Icon: SiLanggraph, color: '#7FC8FF' },
  rag: { Icon: FiZap, color: 'var(--color-accent)' },
  mistral: { Icon: SiMistralai, color: '#FA520F' },
  gemini: { Icon: SiGooglegemini, color: '#8E75B2' },
  aws: { Icon: FaAws, color: '#FF9900' },
  docker: { Icon: SiDocker, color: '#2496ED' },
  vercel: { Icon: SiVercel, color: 'var(--color-ink)' },
  netlify: { Icon: SiNetlify, color: '#00C7B7' },
  git: { Icon: SiGit, color: '#F03C2E' },
  linux: { Icon: FaLinux, color: '#FCC624' },
  vite: { Icon: SiVite, color: '#646CFF' },
  vitest: { Icon: SiVitest, color: '#6E9F18' },
  tanstack: { Icon: SiTanstack, color: 'var(--color-ink)' },
  reactquery: { Icon: SiReactquery, color: '#FF4154' },
  javascript: { Icon: SiJavascript, color: '#F7DF1E' },
  chrome: { Icon: SiGooglechrome, color: '#4285F4' },
  firefox: { Icon: SiFirefoxbrowser, color: '#FF7139' },
  npm: { Icon: SiNpm, color: '#CB3837' },
  pnpm: { Icon: SiPnpm, color: '#F69220' },
  bun: { Icon: SiBun, color: '#FBF0DF' },
  deno: { Icon: SiDeno, color: 'var(--color-ink)' },
  webassembly: { Icon: SiWebassembly, color: '#654FF0' },
  auth0: { Icon: SiAuth0, color: '#EB5424' },
} satisfies Record<string, { Icon: IconType; color: string }>

export type TechnologyIconName = keyof typeof libraryMarks

interface TechnologyIconProps extends SVGProps<SVGSVGElement> {
  name: TechnologyIconName
  /** Render in brand colours instead of the inherited text colour. */
  brand?: boolean
}

export function TechnologyIcon({ name, brand = false, className, style }: TechnologyIconProps) {
  const { Icon, color } = libraryMarks[name]
  const brandStyle: CSSProperties | undefined = brand ? { ...style, color } : style

  return <Icon className={className} style={brandStyle} aria-hidden="true" />
}
