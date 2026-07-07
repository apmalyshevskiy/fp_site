<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../../api.js';

const settings = ref({});
const saving = ref(false);
const message = ref('');
const error = ref('');

// Уведомления в MAX
const maxChats = ref([]);
const maxMessage = ref('');
const maxError = ref('');
const maxBusy = ref(false);

// URL вебхука ЮKassa — его нужно указать в личном кабинете ЮKassa
const webhookUrl = window.location.origin + '/api/payments/yookassa/webhook';

onMounted(async () => {
  settings.value = await api.adminGetSettings();
  // Дефолты для новых ключей времени работы, чтобы поля не были пустыми
  if (!settings.value.work_timezone) settings.value.work_timezone = 'Europe/Moscow';
  if (!settings.value.work_open) settings.value.work_open = '10:00';
  if (!settings.value.work_close) settings.value.work_close = '22:00';
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

// Определить чаты, куда добавлен бот. Сначала сохраняем настройки, чтобы
// токен точно был записан, затем спрашиваем у MAX список чатов.
async function maxDetectChats() {
  maxMessage.value = '';
  maxError.value = '';
  maxChats.value = [];
  maxBusy.value = true;
  try {
    await save();
    const { chats } = await api.adminMaxChats();
    maxChats.value = chats;
    if (!chats.length) {
      maxMessage.value = 'Бот пока не добавлен ни в один чат. Добавьте бота в чат персонала (или напишите ему) и повторите.';
    }
  } catch (e) {
    maxError.value = e.message;
  } finally {
    maxBusy.value = false;
  }
}

function pickChat(c) {
  settings.value.max_chat_id = String(c.chatId);
}

async function maxTest() {
  maxMessage.value = '';
  maxError.value = '';
  maxBusy.value = true;
  try {
    await save();
    await api.adminMaxTest();
    maxMessage.value = 'Тестовое сообщение отправлено — проверьте чат в MAX.';
  } catch (e) {
    maxError.value = e.message;
  } finally {
    maxBusy.value = false;
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
        <h3>Время работы (приём заказов)</h3>
        <label class="check pause-check">
          <input type="checkbox" :checked="settings.orders_paused === 'true'" @change="settings.orders_paused = String($event.target.checked)" />
          ⏸ Приостановить приём заказов (вручную, до снятия галки)
        </label>
        <label class="check">
          <input type="checkbox" :checked="settings.work_schedule_enabled === 'true'" @change="settings.work_schedule_enabled = String($event.target.checked)" />
          Ограничивать приём заказов по времени
        </label>
        <div class="time-row">
          <label class="field"><span>Открытие</span><input v-model="settings.work_open" type="time" /></label>
          <label class="field"><span>Закрытие</span><input v-model="settings.work_close" type="time" /></label>
        </div>
        <label class="field">
          <span>Часовой пояс ресторана</span>
          <select v-model="settings.work_timezone">
            <option value="Europe/Kaliningrad">Калининград (МСК−1)</option>
            <option value="Europe/Moscow">Москва (МСК)</option>
            <option value="Europe/Samara">Самара (МСК+1)</option>
            <option value="Asia/Yekaterinburg">Екатеринбург (МСК+2)</option>
            <option value="Asia/Omsk">Омск (МСК+3)</option>
            <option value="Asia/Krasnoyarsk">Красноярск (МСК+4)</option>
            <option value="Asia/Irkutsk">Иркутск (МСК+5)</option>
            <option value="Asia/Yakutsk">Якутск (МСК+6)</option>
            <option value="Asia/Vladivostok">Владивосток (МСК+7)</option>
            <option value="Asia/Magadan">Магадан (МСК+8)</option>
            <option value="Asia/Kamchatka">Камчатка (МСК+9)</option>
          </select>
        </label>
        <p class="muted" style="font-size: 13px;">
          Вне указанного времени посетители видят меню, но не могут оформить заказ.
          Если закрытие раньше открытия (например, 10:00–02:00) — работа «через полночь».
          Поле «Часы работы» выше — просто текст в шапке сайта, а здесь — реальное ограничение.
        </p>
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

      <section class="card block">
        <h3>Уведомления в MAX</h3>
        <label class="check">
          <input type="checkbox" :checked="settings.max_enabled === 'true'" @change="settings.max_enabled = String($event.target.checked)" />
          Присылать новые заказы в MAX
        </label>
        <label class="field"><span>Токен бота</span><input v-model="settings.max_bot_token" placeholder="Токен бота, созданного в MAX" /></label>
        <label class="field"><span>ID чата</span><input v-model="settings.max_chat_id" placeholder="Заполняется кнопкой «Определить чат»" /></label>

        <div class="max-actions">
          <button class="btn-ghost btn-sm" type="button" :disabled="maxBusy" @click="maxDetectChats">Определить чат</button>
          <button class="btn-ghost btn-sm" type="button" :disabled="maxBusy" @click="maxTest">Отправить тест</button>
        </div>

        <ul v-if="maxChats.length" class="chat-list">
          <li v-for="c in maxChats" :key="c.chatId">
            <button
              class="btn-ghost btn-sm"
              type="button"
              :class="{ active: String(c.chatId) === String(settings.max_chat_id) }"
              @click="pickChat(c)"
            >
              {{ c.title || 'Чат' }} · #{{ c.chatId }}
            </button>
          </li>
        </ul>

        <p v-if="maxMessage" class="badge green">{{ maxMessage }}</p>
        <p v-if="maxError" class="error-text">{{ maxError }}</p>

        <p class="muted" style="font-size: 13px;">
          Создайте бота в MAX и получите токен, вставьте сюда и сохраните.
          Добавьте бота в чат персонала, нажмите «Определить чат», выберите нужный чат и отправьте тест.
        </p>
      </section>

      <section class="card block">
        <h3>Онлайн-оплата (ЮKassa)</h3>
        <label class="check">
          <input type="checkbox" :checked="settings.yookassa_enabled === 'true'" @change="settings.yookassa_enabled = String($event.target.checked)" />
          Принимать онлайн-оплату (СБП и карты)
        </label>
        <label class="field"><span>shopId (идентификатор магазина)</span><input v-model="settings.yookassa_shop_id" placeholder="Из ЛК ЮKassa → Настройки → Магазин" /></label>
        <label class="field"><span>Секретный ключ</span><input v-model="settings.yookassa_secret_key" placeholder="Из ЛК ЮKassa → Интеграция → Ключи API" /></label>
        <label class="field">
          <span>Ставка НДС для чека</span>
          <select v-model="settings.yookassa_vat_code">
            <option value="1">Без НДС (ИП на УСН)</option>
            <option value="2">НДС 0%</option>
            <option value="3">НДС 10%</option>
            <option value="4">НДС 20%</option>
            <option value="5">НДС 10/110</option>
            <option value="6">НДС 20/120</option>
          </select>
        </label>
        <p class="muted" style="font-size: 13px;">
          При включённой оплате заказ уходит на кухню только после успешной оплаты
          (обязательная предоплата). Чек 54-ФЗ пробивает ЮKassa — включите чеки
          в личном кабинете ЮKassa.
        </p>
        <p class="muted" style="font-size: 13px;">
          В ЛК ЮKassa → Интеграция → HTTP-уведомления укажите адрес вебхука
          (события <code>payment.succeeded</code> и <code>payment.canceled</code>):
        </p>
        <code class="webhook-url">{{ webhookUrl }}</code>
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
.max-actions { display: flex; gap: 10px; margin: 4px 0 12px; }
.chat-list { list-style: none; padding: 0; margin: 0 0 12px; display: flex; flex-direction: column; gap: 6px; }
.chat-list .active { border-color: var(--accent); color: var(--accent); font-weight: 700; }
.time-row { display: flex; gap: 12px; }
.time-row .field { flex: 1; }
.pause-check { color: #b3540d; }
.webhook-url {
  display: block;
  padding: 8px 10px;
  background: var(--bg, #f4f1ec);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  word-break: break-all;
}
</style>
