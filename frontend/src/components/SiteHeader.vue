<script setup>
import { useSiteStore } from '../stores/site.js';
import { useCartStore } from '../stores/cart.js';

const site = useSiteStore();
const cart = useCartStore();
</script>

<template>
  <header class="header">
    <div class="container header-inner">
      <router-link to="/" class="brand">
        <img v-if="site.settings.logo_url" :src="site.settings.logo_url" alt="Логотип" class="logo" />
        <div>
          <div class="brand-name">{{ site.settings.site_name || 'Ресторан' }}</div>
          <div v-if="site.settings.site_tagline" class="brand-tagline">{{ site.settings.site_tagline }}</div>
        </div>
      </router-link>

      <div class="header-right">
        <div class="contacts">
          <a v-if="site.settings.phone" :href="`tel:${site.settings.phone}`" class="phone">{{ site.settings.phone }}</a>
          <div v-if="site.settings.work_hours" class="muted hours">{{ site.settings.work_hours }}</div>
        </div>
        <router-link to="/checkout">
          <button class="btn cart-btn">
            Корзина
            <span v-if="cart.count" class="cart-count">{{ cart.count }}</span>
          </button>
        </router-link>
      </div>
    </div>
    <div
      v-if="site.settings.header_image_url"
      class="hero"
      :style="{ backgroundImage: `url(${site.settings.header_image_url})` }"
    />
  </header>
</template>

<style scoped>
.header { background: #fff; border-bottom: 1px solid var(--border); }
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 14px;
  padding-bottom: 14px;
}
.brand { display: flex; align-items: center; gap: 12px; }
.logo { height: 48px; width: 48px; object-fit: cover; border-radius: 10px; }
.brand-name { font-size: 22px; font-weight: 800; }
.brand-tagline { font-size: 13px; color: var(--muted); }
.header-right { display: flex; align-items: center; gap: 20px; }
.contacts { text-align: right; }
.phone { font-weight: 700; }
.hours { font-size: 12px; }
.cart-btn { position: relative; display: inline-flex; align-items: center; gap: 8px; }
.cart-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: #fff;
  color: var(--accent);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}
.hero {
  height: 220px;
  background-size: cover;
  background-position: center;
}
@media (max-width: 640px) {
  .contacts { display: none; }
  .hero { height: 140px; }
}
</style>
