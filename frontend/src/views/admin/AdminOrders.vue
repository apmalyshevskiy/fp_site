<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { api } from '../../api.js';

const orders = ref([]);
const error = ref('');
let timer;

async function load() {
  try {
    orders.value = await api.adminGetOrders();
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(() => {
  load();
  timer = setInterval(load, 15000);
});
onUnmounted(() => clearInterval(timer));

async function setStatus(order, status) {
  const updated = await api.adminPatchOrder(order.id, { status });
  Object.assign(order, updated);
}

async function resend(order) {
  const updated = await api.adminResendOrder(order.id);
  Object.assign(order, updated);
}

const STATUS_LABELS = { new: 'Новый', accepted: 'Принят', done: 'Выполнен', cancelled: 'Отменён' };
const POS_LABELS = { pending: 'в очереди', sent: 'отправлен в POS', error: 'ошибка отправки' };

function fmtDate(d) {
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <h1>Заказы</h1>
  <p v-if="error" class="error-text">{{ error }}</p>
  <p v-if="!orders.length" class="muted">Заказов пока нет.</p>

  <article v-for="o in orders" :key="o.id" class="card order">
    <header class="order-head">
      <div>
        <strong>№ {{ o.public_id }}</strong>
        <span class="muted"> · {{ fmtDate(o.created_at) }}</span>
        <span class="badge orange" style="margin-left: 8px;">
          {{ o.type === 'delivery' ? 'Доставка' : 'Самовывоз' }}
        </span>
        <span class="badge" :class="{ sent: 'green', error: 'red', pending: 'gray' }[o.pos_status]" style="margin-left: 6px;">
          {{ POS_LABELS[o.pos_status] }}
        </span>
      </div>
      <select :value="o.status" @change="setStatus(o, $event.target.value)">
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
.order { padding: 16px 18px; margin-bottom: 14px; }
.order-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.order-head select { width: auto; }
.order-body { display: flex; justify-content: space-between; gap: 20px; margin-top: 10px; flex-wrap: wrap; }
.items { text-align: right; font-size: 14px; }
.item-line { padding: 2px 0; }
.item-line.total { font-weight: 800; border-top: 1px solid var(--border); margin-top: 4px; padding-top: 6px; }
.pos-err { margin-top: 8px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
</style>
