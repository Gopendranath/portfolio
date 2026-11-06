import { useId } from 'react'
import { accentPalettes, cursorStyles } from '../../lib/appearance'
import { SectionLabel } from '../ui/section-label'
import { useAppearance } from './appearance-context'

export function AppearanceControls() {
  const { accent, cursorStyle, setAccent, setCursorStyle, resetAppearance } =
    useAppearance()
  const cursorLabelId = useId()
  const accentLabelId = useId()

  return (
    <section
      aria-label="Customize appearance"
      className="mt-20 border-t border-line pt-10"
    >
      <div className="flex items-end justify-between gap-6">
        <SectionLabel className="flex-1">Customize</SectionLabel>
        <button
          type="button"
          onClick={resetAppearance}
          className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Reset
        </button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="surface-tinted border border-line p-5">
          <h2
            id={cursorLabelId}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent"
          >
            Cursor
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Choose the pointer used across the site. More cursor styles are
            coming.
          </p>

          <div
            role="radiogroup"
            aria-labelledby={cursorLabelId}
            className="mt-5 grid gap-2"
          >
            {cursorStyles.map((style) => {
              const active = style.id === cursorStyle

              return (
                <label
                  key={style.id}
                  className={`cursor-target flex cursor-pointer items-start gap-3 border px-3 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                    active
                      ? 'border-accent bg-accent/5'
                      : 'border-line hover:border-muted/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="cursor-style"
                    value={style.id}
                    checked={active}
                    onChange={() => setCursorStyle(style.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid size-4 shrink-0 place-items-center border ${
                      active ? 'border-accent' : 'border-line'
                    }`}
                  >
                    {active ? (
                      <span className="size-1.5 bg-accent" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-ink">
                      {style.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {style.description}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="surface-tinted border border-line p-5">
          <h2
            id={accentLabelId}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent"
          >
            Theme color
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Sets the accent used by links, tags, highlights, and active states.
          </p>

          <div
            role="radiogroup"
            aria-labelledby={accentLabelId}
            className="mt-5 flex flex-wrap gap-2"
          >
            {accentPalettes.map((palette) => {
              const active = palette.id === accent

              return (
                <label
                  key={palette.id}
                  className={`cursor-target flex cursor-pointer items-center gap-2 border px-2.5 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                    active
                      ? 'border-accent bg-accent/5 text-ink'
                      : 'border-line text-muted hover:border-muted/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="accent"
                    value={palette.id}
                    checked={active}
                    onChange={() => setAccent(palette.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="size-4 shrink-0 rounded-full border border-line"
                    style={{ backgroundColor: palette.swatch }}
                  />
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em]">
                    {palette.label}
                  </span>
                </label>
              )
            })}
          </div>

          <div className="mt-5 border border-line bg-canvas/60 p-4">
            <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              <span className="size-1.5 bg-accent" aria-hidden="true" />
              Preview
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink">
              <span className="text-accent">Accent highlights</span> update
              links, tags, and active states.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-accent">
                Tag
              </span>
              <span className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                Muted
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        Preferences save to this browser.
      </p>
    </section>
  )
}
