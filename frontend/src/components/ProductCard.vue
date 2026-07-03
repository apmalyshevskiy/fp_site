<script setup>
import { useCartStore } from '../stores/cart.js';

const props = defineProps({ product: { type: Object, required: true } });
const cart = useCartStore();
</script>

<template>
  <article class="card product">
    <div class="img-wrap">
      <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" loading="lazy" />
      <div v-else class="img-placeholder">🍽️</div>
    </div>
    <div class="body">
      <h3 class="name">{{ product.name }}</h3>
      <p v-if="product.description" class="desc muted">{{ product.description }}</p>
      <div class="bottom">
        <span class="price">{{ product.price }} ₽</span>
        <div v-if="cart.qtyOf(product.id)" class="qty">
          <button class="qty-btn" @click="cart.remove(product.id)">−</button>
          <span>{{ cart.qtyOf(product.id) }}</span>
          <button class="qty-btn" @click="cart.add(product)">+</button>
        </div>
        <button v-else class="btn btn-sm" @click="cart.add(product)">В корзину</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product { display: flex; flex-direction: column; overflow: hidden; }
.img-wrap { aspect-ratio: 4 / 3; background: #f3efe9; }
.img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
.img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 42px; opacity: .4;
}
.body { padding: 14px; display: flex; flex-direction: column; flex: 1; }
.name { margin: 0 0 6px; font-size: 17px; }
.desc { margin: 0 0 10px; font-size: 13px; flex: 1; }
.bottom { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.price { font-weight: 800; font-size: 17px; }
.qty { display: flex; align-items: center; gap: 10px; font-weight: 700; }
.qty-btn {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 18px;
  line-height: 1;
}
</style>
