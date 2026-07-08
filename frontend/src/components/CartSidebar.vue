<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useCartStore } from '../stores/cart.js';
import { useSiteStore } from '../stores/site.js';
import { formatPrice } from '../format.js';

const cart = useCartStore();
const site = useSiteStore();

function qtySuffix(item) {
  return item.unit && item.unit !== 'шт' ? ` ${item.unit}` : '';
}

function unitPrice(item) {
  return `${formatPrice(item.price)} ₽/${item.unit || 'шт'}`;
}

function lineSum(item) {
  return formatPrice(Math.round(item.price * item.qty * 100) / 100);
}

function modsLine(item) {
  return (item.modifiers || [])
    .map((m) => (m.price > 0 ? `${m.name} +${formatPrice(m.price)} ₽` : m.name))
    .join(' · ');
}

function onClear() {
  if (confirm('Очистить корзину?')) cart.clear();
}

const bodyEl = ref(null);
const bodyHeight = ref('auto');
let resizeObserver;

function measureBody() {
  if (bodyEl.value) bodyHeight.value = `${Math.ceil(bodyEl.value.getBoundingClientRect().height)}px`;
}

onMounted(() => {
  measureBody();
  resizeObserver = new ResizeObserver(measureBody);
  resizeObserver.observe(bodyEl.value);
});
onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<template>
  <aside class="cart-side card">
    <header class="head">
      <h3>Корзина</h3>
      <button v-if="cart.count" class="trash" title="Очистить корзину" @click="onClear">🗑</button>
    </header>

    <div class="cart-body-wrap" :style="{ height: bodyHeight }">
      <div ref="bodyEl" class="cart-body-inner">
        <p v-if="!cart.count" class="muted empty">Корзина пуста — добавьте что-нибудь из меню</p>

        <template v-else>
          <TransitionGroup tag="div" name="item" class="items">
            <div v-for="item in cart.list" :key="item.key" class="item">
              <div class="thumb">
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                <span v-else>🍽️</span>
              </div>
              <div class="info">
                <div class="name">{{ item.name }}</div>
                <div v-if="modsLine(item)" class="mods muted">{{ modsLine(item) }}</div>
                <div class="unit-price muted">{{ unitPrice(item) }}</div>
                <div class="qty-row">
                  <button class="qty-btn" @click="cart.remove(item.key)">−</button>
                  <input
                    class="qty-input"
                    type="text"
                    inputmode="decimal"
                    :value="item.qty"
                    @change="cart.setQty(item.key, $event.target.value)"
                  />
                  <span v-if="qtySuffix(item)" class="unit muted">{{ item.unit }}</span>
                  <button class="qty-btn" @click="cart.add(item)">+</button>
                </div>
                <div class="sum">{{ lineSum(item) }} ₽</div>
              </div>
            </div>
          </TransitionGroup>

          <div class="details">
            <h4>Детали заказа</h4>
            <div class="row"><span class="muted">Товаров на сумму</span><span>{{ formatPrice(cart.total) }} ₽</span></div>
            <div class="row total"><span>Итого</span><span>{{ formatPrice(cart.total) }} ₽</span></div>
          </div>

          <p v-if="!site.orderingOpen" class="closed-note">{{ site.orderingClosedMessage }}</p>
          <router-link v-else to="/checkout">
            <button class="btn go">
              <span>Перейти к оформлению</span>
              <span>{{ formatPrice(cart.total) }} ₽</span>
            </button>
          </router-link>
        </template>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.cart-side {
  padding: 16px;
  position: sticky;
  top: 60px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}
.head { display: flex; justify-content: space-between; align-items: center; }
.head h3 { margin: 0; }
.trash { background: transparent; font-size: 17px; opacity: .6; }
.trash:hover { opacity: 1; }
.empty { font-size: 14px; }
.cart-body-wrap { overflow: hidden; transition: height .3s ease; }
.cart-body-inner { overflow: hidden; }
.items { margin-top: 10px; position: relative; }
.item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  background: var(--card);
  transition: all .3s ease;
}
.item-enter-from, .item-leave-to { opacity: 0; transform: translateX(16px); }
.item-leave-active { position: absolute; width: 100%; }
.thumb {
  width: 54px; height: 54px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #f3efe9;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  overflow: hidden;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.info { flex: 1; min-width: 0; }
.name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.mods { font-size: 11.5px; line-height: 1.3; margin-bottom: 2px; }
.unit-price { font-size: 12px; margin-bottom: 6px; }
.qty-row { display: flex; align-items: center; gap: 8px; }
.qty-btn {
  width: 30px; height: 30px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 19px;
  line-height: 1;
}
.qty-input {
  width: 56px;
  padding: 3px 4px;
  text-align: center;
  font-weight: 500;
  font-size: 16px;
}
.unit { font-size: 12px; }
.sum { font-size: 16px; font-weight: 700; margin-top: 5px; }
.details { margin-top: 12px; }
.details h4 { margin: 0 0 8px; }
.row { display: flex; justify-content: space-between; font-size: 14px; padding: 2px 0; }
.row.total { font-weight: 800; font-size: 16px; margin-top: 4px; }
.go {
  width: 100%;
  margin-top: 12px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 26px;
  font-size: 15px;
}
.closed-note {
  margin: 12px 0 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fff3e6;
  border: 1.5px solid #f5c89a;
  color: #8a4b08;
  font-size: 13px;
  font-weight: 600;
}
</style>
