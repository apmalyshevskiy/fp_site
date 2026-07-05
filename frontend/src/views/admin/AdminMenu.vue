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

function parseOverrides(v) {
  if (!v) return {};
  return typeof v === 'string' ? JSON.parse(v) : v;
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
  Object.assign(p, updated);
}

async function toggleCategory(c) {
  const updated = await api.adminPatchCategory(c.id, { isVisible: !c.is_visible });
  Object.assign(c, updated);
}

async function saveUnit(p) {
  try {
    const updated = await api.adminPatchProduct(p.id, {
      unit: p.unit,
      qtyStep: Number(p.qty_step),
      isWeight: !!p.is_weight,
      weightLabel: p.weight_label || '',
    });
    Object.assign(p, updated, { qty_step: Number(updated.qty_step) });
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}

function toggleWeight(p) {
  p.is_weight = !p.is_weight;
  saveUnit(p);
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
  const parsed = { ...updated, field_overrides: parseOverrides(updated.field_overrides) };
  const list = kind === 'product' ? products.value : categories.value;
  const idx = list.findIndex((x) => x.id === parsed.id);
  if (idx !== -1) Object.assign(list[idx], parsed);
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
          <th>Фото</th><th>Название</th><th>Цена</th><th>Вес порции</th><th>Ед. изм.</th><th>Шаг кол-ва</th><th>Весовой</th><th>В POS</th><th>На сайте</th><th></th>
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
          </td>
          <td>
            {{ Number(effectiveValue(p, 'price')) }} ₽<span v-if="p.unit !== 'шт'" class="muted">/{{ p.unit }}</span>
            <sup v-if="isOverridden(p, 'price')" class="ov-mark" title="Цена изменена вручную">●</sup>
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
            <button class="btn-ghost btn-sm" @click="openEdit('product', p)">✎</button>
            <button class="btn-ghost btn-sm" @click="toggleProduct(p)">
              {{ p.is_visible ? 'Скрыть' : 'Показать' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <div v-if="editing" class="modal-backdrop" @click.self="closeEdit">
    <div class="modal">
      <h3>{{ editing.row.name }}</h3>
      <p class="muted modal-hint">
        Поля, которые вы измените здесь, перестанут обновляться при синхронизации из FUSIONPOS —
        для остальных значение POS применяется как обычно.
      </p>

      <div class="field-row" v-for="f in editing.fields" :key="f.key">
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
.unit-input { width: 74px; padding: 6px 8px; }
.step-input { width: 80px; padding: 6px 8px; }
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
</style>
