import { defineStore } from 'pinia';
import { api } from '../api.js';

export const useAdminOrdersStore = defineStore('adminOrders', {
  state: () => ({
    orders: [],
    error: '',
    knownIds: null, // null до первой загрузки — чтобы не сигналить об уже существующих заказах
    alerting: false,
  }),
  actions: {
    async load() {
      try {
        const fresh = await api.adminGetOrders();
        if (this.knownIds && fresh.some((o) => !this.knownIds.has(o.id))) {
          this.alerting = true;
        }
        this.knownIds = new Set(fresh.map((o) => o.id));
        this.orders = fresh;
        this.error = '';
      } catch (e) {
        this.error = e.message;
      }
    },
    dismissAlert() {
      this.alerting = false;
    },
  },
});
