<template>
  <div class="lockpick-container" :class="{ fail: flashFail, success: isUnlocked }">
    <div class="progress-hud">
      <div class="circle" :class="{ filled: successCount > 0 }"></div>
      <div class="circle" :class="{ filled: successCount > 1 }"></div>
    </div>

    <img
      src="/schloss.png"
      class="lock-img"
      :style="{ transform: `translate(-50%, -50%) rotate(${lockRotation}deg)` }"
    />

    <svg class="dietrich-svg" width="500" height="500">
      <g
        :class="{ 'shake': flashFail, 'broken': isBroken }"
        :transform="`rotate(${currentAngle}, 250, 320)`"
      >
        <line
          v-if="!isBroken"
          x1="250"
          y1="80"
          x2="250"
          y2="320"
          stroke="white"
          stroke-width="4"
          stroke-linecap="round"
        />
      </g>
    </svg>

    <img
      src="/schraubenzieher.png"
      class="screwdriver-img"
      :class="{ active: screwdriverActive }"
      alt="Schraubenzieher"
    />

    <input
      type="range"
      min="-180"
      max="180"
      v-model="currentAngle"
      class="angle-slider"
    />

    <div class="status" v-if="isUnlocked">✅ Schloss geöffnet!</div>
    <div class="status fail" v-if="isBroken">💥 Dietrich gebrochen!</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useLockStore } from '@/store/lockStore'
import { storeToRefs } from 'pinia'

const store = useLockStore()
const {
  currentAngle,
  isUnlocked,
  correctPickAngle,
  correctPickSpeed,
  pickTolerance,
  speedTolerance
} = storeToRefs(store)

const lockRotation = ref(0)
const isBlocked = ref(false)
const isBroken = ref(false)
const flashFail = ref(false)
const successCount = ref(0)
const dangerScore = ref(0)
const screwdriverActive = ref(false)

const blockPoint = ref(10 + Math.random() * 10)
const secondBlock = ref(20 + Math.random() * 10)
const currentCorrectAngle = ref(correctPickAngle.value)

let rotationInterval: ReturnType<typeof setInterval> | null = null
let rotationDirection: 'left' | 'right' | null = null

const lastAngle = ref(currentAngle.value)
const lastTime = ref(Date.now())

function setNextPhase() {
  currentCorrectAngle.value = Math.floor(Math.random() * 180 - 90)
  correctPickSpeed.value = 2 + Math.random() * 1.5
  pickTolerance.value = 10 + Math.random() * 5
  speedTolerance.value = 2 + Math.random() * 1

  if (successCount.value === 0) {
    blockPoint.value = 10 + Math.random() * 10
  } else {
    secondBlock.value = 20 + Math.random() * 10
  }
}

function startRotation(direction: 'left' | 'right') {
  if (rotationInterval) clearInterval(rotationInterval)
  rotationDirection = direction
  screwdriverActive.value = true
  rotationInterval = setInterval(() => {
    if (successCount.value === 0 && lockRotation.value >= blockPoint.value) {
      isBlocked.value = true
      clearInterval(rotationInterval!)
    } else if (successCount.value === 1 && lockRotation.value >= secondBlock.value) {
      isBlocked.value = true
      clearInterval(rotationInterval!)
    } else {
      lockRotation.value += direction === 'right' ? 0.25 : -0.25
    }
  }, 16)
}

function stopRotation() {
  if (rotationInterval) clearInterval(rotationInterval)
  screwdriverActive.value = false
  rotationDirection = null
}

watch(currentAngle, (newVal) => {
  if (isBroken.value) return

  const now = Date.now()
  const deltaAngle = Math.abs(newVal - lastAngle.value)
  const deltaTime = now - lastTime.value
  const speed = deltaAngle / (deltaTime / 1000)
  const diffPick = Math.abs(newVal - currentCorrectAngle.value)

  const isSpeedOk = Math.abs(speed - correctPickSpeed.value) < speedTolerance.value
  const isAngleOk = diffPick < pickTolerance.value

  if (isBlocked.value) {
    if (isAngleOk && isSpeedOk) {
      successCount.value++
      dangerScore.value = 0
      isBlocked.value = false
      setNextPhase()

      setTimeout(() => {
        rotationInterval = setInterval(() => {
          lockRotation.value += rotationDirection === 'right' ? 0.25 : -0.25
        }, 16)
      }, 150)

      if (successCount.value >= 2) {
        isUnlocked.value = true
      }
    } else {
      if (speed > 12 && diffPick > 40) {
        isBroken.value = true
        return
      }

      if (diffPick > 20) {
        dangerScore.value += 1
        flashFail.value = true
        setTimeout(() => (flashFail.value = false), 150)

        if (dangerScore.value >= 5 + Math.floor(Math.random() * 2)) {
          isBroken.value = true
        }
      }
    }
  }

  lastAngle.value = newVal
  lastTime.value = now
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
  setNextPhase()
  window.addEventListener('keydown', handleKey)
  window.addEventListener('keyup', handleKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
  window.removeEventListener('keyup', handleKey)
  if (rotationInterval) clearInterval(rotationInterval)
})
</script>

<style scoped>
.lockpick-container {
  position: relative;
  width: 500px;
  height: 600px;
  margin: 40px auto;
  background: linear-gradient(354deg,
    rgba(42, 167, 161, 0.7) 0%,
    rgba(42, 167, 161, 0.7) 34%,
    rgba(42, 152, 159, 0.7) 67%,
    rgba(42, 133, 156, 0.7) 84%);
  border-radius: 20px;
  border: 1px solid #2aa7a1;
  box-shadow: 0 0 40px rgba(42, 167, 161, 0.2);
  overflow: hidden;
}

.lockpick-container.fail {
  animation: flashFail 0.2s ease;
}
@keyframes flashFail {
  0% { background-color: rgba(255, 0, 0, 0.3); }
  100% { background-color: inherit; }
}

.progress-hud {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 15px 0 5px;
}
.circle {
  width: 20px;
  height: 20px;
  border: 2px solid white;
  border-radius: 50%;
  background-color: transparent;
  transition: background 0.3s;
}
.circle.filled {
  background-color: #00ff6e;
}

.lock-img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px;
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
}

.dietrich-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 500px;
  height: 500px;
  pointer-events: none;
  z-index: 2;
}
.dietrich-svg .shake {
  animation: shake 0.15s linear 1;
}
.dietrich-svg .broken {
  opacity: 0.2;
  transition: opacity 0.3s ease-in-out;
}
@keyframes shake {
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-1px, 1px) rotate(-1deg); }
  50% { transform: translate(1px, -1px) rotate(1deg); }
  75% { transform: translate(-1px, 1px) rotate(-1deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

.screwdriver-img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 240px;
  transform: translate(60%, -45%) rotate(-60deg);
  transform-origin: left center;
  z-index: 3;
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
  z-index: 4;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  appearance: none;
  outline: none;
}
.angle-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  background: #2aa7a1;
  border-radius: 50%;
  box-shadow: 0 0 10px #2aa7a1;
  cursor: pointer;
  transition: background 0.2s ease;
}
.angle-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #2aa7a1;
  border: none;
  border-radius: 50%;
  box-shadow: 0 0 10px #2aa7a1;
  cursor: pointer;
}
.status {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 22px;
  color: #ffffff;
  font-family: monospace;
  z-index: 4;
}
</style>
