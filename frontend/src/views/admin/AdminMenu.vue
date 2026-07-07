<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../../api.js';

const categories = ref([]);
const products = ref([]);
const syncing = ref(false);
const message = ref('');
const error = ref('');

const PRODUCT_FIELDS = [
  { key: 'name', label: 'Название', type: 'text' },
  { key: 'description', label: 'Описание', type: 'textarea' },
  { key: 'price', label: 'Цена, ₽', type: 'number', step: '0.01' },
  { key: 'compound', label: 'Состав', type: 'textarea' },
  { key: 'allergens', label: 'Аллергены', type: 'text' },
  { key: 'protein', label: 'Белки, г', type: 'number', step: '0.1' },
  { key: 'fat', label: 'Жиры, г', type: 'number', step: '0.1' },
  { key: 'carbohydrate', label: 'Углеводы, г', type: 'number', step: '0.1' },
  { key: 'kilocalories', label: 'Калорийность, ккал', type: 'number', step: '1' },
  { key: 'sort_order', label: 'Порядок сортировки', type: 'number', step: '1' },
];
const CATEGORY_FIELDS = [
  { key: 'name', label: 'Название', type: 'text' },
  { key: 'sort_order', label: 'Порядок сортировки', type: 'number', step: '1' },
];
const NUTRITION_KEYS = ['protein', 'fat', 'carbohydrate', 'kilocalories'];
const PAIR_KEYS = ['price', 'sort_order'];
const mainFields = (fields) => fields.filter((f) => !NUTRITION_KEYS.includes(f.key) && !PAIR_KEYS.includes(f.key));
const pairFields = (fields) => fields.filter((f) => PAIR_KEYS.includes(f.key));
const nutritionFields = (fields) => fields.filter((f) => NUTRITION_KEYS.includes(f.key));

function parseOverrides(v) {
  if (!v) return {};
  return typeof v === 'string' ? JSON.parse(v) : v;
}

// Сервер всегда отдаёт field_overrides сырым (MariaDB хранит JSON как
// longtext, не парсится драйвером) — любое присвоение ответа сервера в
// локальный список обязано пройти через это, иначе field_overrides
// затирается строкой и isOverridden/effectiveValue перестают его видеть.
function applyRow(target, updated, extra = {}) {
  Object.assign(target, updated, { field_overrides: parseOverrides(updated.field_overrides), ...extra });
}

function effectiveValue(row, field) {
  const ov = row.field_overrides;
  return ov && Object.prototype.hasOwnProperty.call(ov, field) ? ov[field] : row[field];
}
function isOverridden(row, field) {
  const ov = row.field_overrides;
  return !!(ov && Object.prototype.hasOwnProperty.call(ov, field));
}
function posDisplay(row, field) {
  const v = row[field];
  if (v === null || v === undefined || v === '') return 'не заполнено в POS';
  return field === 'price' ? `${Number(v)} ₽` : String(v);
}

// Акция действует, если акционная цена задана и меньше текущей (эффективной) цены
function promoActive(p) {
  const promo = Number(p.promo_price);
  return promo > 0 && promo < Number(effectiveValue(p, 'price'));
}
function promoPercent(p) {
  return Math.round((1 - Number(p.promo_price) / Number(effectiveValue(p, 'price'))) * 100);
}

// Компактная строка со всеми доп. полями прямо в списке (без открытия панели)
function infoLine(p) {
  const parts = [];
  const kcal = effectiveValue(p, 'kilocalories');
  const protein = effectiveValue(p, 'protein');
  const fat = effectiveValue(p, 'fat');
  const carb = effectiveValue(p, 'carbohydrate');
  if (kcal !== null && kcal !== undefined && kcal !== '') parts.push(`${kcal} ккал`);
  if ([protein, fat, carb].some((v) => v !== null && v !== undefined && v !== '')) {
    const fmt = (v) => (v !== null && v !== undefined && v !== '' ? v : '—');
    parts.push(`Б/Ж/У ${fmt(protein)}/${fmt(fat)}/${fmt(carb)}`);
  }
  const compound = effectiveValue(p, 'compound');
  if (compound) parts.push(`Состав: ${compound}`);
  const allergens = effectiveValue(p, 'allergens');
  if (allergens) parts.push(`Аллергены: ${allergens}`);
  return parts.join(' · ');
}

