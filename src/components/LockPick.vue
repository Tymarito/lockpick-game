<template>
  <div class="lockpick-container">
    <div class="progress-hud">
      <div class="circle" :class="{ filled: currentLevel > 0 }"></div>
      <div class="circle" :class="{ filled: currentLevel > 1 }"></div>
    </div>

    <div class="lock-shimmer" :class="shimmerClass" />
    <div
      v-if="nearLockSweetspot"
      class="center-indicator"
      :class="feedbackLevel"
      :style="{ transform: `translate(-50%, -50%) scale(${pulseScale})` }"
    />

    <img src="/schloss.png" class="lock-img" :style="lockStyle" />

    <svg class="dietrich-svg" width="500" height="500">
      <g
        :transform="`rotate(${hasLockedPick ? finalAngle : currentAngle}, 250, 320)`"
        :class="{ broken: isBroken, damaged: isDamaged }"
      >
        <line
          v-if="!isBroken"
          x1="250"
          y1="60"
          x2="250"
          y2="290"
          stroke="white"
          stroke-width="5"
          stroke-linecap="round"
          filter="drop-shadow(0 0 3px #fff)"
        />
      </g>
    </svg>

    <img
      src="/schraubenzieher.png"
      class="screwdriver-img"
      :class="{ active: nearLockSweetspot || isRotating }"
    />

    <input
      type="range"
      min="-180"
      max="180"
      v-model="currentAngle"
      class="angle-slider"
      :disabled="lockUnlocked || !nearLockSweetspot"
    />

    <div class="status" v-if="lockUnlocked">✅ Schloss geöffnet!</div>
    <div class="status fail" v-if="isBroken">💥 Dietrich gebrochen!</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const currentLevel = ref(0)
const isBroken = ref(false)
const isDamaged = ref(false)
const lockUnlocked = computed(() => currentLevel.value >= 2)

const lockRotation = ref(0)
const currentAngle = ref(0)
const finalAngle = ref(0)

const targetLockAngle = ref(0)
const targetPickAngle = ref(0)

const pickTolerance = Math.random() * 2 + 3
const lockTolerance = Math.random() * 2 + 3
const breakSpeed = 75
const maxDamage = 8

const isRotating = ref(false)
const pickLocked = ref(false)
const hasLockedPick = ref(false)
const damageScore = ref(0)

let rotationInterval: ReturnType<typeof setInterval> | null = null
const rotationDir = ref<'left' | 'right' | null>(null)

const nearLockSweetspot = computed(() =>
  Math.abs(lockRotation.value - targetLockAngle.value) < lockTolerance
)
const nearPickSweetspot = computed(() =>
  Math.abs(currentAngle.value - targetPickAngle.value) < pickTolerance
)

const shimmerClass = computed(() => {
  if (nearLockSweetspot.value) return 'green shimmer'
  const diff = targetLockAngle.value - lockRotation.value
  const movingRight = rotationDir.value === 'right'
  const movingLeft = rotationDir.value === 'left'
  if ((movingRight && diff > 0) || (movingLeft && diff < 0)) return 'orange shimmer'
  return 'red shimmer'
})

const lockStyle = computed(() => ({
  transform: `translate(-50%, -50%) rotate(${lockRotation.value}deg)`
}))

const feedbackLevel = computed(() => {
  if (!nearLockSweetspot.value) return ''
  const diff = targetPickAngle.value - currentAngle.value
  const movingToward =
    (diff > 0 && currentAngle.value < targetPickAngle.value) ||
    (diff < 0 && currentAngle.value > targetPickAngle.value)

  if (Math.abs(diff) < 5) return 'indicator-green'
  if (Math.abs(diff) < 20 && movingToward) return 'indicator-orange'
  return 'indicator-red'
})

