<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../../api.js';

const settings = ref({});
const saving = ref(false);
const message = ref('');
const error = ref('');

onMounted(async () => {
  settings.value = await api.adminGetSettings();
});

async function save() {
  saving.value = true;
  message.value = '';
  error.value = '';
  try {
    settings.value = await api.adminSaveSettings(settings.value);
    message.value = 'Сохранено';
    setTimeout(() => (message.value = ''), 2500);
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function uploadTo(key, event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const { url } = await api.adminUpload(file);
    settings.value[key] = url;
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <h1>Настройки</h1>

  <div class="cols">
    <section class="card block">
      <h3>Сайт и шапка</h3>
      <label class="field"><span>Название</span><input v-model="settings.site_name" /></label>
      <label class="field"><span>Слоган</span><input v-model="settings.site_tagline" /></label>
      <label class="field"><span>Телефон</span><input v-model="settings.phone" /></label>
      <label class="field"><span>Адрес</span><input v-model="settings.address" /></label>
      <label class="field"><span>Часы работы</span><input v-model="settings.work_hours" /></label>
      <label class="field"><span>Акцентный цвет</span><input v-model="settings.accent_color" type="color" style="height: 44px; padding: 4px;" /></label>

      <label class="field">
        <span>Логотип</span>
        <div class="upload-row">
          <img v-if="settings.logo_url" :src="settings.logo_url" class="preview" />
          <input type="file" accept="image/*" @change="uploadTo('logo_url', $event)" />
        </div>
      </label>
      <label class="field">
        <span>Картинка шапки (баннер)</span>
        <div class="upload-row">
          <img v-if="settings.header_image_url" :src="settings.header_image_url" class="preview wide" />
          <input type="file" accept="image/*" @change="uploadTo('header_image_url', $event)" />
        </div>
      </label>
    </section>

    <div>
      <section class="card block">
        <h3>Самовывоз и доставка</h3>
        <label class="check"><input type="checkbox" :checked="settings.pickup_enabled === 'true'" @change="settings.pickup_enabled = String($event.target.checked)" /> Самовывоз включён</label>
        <label class="check"><input type="checkbox" :checked="settings.delivery_enabled === 'true'" @change="settings.delivery_enabled = String($event.target.checked)" /> Доставка включена</label>
        <label class="field"><span>Стоимость доставки, ₽</span><input v-model="settings.delivery_fee" type="number" min="0" /></label>
        <label class="field"><span>Бесплатно от, ₽ (0 — никогда)</span><input v-model="settings.delivery_free_from" type="number" min="0" /></label>
        <label class="field"><span>Мин. заказ на доставку, ₽</span><input v-model="settings.delivery_min_order" type="number" min="0" /></label>
      </section>

      <section class="card block">
        <h3>Интеграция FUSIONPOS</h3>
        <label class="field">
          <span>Драйвер</span>
          <select v-model="settings.pos_driver">
            <option value="mock">Демо-режим (mock)</option>
            <option value="fusionpos">FUSIONPOS</option>
          </select>
        </label>
        <label class="field"><span>Базовый URL API</span><input v-model="settings.fusionpos_base_url" placeholder="https://api.fusionpos.ru" /></label>
        <label class="field"><span>API-токен</span><input v-model="settings.fusionpos_token" placeholder="Токен из Панели управления → Настройки → API Токены" /></label>
        <p class="muted" style="font-size: 13px;">
          Токену нужны права: «Меню» — просмотр, «Внешние заказы» — изменение.
        </p>
      </section>
    </div>
  </div>

  <div class="save-row">
    <button class="btn" :disabled="saving" @click="save">{{ saving ? 'Сохраняем…' : 'Сохранить' }}</button>
    <span v-if="message" class="badge green">{{ message }}</span>
    <span v-if="error" class="error-text">{{ error }}</span>
  </div>
</template>

<style scoped>
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
@media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
.block { padding: 20px; margin-bottom: 20px; }
.block h3 { margin-top: 0; }
.check { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-weight: 600; }
.check input { width: auto; }
.upload-row { display: flex; align-items: center; gap: 12px; }
.preview { height: 48px; width: 48px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); }
.preview.wide { width: 96px; }
.save-row { display: flex; align-items: center; gap: 14px; margin-top: 8px; }
</style>
