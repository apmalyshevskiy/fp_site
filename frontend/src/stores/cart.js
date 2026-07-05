import { defineStore } from 'pinia';

// Дробные количества (0.5 кг и т.п.): считаем с округлением до 3 знаков
const round3 = (n) => Math.round(n * 1000) / 1000;

// Порядок добавления в корзину (не зависит от числовых id, которые JS всегда
// перебирает по возрастанию в Object.keys/values — из-за этого позиции "прыгали"
// по номеру в меню, а не по порядку добавления).
function loadOrder(items) {
  const saved = JSON.parse(localStorage.getItem('cartOrder') || 'null');
  const order = Array.isArray(saved) ? saved.filter((id) => items[id] !== undefined) : [];
  for (const item of Object.values(items)) {
    if (!order.includes(item.id)) order.push(item.id);
  }
  return order;
}

export const useCartStore = defineStore('cart', {
  state: () => {
    // items: { [productId]: { id, name, price, qty, unit, step } }
    const items = JSON.parse(localStorage.getItem('cart') || '{}');
    return { items, order: loadOrder(items) };
  },
  getters: {
    list: (s) => s.order.map((id) => s.items[id]).filter(Boolean),
    count: (s) => s.order.length,
    total: (s) =>
      Math.round(Object.values(s.items).reduce((a, i) => a + i.price * i.qty, 0) * 100) / 100,
    qtyOf: (s) => (id) => s.items[id]?.qty || 0,
  },
  actions: {
    persist() {
      localStorage.setItem('cart', JSON.stringify(this.items));
      localStorage.setItem('cartOrder', JSON.stringify(this.order));
    },
    dropFromOrder(id) {
      this.order = this.order.filter((oid) => oid !== id);
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
          isWeight: !!(product.isWeight ?? product.is_weight),
          imageUrl: product.imageUrl || null,
        };
        this.order.push(product.id);
      }
      this.persist();
    },
    // Установить точное количество (калькулятор весового товара); 0 удаляет
    setItem(product, qty) {
      if (!(qty > 0)) {
        delete this.items[product.id];
        this.dropFromOrder(product.id);
      } else {
        const step = Number(product.step ?? product.qtyStep) > 0 ? Number(product.step ?? product.qtyStep) : 1;
        const existing = this.items[product.id];
        if (existing) {
          existing.qty = round3(Math.min(qty, 99));
        } else {
          this.items[product.id] = {
            id: product.id,
            name: product.name,
            price: product.price,
            qty: round3(Math.min(qty, 99)),
            unit: product.unit || 'шт',
            step,
            isWeight: !!(product.isWeight ?? product.is_weight),
            imageUrl: product.imageUrl || null,
          };
          this.order.push(product.id);
        }
      }
      this.persist();
    },
    remove(id) {
      const existing = this.items[id];
      if (!existing) return;
      const step = Number(existing.step) > 0 ? Number(existing.step) : 1;
      existing.qty = round3(existing.qty - step);
      if (existing.qty < step - 1e-9) {
        delete this.items[id];
        this.dropFromOrder(existing.id);
      }
      this.persist();
    },
    // Ручной ввод: весовой товар — любое количество,
    // штучный — округление до ближайшего кратного шагу. 0 удаляет позицию.
    setQty(id, rawQty) {
      const existing = this.items[id];
      if (!existing) return;
      const step = Number(existing.step) > 0 ? Number(existing.step) : 1;
      const qty = Number(String(rawQty).replace(',', '.'));
      if (!Number.isFinite(qty) || qty <= 0) {
        delete this.items[id];
        this.dropFromOrder(existing.id);
      } else if (existing.isWeight) {
        existing.qty = round3(Math.min(qty, 99));
      } else {
        if (qty < step / 2) {
          delete this.items[id];
          this.dropFromOrder(existing.id);
        } else {
          existing.qty = round3(Math.min(Math.max(Math.round(qty / step), 1) * step, 99));
        }
      }
      this.persist();
    },
    clear() {
      this.items = {};
      this.order = [];
      this.persist();
    },
  },
});
