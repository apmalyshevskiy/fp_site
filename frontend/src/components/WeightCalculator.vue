<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  product: { type: Object, required: true },
  initialQty: { type: Number, default: 0 },
});
const emit = defineEmits(['close', 'confirm']);

const step = computed(() => (Number(props.product.qtyStep) > 0 ? Number(props.product.qtyStep) : 0.5));
const qty = ref(props.initialQty > 0 ? props.initialQty : step.value);

watch(() => props.initialQty, (v) => { if (v > 0) qty.value = v; });

const round3 = (n) => Math.round(n * 1000) / 1000;
const sum = computed(() => Math.round(props.product.price * (Number(qty.value) || 0) * 100) / 100);
const valid = computed(() => Number.isFinite(Number(qty.value)) && Number(qty.value) > 0 && Number(qty.value) <= 99);

function inc() { qty.value = round3(Math.min((Number(qty.value) || 0) + step.value, 99)); }
function dec() { qty.value = round3(Math.max((Number(qty.value) || 0) - step.value, step.value)); }
function onInput(e) {
  const v = Number(String(e.target.value).replace(',', '.'));
  qty.value = Number.isFinite(v) ? v : 0;
}
function confirm() {
  if (!valid.value) return;
  emit('confirm', round3(Number(qty.value)));
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal card">
      <button class="close" @click="emit('close')">✕</button>
      <h3 class="title">{{ product.name }}</h3>
      <p class="muted price-line">{{ product.price }} ₽ за {{ product.unit }}</p>

      <div class="qty-row">
        <button class="qty-btn" @click="dec">−</button>
        <div class="input-wrap">
          <input
            type="text"
            inputmode="decimal"
            :value="qty"
            @input="onInput"
            @keyup.enter="confirm"
          />
          <span class="unit">{{ product.unit }}</span>
        </div>
        <button class="qty-btn" @click="inc">+</button>
      </div>

      <p v-if="!valid" class="error-text hint">Укажите количество от 0 до 99</p>

      <button class="btn add" :disabled="!valid" @click="confirm">
        {{ initialQty > 0 ? 'Сохранить' : 'Добавить' }} · {{ sum }} ₽
      </button>
      <button v-if="initialQty > 0" class="remove" @click="emit('confirm', 0)">Убрать из корзины</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}
.modal {
  position: relative;
  width: 340px;
  max-width: 100%;
  padding: 24px;
  text-align: center;
}
.close {
  position: absolute;
  top: 10px; right: 10px;
  background: transparent;
  font-size: 16px;
  color: var(--muted);
}
.title { margin: 0 0 4px; }
.price-line { margin: 0 0 18px; }
.qty-row { display: flex; align-items: center; gap: 10px; }
.qty-btn {
  width: 44px; height: 44px;
  flex-shrink: 0;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: 22px;
}
.input-wrap { position: relative; flex: 1; }
.input-wrap input {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  padding-right: 52px;
}
.unit {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-weight: 600;
  font-size: 14px;
}
.hint { margin: 8px 0 0; }
.add { width: 100%; margin-top: 16px; padding: 13px; font-size: 16px; }
.remove {
  width: 100%;
  margin-top: 8px;
  background: transparent;
  color: #c0392b;
  font-weight: 600;
  padding: 8px;
}
</style>
