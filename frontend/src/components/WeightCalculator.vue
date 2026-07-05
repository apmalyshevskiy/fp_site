<script setup>
import { computed, ref, watch } from 'vue';
import { formatPrice } from '../format.js';

const props = defineProps({
  product: { type: Object, required: true },
  initialQty: { type: Number, default: 0 },
});
const emit = defineEmits(['close', 'confirm']);

const round3 = (n) => Math.round(n * 1000) / 1000;
const fmt = (n) => round3(n).toString().replace('.', ',');

const step = computed(() => (Number(props.product.qtyStep) > 0 ? Number(props.product.qtyStep) : 0.5));
const display = ref(fmt(props.initialQty > 0 ? props.initialQty : step.value));

watch(() => props.initialQty, (v) => { if (v > 0) display.value = fmt(v); });

const qty = computed(() => {
  const n = Number(display.value.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
});
const sum = computed(() => Math.round(props.product.price * qty.value * 100) / 100);
const valid = computed(() => qty.value > 0 && qty.value <= 99);

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back'];

function pressKey(k) {
  if (k === 'back') return backspace();
  if (k === ',') return pressComma();
  return pressDigit(k);
}
function pressDigit(d) {
  const next = display.value === '0' ? d : display.value + d;
  if (next.replace(',', '.').length > 6) return;
  const n = Number(next.replace(',', '.'));
  if (!Number.isFinite(n) || n > 99) return;
  display.value = next;
}
function pressComma() {
  if (display.value.includes(',')) return;
  display.value = display.value ? display.value + ',' : '0,';
}
function backspace() {
  display.value = display.value.length > 1 ? display.value.slice(0, -1) : '0';
}
function confirm() {
  if (!valid.value) return;
  emit('confirm', round3(qty.value));
}
</script>

<template>
  <Teleport to="body">
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <h3 class="title">{{ product.name }}</h3>
      <p class="price-line">{{ formatPrice(product.price) }} ₽ за {{ product.unit }}</p>

      <div class="qty-display">
        <div class="label">Количество</div>
        <div class="value">{{ display }} <span class="unit">{{ product.unit }}</span></div>
      </div>

      <div class="keypad">
        <button v-for="k in keys" :key="k" class="key" :class="{ 'key-back': k === 'back' }" @click="pressKey(k)">
          <span v-if="k !== 'back'">{{ k }}</span>
          <span v-else>⌫</span>
        </button>
      </div>

      <p v-if="!valid" class="hint">Укажите количество от 0 до 99</p>

      <div class="actions">
        <button class="cancel-btn" @click="emit('close')">Отмена</button>
        <button class="btn add" :disabled="!valid" @click="confirm">
          {{ initialQty > 0 ? 'Сохранить' : 'Продолжить' }} · {{ formatPrice(sum) }} ₽
        </button>
      </div>
      <button v-if="initialQty > 0" class="remove" @click="emit('confirm', 0)">Убрать из корзины</button>
    </div>
  </div>
  </Teleport>
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
  width: 238px;
  max-width: 100%;
  padding: 17px;
  text-align: center;
  background: #29241f;
  color: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, .35);
}
.title { margin: 0 0 3px; color: #fff; font-size: 14px; }
.price-line { margin: 0 0 11px; color: rgba(255, 255, 255, .55); font-size: 10px; }
.qty-display { margin-bottom: 13px; }
.qty-display .label { font-size: 9px; color: rgba(255, 255, 255, .55); margin-bottom: 3px; }
.qty-display .value { font-size: 22px; font-weight: 700; color: var(--accent); }
.qty-display .value .unit { font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, .7); }
.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 13px;
}
.key {
  aspect-ratio: 1;
  border-radius: 50%;
  background: transparent;
  border: 1.5px solid rgba(255, 255, 255, .25);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  transition: background .15s;
}
.key:hover { background: rgba(255, 255, 255, .1); }
.key-back { font-size: 13px; color: rgba(255, 255, 255, .75); }
.hint { margin: 0 0 7px; color: #ff8a7a; font-size: 9px; }
.actions { display: flex; gap: 7px; }
.cancel-btn {
  flex: 1;
  padding: 9px;
  border-radius: 9px;
  background: rgba(255, 255, 255, .08);
  color: #fff;
  font-weight: 600;
  font-size: 11px;
}
.cancel-btn:hover { background: rgba(255, 255, 255, .14); }
.add { flex: 1; padding: 9px; border-radius: 9px; font-size: 11px; }
.remove {
  width: 100%;
  margin-top: 7px;
  background: transparent;
  color: #ff8a7a;
  font-weight: 600;
  padding: 6px;
  font-size: 10px;
}
</style>
