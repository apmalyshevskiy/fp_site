<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();

function logout() {
  localStorage.removeItem('admin_token');
  router.push('/admin/login');
}
</script>

<template>
  <div class="admin">
    <aside class="sidebar">
      <div class="title">Админка</div>
      <nav>
        <router-link to="/admin/orders">Заказы</router-link>
        <router-link to="/admin/menu">Меню</router-link>
        <router-link to="/admin/settings">Настройки</router-link>
        <a href="/" target="_blank">Открыть сайт ↗</a>
      </nav>
      <button class="btn-ghost btn-sm logout" @click="logout">Выйти</button>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.admin { display: flex; min-height: 100vh; }
.sidebar {
  width: 220px;
  background: #1f1a17;
  color: #fff;
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.title { font-weight: 800; font-size: 18px; margin-bottom: 14px; }
nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
nav a {
  padding: 10px 12px;
  border-radius: 8px;
  color: #d8d2cb;
  font-weight: 600;
}
nav a.router-link-active { background: var(--accent); color: #fff; }
nav a:hover { color: #fff; }
.logout { border-color: #d8d2cb; color: #d8d2cb; }
.content { flex: 1; padding: 28px; background: var(--bg); min-width: 0; }
</style>
