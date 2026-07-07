<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useSiteStore } from '../stores/site.js';
import { useCartStore } from '../stores/cart.js';
import { api } from '../api.js';

const props = defineProps({ publicId: String });
const site = useSiteStore();
const cart = useCartStore();

// not_required — оплата не требовалась (оплата при получении); paid — оплачено;
// pending — ждём подтверждения оплаты; canceled — оплата не завершена.
const status = ref('loading');
let timer = null;

async function check() {
  try {
    const { paymentStatus } = await api.getOrderStatus(props.publicId);
    status.value = paymentStatus;
    if (paymentStatus === 'paid' || paymentStatus === 'not_required') {
      cart.clear();
      stopPolling();
    } else if (paymentStatus === 'canceled') {
      stopPolling();
    }
  } catch {
    // заказ мог ещё не проиндексироваться — просто попробуем ещё раз по таймеру
  }
}

function stopPolling() {
  if (timer) { clearInterval(timer); timer = null; }
}

onMounted(() => {
  check();
  // Вебхук об оплате может прийти с небольшой задержкой — опрашиваем статус.
  timer = setInterval(check, 3000);
  // Страховка: не опрашиваем вечно
  setTimeout(stopPolling, 3 * 60 * 1000);
});
onUnmounted(stopPolling);
</script>

<template>
  <div class="wrap">
    <!-- Ожидание подтверждения оплаты -->
    <div v-if="status === 'pending' || status === 'loading'" class="card box">
      <div class="spinner"></div>
      <h1>Ожидаем оплату…</h1>
      <div class="order-id">№ {{ publicId }}</div>
      <p class="muted">
        Как только банк подтвердит платёж, заказ уйдёт на кухню. Эта страница
        обновится автоматически. Если вы ещё не оплатили — вернитесь на вкладку оплаты.
      </p>
    </div>

    <!-- Оплата не завершена -->
    <div v-else-if="status === 'canceled'" class="card box">
      <div class="icon icon-fail">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </div>
      <h1>Оплата не завершена</h1>
      <div class="order-id">№ {{ publicId }}</div>
      <p class="muted">
        Платёж не прошёл или был отменён. Вы можете оформить заказ заново.
      </p>
      <router-link to="/">
        <button class="btn go"><span>Вернуться в меню</span><span>→</span></button>
      </router-link>
    </div>

    <!-- Успех (оплачено или оплата при получении) -->
    <div v-else class="card box">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 12.5L10 17.5L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h1>Заказ принят!</h1>
      <div class="order-id">№ {{ publicId }}</div>
      <span v-if="status === 'paid'" class="paid-badge">Оплачено онлайн</span>
      <p class="muted">
        Мы уже передали его на кухню. Если возникнут вопросы — позвоните нам:
        <a :href="`tel:${site.settings.phone}`" class="phone-link">{{ site.settings.phone }}</a>
      </p>
      <router-link to="/">
        <button class="btn go"><span>Вернуться в меню</span><span>→</span></button>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.wrap { display: flex; justify-content: center; padding-top: 48px; }
.box {
  max-width: 460px;
  padding: 40px 36px;
  text-align: center;
  border-radius: 24px;
  box-shadow: 0 16px 40px rgba(31, 26, 23, .08);
  animation: rise .4s cubic-bezier(.2, .8, .2, 1);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.icon {
  width: 76px;
  height: 76px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: #e6f7ec;
  color: #157347;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pop .45s .1s cubic-bezier(.34, 1.56, .64, 1) both;
}
.icon-fail { background: #fdecec; color: #c0392b; }
@keyframes pop {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.icon svg { width: 34px; height: 34px; }
.spinner {
  width: 54px; height: 54px;
  margin: 0 auto 22px;
  border: 5px solid #eee;
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
h1 { margin: 0 0 12px; }
.order-id {
  display: inline-block;
  margin: 0 0 18px;
  padding: 5px 16px;
  border-radius: 20px;
  background: #fff3e6;
  color: var(--accent);
  font-weight: 800;
  font-size: 16px;
  letter-spacing: .5px;
}
.paid-badge {
  display: inline-block;
  margin: -8px 0 16px;
  padding: 4px 14px;
  border-radius: 20px;
  background: #e6f7ec;
  color: #157347;
  font-weight: 700;
  font-size: 14px;
}
.phone-link { color: var(--accent); font-weight: 700; }
.go {
  width: 100%;
  margin-top: 22px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 26px;
  font-size: 15px;
}
</style>
