/**
 * Unit Tests for Cart Component / Cart API Logic
 * Member: IT24101992
 * Component: Cart Screen
 * Framework: Jest
 *
 * Run with:
 *   cd "testing app"
 *   npm install
 *   npm run test:cart
 */

// Mock AsyncStorage behavior used by frontend/src/services/api.js
const AsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

// Mock fetch for API unit tests
global.fetch = jest.fn();

const BASE_URL = 'http://localhost:5000/api';

const getToken = async () => AsyncStorage.getItem('userToken');

const authHeaders = async () => {
  const token = await getToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res) => {
  let data;

  try {
    data = await res.json();
  } catch (_e) {
    throw new Error('Invalid server response');
  }

  if (!res.ok) {
    throw new Error(data?.message || 'Something went wrong');
  }

  return data;
};

// Recreated cart API functions from frontend/src/services/api.js
const fetchCart = async () => {
  const res = await fetch(`${BASE_URL}/cart`, {
    headers: await authHeaders(),
  });

  return handleResponse(res);
};

const addToCart = async (productId, quantity, size) => {
  const res = await fetch(`${BASE_URL}/cart/add`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ productId, quantity, size }),
  });

  return handleResponse(res);
};

const updateCartItem = async (itemId, quantity) => {
  const res = await fetch(`${BASE_URL}/cart/update/${itemId}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ quantity }),
  });

  return handleResponse(res);
};

const removeFromCart = async (itemId) => {
  const res = await fetch(`${BASE_URL}/cart/remove/${itemId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });

  return handleResponse(res);
};

const clearCart = async () => {
  const res = await fetch(`${BASE_URL}/cart/clear`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });

  return handleResponse(res);
};

// Business logic helpers used by CartScreen and CartContext
const getCartCount = (items = []) => (
  items.reduce((total, item) => total + Number(item.quantity || 0), 0)
);

const getLineTotal = (item) => {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.product?.price || 0);
  return unitPrice * quantity;
};

const getCartTotal = (items = []) => (
  items.reduce((total, item) => total + getLineTotal(item), 0)
);

const shouldRemoveWhenQuantityChanges = (nextQuantity) => nextQuantity < 1;

const normalizeCartItems = (cart) => cart?.items || [];

const mockFetchSuccess = (data) => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
};

const mockFetchFail = (message, status = 400) => {
  fetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ message }),
  });
};

describe('fetchCart', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  test('should fetch current user cart successfully', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    const mockCart = {
      _id: 'cart123',
      items: [
        { _id: 'item1', quantity: 2, product: { name: 'Denim', price: 3000 } },
      ],
      totalPrice: 6000,
    };
    mockFetchSuccess(mockCart);

    const result = await fetchCart();

    expect(result).toEqual(mockCart);
    expect(result.items).toHaveLength(1);
    expect(result.totalPrice).toBe(6000);
  });

  test('should call the correct cart endpoint', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [], totalPrice: 0 });

    await fetchCart();

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/cart`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-user-token',
        }),
      })
    );
  });

  test('should throw error when user is not authorized', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('bad-token');
    mockFetchFail('Not authorized, token failed', 401);

    await expect(fetchCart()).rejects.toThrow('Not authorized, token failed');
  });
});

describe('addToCart', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  test('should add a product to cart successfully', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    const mockCart = {
      _id: 'cart123',
      items: [{ _id: 'item1', product: 'product123', quantity: 1, size: 'M' }],
      totalPrice: 1500,
    };
    mockFetchSuccess(mockCart);

    const result = await addToCart('product123', 1, 'M');

    expect(result).toEqual(mockCart);
    expect(result.items[0].size).toBe('M');
  });

  test('should send product id, quantity, and size in request body', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [] });

    await addToCart('product123', 3, 'L');

    const [, requestOptions] = fetch.mock.calls[0];
    const body = JSON.parse(requestOptions.body);

    expect(body.productId).toBe('product123');
    expect(body.quantity).toBe(3);
    expect(body.size).toBe('L');
  });

  test('should use POST method and Authorization header', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [] });

    await addToCart('product123', 1, 'S');

    const [, requestOptions] = fetch.mock.calls[0];
    expect(requestOptions.method).toBe('POST');
    expect(requestOptions.headers.Authorization).toBe('Bearer mock-user-token');
  });

  test('should throw backend validation error', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchFail('Product not found', 404);

    await expect(addToCart('missingProduct', 1, 'M')).rejects.toThrow('Product not found');
  });
});

describe('updateCartItem', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  test('should update cart item quantity successfully', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    const updatedCart = {
      items: [{ _id: 'item1', quantity: 4, product: { price: 1000 } }],
      totalPrice: 4000,
    };
    mockFetchSuccess(updatedCart);

    const result = await updateCartItem('item1', 4);

    expect(result.items[0].quantity).toBe(4);
    expect(result.totalPrice).toBe(4000);
  });

  test('should call update endpoint with PUT method', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [] });

    await updateCartItem('item1', 2);

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/cart/update/item1`,
      expect.objectContaining({ method: 'PUT' })
    );
  });

  test('should send updated quantity in request body', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [] });

    await updateCartItem('item1', 5);

    const [, requestOptions] = fetch.mock.calls[0];
    expect(JSON.parse(requestOptions.body).quantity).toBe(5);
  });

  test('should throw error when item does not exist', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchFail('Item not found in cart', 404);

    await expect(updateCartItem('missingItem', 2)).rejects.toThrow('Item not found in cart');
  });
});

