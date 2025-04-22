// src/store/lockStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

type Phase = 'lock' | 'pick' | 'sync' | 'final' | 'done'
type Dir = 'left' | 'right'

export const useLockStore = defineStore('lock', () => {
  const phase = ref<Phase>('lock')
  const lockRotation = ref(0)
  const currentAngle = ref(0)

  const targetLockAngle = ref(Math.random() * 180 - 90)
  const targetPickAngle = ref(Math.random() * 180 - 90)
  const lockedPickAngle = ref(0)

  const lockTolerance = ref(5)
  const pickTolerance = ref(5)

  const isBroken = ref(false)
  const isDamaged = ref(false)
  const damageScore = ref(0)
  const maxDamage = 4
  const isRotating = ref(false)
  const rotationDir = ref<Dir | null>(null)

  const hasLockedPick = ref(false)
  const lockUnlocked = computed(() => phase.value === 'done')

  let rotationInterval: number | undefined
  let lastDamageAt = Date.now()

  let finalPhaseTimer: number | undefined

  let sweetspotOscillationInterval: number | undefined

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
  }

  function startRotation(dir: Dir) {
    if (rotationInterval) clearInterval(rotationInterval)
    rotationDir.value = dir
    isRotating.value = true
  
    // Sweetspot wackeln lassen in Phase 3
    if (phase.value === 'final' && !sweetspotOscillationInterval) {
      sweetspotOscillationInterval = window.setInterval(() => {
        targetLockAngle.value += Math.sin(Date.now() / 500) * 0.2 // Wackeln ±0.2°
      }, 100)
    }
  
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
    if (sweetspotOscillationInterval) {
      clearInterval(sweetspotOscillationInterval)
      sweetspotOscillationInterval = undefined
    }
  }

  function setCurrentAngle(val: number) {
    currentAngle.value = val
    checkLockProgress()
  }

  // Helper: garantiert anderer Winkel für finalen Lock-Sweetspot
  function setNewLockTargetFarFromCurrent() {
    let newAngle
    do {
      newAngle = Math.random() * 180 - 90
    } while (Math.abs(newAngle - lockRotation.value) < 40)
    targetLockAngle.value = newAngle
  }

  function checkLockProgress() {
    if (isBroken.value || lockUnlocked.value) return
  
    const lockInSweetspot = Math.abs(lockRotation.value - targetLockAngle.value) < lockTolerance.value
    const pickInSweetspot = Math.abs(currentAngle.value - targetPickAngle.value) < pickTolerance.value
  
    // Phase 1: LOCK
    if (phase.value === 'lock') {
      if (lockInSweetspot) {
        phase.value = 'pick'
      }
      return
    }
  
    // Phase 2: PICK
    if (phase.value === 'pick') {
      if (pickInSweetspot) {
        lockedPickAngle.value = currentAngle.value
        hasLockedPick.value = true
        setNewLockTargetFarFromCurrent()
        phase.value = 'final'
  
        // ⏱ 20s Timer starten für Final Phase
        if (finalPhaseTimer) clearTimeout(finalPhaseTimer)
        finalPhaseTimer = window.setTimeout(() => {
          if (phase.value === 'final') {
            isBroken.value = true
            stopRotation()
          }
        }, 20000)
      }
      return
    }
  
    // Phase 3: FINAL
    if (phase.value === 'final') {
      if (!lockInSweetspot) {
        const diff = targetLockAngle.value - lockRotation.value
        const correctDir = diff > 0 ? 'right' : 'left'
  
        const turningWrongDir =
          (rotationDir.value === 'right' && correctDir !== 'right') ||
          (rotationDir.value === 'left' && correctDir !== 'left')
  
        if (turningWrongDir) {
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
      }
  
      if (lockInSweetspot && pickInSweetspot) {
        phase.value = 'done'
        stopRotation()
        if (finalPhaseTimer) clearTimeout(finalPhaseTimer)
      }
    }
  }   

  const shimmerClass = computed(() => {
    const diff = targetLockAngle.value - lockRotation.value
    const correctDir = diff > 0 ? 'right' : 'left'

    if (Math.abs(diff) < lockTolerance.value) return 'green shimmer'
    if (
      (rotationDir.value === 'right' && correctDir === 'right') ||
      (rotationDir.value === 'left' && correctDir === 'left')
    ) {
      return 'orange shimmer'
    }
    return 'red shimmer'
  })

  const feedbackLevel = computed(() => {
    const diff = targetPickAngle.value - currentAngle.value
    const absDiff = Math.abs(diff)
  
    const isApproaching =
      (diff > 0 && rotationDir.value === 'right') ||
      (diff < 0 && rotationDir.value === 'left')
  
    if (absDiff < 5) return 'indicator-green'
    if (absDiff < 20 && isApproaching) return 'indicator-orange'
    return 'indicator-red'
  })
  

  const pulseScale = computed(() => {
    const diff = Math.abs(currentAngle.value - targetPickAngle.value)
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
    targetLockAngle,
    targetPickAngle,
    lockedPickAngle,
    lockTolerance,
    pickTolerance,
    isBroken,
    isDamaged,
    isRotating,
    hasLockedPick,
    damageScore,
    maxDamage,
    rotationDir,
    lockUnlocked,
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
