import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { shouldPlayIntro, shouldStartIntroPlayback } from '../../app/introSession'
import styles from './IntroGate.module.css'

let initialPlaybackDecision: boolean | null = null
let playbackStartedForDocument = false

function getInitialPlaybackDecision() {
  if (typeof window === 'undefined') return false
  if (initialPlaybackDecision !== null) return initialPlaybackDecision

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  initialPlaybackDecision = shouldPlayIntro(prefersReducedMotion)
  return initialPlaybackDecision
}

export function IntroGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showIntro, setShowIntro] = useState(getInitialPlaybackDecision)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (!showIntro) return

    const video = videoRef.current
    if (!video) {
      navigate('/', { replace: true })
      setShowIntro(false)
      return
    }

    if (!shouldStartIntroPlayback(playbackStartedForDocument)) return
    playbackStartedForDocument = true

    const playback = video.play()
    playback?.catch(() => {
      navigate('/', { replace: true })
      setShowIntro(false)
    })
  }, [navigate, showIntro])

  function revealFirstPage(withFade: boolean) {
    navigate('/', { replace: true })
    if (!withFade) {
      setShowIntro(false)
      return
    }

    setIsExiting(true)
    window.setTimeout(() => setShowIntro(false), 180)
  }

  return (
    <>
      {(!showIntro || isExiting) && children}
      {showIntro && (
        <div className={`${styles.intro} ${isExiting ? styles.exiting : ''}`} aria-hidden="true">
          <div className={styles.frame}>
            <video
              ref={videoRef}
              className={styles.video}
              src="/media/eventa-intro.mp4"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={() => revealFirstPage(true)}
              onError={() => revealFirstPage(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
