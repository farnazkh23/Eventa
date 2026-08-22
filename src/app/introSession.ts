export const introSessionKey = 'eventa:intro-played'

export function shouldPlayIntro(alreadyPlayed: boolean, prefersReducedMotion: boolean) {
  return !alreadyPlayed && !prefersReducedMotion
}
