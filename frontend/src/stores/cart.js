import { defineStore } from 'pinia';

// Дробные количества (0.5 кг и т.п.): считаем с округлением до 3 знаков
const round3 = (n) => Math.round(n * 1000) / 1000;

// Ключ строки корзины: товар без модификаторов -> "id"; с модификаторами ->
// "id|optId.optId..." — один и тот же товар с разным выбором лежит разными
// строками (капучино с сиропом и без — разные позиции).
function keyFor(productId, modifiers) {
  const ids = (modifiers || []).map((m) => Number(m.id)).sort((a, b) => a - b);
  return ids.length ? `${productId}|${ids.join('.')}` : String(productId);
}

// Порядок добавления в корзину (не зависит от числовых id, которые JS всегда
// перебирает по возрастанию в Object.keys/values — из-за этого позиции "прыгали"
// по номеру в меню, а не по порядку добавления).
function loadOrder(items) {
  const saved = JSON.parse(localStorage.getItem('cartOrder') || 'null');
  const order = Array.isArray(saved) ? saved.map(String).filter((k) => items[k] !== undefined) : [];
  for (const item of Object.values(items)) {
    if (!order.includes(item.key)) order.push(item.key);
  }
  return order;
}

// Совместимость со старыми сохранёнными корзинами (до модификаторов):
// у строк не было key/modifiers — нормализуем.
function loadItems() {
  const raw = JSON.parse(localStorage.getItem('cart') || '{}');
  const items = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = v.key || String(v.id ?? k);
    items[key] = { ...v, key, modifiers: v.modifiers || [] };
  }
  return items;
}

export const useCartStore = defineStore('cart', {
  state: () => {
    // items: { [key]: { key, id, name, price, qty, unit, step, modifiers } }
    const items = loadItems();
    return { items, order: loadOrder(items) };
  },
  getters: {
    list: (s) => s.order.map((k) => s.items[k]).filter(Boolean),
    count: (s) => s.order.length,
    total: (s) =>
      Math.round(Object.values(s.items).reduce((a, i) => a + i.price * i.qty, 0) * 100) / 100,
    // Количество товара суммарно по всем его строкам (для бейджа на карточке)
    qtyOf: (s) => (productId) =>
      round3(Object.values(s.items).reduce((a, i) => (i.id === productId ? a + i.qty : a), 0)),
  },
  actions: {
    persist() {
      localStorage.setItem('cart', JSON.stringify(this.items));
      localStorage.setItem('cartOrder', JSON.stringify(this.order));
    },
    dropFromOrder(key) {
      this.order = this.order.filter((k) => k !== key);
    },
    // product.price должна уже включать доплаты за модификаторы
    add(product, modifiers = null) {
      const mods = modifiers || product.modifiers || [];
      const key = keyFor(product.id, mods);
      const step = Number(product.step ?? product.qtyStep) > 0 ? Number(product.step ?? product.qtyStep) : 1;
      const existing = this.items[key];
      if (existing) {
        existing.step = Number(existing.step) > 0 ? Number(existing.step) : step;
        existing.qty = round3(Math.min(existing.qty + existing.step, 99));
      } else {
        this.items[key] = {
          key,
          id: product.id,
          name: product.name,
          price: product.price,
          qty: step,
          unit: product.unit || 'шт',
          step,
          isWeight: !!(product.isWeight ?? product.is_weight),
          imageUrl: product.imageUrl || null,
          modifiers: mods,
        };
        this.order.push(key);
      }
      this.persist();
    },
    // Установить точное количество (калькулятор весового товара); 0 удаляет.
    // Весовые товары без модификаторов — ключ равен id.
    setItem(product, qty) {
      const key = keyFor(product.id, null);
      if (!(qty > 0)) {
        delete this.items[key];
        this.dropFromOrder(key);
      } else {
        const step = Number(product.step ?? product.qtyStep) > 0 ? Number(product.step ?? product.qtyStep) : 1;
        const existing = this.items[key];
        if (existing) {
          existing.qty = round3(Math.min(qty, 99));
        } else {
          this.items[key] = {
            key,
            id: product.id,
            name: product.name,
            price: product.price,
            qty: round3(Math.min(qty, 99)),
            unit: product.unit || 'шт',
            step,
            isWeight: !!(product.isWeight ?? product.is_weight),
            imageUrl: product.imageUrl || null,
            modifiers: [],
          };
          this.order.push(key);
        }
      }
      this.persist();
    },
    remove(key) {
      key = String(key);
      const existing = this.items[key];
      if (!existing) return;
      const step = Number(existing.step) > 0 ? Number(existing.step) : 1;
      existing.qty = round3(existing.qty - step);
      if (existing.qty < step - 1e-9) {
        delete this.items[key];
        this.dropFromOrder(key);
      }
      this.persist();
    },
    // Ручной ввод: весовой товар — любое количество,
    // штучный — округление до ближайшего кратного шагу. 0 удаляет позицию.
    setQty(key, rawQty) {
      key = String(key);
      const existing = this.items[key];
      if (!existing) return;
      const step = Number(existing.step) > 0 ? Number(existing.step) : 1;
      const qty = Number(String(rawQty).replace(',', '.'));
      if (!Number.isFinite(qty) || qty <= 0) {
        delete this.items[key];
        this.dropFromOrder(key);
      } else if (existing.isWeight) {
        existing.qty = round3(Math.min(qty, 99));
      } else {
        if (qty < step / 2) {
          delete this.items[key];
          this.dropFromOrder(key);
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