const pulseScale = computed(() => {
  const diff = Math.abs(currentAngle.value - targetPickAngle.value)
  if (!nearLockSweetspot.value) return 0
  if (diff < 5) return 1.3
  if (diff < 15) return 1.1
  return 0.9
})

function setNewTargetAngles() {
  let newLock = 0, newPick = 0
  do {
    newLock = Math.random() * 180 - 90
    newPick = Math.random() * 180 - 90
  } while (
    Math.abs(newLock - targetLockAngle.value) < 25 ||
    Math.abs(newPick - targetPickAngle.value) < 25
  )
  targetLockAngle.value = newLock
  targetPickAngle.value = newPick

  currentAngle.value = 0
  lockRotation.value = 0
  finalAngle.value = 0
  pickLocked.value = false
  hasLockedPick.value = false
  isBroken.value = false
  isDamaged.value = false
  damageScore.value = 0
}

function startRotation(dir: 'left' | 'right') {
  if (rotationInterval) clearInterval(rotationInterval)
  rotationDir.value = dir
  isRotating.value = true
  rotationInterval = setInterval(() => {
    if (isBroken.value || lockUnlocked.value) return
    lockRotation.value += dir === 'right' ? 0.5 : -0.5
  }, 16)
}

function stopRotation() {
  if (rotationInterval) clearInterval(rotationInterval)
  isRotating.value = false
  rotationDir.value = null
}

watch([lockRotation, currentAngle], () => {
  if (isBroken.value || lockUnlocked.value) return
  if (nearLockSweetspot.value && nearPickSweetspot.value && !pickLocked.value) {
    currentLevel.value++
    pickLocked.value = true
    hasLockedPick.value = true

    if (currentLevel.value < 2) {
      setTimeout(() => {
        setNewTargetAngles()
      }, 600)
    }
  }
})

let lastAngle = currentAngle.value
let lastTime = Date.now()
let wrongDirectionStartAngle = currentAngle.value

watch(currentAngle, (newVal) => {
  if (isBroken.value || lockUnlocked.value || !nearLockSweetspot.value) return

  const now = Date.now()
  const delta = Math.abs(newVal - lastAngle)
  const timeDiff = now - lastTime
  const speed = delta / (timeDiff / 1000)
  const diff = Math.abs(newVal - targetPickAngle.value)

  if (!hasLockedPick.value && diff < 15) {
    finalAngle.value = newVal
    hasLockedPick.value = true
  }

  const movingTowardSweetspot =
    (newVal > targetPickAngle.value && newVal > lastAngle) ||
    (newVal < targetPickAngle.value && newVal < lastAngle)

  const movedWrong = Math.abs(newVal - wrongDirectionStartAngle)

  if (!hasLockedPick.value) {
    if (!movingTowardSweetspot && movedWrong >= 20) {
      damageScore.value++
      wrongDirectionStartAngle = newVal
      isDamaged.value = true
      setTimeout(() => (isDamaged.value = false), 200)
      if (damageScore.value >= maxDamage) isBroken.value = true
    }

    if (speed > breakSpeed) {
      damageScore.value++
      isDamaged.value = true
      setTimeout(() => (isDamaged.value = false), 200)
      if (damageScore.value >= maxDamage) isBroken.value = true
    }

    if (movingTowardSweetspot) {
      wrongDirectionStartAngle = newVal // reset
    }
  }

  lastAngle = newVal
  lastTime = now
})

function handleKey(e: KeyboardEvent) {
  if (e.code === 'KeyA') {
    if (e.type === 'keydown') startRotation('left')
    else stopRotation()
  } else if (e.code === 'KeyD') {
    if (e.type === 'keydown') startRotation('right')
    else stopRotation()
  }
}

onMounted(() => {
  setNewTargetAngles()
  window.addEventListener('keydown', handleKey)
  window.addEventListener('keyup', handleKey)
})

onUnmounted(() => {
  if (rotationInterval) clearInterval(rotationInterval)
  window.removeEventListener('keydown', handleKey)
  window.removeEventListener('keyup', handleKey)
})
</script>


