<script setup>
import { computed } from 'vue';
import { api } from '../../api.js';
import { useAdminOrdersStore } from '../../stores/adminOrders.js';

const ordersStore = useAdminOrdersStore();
const orders = computed(() => ordersStore.orders);
const error = computed(() => ordersStore.error);

async function setStatus(order, status) {
  const updated = await api.adminPatchOrder(order.id, { status });
  Object.assign(order, updated);
}

async function resend(order) {
  const updated = await api.adminResendOrder(order.id);
  Object.assign(order, updated);
}

const STATUS_LABELS = { new: 'Новый', accepted: 'Принят', done: 'Выполнен', cancelled: 'Отменён' };
const STATUS_COLORS = { new: '#e8590c', accepted: '#2f6fed', done: '#157347', cancelled: '#a39a8f' };
const POS_LABELS = { pending: 'в очереди', sent: 'отправлен в POS', error: 'ошибка отправки' };

// Статусы онлайн-оплаты (см. миграцию payments): not_required — оплата при
// получении, заказы до подключения ЮKassa тоже попадают сюда.
const PAY_LABELS = {
  not_required: 'оплата при получении',
  pending: '⏳ ждёт оплаты',
  paid: '✓ оплачен',
  canceled: '✕ оплата не прошла',
};
const PAY_CLASSES = { not_required: 'gray', pending: 'orange', paid: 'green', canceled: 'red' };

// Способы оплаты ЮKassa (payment_method.type из API)
const PAY_METHODS = {
  sbp: 'СБП',
  bank_card: 'карта',
  yoo_money: 'ЮMoney',
  sberbank: 'SberPay',
  tinkoff_bank: 'T-Pay',
  cash: 'наличные',
  mobile_balance: 'счёт телефона',
};

function payBadge(o) {
  let label = PAY_LABELS[o.payment_status] || o.payment_status;
  if (o.payment_status === 'paid' && o.payment_method) {
    label += ` · ${PAY_METHODS[o.payment_method] || o.payment_method}`;
  }
  return label;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <h1>Заказы</h1>
  <p v-if="error" class="error-text">{{ error }}</p>
  <p v-if="!orders.length" class="muted">Заказов пока нет.</p>

  <article v-for="o in orders" :key="o.id" class="card order" :style="{ borderLeftColor: STATUS_COLORS[o.status] }">
    <header class="order-head">
      <div>
        <strong>№ {{ o.public_id }}</strong>
        <span class="muted"> · {{ fmtDate(o.created_at) }}</span>
        <span class="badge orange" style="margin-left: 8px;">
          {{ o.type === 'delivery' ? 'Доставка' : 'Самовывоз' }}
        </span>
        <span v-if="o.scheduled_at" class="badge scheduled" style="margin-left: 6px;">
          ⏰ ко времени {{ fmtDate(o.scheduled_at) }}
        </span>
        <span class="badge" :class="{ sent: 'green', error: 'red', pending: 'gray' }[o.pos_status]" style="margin-left: 6px;">
          {{ POS_LABELS[o.pos_status] }}
        </span>
        <span
          class="badge"
          :class="PAY_CLASSES[o.payment_status] || 'gray'"
          :title="o.paid_at ? `Оплачен ${fmtDate(o.paid_at)}` : ''"
          style="margin-left: 6px;"
        >
          {{ payBadge(o) }}
        </span>
        <span v-if="o.paid_at" class="muted paid-at">оплачен {{ fmtDate(o.paid_at) }}</span>
      </div>
      <select
        class="status-select"
        :style="{ color: STATUS_COLORS[o.status] }"
        :value="o.status"
        @change="setStatus(o, $event.target.value)"
      >
        <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
      </select>
    </header>

    <div class="order-body">
      <div>
        <div><strong>{{ o.customer_name }}</strong> · <a :href="`tel:${o.customer_phone}`">{{ o.customer_phone }}</a></div>
        <div v-if="o.address" class="muted">{{ o.address }}</div>
        <div v-if="o.comment" class="muted">Комментарий: {{ o.comment }}</div>
        <div v-if="o.pos_status === 'error'" class="error-text pos-err">
          {{ o.pos_error }}
          <button class="btn-ghost btn-sm" @click="resend(o)">Отправить повторно</button>
        </div>
      </div>
      <div class="items">
        <div v-for="it in o.items" :key="it.id" class="item-line">
          {{ it.name }} × {{ Number(it.qty) }}{{ it.unit && it.unit !== 'шт' ? ` ${it.unit}` : '' }}
          <span class="muted">{{ Math.round(Number(it.price) * Number(it.qty) * 100) / 100 }} ₽</span>
        </div>
        <div v-if="Number(o.delivery_fee)" class="item-line muted">Доставка {{ Number(o.delivery_fee) }} ₽</div>
        <div class="item-line total">Итого {{ Number(o.total) }} ₽</div>
      </div>
    </div>
  </article>
</template>

<style scoped>
h1 { margin-bottom: 20px; }
.order {
  padding: 18px 20px;
  margin-bottom: 14px;
  border-radius: 16px;
  border-left: 4px solid transparent;
  box-shadow: 0 2px 10px rgba(31, 26, 23, .05);
  transition: box-shadow .15s, transform .15s;
}
.order:hover { box-shadow: 0 8px 22px rgba(31, 26, 23, .1); transform: translateY(-1px); }
.order-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.status-select {
  width: auto;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: #fff;
  font-weight: 700;
  font-size: 13px;
}
.order-body { display: flex; justify-content: space-between; gap: 20px; margin-top: 12px; flex-wrap: wrap; }
.items { text-align: right; font-size: 14px; }
.item-line { padding: 2px 0; }
.item-line.total { font-weight: 800; font-size: 15px; border-top: 1px solid var(--border); margin-top: 6px; padding-top: 8px; }
.pos-err { margin-top: 8px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.paid-at { margin-left: 8px; font-size: 12px; white-space: nowrap; }
.badge.scheduled { background: #e7f0ff; color: #2f6fed; font-weight: 800; }
</style>
