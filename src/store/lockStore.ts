// src/store/lockStore.ts
import { defineStore } from 'pinia'

export const useLockStore = defineStore('lock', {
  state: () => ({
    isUnlocked: false,
    isBroken: false,
    level: 0
  }),
  actions: {
    reset() {
      this.isUnlocked = false
      this.isBroken = false
      this.level = 0
    }
  }
})