async function load() {
  const data = await api.adminGetMenu();
  categories.value = data.categories.map((c) => ({ ...c, field_overrides: parseOverrides(c.field_overrides) }));
  products.value = data.products.map((p) => ({
    ...p,
    qty_step: Number(p.qty_step),
    field_overrides: parseOverrides(p.field_overrides),
  }));
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
  applyRow(p, updated);
}

async function toggleCategory(c) {
  const updated = await api.adminPatchCategory(c.id, { isVisible: !c.is_visible });
  applyRow(c, updated);
}

async function saveUnit(p) {
  try {
    const updated = await api.adminPatchProduct(p.id, {
      unit: p.unit,
      qtyStep: Number(p.qty_step),
      isWeight: !!p.is_weight,
      weightLabel: p.weight_label || '',
    });
    applyRow(p, updated, { qty_step: Number(updated.qty_step) });
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}

function toggleWeight(p) {
  p.is_weight = !p.is_weight;
  saveUnit(p);
}

async function savePromo(p) {
  try {
    const updated = await api.adminPatchProduct(p.id, { promoPrice: p.promo_price ?? '' });
    applyRow(p, updated, { qty_step: Number(updated.qty_step) });
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}

async function uploadImage(p, event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const { url } = await api.adminUpload(file);
    const updated = await api.adminPatchProduct(p.id, { imageUrl: url });
    applyRow(p, updated);
  } catch (e) {
    error.value = e.message;
  }
}

function productsOf(catId) {
  return products.value.filter((p) => p.category_id === catId);
}

// --- Переопределение полей поверх POS ---
const editing = ref(null); // { kind: 'product'|'category', row, fields }
const editForm = ref({});
const initialForm = ref({});
const savingOverride = ref(false);

function openEdit(kind, row) {
  const fields = kind === 'product' ? PRODUCT_FIELDS : CATEGORY_FIELDS;
  const snapshot = {};
  for (const f of fields) snapshot[f.key] = effectiveValue(row, f.key) ?? '';
  editing.value = { kind, row, fields };
  editForm.value = { ...snapshot };
  initialForm.value = { ...snapshot };
}
function closeEdit() {
  editing.value = null;
}
function dirtyKeys() {
  if (!editing.value) return [];
  return editing.value.fields
    .map((f) => f.key)
    .filter((k) => String(editForm.value[k] ?? '') !== String(initialForm.value[k] ?? ''));
}
function applyUpdatedRow(kind, updated) {
  const list = kind === 'product' ? products.value : categories.value;
  const idx = list.findIndex((x) => x.id === updated.id);
  if (idx !== -1) applyRow(list[idx], updated);
}
async function saveOverrides() {
  if (!editing.value) return;
  const dirty = dirtyKeys();
  if (!dirty.length) { closeEdit(); return; }
  const set = {};
  for (const k of dirty) set[k] = editForm.value[k];
  savingOverride.value = true;
  try {
    const { kind, row } = editing.value;
    const updated = kind === 'product'
      ? await api.adminOverrideProduct(row.id, { set })
      : await api.adminOverrideCategory(row.id, { set });
    applyUpdatedRow(kind, updated);
    error.value = '';
    closeEdit();
  } catch (e) {
    error.value = e.message;
  } finally {
    savingOverride.value = false;
  }
}
// click.self закрывал модалку и при выделении текста в поле мышью, если
// отпустить кнопку мыши уже над подложкой — клик засчитывается по месту
// mouseup, а не mousedown. Закрываем только если и mousedown, и клик были
// именно по подложке (а не начались на поле ввода).
const backdropMouseDownSelf = ref(false);
function onBackdropMouseDown(e) {
  backdropMouseDownSelf.value = e.target === e.currentTarget;
}
function onBackdropClick(e) {
  if (backdropMouseDownSelf.value && e.target === e.currentTarget) closeEdit();
}

async function revertField(key) {
  if (!editing.value) return;
  try {
    const { kind, row } = editing.value;
    const updated = kind === 'product'
      ? await api.adminOverrideProduct(row.id, { revert: [key] })
      : await api.adminOverrideCategory(row.id, { revert: [key] });
    applyUpdatedRow(kind, updated);
    const val = effectiveValue(updated, key) ?? '';
    editForm.value[key] = val;
    initialForm.value[key] = val;
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
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
      <h3 :class="{ hidden: !cat.is_visible }">
        {{ cat.name }}
        <sup v-if="isOverridden(cat, 'name') || isOverridden(cat, 'sort_order')" class="ov-mark" title="Есть переопределённые вручную поля">●</sup>
      </h3>
      <div class="cat-actions">
        <button class="btn-ghost btn-sm" @click="openEdit('category', cat)">✎ Редактировать</button>
        <button class="btn-ghost btn-sm" @click="toggleCategory(cat)">
          {{ cat.is_visible ? 'Скрыть категорию' : 'Показать категорию' }}
        </button>
      </div>
    </header>

    <table>
      <thead>
        <tr>
          <th>Фото</th><th>Название</th><th>Цена</th><th>Акция, ₽</th><th>Вес порции</th><th>Ед. изм.</th><th>Шаг кол-ва</th><th>Весовой</th><th>В POS</th><th>На сайте</th><th></th>
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
            <strong>
              {{ effectiveValue(p, 'name') }}
              <sup v-if="isOverridden(p, 'name')" class="ov-mark" title="Название изменено вручную">●</sup>
            </strong>
            <div class="muted desc">{{ effectiveValue(p, 'description') }}</div>
            <div v-if="infoLine(p)" class="muted info-line">{{ infoLine(p) }}</div>
          </td>
          <td>
            <template v-if="promoActive(p)">
              <s class="muted">{{ Number(effectiveValue(p, 'price')) }}</s>
              <strong class="promo-price"> {{ Number(p.promo_price) }} ₽</strong>
              <span class="promo-pct">-{{ promoPercent(p) }}%</span>
            </template>
            <template v-else>
              {{ Number(effectiveValue(p, 'price')) }} ₽<span v-if="p.unit !== 'шт'" class="muted">/{{ p.unit }}</span>
            </template>
            <sup v-if="isOverridden(p, 'price')" class="ov-mark" title="Цена изменена вручную">●</sup>
          </td>
          <td>
            <input
              v-model="p.promo_price"
              class="promo-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="—"
              title="Акционная цена. Пусто — без акции"
              @change="savePromo(p)"
            />
          </td>
          <td>
            <input v-model="p.weight_label" class="unit-input" maxlength="30" placeholder="367 г" @change="saveUnit(p)" />
          </td>
          <td>
            <input v-model="p.unit" class="unit-input" maxlength="20" @change="saveUnit(p)" />
          </td>
          <td>
            <input v-model="p.qty_step" class="step-input" type="number" min="0.001" step="0.001" @change="saveUnit(p)" />
          </td>
          <td>
            <input type="checkbox" class="weight-check" :checked="!!p.is_weight" @change="toggleWeight(p)" />
          </td>
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
            <div class="row-actions">
              <button class="btn-ghost btn-sm" @click="openEdit('product', p)">✎</button>
              <button class="btn-ghost btn-sm" @click="toggleProduct(p)">
                {{ p.is_visible ? 'Скрыть' : 'Показать' }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <div v-if="editing" class="modal-backdrop" @mousedown="onBackdropMouseDown" @click="onBackdropClick">
    <div class="modal">
      <h3>{{ editing.row.name }}</h3>
      <p class="muted modal-hint">
        Поля, которые вы измените здесь, перестанут обновляться при синхронизации из FUSIONPOS —
        для остальных значение POS применяется как обычно.
      </p>

      <div class="field-row" v-for="f in mainFields(editing.fields)" :key="f.key">
        <label>{{ f.label }}</label>
        <textarea
          v-if="f.type === 'textarea'"
          v-model="editForm[f.key]"
          rows="2"
        />
        <input
          v-else
          v-model="editForm[f.key]"
          :type="f.type"
          :step="f.step"
        />
        <div class="pos-hint">
          <span>POS: {{ posDisplay(editing.row, f.key) }}</span>
          <button
            v-if="isOverridden(editing.row, f.key)"
            class="btn-ghost btn-xs"
            @click="revertField(f.key)"
          >
            ↺ вернуть из POS
          </button>
        </div>
      </div>

      <div v-if="pairFields(editing.fields).length" class="pair-grid">
        <div class="field-cell" v-for="f in pairFields(editing.fields)" :key="f.key">
          <label>{{ f.label }}</label>
          <input v-model="editForm[f.key]" :type="f.type" :step="f.step" />
          <div class="pos-hint-sm">
            <span>{{ posDisplay(editing.row, f.key) }}</span>
            <button
              v-if="isOverridden(editing.row, f.key)"
              class="btn-ghost btn-xs"
              title="Вернуть из POS"
              @click="revertField(f.key)"
            >
              ↺
            </button>
          </div>
        </div>
      </div>

      <div v-if="nutritionFields(editing.fields).length" class="nutrition-grid">
        <div class="field-cell" v-for="f in nutritionFields(editing.fields)" :key="f.key">
          <label>{{ f.label }}</label>
          <input v-model="editForm[f.key]" :type="f.type" :step="f.step" />
          <div class="pos-hint-sm">
            <span>{{ posDisplay(editing.row, f.key) }}</span>
            <button
              v-if="isOverridden(editing.row, f.key)"
              class="btn-ghost btn-xs"
              title="Вернуть из POS"
              @click="revertField(f.key)"
            >
              ↺
            </button>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-ghost" @click="closeEdit">Отмена</button>
        <button class="btn" :disabled="savingOverride" @click="saveOverrides">
          {{ savingOverride ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.cat { padding: 18px; margin-bottom: 18px; }
.cat-head { display: flex; justify-content: space-between; align-items: center; }
.cat-head h3 { margin: 0; }
.cat-head h3.hidden { opacity: .4; text-decoration: line-through; }
.cat-actions { display: flex; gap: 8px; }
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
.info-line { font-size: 11px; max-width: 320px; line-height: 1.35; }
.row-actions { display: flex; align-items: center; gap: 8px; }
.unit-input { width: 74px; padding: 6px 8px; }
.step-input { width: 80px; padding: 6px 8px; }
.promo-input { width: 78px; padding: 6px 8px; }
.promo-price { color: #c0392b; white-space: nowrap; margin-left: 5px; }
.promo-pct {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 7px;
  border-radius: 10px;
  background: #fdecec;
  color: #c0392b;
  font-size: 11px;
  font-weight: 800;
}
.weight-check { width: 18px; height: 18px; cursor: pointer; }
.ov-mark { color: var(--accent); font-size: 10px; margin-left: 2px; }

.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(20, 16, 12, .45);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  z-index: 100;
}
.modal {
  background: var(--card, #fff);
  border-radius: 16px;
  padding: 22px;
  width: 100%;
  max-width: 520px;
  max-height: 86vh;
  overflow-y: auto;
}
.modal h3 { margin: 0 0 6px; }
.modal-hint { margin: 0 0 16px; font-size: 12px; line-height: 1.4; }
.field-row { margin-bottom: 14px; }
.field-row label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.field-row input, .field-row textarea {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font: inherit;
  resize: vertical;
}
.pos-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
.btn-xs { padding: 2px 8px; font-size: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

.pair-grid, .nutrition-grid {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}
.pair-grid { grid-template-columns: repeat(2, 1fr); }
.nutrition-grid { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 480px) {
  .nutrition-grid { grid-template-columns: repeat(2, 1fr); }
}
.field-cell label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.field-cell input {
  width: 100%;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font: inherit;
}
.pos-hint-sm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: 3px;
  font-size: 10.5px;
  color: var(--muted);
}
.pos-hint-sm span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pos-hint-sm .btn-xs { padding: 0 4px; flex-shrink: 0; }
</style>
