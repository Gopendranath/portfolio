const SCRAMBLE_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}=+*^?#'

export function buildScrambledText(
  text: string,
  revealed: number,
  random: () => number = Math.random,
): string {
  return Array.from(text)
    .map((character, index) => {
      if (character === ' ') {
        return character
      }

      if (index < revealed) {
        return character
      }

      return SCRAMBLE_CHARS[Math.floor(random() * SCRAMBLE_CHARS.length)]
    })
    .join('')
}

export function initialScramble(text: string): string {
  return Array.from(text)
    .map((character, index) =>
      character === ' '
        ? character
        : SCRAMBLE_CHARS[(index * 7 + 3) % SCRAMBLE_CHARS.length],
    )
    .join('')
}
