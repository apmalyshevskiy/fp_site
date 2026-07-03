<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSiteStore } from './stores/site.js';
import SiteHeader from './components/SiteHeader.vue';
import SiteFooter from './components/SiteFooter.vue';

const site = useSiteStore();
const route = useRoute();
onMounted(() => site.load());
</script>

<template>
  <template v-if="!route.path.startsWith('/admin')">
    <SiteHeader />
    <main class="container" style="min-height: 60vh; padding-top: 24px; padding-bottom: 48px;">
      <router-view />
    </main>
    <SiteFooter />
  </template>
  <router-view v-else />
</template>
