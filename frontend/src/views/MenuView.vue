<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../api.js';
import { useSiteStore } from '../stores/site.js';
import ProductCard from '../components/ProductCard.vue';
import CartBar from '../components/CartBar.vue';
import CartSidebar from '../components/CartSidebar.vue';

const site = useSiteStore();

const menu = ref([]);
const loading = ref(true);
const error = ref('');
const activeCategory = ref('all');
const search = ref('');

onMounted(async () => {
  try {
    menu.value = await api.getMenu();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

const searchedMenu = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return menu.value;
  return menu.value
    .map((cat) => ({
      ...cat,
      products: cat.products.filter(
        (p) => p.name.toLowerCase().includes(q) || String(p.price).includes(q)
      ),
    }))
    .filter((cat) => cat.products.length > 0);
});

// Категория "Все" показывает все секции; выбор конкретной категории
// фильтрует список, а не просто прокручивает к ней.
const visibleMenu = computed(() => {
  if (activeCategory.value === 'all') return searchedMenu.value;
  return searchedMenu.value.filter((cat) => cat.id === activeCategory.value);
});

function selectCategory(id) {
  activeCategory.value = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
  <div v-if="loading" class="muted">Загрузка меню…</div>
  <div v-else-if="error" class="error-text">{{ error }}</div>
  <div v-else-if="!menu.length" class="muted">Меню пока пусто. Загляните позже!</div>

  <template v-else>
    <div v-if="!site.orderingOpen" class="closed-banner">
      <span class="closed-icon">🕐</span>
      <span>{{ site.orderingClosedMessage }} Меню можно посмотреть, но оформить заказ пока нельзя.</span>
    </div>

    <div class="menu-layout">
      <div class="menu-main">
        <input
          v-model="search"
          type="text"
          class="search-input"
          placeholder="Поиск по названию или цене…"
        />

        <nav class="cat-nav">
          <button
            class="cat-chip"
            :class="{ active: activeCategory === 'all' }"
            @click="selectCategory('all')"
          >
            Все
          </button>
          <button
            v-for="cat in menu"
            :key="cat.id"
            class="cat-chip"
            :class="{ active: activeCategory === cat.id }"
            @click="selectCategory(cat.id)"
          >
            {{ cat.name }}
          </button>
        </nav>

        <p v-if="!visibleMenu.length" class="muted">Ничего не найдено</p>

        <section v-for="cat in visibleMenu" :key="cat.id" class="cat-section">
          <h2>{{ cat.name }}</h2>
          <div class="grid">
            <ProductCard v-for="p in cat.products" :key="p.id" :product="p" />
          </div>
        </section>
      </div>

      <CartSidebar class="desktop-cart" />
    </div>

    <!-- Плавающая корзина только на мобильных, где сайдбар скрыт -->
    <CartBar class="mobile-cart" />
  </template>
</template>

<style scoped>
.closed-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px 18px;
  border-radius: 14px;
  background: #fff3e6;
  border: 1.5px solid #f5c89a;
  color: #8a4b08;
  font-weight: 600;
}
.closed-icon { font-size: 20px; }
.menu-layout {
  display: grid;
  grid-template-columns: 1fr 390px;
  gap: 20px;
  align-items: start;
}
.menu-main { min-width: 0; }
.search-input { margin-bottom: 12px; }
@media (max-width: 900px) {
  .menu-layout { grid-template-columns: 1fr; }
  .desktop-cart { display: none; }
}
@media (min-width: 901px) {
  .mobile-cart { display: none; }
}
.cat-nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  background: var(--bg);
  padding: 10px 0;
  z-index: 5;
}
.cat-chip {
  padding: 8px 16px;
  border-radius: 20px;
  background: #fff;
  border: 1.5px solid var(--border);
  font-weight: 600;
}
.cat-chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(201px, 1fr));
  gap: 14px;
}
</style>
