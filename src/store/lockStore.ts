import { defineStore } from 'pinia'

export const useLockStore = defineStore('lock', {
  state: () => ({
    currentAngle: 0,
    tensionActive: false,
    isUnlocked: false,
    correctTensionAngle: Math.floor(Math.random() * 120) - 60,
    correctPickAngle: Math.floor(Math.random() * 120) - 60,
    correctPickSpeed: Math.random() * 2 + 0.5,         // deg/sec
    tensionTolerance: Math.random() * 2 + 2,           // ±2–4°
    pickTolerance: Math.random() * 2 + 2,              // ±2–4°
    speedTolerance: Math.random() * 0.4 + 0.2          // ±0.2–0.6 deg/s
  }),
})
