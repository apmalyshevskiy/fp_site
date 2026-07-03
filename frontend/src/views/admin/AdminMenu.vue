<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../../api.js';

const categories = ref([]);
const products = ref([]);
const syncing = ref(false);
const message = ref('');
const error = ref('');

async function load() {
  const data = await api.adminGetMenu();
  categories.value = data.categories;
  products.value = data.products;
}
onMounted(load);

async function sync() {
  syncing.value = true;
  message.value = '';
  error.value = '';
  try {
    const stats = await api.adminSyncMenu();
    message.value = `Синхронизировано: категорий ${stats.categories}, позиций ${stats.products}` +
      (stats.disabled ? `, снято с продажи ${stats.disabled}` : '');
    await load();
  } catch (e) {
    error.value = e.message;
  } finally {
    syncing.value = false;
  }
}

async function toggleProduct(p) {
  const updated = await api.adminPatchProduct(p.id, { isVisible: !p.is_visible });
  Object.assign(p, updated);
}

async function toggleCategory(c) {
  const updated = await api.adminPatchCategory(c.id, { isVisible: !c.is_visible });
  Object.assign(c, updated);
}

async function uploadImage(p, event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const { url } = await api.adminUpload(file);
    const updated = await api.adminPatchProduct(p.id, { imageUrl: url });
    Object.assign(p, updated);
  } catch (e) {
    error.value = e.message;
  }
}

function productsOf(catId) {
  return products.value.filter((p) => p.category_id === catId);
}
</script>

<template>
  <div class="head">
    <h1>Меню</h1>
    <button class="btn" :disabled="syncing" @click="sync">
      {{ syncing ? 'Синхронизация…' : 'Синхронизировать из FUSIONPOS' }}
    </button>
  </div>
  <p v-if="message" class="badge green">{{ message }}</p>
  <p v-if="error" class="error-text">{{ error }}</p>

  <p v-if="!categories.length" class="muted">
    Меню ещё не загружено. Нажмите «Синхронизировать из FUSIONPOS».
  </p>

  <section v-for="cat in categories" :key="cat.id" class="card cat">
    <header class="cat-head">
      <h3 :class="{ hidden: !cat.is_visible }">{{ cat.name }}</h3>
      <button class="btn-ghost btn-sm" @click="toggleCategory(cat)">
        {{ cat.is_visible ? 'Скрыть категорию' : 'Показать категорию' }}
      </button>
    </header>

    <table>
      <thead>
        <tr>
          <th>Фото</th><th>Название</th><th>Цена</th><th>В POS</th><th>На сайте</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in productsOf(cat.id)" :key="p.id" :class="{ dim: !p.is_visible || !p.is_available }">
          <td>
            <label class="img-cell">
              <img v-if="p.image_url" :src="p.image_url" />
              <span v-else class="no-img">+фото</span>
              <input type="file" accept="image/*" hidden @change="uploadImage(p, $event)" />
            </label>
          </td>
          <td>
            <strong>{{ p.name }}</strong>
            <div class="muted desc">{{ p.description }}</div>
          </td>
          <td>{{ Number(p.price) }} ₽</td>
          <td>
            <span class="badge" :class="p.is_available ? 'green' : 'red'">
              {{ p.is_available ? 'доступно' : 'стоп' }}
            </span>
          </td>
          <td>
            <span class="badge" :class="p.is_visible ? 'green' : 'gray'">
              {{ p.is_visible ? 'показано' : 'скрыто' }}
            </span>
          </td>
          <td>
            <button class="btn-ghost btn-sm" @click="toggleProduct(p)">
              {{ p.is_visible ? 'Скрыть' : 'Показать' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.cat { padding: 18px; margin-bottom: 18px; }
.cat-head { display: flex; justify-content: space-between; align-items: center; }
.cat-head h3 { margin: 0; }
.cat-head h3.hidden { opacity: .4; text-decoration: line-through; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th { text-align: left; font-size: 12px; color: var(--muted); padding: 6px 8px; border-bottom: 1px solid var(--border); }
td { padding: 8px; border-bottom: 1px solid var(--border); vertical-align: middle; }
tr.dim td { opacity: .55; }
.img-cell { cursor: pointer; display: inline-block; }
.img-cell img { width: 52px; height: 40px; object-fit: cover; border-radius: 6px; }
.no-img {
  display: inline-flex; align-items: center; justify-content: center;
  width: 52px; height: 40px;
  border: 1.5px dashed var(--border);
  border-radius: 6px;
  font-size: 11px;
  color: var(--muted);
}
.desc { font-size: 12px; max-width: 320px; }
</style>
