import { defineStore } from 'pinia';
import { api } from '../api.js';
import { getOrderingStatus, closedMessage } from '../workHours.js';

export const useSiteStore = defineStore('site', {
  state: () => ({
    settings: {},
    loaded: false,
    // «Тикающая» зависимость, чтобы статус приёма заказов пересчитывался
    // сам по себе раз в полминуты (граница открытия/закрытия), а не только
    // при перезагрузке страницы.
    nowTick: Date.now(),
  }),
  getters: {
    deliveryEnabled: (s) => s.settings.delivery_enabled === 'true',
    pickupEnabled: (s) => s.settings.pickup_enabled === 'true',
    deliveryFee: (s) => Number(s.settings.delivery_fee || 0),
    deliveryFreeFrom: (s) => Number(s.settings.delivery_free_from || 0),
    deliveryMinOrder: (s) => Number(s.settings.delivery_min_order || 0),
    orderingStatus: (s) => getOrderingStatus(s.settings, new Date(s.nowTick)),
    orderingOpen() { return this.orderingStatus.open; },
    orderingClosedMessage() { return this.orderingStatus.open ? '' : closedMessage(this.orderingStatus); },
  },
  actions: {
    async load() {
      this.settings = await api.getSettings();
      this.loaded = true;
      if (this.settings.site_name) document.title = this.settings.site_name;
      if (this.settings.accent_color) {
        document.documentElement.style.setProperty('--accent', this.settings.accent_color);
      }
      if (!this._clock) {
        this._clock = setInterval(() => { this.nowTick = Date.now(); }, 30000);
      }
    },
  },
});
