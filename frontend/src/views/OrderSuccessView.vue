<script setup>
import { useSiteStore } from '../stores/site.js';
defineProps({ publicId: String });
const site = useSiteStore();
</script>

<template>
  <div class="wrap">
    <div class="card box">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 12.5L10 17.5L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h1>Заказ принят!</h1>
      <div class="order-id">№ {{ publicId }}</div>
      <p class="muted">
        Мы уже передали его на кухню. Если возникнут вопросы — позвоните нам:
        <a :href="`tel:${site.settings.phone}`" class="phone-link">{{ site.settings.phone }}</a>
      </p>
      <router-link to="/">
        <button class="btn go">
          <span>Вернуться в меню</span>
          <span>→</span>
        </button>
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
@keyframes pop {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.icon svg { width: 34px; height: 34px; }
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
