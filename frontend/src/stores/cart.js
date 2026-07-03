import { defineStore } from 'pinia';

export const useCartStore = defineStore('cart', {
  state: () => ({
    // items: { [productId]: { id, name, price, qty } }
    items: JSON.parse(localStorage.getItem('cart') || '{}'),
  }),
  getters: {
    list: (s) => Object.values(s.items),
    count: (s) => Object.values(s.items).reduce((a, i) => a + i.qty, 0),
    total: (s) => Object.values(s.items).reduce((a, i) => a + i.price * i.qty, 0),
    qtyOf: (s) => (id) => s.items[id]?.qty || 0,
  },
  actions: {
    persist() {
      localStorage.setItem('cart', JSON.stringify(this.items));
    },
    add(product) {
      const existing = this.items[product.id];
      if (existing) existing.qty = Math.min(existing.qty + 1, 99);
      else this.items[product.id] = { id: product.id, name: product.name, price: product.price, qty: 1 };
      this.persist();
    },
    remove(id) {
      const existing = this.items[id];
      if (!existing) return;
      existing.qty -= 1;
      if (existing.qty <= 0) delete this.items[id];
      this.persist();
    },
    clear() {
      this.items = {};
      this.persist();
    },
  },
});
