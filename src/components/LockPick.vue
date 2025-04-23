<!-- src/components/LockPick.vue -->
<template>
  <div class="lockpick-container">
    <!-- Progress -->
    <div class="progress-hud">
      <div class="circle" :class="{ filled: ['pick', 'final', 'done'].includes(store.phase) }"></div>
      <div class="circle" :class="{ filled: ['final', 'done'].includes(store.phase) }"></div>
      <div class="circle" :class="{ filled: store.phase === 'done' }"></div>
    </div>

    <!-- Shimmer Phase 1 -->
    <div v-if="store.phase === 'lock'" class="lock-shimmer" :class="store.shimmerClass" />

    <!-- Indicator Phase 2 -->
    <div
      v-if="store.phase === 'pick'"
      class="center-indicator"
      :class="store.feedbackLevel"
      :style="{ transform: `translate(-50%, -50%) scale(${store.pulseScale})` }"
    />

    <!-- Lock -->
    <img
      src="/schloss.png"
      class="lock-img"
      :style="{
        transform: `translate(-50%, -50%) rotate(${store.lockRotation}deg) scale(${1 + store.vibrationIntensity * 0.05})`,
        filter: `drop-shadow(0 0 ${10 + store.vibrationIntensity * 40}px #2aa7a1)`
      }"
    />

    <!-- Result -->
    <div class="result-box" v-if="store.lockUnlocked || store.isBroken">
      <div class="status" :class="{ success: store.lockUnlocked, fail: store.isBroken }">
        {{ store.lockUnlocked ? '✅ Schloss geöffnet!' : '💥 Dietrich gebrochen!' }}
      </div>
    </div>

    <!-- Dietrich -->
    <svg class="dietrich-svg" width="500" height="500">
      <g
        :transform="`rotate(${
          store.phase === 'final'
            ? store.currentAngle
            : store.hasLockedPick
              ? store.lockedPickAngle
              : store.currentAngle
        }, 250, 290)`"
        :class="{ broken: store.isBroken, damaged: store.isDamaged }"
      >
        <line
          v-if="!store.isBroken"
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

    <!-- Screwdriver -->
    <img
      src="/schraubenzieher.png"
      class="screwdriver-img"
      :class="{ active: store.isRotating }"
    />

    <!-- Slider -->
    <input
      type="range"
      min="-180"
      max="180"
      :value="store.currentAngle"
      @input="onAngleInput"
      class="angle-slider"
      :disabled="store.phase === 'lock' || store.lockUnlocked || store.isBroken"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useLockStore } from '@/store/lockStore'

const store = useLockStore()

function handleKey(e: KeyboardEvent) {
  if (store.lockUnlocked || store.isBroken) return
  if (e.code === 'KeyA') e.type === 'keydown' ? store.startRotation('left') : store.stopRotation()
  else if (e.code === 'KeyD') e.type === 'keydown' ? store.startRotation('right') : store.stopRotation()
}

function onAngleInput(e: Event) {
  const val = (e.target as HTMLInputElement)?.valueAsNumber
  store.setCurrentAngle(val)
}

onMounted(() => {
  store.initLock()
  window.addEventListener('keydown', handleKey)
  window.addEventListener('keyup', handleKey)
})

onUnmounted(() => {
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
  border-radius: 20px;
  border: 1px solid #2aa7a1;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(42, 167, 161, 0.2);
  background-color: rgba(10, 10, 10, 0.75);
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 80px 80px;
  backdrop-filter: blur(2px);
}


.lock-shimmer {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  mix-blend-mode: screen;
}
.lock-shimmer.red    { background: radial-gradient(circle, rgba(255, 0, 0, 0.4), transparent 80%); }
.lock-shimmer.orange { background: radial-gradient(circle, rgba(255, 140, 0, 0.5), transparent 80%); }
.lock-shimmer.green  { background: radial-gradient(circle, rgba(0, 255, 150, 0.5), transparent 80%); }
.shimmer { animation: pulse 1.3s infinite; }

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.07); }
}

.center-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  pointer-events: none;
  z-index: 4;
  transition: transform 0.3s ease, background 0.2s ease, border 0.2s ease;
}
.indicator-red    { width: 24px; height: 24px; background: rgba(255, 0, 0, 0.25); border: 2px solid red; }
.indicator-orange { width: 34px; height: 34px; background: rgba(255, 140, 0, 0.15); border: 2px solid orange; }
.indicator-green  { width: 45px; height: 45px; background: rgba(0, 255, 149, 0.48); border: 2px solid #00ff8a; }

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
  top: 20px;
  left: 0;
  width: 500px;
  height: 500px;
  pointer-events: none;
  z-index: 4;
}
.dietrich-svg g { transition: transform 0.25s ease-in-out; }
.dietrich-svg .broken { opacity: 0.2; }
.dietrich-svg .damaged line {
  stroke: #ff4d4d;
  filter: drop-shadow(0 0 2px #ff4d4d);
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
  height: 40px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  appearance: none;
  outline: none;
  z-index: 4;
}
.angle-slider::-webkit-slider-thumb {
  appearance: none;
  width: 36px;
  height: 36px;
  background: #2aa7a1;
  border-radius: 50%;
  box-shadow: 0 0 15px #2aa7a1;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.angle-slider::-webkit-slider-thumb:active {
  transform: scale(0.9);
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
.circle.filled {
  background-color: #00ff6e;
  border-color: #00ff6e;
}

.status {
  font-size: 22px;
  color: white;
  font-family: monospace;
  padding: 10px 20px;
  border-radius: 8px;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.8);
  border: 1px solid white;
}
.status.success { border-color: #00ff6e; color: #00ff6e; }
.status.fail { border-color: #ff4d4d; color: #ff4d4d; }

.result-box {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  width: 70%;
  animation: fadein 0.5s ease-in-out;
}
@keyframes fadein {
  from { opacity: 0; transform: translate(-50%, -60%); }
  to   { opacity: 1; transform: translate(-50%, -50%); }
}
</style>
