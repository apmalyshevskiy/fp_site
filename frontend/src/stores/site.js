import { defineStore } from 'pinia';
import { api } from '../api.js';

export const useSiteStore = defineStore('site', {
  state: () => ({
    settings: {},
    loaded: false,
  }),
  getters: {
    deliveryEnabled: (s) => s.settings.delivery_enabled === 'true',
    pickupEnabled: (s) => s.settings.pickup_enabled === 'true',
    deliveryFee: (s) => Number(s.settings.delivery_fee || 0),
    deliveryFreeFrom: (s) => Number(s.settings.delivery_free_from || 0),
    deliveryMinOrder: (s) => Number(s.settings.delivery_min_order || 0),
  },
  actions: {
    async load() {
      this.settings = await api.getSettings();
      this.loaded = true;
      if (this.settings.site_name) document.title = this.settings.site_name;
      if (this.settings.accent_color) {
        document.documentElement.style.setProperty('--accent', this.settings.accent_color);
      }
    },
  },
});
