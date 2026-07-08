<script setup>
import { computed, reactive } from 'vue';
import { formatPrice } from '../format.js';

const props = defineProps({
  product: { type: Object, required: true },
});
const emit = defineEmits(['close', 'confirm']);

const groups = props.product.modifierGroups || [];

// Выбор: single -> id варианта (предзаполняем дефолтом), multi -> Set id
const selection = reactive({});
for (const g of groups) {
  if (g.type === 'single') {
    const def = g.options.find((o) => o.isDefault) || g.options[0];
    selection[g.id] = def ? def.id : null;
  } else {
    selection[g.id] = new Set();
  }
}

function isPicked(g, o) {
  return g.type === 'single' ? selection[g.id] === o.id : selection[g.id].has(o.id);
}
function toggle(g, o) {
  if (g.type === 'single') {
    selection[g.id] = o.id;
  } else {
    if (selection[g.id].has(o.id)) selection[g.id].delete(o.id);
    else selection[g.id].add(o.id);
  }
}

const selectedOptions = computed(() => {
  const out = [];
  for (const g of groups) {
    if (g.type === 'single') {
      const o = g.options.find((x) => x.id === selection[g.id]);
      if (o) out.push({ id: o.id, name: o.name, price: o.priceDelta });
    } else {
      for (const o of g.options) {
        if (selection[g.id].has(o.id)) out.push({ id: o.id, name: o.name, price: o.priceDelta });
      }
    }
  }
  return out;
});

const totalPrice = computed(() => {
  const delta = selectedOptions.value.reduce((a, m) => a + m.price, 0);
  return Math.max(0, Math.round((props.product.price + delta) * 100) / 100);
});

function deltaLabel(o) {
  if (!o.priceDelta) return '';
  return o.priceDelta > 0 ? `+${formatPrice(o.priceDelta)} ₽` : `−${formatPrice(Math.abs(o.priceDelta))} ₽`;
}
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')">
      <div class="dialog card">
        <h3>{{ product.name }}</h3>

        <div v-for="g in groups" :key="g.id" class="group">
          <div class="group-name">
            {{ g.name }}
            <span v-if="g.type === 'multi'" class="muted hint">можно несколько</span>
          </div>
          <div class="options">
            <button
              v-for="o in g.options"
              :key="o.id"
              type="button"
              class="opt"
              :class="{ active: isPicked(g, o) }"
              @click="toggle(g, o)"
            >
              <span>{{ o.name }}</span>
              <span v-if="o.priceDelta" class="delta">{{ deltaLabel(o) }}</span>
            </button>
          </div>
        </div>

        <div class="actions">
          <button type="button" class="btn-ghost" @click="emit('close')">Отмена</button>
          <button type="button" class="btn confirm" @click="emit('confirm', selectedOptions)">
            В корзину · {{ formatPrice(totalPrice) }} ₽
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0;
  background: rgba(20, 16, 12, .45);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  z-index: 100;
}
.dialog {
  width: 100%;
  max-width: 420px;
  max-height: 84vh;
  overflow-y: auto;
  padding: 20px;
  border-radius: 18px;
  background: var(--card, #fff);
}
.dialog h3 { margin: 0 0 14px; }
.group { margin-bottom: 16px; }
.group-name { font-weight: 700; font-size: 14px; margin-bottom: 8px; }
.hint { font-weight: 400; font-size: 12px; margin-left: 6px; }
.options { display: flex; flex-wrap: wrap; gap: 8px; }
.opt {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 18px;
  background: #fff;
  border: 1.5px solid var(--border);
  font-weight: 600;
  font-size: 14px;
}
.opt.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.opt .delta { font-size: 12.5px; opacity: .8; white-space: nowrap; }
.actions { display: flex; gap: 10px; margin-top: 18px; }
.actions .btn-ghost { flex: 0 0 auto; }
.confirm { flex: 1; padding: 13px; border-radius: 22px; }
</style>
