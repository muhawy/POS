const API_BASE_URL = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || 'API request failed.')
  }
  return payload
}

export function fetchPosData() {
  return request('/api/data')
}

export function createProduct(product) {
  return request('/api/products', {
    method: 'POST',
    body: JSON.stringify(product),
  })
}

export function adjustProductStock(productId, amount) {
  return request(`/api/products/${productId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ amount }),
  })
}

export function deleteProduct(productId) {
  return request(`/api/products/${productId}`, {
    method: 'DELETE',
  })
}

export function checkoutSale(order) {
  return request('/api/sales/checkout', {
    method: 'POST',
    body: JSON.stringify(order),
  })
}

export function resetDemoData() {
  return request('/api/reset', {
    method: 'POST',
  })
}
