<script setup>
import { useSiteStore } from '../stores/site.js';
defineProps({ publicId: String });
const site = useSiteStore();
</script>

<template>
  <div class="wrap">
    <div class="card box">
      <div class="icon">✅</div>
      <h1>Заказ принят!</h1>
      <p>Номер вашего заказа: <strong class="order-id">{{ publicId }}</strong></p>
      <p class="muted">
        Мы уже передали его на кухню. Если возникнут вопросы — позвоните нам:
        <a :href="`tel:${site.settings.phone}`" style="color: var(--accent); font-weight: 700;">{{ site.settings.phone }}</a>
      </p>
      <router-link to="/"><button class="btn">Вернуться в меню</button></router-link>
    </div>
  </div>
</template>

<style scoped>
.wrap { display: flex; justify-content: center; padding-top: 40px; }
.box { max-width: 460px; padding: 36px; text-align: center; }
.icon { font-size: 48px; }
.order-id { font-size: 20px; letter-spacing: 1px; }
</style>