<style scoped>
.lockpick-container {
  position: relative;
  width: 500px;
  height: 600px;
  margin: 40px auto;
  background: rgba(10, 10, 10, 0.75);
  border-radius: 20px;
  border: 1px solid #2aa7a1;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(42, 167, 161, 0.2);
}

/* Schimmer mit radialem Glow-Effekt */
.lock-shimmer {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 3; /* ÜBER dem Lock-Image */
  pointer-events: none;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  mix-blend-mode: screen;
}
.lock-shimmer.red {
  background: radial-gradient(circle, rgba(255, 0, 0, 0.4), transparent 80%);
}
.lock-shimmer.orange {
  background: radial-gradient(circle, rgba(255, 140, 0, 0.35), transparent 80%);
}
.lock-shimmer.green {
  background: radial-gradient(circle, rgba(0, 255, 150, 0.4), transparent 80%);
}

.shimmer {
  animation: pulse 1.3s infinite;
}
@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.07); }
}

.center-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 4;
  transition: all 0.3s ease-in-out;
}
.indicator-red {
  width: 24px;
  height: 24px;
  background: rgba(255, 0, 0, 0.25);
  border: 2px solid red;
}
.indicator-orange {
  width: 34px;
  height: 34px;
  background: rgba(255, 140, 0, 0.15);
  border: 2px solid orange;
}
.indicator-green {
  width: 45px;
  height: 45px;
  background: rgba(0, 255, 150, 0.12);
  border: 2px solid #00ff8a;
  animation: pulsePick 1.1s infinite;
}
@keyframes pulsePick {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.2); }
}

.progress-hud {
  display: flex;
  justify-content: center;
  gap: 18px;
  padding: 20px 0 10px;
  z-index: 5;
}
.circle {
  width: 24px;
  height: 24px;
  border: 2px solid white;
  border-radius: 50%;
  background-color: transparent;
  transition: background 0.3s ease;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.3);
}
.circle.filled { background-color: #00ff6e; }

.lock-img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px;
  transform: translate(-50%, -50%);
  z-index: 2;
  pointer-events: none;
}

.dietrich-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 500px;
  height: 500px;
  pointer-events: none;
  z-index: 4;
}
.dietrich-svg g {
  transition: transform 0.3s ease-in-out;
}
.dietrich-svg .shake {
  animation: shake 0.3s ease-in-out infinite;
}
.dietrich-svg .broken {
  opacity: 0.2;
}
.dietrich-svg .damaged line {
  stroke: #ff4d4d;
  filter: drop-shadow(0 0 2px #ff4d4d);
  transition: stroke 0.3s;
}

@keyframes shake {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(1deg); }
  100% { transform: rotate(-1deg); }
}

.screwdriver-img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 240px;
  transform: translate(60%, -45%) rotate(-60deg);
  transform-origin: left center;
  z-index: 5;
  transition: transform 0.2s ease;
  pointer-events: none;
}
.screwdriver-img.active {
  transform: translate(60%, -45%) rotate(-80deg);
}

.angle-slider {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  height: 30px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  appearance: none;
  outline: none;
  z-index: 4;
}
.angle-slider::-webkit-slider-thumb {
  appearance: none;
  width: 26px;
  height: 26px;
  background: #2aa7a1;
  border-radius: 50%;
  box-shadow: 0 0 10px #2aa7a1;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.angle-slider::-webkit-slider-thumb:active {
  transform: scale(0.9);
}
.angle-slider::-moz-range-thumb {
  width: 26px;
  height: 26px;
  background: #2aa7a1;
  border: none;
  border-radius: 50%;
  box-shadow: 0 0 10px #2aa7a1;
  cursor: pointer;
}

.status {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 22px;
  color: #ffffff;
  font-family: monospace;
  z-index: 6;
}
</style>
