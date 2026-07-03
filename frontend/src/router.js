import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', component: () => import('./views/MenuView.vue') },
  { path: '/checkout', component: () => import('./views/CheckoutView.vue') },
  { path: '/order/:publicId', component: () => import('./views/OrderSuccessView.vue'), props: true },
  { path: '/admin/login', component: () => import('./views/admin/AdminLogin.vue') },
  {
    path: '/admin',
    component: () => import('./views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/admin/orders' },
      { path: 'orders', component: () => import('./views/admin/AdminOrders.vue') },
      { path: 'menu', component: () => import('./views/admin/AdminMenu.vue') },
      { path: 'settings', component: () => import('./views/admin/AdminSettings.vue') },
    ],
  },
];

export const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('admin_token')) {
    return '/admin/login';
  }
});
