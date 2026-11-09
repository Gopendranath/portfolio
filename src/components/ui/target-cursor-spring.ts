export type Spring = { x: number; v: number }

export const spring = (
  state: Spring,
  goal: number,
  stiffness: number,
  damping: number,
  dt: number,
) => {
  const steps = Math.max(
    1,
    Math.ceil(dt * Math.max(damping, Math.sqrt(stiffness))),
  )
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    state.v += (stiffness * (goal - state.x) - damping * state.v) * h
    state.x += state.v * h
  }
}
