import { defineStore } from 'pinia';

// Дробные количества (0.5 кг и т.п.): считаем с округлением до 3 знаков
const round3 = (n) => Math.round(n * 1000) / 1000;

export const useCartStore = defineStore('cart', {
  state: () => ({
    // items: { [productId]: { id, name, price, qty, unit, step } }
    items: JSON.parse(localStorage.getItem('cart') || '{}'),
  }),
  getters: {
    list: (s) => Object.values(s.items),
    count: (s) => Object.keys(s.items).length,
    total: (s) =>
      Math.round(Object.values(s.items).reduce((a, i) => a + i.price * i.qty, 0) * 100) / 100,
    qtyOf: (s) => (id) => s.items[id]?.qty || 0,
  },
  actions: {
    persist() {
      localStorage.setItem('cart', JSON.stringify(this.items));
    },
    add(product) {
      const step = Number(product.step ?? product.qtyStep) > 0 ? Number(product.step ?? product.qtyStep) : 1;
      const existing = this.items[product.id];
      if (existing) {
        existing.step = Number(existing.step) > 0 ? Number(existing.step) : step;
        existing.qty = round3(Math.min(existing.qty + existing.step, 99));
      } else {
        this.items[product.id] = {
          id: product.id,
          name: product.name,
          price: product.price,
          qty: step,
          unit: product.unit || 'шт',
          step,
        };
      }
      this.persist();
    },
    remove(id) {
      const existing = this.items[id];
      if (!existing) return;
      const step = Number(existing.step) > 0 ? Number(existing.step) : 1;
      existing.qty = round3(existing.qty - step);
      if (existing.qty < step - 1e-9) delete this.items[id];
      this.persist();
    },
    // Ручной ввод: округляем до ближайшего кратного шагу, 0 удаляет позицию
    setQty(id, rawQty) {
      const existing = this.items[id];
      if (!existing) return;
      const step = Number(existing.step) > 0 ? Number(existing.step) : 1;
      const qty = Number(rawQty);
      if (!Number.isFinite(qty) || qty < step / 2) {
        delete this.items[id];
      } else {
        existing.qty = round3(Math.min(Math.max(Math.round(qty / step), 1) * step, 99));
      }
      this.persist();
    },
    clear() {
      this.items = {};
      this.persist();
    },
  },
});
