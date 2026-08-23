export function shouldPlayIntro(prefersReducedMotion: boolean) {
  return !prefersReducedMotion
}

export function shouldStartIntroPlayback(playbackStartedForDocument: boolean) {
  return !playbackStartedForDocument
}