describe('removeFromCart', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  test('should remove an item from cart successfully', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    const updatedCart = {
      items: [],
      totalPrice: 0,
    };
    mockFetchSuccess(updatedCart);

    const result = await removeFromCart('item1');

    expect(result.items).toHaveLength(0);
    expect(result.totalPrice).toBe(0);
  });

  test('should call remove endpoint with DELETE method', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [] });

    await removeFromCart('item1');

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/cart/remove/item1`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  test('should include auth token when removing cart item', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [] });

    await removeFromCart('item1');

    const [, requestOptions] = fetch.mock.calls[0];
    expect(requestOptions.headers.Authorization).toBe('Bearer mock-user-token');
  });

  test('should throw error when removal fails', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchFail('Failed to remove item', 500);

    await expect(removeFromCart('item1')).rejects.toThrow('Failed to remove item');
  });
});

describe('clearCart', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  test('should clear all items from cart', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [], totalPrice: 0 });

    const result = await clearCart();

    expect(result.items).toEqual([]);
    expect(result.totalPrice).toBe(0);
  });

  test('should call clear cart endpoint with DELETE method', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [] });

    await clearCart();

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/cart/clear`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  test('should throw server error if clear cart fails', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchFail('Failed to clear cart', 500);

    await expect(clearCart()).rejects.toThrow('Failed to clear cart');
  });
});

describe('Cart Business Logic', () => {
  test('should calculate cart count from item quantities', () => {
    const items = [
      { quantity: 2 },
      { quantity: 1 },
      { quantity: 3 },
    ];

    expect(getCartCount(items)).toBe(6);
  });

  test('should return 0 cart count for empty cart', () => {
    expect(getCartCount([])).toBe(0);
    expect(getCartCount()).toBe(0);
  });

  test('should calculate line total using product price and quantity', () => {
    const item = {
      quantity: 3,
      product: { price: 1500 },
    };

    expect(getLineTotal(item)).toBe(4500);
  });

  test('should calculate full cart total from all line totals', () => {
    const items = [
      { quantity: 2, product: { price: 1000 } },
      { quantity: 1, product: { price: 2500 } },
      { quantity: 3, product: { price: 500 } },
    ];

    expect(getCartTotal(items)).toBe(6000);
  });

  test('should identify quantity below 1 as remove action', () => {
    expect(shouldRemoveWhenQuantityChanges(0)).toBe(true);
    expect(shouldRemoveWhenQuantityChanges(-1)).toBe(true);
    expect(shouldRemoveWhenQuantityChanges(1)).toBe(false);
  });

  test('should normalize cart items safely', () => {
    expect(normalizeCartItems({ items: [{ _id: 'item1' }] })).toHaveLength(1);
    expect(normalizeCartItems({})).toEqual([]);
    expect(normalizeCartItems(null)).toEqual([]);
  });

  test('should handle unavailable product details safely', () => {
    const item = {
      quantity: 2,
      product: null,
    };

    expect(getLineTotal(item)).toBe(0);
  });
});

describe('Cart Edge Cases', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  test('should handle network error when fetching cart', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    fetch.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(fetchCart()).rejects.toThrow('Network request failed');
  });

  test('should handle invalid server response', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('bad json');
      },
    });

    await expect(fetchCart()).rejects.toThrow('Invalid server response');
  });

  test('should not send Authorization header when token is missing', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    mockFetchSuccess({ items: [] });

    await fetchCart();

    const [, requestOptions] = fetch.mock.calls[0];
    expect(requestOptions.headers.Authorization).toBeUndefined();
  });

  test('should convert string quantity values into numbers', () => {
    const items = [
      { quantity: '2' },
      { quantity: '3' },
    ];

    expect(getCartCount(items)).toBe(5);
  });

  test('should convert string price values into numbers', () => {
    const item = {
      quantity: '2',
      product: { price: '1200' },
    };

    expect(getLineTotal(item)).toBe(2400);
  });
});
