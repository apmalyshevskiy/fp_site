<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart.js';
import { useSiteStore } from '../stores/site.js';
import { api } from '../api.js';
import { formatPrice } from '../format.js';

const cart = useCartStore();
const site = useSiteStore();
const router = useRouter();

const type = ref(site.pickupEnabled || !site.deliveryEnabled ? 'pickup' : 'delivery');
const name = ref('');
const phone = ref('');
const address = ref('');
const comment = ref('');
const submitting = ref(false);
const error = ref('');

const deliveryFee = computed(() => {
  if (type.value !== 'delivery') return 0;
  if (site.deliveryFreeFrom > 0 && cart.total >= site.deliveryFreeFrom) return 0;
  return site.deliveryFee;
});
const total = computed(() => cart.total + deliveryFee.value);
const lineTotal = (item) => Math.round(item.price * item.qty * 100) / 100;
const belowMin = computed(
  () => type.value === 'delivery' && site.deliveryMinOrder > 0 && cart.total < site.deliveryMinOrder
);

async function submit() {
  error.value = '';
  submitting.value = true;
  try {
    const result = await api.createOrder({
      type: type.value,
      customerName: name.value,
      customerPhone: phone.value,
      address: address.value,
      comment: comment.value,
      items: cart.list.map((i) => ({ productId: i.id, qty: i.qty })),
    });
    // Онлайн-оплата: уходим на страницу оплаты ЮKassa. Корзину НЕ чистим здесь —
    // если оплату не завершат, заказ останется в корзине; очистим на странице
    // «Заказ принят» после подтверждения оплаты.
    if (result.confirmationUrl) {
      window.location.href = result.confirmationUrl;
      return;
    }
    cart.clear();
    router.push(`/order/${result.publicId}`);
  } catch (e) {
    error.value = e.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <h1>Оформление заказа</h1>

  <div v-if="!cart.count" class="muted">
    Корзина пуста. <router-link to="/" style="color: var(--accent); font-weight: 600;">Перейти в меню</router-link>
  </div>

  <div v-else class="layout">
    <form class="card form" @submit.prevent="submit">
      <div class="type-switch" v-if="site.pickupEnabled && site.deliveryEnabled">
        <button type="button" :class="{ active: type === 'pickup' }" @click="type = 'pickup'">Самовывоз</button>
        <button type="button" :class="{ active: type === 'delivery' }" @click="type = 'delivery'">Доставка</button>
      </div>

      <p v-if="type === 'pickup'" class="muted pickup-info">
        Заберите заказ по адресу: <strong>{{ site.settings.address }}</strong>
      </p>

      <label class="field">
        <span>Ваше имя *</span>
        <input v-model="name" required maxlength="100" placeholder="Иван" />
      </label>
      <label class="field">
        <span>Телефон *</span>
        <input v-model="phone" required type="tel" placeholder="+7 900 000-00-00" />
      </label>
      <label v-if="type === 'delivery'" class="field">
        <span>Адрес доставки *</span>
        <input v-model="address" required maxlength="300" placeholder="Улица, дом, квартира" />
      </label>
      <label class="field">
        <span>Комментарий к заказу</span>
        <textarea v-model="comment" rows="2" maxlength="500" placeholder="Например: без лука"></textarea>
      </label>

      <p v-if="belowMin" class="error-text">
        Минимальная сумма заказа на доставку — {{ formatPrice(site.deliveryMinOrder) }} ₽
      </p>
      <p v-if="error" class="error-text">{{ error }}</p>

      <button class="btn submit" :disabled="submitting || belowMin">
        {{ submitting ? 'Отправляем…' : `Заказать за ${formatPrice(total)} ₽` }}
      </button>
    </form>

    <aside class="card summary">
      <h3>Ваш заказ</h3>
      <div v-for="item in cart.list" :key="item.id" class="line">
        <div class="line-top">
          <span class="line-name">{{ item.name }}</span>
          <div class="qty">
            <button class="qty-btn" @click="cart.remove(item.id)">−</button>
            <input
              class="qty-input"
              type="text"
              inputmode="decimal"
              :value="item.qty"
              @change="cart.setQty(item.id, $event.target.value)"
            />
            <button class="qty-btn" @click="cart.add(item)">+</button>
          </div>
        </div>
        <div class="line-bottom">
          <span class="muted">{{ formatPrice(item.price) }} ₽ × {{ item.qty }}{{ item.unit && item.unit !== 'шт' ? ` ${item.unit}` : '' }}</span>
          <span class="line-total">{{ formatPrice(lineTotal(item)) }} ₽</span>
        </div>
      </div>
      <hr />
      <div class="row"><span>Сумма</span><span>{{ formatPrice(cart.total) }} ₽</span></div>
      <div class="row" v-if="type === 'delivery'">
        <span>Доставка</span>
        <span>{{ deliveryFee ? `${formatPrice(deliveryFee)} ₽` : 'бесплатно' }}</span>
      </div>
      <div class="row total"><span>Итого</span><span>{{ formatPrice(total) }} ₽</span></div>
    </aside>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 1fr 425px; gap: 20px; align-items: start; }
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
.form { padding: 22px; }
.summary { padding: 28px; }
.summary h3 { font-size: 23px; }
.type-switch { display: flex; gap: 8px; margin-bottom: 18px; }
.type-switch button {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  background: #fff;
  border: 1.5px solid var(--border);
  font-weight: 700;
}
.type-switch button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.pickup-info { margin-top: 0; }
.submit { width: 100%; padding: 14px; font-size: 16px; margin-top: 6px; }
.line { padding: 10px 0; border-bottom: 1px solid var(--border); }
.line-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.line-name { font-size: 18px; font-weight: 600; }
.line-bottom { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 14px; margin-top: 4px; }
.line-total { font-weight: 800; font-size: 18px; white-space: nowrap; }
.qty { display: flex; align-items: center; gap: 8px; font-weight: 700; flex-shrink: 0; }
.qty-btn { width: 33px; height: 33px; border-radius: 9px; background: var(--accent); color: #fff; }
.qty-input {
  width: 78px;
  padding: 5px 7px;
  text-align: center;
  font-weight: 700;
  font-size: 16px;
}
hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
.row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 19px; }
.row.total { font-weight: 800; font-size: 21px; margin-top: 6px; }
</style>
