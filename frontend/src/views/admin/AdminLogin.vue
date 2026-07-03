<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api.js';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const { token } = await api.login(email.value, password.value);
    localStorage.setItem('admin_token', token);
    router.push('/admin');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="wrap">
    <form class="card box" @submit.prevent="submit">
      <h1>Админка</h1>
      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" required autocomplete="username" />
      </label>
      <label class="field">
        <span>Пароль</span>
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="btn" style="width: 100%;" :disabled="loading">Войти</button>
    </form>
  </div>
</template>

<style scoped>
.wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); }
.box { width: 360px; padding: 30px; }
h1 { margin-top: 0; }
</style>
