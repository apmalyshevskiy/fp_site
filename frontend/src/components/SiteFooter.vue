<script setup>
import { useSiteStore } from '../stores/site.js';
const site = useSiteStore();
</script>

<template>
  <footer class="footer">
    <div class="container footer-inner">
      <div>
        <strong>{{ site.settings.site_name }}</strong>
        <div class="muted">{{ site.settings.address }}</div>
      </div>
      <div class="muted">
        <div>{{ site.settings.phone }}</div>
        <div>{{ site.settings.work_hours }}</div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer { background: #fff; border-top: 1px solid var(--border); padding: 24px 0; margin-top: 24px; }
.footer-inner { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-size: 14px; }
</style>
