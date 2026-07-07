async function request(method, url, body, { auth = false, formData = null } = {}) {
  const headers = {};
  if (auth) {
    const token = localStorage.getItem('admin_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth) {
      localStorage.removeItem('admin_token');
      if (location.pathname.startsWith('/admin')) location.href = '/admin/login';
    }
    throw new Error(data.error || `Ошибка ${res.status}`);
  }
  return data;
}

export const api = {
  // public
  getSettings: () => request('GET', '/api/settings'),
  getMenu: () => request('GET', '/api/menu'),
  createOrder: (order) => request('POST', '/api/orders', order),
  getOrderStatus: (publicId) => request('GET', `/api/orders/${publicId}/status`),
  // admin
  login: (email, password) => request('POST', '/api/admin/login', { email, password }),
  adminGetSettings: () => request('GET', '/api/admin/settings', undefined, { auth: true }),
  adminSaveSettings: (patch) => request('PUT', '/api/admin/settings', patch, { auth: true }),
  adminUpload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/api/admin/upload', undefined, { auth: true, formData: fd });
  },
  adminSyncMenu: () => request('POST', '/api/admin/menu/sync', {}, { auth: true }),
  adminGetMenu: () => request('GET', '/api/admin/menu', undefined, { auth: true }),
  adminPatchProduct: (id, patch) => request('PATCH', `/api/admin/products/${id}`, patch, { auth: true }),
  adminPatchCategory: (id, patch) => request('PATCH', `/api/admin/categories/${id}`, patch, { auth: true }),
  adminOverrideProduct: (id, body) => request('PATCH', `/api/admin/products/${id}/override`, body, { auth: true }),
  adminOverrideCategory: (id, body) => request('PATCH', `/api/admin/categories/${id}/override`, body, { auth: true }),
  adminMaxChats: () => request('POST', '/api/admin/max/chats', {}, { auth: true }),
  adminMaxTest: () => request('POST', '/api/admin/max/test', {}, { auth: true }),
  adminGetOrders: () => request('GET', '/api/admin/orders', undefined, { auth: true }),
  adminPatchOrder: (id, patch) => request('PATCH', `/api/admin/orders/${id}`, patch, { auth: true }),
  adminResendOrder: (id) => request('POST', `/api/admin/orders/${id}/resend`, {}, { auth: true }),
};
