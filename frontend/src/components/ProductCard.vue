<script setup>
import { computed, ref } from 'vue';
import { useCartStore } from '../stores/cart.js';
import { formatPrice } from '../format.js';
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
const nutritionLine = computed(() => {
  const p = props.product;
  const parts = [];
  if (p.kilocalories != null) parts.push(`${p.kilocalories} ккал`);
  if (p.protein != null || p.fat != null || p.carbohydrate != null) {
    const fmt = (v) => (v != null ? v : '—');
    parts.push(`Б/Ж/У ${fmt(p.protein)}/${fmt(p.fat)}/${fmt(p.carbohydrate)}`);
  }
  return parts.join(' · ');
});

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
      <!-- Бейдж скидки (как в Я.Еде) -->
      <div v-if="product.discountPercent" class="disc-badge">-{{ product.discountPercent }}%</div>
      <!-- Количество в корзине поверх фото -->
      <div v-if="inCartQty" class="img-badge">{{ qtyLabel }}</div>
    </div>
    <div class="body">
      <h3 class="name">{{ product.name }}</h3>
      <p v-if="product.weightLabel" class="weight muted">{{ product.weightLabel }}</p>
      <p v-if="product.description" class="desc muted">{{ product.description }}</p>
      <p v-if="product.compound" class="compound muted">Состав: {{ product.compound }}</p>
      <p v-if="nutritionLine" class="nutrition muted">{{ nutritionLine }}</p>
      <p v-if="product.allergens" class="allergens muted">Аллергены: {{ product.allergens }}</p>
      <div class="bottom">
        <span class="price" :class="{ discounted: product.oldPrice }">
          {{ formatPrice(product.price) }} ₽<span v-if="!isPiece" class="per-unit">/{{ product.unit }}</span>
          <s v-if="product.oldPrice" class="old-price">{{ formatPrice(product.oldPrice) }} ₽</s>
        </span>

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

        <button v-else class="add-btn" @click="onAddClick">+</button>
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
.product {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  border-color: #ded5c8;
  box-shadow: 0 1px 2px rgba(31, 26, 23, .04);
  transition: box-shadow .18s, transform .18s;
}
.product:hover {
  box-shadow: 0 10px 24px rgba(31, 26, 23, .1);
  transform: translateY(-2px);
}
/* min-height: 0 обязателен: .product — flex-колонка, и без него автоматический
   минимальный размер flex-элемента (по содержимому) позволяет портретным фото
   продавливать высоту, игнорируя aspect-ratio — карточки «прыгают» по высоте. */
.img-wrap { aspect-ratio: 4 / 3; min-height: 0; overflow: hidden; background: #f3efe9; position: relative; border-bottom: 1px solid #ded5c8; }
.img-badge {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, .4);
  color: #fff;
  font-size: 66px;
  font-weight: 400;
  text-shadow: 0 2px 10px rgba(0,0,0,.65);
  pointer-events: none;
}
.weight { margin: -3px 0 6px; font-size: 13px; }
.img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
.img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 34px; opacity: .4;
}
.body { padding: 12px; display: flex; flex-direction: column; flex: 1; }
.name { margin: 0 0 6px; font-size: 19px; font-weight: 700; letter-spacing: -.1px; }
.desc { margin: 0 0 8px; font-size: 15px; flex: 1; }
.compound, .nutrition, .allergens { margin: 0 0 6px; font-size: 12px; line-height: 1.3; }
.allergens { color: #b35309; }
.bottom { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.price { font-weight: 800; font-size: 20px; }
.price.discounted { color: #c0392b; }
.old-price {
  margin-left: 6px;
  color: var(--muted);
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
}
.disc-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 10px;
  border-radius: 12px;
  background: #e03131;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .18);
}
.per-unit { font-weight: 600; font-size: 14px; color: var(--muted); }
.qty { display: flex; align-items: center; gap: 10px; font-weight: 500; }
.qty-label { white-space: nowrap; font-size: 18px; }
.qty-btn {
  width: 36px; height: 36px;
  border-radius: 11px;
  background: var(--accent);
  color: #fff;
  font-size: 24px;
  line-height: 1;
}
.qty-pill {
  padding: 7px 13px;
  border-radius: 20px;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
}
.add-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 26px;
  font-weight: 400;
  line-height: 1;
  transition: filter .15s;
}
.add-btn:hover { filter: brightness(1.08); }
</style>
