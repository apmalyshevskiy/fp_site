<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.vue';
import CartBar from '../components/CartBar.vue';

const menu = ref([]);
const loading = ref(true);
const error = ref('');
const activeCategory = ref(null);

onMounted(async () => {
  try {
    menu.value = await api.getMenu();
    activeCategory.value = menu.value[0]?.id ?? null;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

function scrollToCategory(id) {
  activeCategory.value = id;
  document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div v-if="loading" class="muted">Загрузка меню…</div>
  <div v-else-if="error" class="error-text">{{ error }}</div>
  <div v-else-if="!menu.length" class="muted">Меню пока пусто. Загляните позже!</div>

  <template v-else>
    <nav class="cat-nav">
      <button
        v-for="cat in menu"
        :key="cat.id"
        class="cat-chip"
        :class="{ active: activeCategory === cat.id }"
        @click="scrollToCategory(cat.id)"
      >
        {{ cat.name }}
      </button>
    </nav>

    <section v-for="cat in menu" :key="cat.id" :id="`cat-${cat.id}`" class="cat-section">
      <h2>{{ cat.name }}</h2>
      <div class="grid">
        <ProductCard v-for="p in cat.products" :key="p.id" :product="p" />
      </div>
    </section>

    <CartBar />
  </template>
</template>

<style scoped>
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
.cat-section { scroll-margin-top: 70px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
</style>
