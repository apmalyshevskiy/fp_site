<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminOrdersStore } from '../../stores/adminOrders.js';

const router = useRouter();
const ordersStore = useAdminOrdersStore();

const ALERT_DURATION_MS = 3 * 60 * 1000;
const BEEP_INTERVAL_MS = 2000;

function logout() {
  localStorage.removeItem('admin_token');
  router.push('/admin/login');
}

let audioCtx;
function unlockAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function beep() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.4);
}

const originalTitle = document.title;
let beepTimer, titleTimer, stopTimer;
let titleBlinkOn = false;

function startAlertEffects() {
  beep();
  beepTimer = setInterval(beep, BEEP_INTERVAL_MS);
  titleTimer = setInterval(() => {
    titleBlinkOn = !titleBlinkOn;
    document.title = titleBlinkOn ? '🔔 Новый заказ!' : originalTitle;
  }, 1000);
  stopTimer = setTimeout(() => ordersStore.dismissAlert(), ALERT_DURATION_MS);
}

function stopAlertEffects() {
  clearInterval(beepTimer);
  clearInterval(titleTimer);
  clearTimeout(stopTimer);
  document.title = originalTitle;
}

watch(() => ordersStore.alerting, (on) => (on ? startAlertEffects() : stopAlertEffects()));

let pollTimer;
onMounted(() => {
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
  ordersStore.load();
  pollTimer = setInterval(() => ordersStore.load(), 15000);
});
onUnmounted(() => {
  clearInterval(pollTimer);
  stopAlertEffects();
});
</script>

<template>
  <div class="admin">
    <Transition name="toast">
      <div v-if="ordersStore.alerting" class="new-order-toast" @click="ordersStore.dismissAlert()">
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22ZM18 16v-5a6 6 0 1 0-12 0v5l-1.6 1.6a1 1 0 0 0 .7 1.7h14.8a1 1 0 0 0 .7-1.7L18 16Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
        </svg>
        <span>Поступил новый заказ!</span>
        <span class="toast-close">✕</span>
      </div>
    </Transition>

    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">A</div>
        <div class="title">Админка</div>
      </div>
      <nav>
        <router-link to="/admin/orders">
          <svg viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" stroke-width="2" /><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="2" /><path d="M9 10h6M9 14h6M9 18h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          Заказы
        </router-link>
        <router-link to="/admin/menu">
          <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2" /><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2" /><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2" /><rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2" /></svg>
          Меню
        </router-link>
        <router-link to="/admin/settings">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 6h10M18 6h2M4 18h2M8 18h12M4 12h6M14 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" /><circle cx="16" cy="6" r="2" stroke="currentColor" stroke-width="2" /><circle cx="6" cy="12" r="2" stroke="currentColor" stroke-width="2" /><circle cx="12" cy="18" r="2" stroke="currentColor" stroke-width="2" /></svg>
          Настройки
        </router-link>
        <a href="/" target="_blank">
          <svg viewBox="0 0 24 24" fill="none"><path d="M14 4h6v6M20 4 10 14M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          Открыть сайт
        </a>
      </nav>
      <button class="logout" @click="logout">
        <svg viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        Выйти
      </button>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.admin { display: flex; min-height: 100vh; }

.new-order-toast {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 30px;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(232, 89, 12, .35);
  animation: toast-pulse 1.4s ease-in-out infinite;
}
.toast-icon { width: 20px; height: 20px; flex-shrink: 0; }
.toast-close { opacity: .8; font-size: 12px; margin-left: 2px; }
@keyframes toast-pulse {
  0%, 100% { box-shadow: 0 8px 24px rgba(232, 89, 12, .35), 0 0 0 0 rgba(232, 89, 12, .45); }
  50% { box-shadow: 0 8px 24px rgba(232, 89, 12, .35), 0 0 0 9px rgba(232, 89, 12, 0); }
}
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, -14px); }

.sidebar {
  width: 232px;
  background: #1f1a17;
  color: #fff;
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
}
.title { font-weight: 800; font-size: 17px; }
nav { display: flex; flex-direction: column; gap: 3px; flex: 1; }
nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: #b8b0a6;
  font-weight: 600;
  font-size: 14px;
  transition: background .15s, color .15s;
}
nav a svg { width: 18px; height: 18px; flex-shrink: 0; }
nav a.router-link-active { background: var(--accent); color: #fff; }
nav a:hover { color: #fff; background: rgba(255, 255, 255, .06); }
nav a.router-link-active:hover { background: var(--accent); }
.logout {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: transparent;
  color: #b8b0a6;
  font-weight: 600;
  font-size: 14px;
  transition: background .15s, color .15s;
}
.logout svg { width: 18px; height: 18px; }
.logout:hover { color: #fff; background: rgba(255, 255, 255, .06); }
.content { flex: 1; padding: 32px; background: var(--bg); min-width: 0; }
</style>
