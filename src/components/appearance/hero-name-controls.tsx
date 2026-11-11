import type { ParticlePreferenceKey } from '@/lib/appearance'
import { useAppearance } from './appearance-context'

const effectRows: readonly {
  key: Exclude<ParticlePreferenceKey, 'cloud'>
  label: string
  description: string
}[] = [
  {
    key: 'scan',
    label: 'Scan',
    description:
      'A band of accent light sweeps across the name every few seconds.',
  },
  {
    key: 'dust',
    label: 'Dust drift',
    description:
      'Motes leave the letters and stream north-east with short trails.',
  },
  {
    key: 'hover',
    label: 'Pointer interaction',
    description:
      'Particles part around the pointer and settle back when it leaves.',
  },
]

export function HeroNameControls() {
  const { particles, setParticlePreference } = useAppearance()

  return (
    <div className="surface-tinted border border-line p-5 lg:col-span-2">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        Hero name
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Render the home page name as a live particle cloud. Off shows quiet
        type, with no canvas or animation.
      </p>

      <SwitchRow
        label="Particle cloud"
        description="Gather the name from points, then keep it alive while visible."
        checked={particles.cloud}
        onChange={(value) => setParticlePreference('cloud', value)}
      />

      <div className="mt-3 grid gap-2 border-t border-line pt-3">
        {effectRows.map((row) => (
          <SwitchRow
            key={row.key}
            label={row.label}
            description={row.description}
            checked={particles[row.key]}
            disabled={!particles.cloud}
            onChange={(value) => setParticlePreference(row.key, value)}
          />
        ))}
      </div>
    </div>
  )
}

function SwitchRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="cursor-target flex w-full items-center justify-between gap-4 border border-line px-3 py-3 text-left transition-colors hover:border-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`relative block h-5 w-9 shrink-0 border transition-colors ${
          checked ? 'border-accent bg-accent/10' : 'border-line bg-canvas/40'
        }`}
      >
        <span
          className={`absolute top-0.5 size-3.5 transition-transform duration-150 ${
            checked ? 'translate-x-4 bg-accent' : 'translate-x-0.5 bg-muted'
          }`}
        />
      </span>
    </button>
  )
}
