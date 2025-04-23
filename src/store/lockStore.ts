// src/store/lockStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

type Phase = 'lock' | 'pick' | 'final' | 'done'
type Dir = 'left' | 'right'

export const useLockStore = defineStore('lock', () => {
  const phase = ref<Phase>('lock')
  const lockRotation = ref(0)
  const currentAngle = ref(0)
  const lockedPickAngle = ref(0)

  const targetLockAngle = ref(Math.random() * 180 - 90)
  const targetPickAngle = ref(Math.random() * 180 - 90)

  const lockTolerance = ref(8)
  const pickTolerance = ref(8)

  const hasLockedPick = ref(false)
  const isBroken = ref(false)
  const isDamaged = ref(false)
  const damageScore = ref(0)
  const maxDamage = 4
  const isRotating = ref(false)
  const rotationDir = ref<Dir | null>(null)

  const lockUnlocked = computed(() => phase.value === 'done')
  const vibrationIntensity = ref(0)

  let rotationInterval: number | undefined
  let finalPhaseTimer: number | undefined
  let lastDamageAt = Date.now()
  let lastAngle = 0
  let lastAngleChangeAt = Date.now()

  let sweetspotStart: number | null = null
  let lockTimeout: number | null = null
  let pickTimeout: number | null = null

  const currentPickTarget = computed(() =>
    phase.value === 'pick' ? targetPickAngle.value : lockedPickAngle.value
  )

  function initLock() {
    phase.value = 'lock'
    lockRotation.value = 0
    currentAngle.value = 0
    lockedPickAngle.value = 0
    isBroken.value = false
    isDamaged.value = false
    damageScore.value = 0
    hasLockedPick.value = false
    targetLockAngle.value = Math.random() * 180 - 90
    targetPickAngle.value = Math.random() * 180 - 90
    sweetspotStart = null
    if (lockTimeout) clearTimeout(lockTimeout)
    if (pickTimeout) clearTimeout(pickTimeout)
  }

  function startRotation(dir: Dir) {
    if (rotationInterval) clearInterval(rotationInterval)
    if (phase.value === 'pick') return

    rotationDir.value = dir
    isRotating.value = true

    rotationInterval = window.setInterval(() => {
      if (isBroken.value || lockUnlocked.value) return
      const speed = phase.value === 'final' ? 0.3 : 0.7
      lockRotation.value += dir === 'right' ? speed : -speed
      checkLockProgress()
    }, 16)
  }

  function stopRotation() {
    if (rotationInterval) clearInterval(rotationInterval)
    isRotating.value = false
    rotationDir.value = null
  }

  function setCurrentAngle(val: number) {
    const now = Date.now()
    const diff = Math.abs(val - lastAngle)
    const delta = now - lastAngleChangeAt
    const speed = diff / (delta || 1)
    if (speed > 0.8) {
      damageScore.value++
      isDamaged.value = true
      setTimeout(() => isDamaged.value = false, 200)
      if (damageScore.value >= maxDamage) {
        isBroken.value = true
        stopRotation()
      }
    }

    lastAngle = val
    lastAngleChangeAt = now
    currentAngle.value = val
    checkLockProgress()
  }

  function setNewLockTargetFarFromCurrent() {
    let newAngle
    do {
      newAngle = Math.random() * 180 - 90
    } while (Math.abs(newAngle - lockRotation.value) < 40)
    targetLockAngle.value = newAngle
  }

  function checkLockProgress() {
    if (isBroken.value || lockUnlocked.value) return

    const lockDiff = Math.abs(lockRotation.value - targetLockAngle.value)
    const pickDiff = Math.abs(currentAngle.value - targetPickAngle.value)

    const lockInSweetspot = lockDiff <= lockTolerance.value
    const pickInSweetspot = pickDiff <= pickTolerance.value

    if (phase.value === 'lock') {
      if (lockInSweetspot && !lockTimeout) {
        lockTimeout = window.setTimeout(() => {
          if (phase.value === 'lock' && Math.abs(lockRotation.value - targetLockAngle.value) <= lockTolerance.value) {
            phase.value = 'pick'
            lockTimeout = null
          }
        }, 1000)
      } else if (!lockInSweetspot && lockTimeout) {
        clearTimeout(lockTimeout)
        lockTimeout = null
      }
      return
    }

    if (phase.value === 'pick') {
      if (pickInSweetspot && !pickTimeout) {
        pickTimeout = window.setTimeout(() => {
          if (phase.value === 'pick' && Math.abs(currentAngle.value - targetPickAngle.value) <= pickTolerance.value) {
            lockedPickAngle.value = currentAngle.value
            hasLockedPick.value = true
            setNewLockTargetFarFromCurrent()
            phase.value = 'final'
            pickTimeout = null

            if (finalPhaseTimer) clearTimeout(finalPhaseTimer)
            finalPhaseTimer = window.setTimeout(() => {
              if (phase.value === 'final') {
                isBroken.value = true
                stopRotation()
              }
            }, 30000)
          }
        }, 1000)
      } else if (!pickInSweetspot && pickTimeout) {
        clearTimeout(pickTimeout)
        pickTimeout = null
      }
      return
    }

    if (phase.value === 'final') {
      const pickNowCorrect = Math.abs(currentAngle.value - lockedPickAngle.value) < pickTolerance.value
      const lockNowCorrect = lockDiff < lockTolerance.value

      vibrationIntensity.value = Math.max(0, 1 - (lockDiff + Math.abs(currentAngle.value - lockedPickAngle.value)) / 100)

      const diff = targetLockAngle.value - lockRotation.value
      const correctDir = diff > 0 ? 'right' : 'left'
      const turningWrongDir =
        (rotationDir.value === 'right' && correctDir !== 'right') ||
        (rotationDir.value === 'left' && correctDir !== 'left')

      if (!lockNowCorrect && turningWrongDir) {
        const now = Date.now()
        if (now - lastDamageAt > 700) {
          damageScore.value++
          isDamaged.value = true
          setTimeout(() => (isDamaged.value = false), 200)
          if (damageScore.value >= maxDamage) {
            isBroken.value = true
            stopRotation()
            if (finalPhaseTimer) clearTimeout(finalPhaseTimer)
          }
          lastDamageAt = now
        }
      }

      if (lockNowCorrect && pickNowCorrect) {
        phase.value = 'done'
        stopRotation()
        if (finalPhaseTimer) clearTimeout(finalPhaseTimer)
      }
    }
  }

  const shimmerClass = computed(() => {
    if (phase.value !== 'lock') return ''
    const diff = targetLockAngle.value - lockRotation.value
    const absDiff = Math.abs(diff)
    const correctDir = diff > 0 ? 'right' : 'left'

    if (absDiff <= lockTolerance.value) return 'green shimmer'
    if (
      (rotationDir.value === 'right' && correctDir === 'right') ||
      (rotationDir.value === 'left' && correctDir === 'left')
    ) {
      return 'orange shimmer'
    }
    return 'red shimmer'
  })

  const feedbackLevel = computed(() => {
    if (phase.value !== 'pick') return ''
    const diff = Math.abs(currentAngle.value - targetPickAngle.value)
    if (diff <= pickTolerance.value) return 'indicator-green'
    if (diff <= pickTolerance.value + 10) return 'indicator-orange'
    return 'indicator-red'
  })

  const pulseScale = computed(() => {
    const diff = Math.abs(currentAngle.value - currentPickTarget.value)
    if (phase.value === 'lock') return 0.8
    if (diff < 5) return 1.3
    if (diff < 15) return 1.15
    if (diff < 30) return 1.05
    return 0.9
  })

  return {
    phase,
    lockRotation,
    currentAngle,
    lockedPickAngle,
    targetLockAngle,
    targetPickAngle,
    lockTolerance,
    pickTolerance,
    isBroken,
    isDamaged,
    damageScore,
    maxDamage,
    isRotating,
    rotationDir,
    hasLockedPick,
    lockUnlocked,
    vibrationIntensity,
    shimmerClass,
    feedbackLevel,
    pulseScale,
    initLock,
    startRotation,
    stopRotation,
    setCurrentAngle,
    checkLockProgress
  }
})
