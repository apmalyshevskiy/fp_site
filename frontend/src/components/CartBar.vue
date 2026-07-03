<script setup>
import { useCartStore } from '../stores/cart.js';
const cart = useCartStore();
</script>

<template>
  <transition name="slide">
    <div v-if="cart.count" class="cart-bar">
      <router-link to="/checkout" class="cart-bar-inner">
        <span>{{ cart.count }} поз. · {{ cart.total }} ₽</span>
        <span class="go">Оформить заказ →</span>
      </router-link>
    </div>
  </transition>
</template>

<style scoped>
.cart-bar {
  position: fixed;
  left: 0; right: 0; bottom: 16px;
  display: flex;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}
.cart-bar-inner {
  pointer-events: auto;
  display: flex;
  gap: 24px;
  align-items: center;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  padding: 14px 26px;
  border-radius: 30px;
  box-shadow: 0 6px 24px rgba(0,0,0,.25);
}
.slide-enter-from, .slide-leave-to { transform: translateY(80px); opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: all .25s; }
</style>
