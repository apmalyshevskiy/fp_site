<script setup>
import { computed, ref } from 'vue';
import { useCartStore } from '../stores/cart.js';
import WeightCalculator from './WeightCalculator.vue';

const props = defineProps({ product: { type: Object, required: true } });
const cart = useCartStore();

const showCalc = ref(false);
const isWeight = computed(() => !!props.product.isWeight);
const isPiece = computed(() => (props.product.unit || 'шт') === 'шт');
const inCartQty = computed(() => cart.qtyOf(props.product.id));
const qtyLabel = computed(() =>
  isPiece.value ? inCartQty.value : `${inCartQty.value} ${props.product.unit}`
);

function onAddClick() {
  if (isWeight.value) showCalc.value = true;
  else cart.add(props.product);
}

function onCalcConfirm(qty) {
  cart.setItem(props.product, qty);
  showCalc.value = false;
}
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
        <span class="price">{{ product.price }} ₽<span v-if="!isPiece" class="per-unit">/{{ product.unit }}</span></span>

        <!-- Весовой товар: количество открывает калькулятор -->
        <button v-if="isWeight && inCartQty" class="qty-pill" @click="showCalc = true">
          {{ qtyLabel }} ✎
        </button>

        <!-- Штучный товар: обычные +/− -->
        <div v-else-if="inCartQty" class="qty">
          <button class="qty-btn" @click="cart.remove(product.id)">−</button>
          <span class="qty-label">{{ qtyLabel }}</span>
          <button class="qty-btn" @click="cart.add(product)">+</button>
        </div>

        <button v-else class="btn btn-sm" @click="onAddClick">В корзину</button>
      </div>
    </div>

    <WeightCalculator
      v-if="showCalc"
      :product="product"
      :initial-qty="inCartQty"
      @close="showCalc = false"
      @confirm="onCalcConfirm"
    />
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
.per-unit { font-weight: 600; font-size: 13px; color: var(--muted); }
.qty { display: flex; align-items: center; gap: 10px; font-weight: 700; }
.qty-label { white-space: nowrap; font-size: 14px; }
.qty-btn {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 18px;
  line-height: 1;
}
.qty-pill {
  padding: 7px 14px;
  border-radius: 20px;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
}
</style>
