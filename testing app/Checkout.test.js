/**
 * Unit Tests for Checkout Screen / Order API Logic
 * Member: IT24101992
 * Component: Checkout Screen
 * Framework: Jest
 *
 * Run with:
 *   cd "testing app"
 *   npm install
 *   npm run test:checkout
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
  const text = await res.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_e) {
      throw new Error(`Server returned ${res.status}. Please restart the backend and try again.`);
    }
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data || {};
};

// Recreated checkout API functions from frontend/src/services/api.js
const createOrder = async (orderData) => {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(orderData),
  });

  return handleResponse(res);
};

const fetchMyOrders = async () => {
  const res = await fetch(`${BASE_URL}/orders/myorders`, {
    headers: await authHeaders(),
  });

  return handleResponse(res);
};

const removeSelectedFromCart = async (itemIds) => {
  const res = await fetch(`${BASE_URL}/cart/remove-selected`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ itemIds }),
  });

  return handleResponse(res);
};

const validateCheckoutForm = (formData) => {
  const errors = {};

  if (!formData.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (formData.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  } else if (formData.fullName.trim().length > 50) {
    errors.fullName = 'Full name must be less than 50 characters';
  }

  if (!formData.address.trim()) {
    errors.address = 'Address is required';
  } else if (formData.address.trim().length < 10) {
    errors.address = 'Address must be at least 10 characters';
  } else if (formData.address.trim().length > 200) {
    errors.address = 'Address must be less than 200 characters';
  }

  if (!formData.city.trim()) {
    errors.city = 'City is required';
  } else if (formData.city.trim().length < 2) {
    errors.city = 'City must be at least 2 characters';
  } else if (!/^[a-zA-Z\s]+$/.test(formData.city.trim())) {
    errors.city = 'City should contain only letters and spaces';
  }

  if (!formData.phoneNumber.trim()) {
    errors.phoneNumber = 'Phone number is required';
  } else if (!/^[+]?[\d\s\-()]{10,}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
    errors.phoneNumber = 'Please enter a valid phone number (at least 10 digits)';
  }

  if (!formData.paymentMethod) {
    errors.paymentMethod = 'Payment method is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const getLineTotal = (item) => {
  const price = Number(item.product?.price);
  const quantity = Number(item.quantity);

  return Number.isFinite(price) && Number.isFinite(quantity) ? price * quantity : 0;
};

const calculateTotals = (items = []) => {
  const subtotal = items.reduce((total, item) => total + getLineTotal(item), 0);
  const shipping = subtotal > 0 ? 200 : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return { subtotal, shipping, tax, total };
};

const buildOrderItems = (items = []) => items
  .map((item) => ({
    qty: Number(item.quantity || 0),
    product: item.product?._id,
    size: item.size || '',
  }))
  .filter((item) => item.product && item.qty > 0);

const buildOrderData = ({ items = [], selectedItemIds = [], formData }) => {
  const checkoutItemIds = items.map((item) => item._id).filter(Boolean);

  return {
    orderItems: buildOrderItems(items),
    shippingAddress: {
      fullName: formData.fullName.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      phoneNumber: formData.phoneNumber.trim(),
    },
    cartItemIds: checkoutItemIds.length ? checkoutItemIds : selectedItemIds,
    paymentMethod: formData.paymentMethod,
  };
};

const normalizeOrders = (data) => (Array.isArray(data) ? data : []);

const getStatusKey = (status) => `status${(status || 'Pending').replace(/\s+/g, '')}`;

const mockFetchSuccess = (data, status = 200) => {
  fetch.mockResolvedValueOnce({
    ok: true,
    status,
    text: async () => JSON.stringify(data),
  });
};

const mockFetchFail = (message, status = 400) => {
  fetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => JSON.stringify({ message }),
  });
};

const validFormData = {
  fullName: 'Vijaya Kumar',
  address: '123 Flower Road, Kandy',
  city: 'Kandy',
  phoneNumber: '0772585258',
  paymentMethod: 'cod',
};

const sampleCartItems = [
  {
    _id: 'cartItem1',
    quantity: 1,
    size: 'S',
    product: { _id: 'product1', name: 'Formal Shirt', price: 2999 },
  },
  {
    _id: 'cartItem2',
    quantity: 2,
    size: 'M',
    product: { _id: 'product2', name: 'Graphic Print Tee', price: 1800 },
  },
];

describe('createOrder', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  test('should create an order successfully', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    const orderData = buildOrderData({ items: sampleCartItems, formData: validFormData });
    const createdOrder = {
      _id: 'order123',
      orderItems: orderData.orderItems,
      totalPrice: 7343,
      paymentMethod: 'cod',
    };
    mockFetchSuccess(createdOrder, 201);

    const result = await createOrder(orderData);

    expect(result).toEqual(createdOrder);
    expect(result._id).toBe('order123');
  });

  test('should call the orders endpoint with POST and auth header', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ _id: 'order123' }, 201);

    await createOrder(buildOrderData({ items: sampleCartItems, formData: validFormData }));

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/orders`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-user-token',
        }),
      })
    );
  });

  test('should send order items, shipping address, cart item ids, and payment method', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ _id: 'order123' }, 201);

    await createOrder(buildOrderData({ items: sampleCartItems, formData: validFormData }));

    const [, requestOptions] = fetch.mock.calls[0];
    const body = JSON.parse(requestOptions.body);

    expect(body.orderItems).toEqual([
      { qty: 1, product: 'product1', size: 'S' },
      { qty: 2, product: 'product2', size: 'M' },
    ]);
    expect(body.shippingAddress.fullName).toBe('Vijaya Kumar');
    expect(body.cartItemIds).toEqual(['cartItem1', 'cartItem2']);
    expect(body.paymentMethod).toBe('cod');
  });

  test('should throw backend validation error for incomplete shipping details', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchFail('Please provide complete shipping details', 400);

    await expect(createOrder({ orderItems: [] })).rejects.toThrow(
      'Please provide complete shipping details'
    );
  });

  test('should throw backend validation error for invalid payment method', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchFail('Invalid payment method', 400);

    await expect(
      createOrder(buildOrderData({
        items: sampleCartItems,
        formData: { ...validFormData, paymentMethod: 'bank-transfer' },
      }))
    ).rejects.toThrow('Invalid payment method');
  });
});

describe('fetchMyOrders', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  test('should fetch logged in user orders successfully', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    const orders = [
      { _id: 'order1', status: 'Pending', totalPrice: 2000 },
      { _id: 'order2', status: 'Order Placed', totalPrice: 4500 },
    ];
    mockFetchSuccess(orders);

    const result = await fetchMyOrders();

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('Pending');
  });

  test('should call my orders endpoint with auth header', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess([]);

    await fetchMyOrders();

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/orders/myorders`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-user-token',
        }),
      })
    );
  });

  test('should throw unauthorized error when token fails', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('bad-token');
    mockFetchFail('Not authorized, token failed', 401);

    await expect(fetchMyOrders()).rejects.toThrow('Not authorized, token failed');
  });

  test('should normalize non-array orders safely for screen state', () => {
    expect(normalizeOrders([{ _id: 'order1' }])).toHaveLength(1);
    expect(normalizeOrders({ message: 'No orders' })).toEqual([]);
    expect(normalizeOrders(null)).toEqual([]);
  });
});

describe('removeSelectedFromCart', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  test('should remove selected cart items successfully', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [], totalPrice: 0 });

    const result = await removeSelectedFromCart(['cartItem1', 'cartItem2']);

    expect(result.items).toEqual([]);
    expect(result.totalPrice).toBe(0);
  });

  test('should call remove selected endpoint with POST method', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [] });

    await removeSelectedFromCart(['cartItem1']);

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/cart/remove-selected`,
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('should send selected item ids in request body', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchSuccess({ items: [] });

    await removeSelectedFromCart(['cartItem1', 'cartItem2']);

    const [, requestOptions] = fetch.mock.calls[0];
    expect(JSON.parse(requestOptions.body).itemIds).toEqual(['cartItem1', 'cartItem2']);
  });

  test('should throw server error when cart cleanup fails', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    mockFetchFail('No cart found', 404);

    await expect(removeSelectedFromCart(['missingItem'])).rejects.toThrow('No cart found');
  });
});

describe('Checkout Form Validation', () => {
  test('should pass with valid shipping and payment details', () => {
    const result = validateCheckoutForm(validFormData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test('should require full name', () => {
    const result = validateCheckoutForm({ ...validFormData, fullName: '   ' });

    expect(result.isValid).toBe(false);
    expect(result.errors.fullName).toBe('Full name is required');
  });

  test('should validate full name length', () => {
    expect(validateCheckoutForm({ ...validFormData, fullName: 'A' }).errors.fullName)
      .toBe('Full name must be at least 2 characters');

    expect(validateCheckoutForm({ ...validFormData, fullName: 'A'.repeat(51) }).errors.fullName)
      .toBe('Full name must be less than 50 characters');
  });

  test('should require address and validate address length', () => {
    expect(validateCheckoutForm({ ...validFormData, address: '' }).errors.address)
      .toBe('Address is required');

    expect(validateCheckoutForm({ ...validFormData, address: 'Short' }).errors.address)
      .toBe('Address must be at least 10 characters');

    expect(validateCheckoutForm({ ...validFormData, address: 'A'.repeat(201) }).errors.address)
      .toBe('Address must be less than 200 characters');
  });

  test('should validate city name', () => {
    expect(validateCheckoutForm({ ...validFormData, city: '' }).errors.city)
      .toBe('City is required');

    expect(validateCheckoutForm({ ...validFormData, city: 'K' }).errors.city)
      .toBe('City must be at least 2 characters');

    expect(validateCheckoutForm({ ...validFormData, city: 'Kandy 2' }).errors.city)
      .toBe('City should contain only letters and spaces');
  });

  test('should validate phone number', () => {
    expect(validateCheckoutForm({ ...validFormData, phoneNumber: '' }).errors.phoneNumber)
      .toBe('Phone number is required');

    expect(validateCheckoutForm({ ...validFormData, phoneNumber: '12345' }).errors.phoneNumber)
      .toBe('Please enter a valid phone number (at least 10 digits)');

    expect(validateCheckoutForm({ ...validFormData, phoneNumber: '+94 77 258 5258' }).isValid)
      .toBe(true);
  });

  test('should require payment method', () => {
    const result = validateCheckoutForm({ ...validFormData, paymentMethod: '' });

    expect(result.isValid).toBe(false);
    expect(result.errors.paymentMethod).toBe('Payment method is required');
  });
});

describe('Checkout Totals', () => {
  test('should calculate a single line total from price and quantity', () => {
    expect(getLineTotal(sampleCartItems[1])).toBe(3600);
  });

  test('should calculate subtotal, shipping, tax, and total', () => {
    const totals = calculateTotals(sampleCartItems);

    expect(totals.subtotal).toBe(6599);
    expect(totals.shipping).toBe(200);
    expect(totals.tax).toBeCloseTo(527.92);
    expect(totals.total).toBeCloseTo(7326.92);
  });

  test('should return zero totals for empty checkout', () => {
    const totals = calculateTotals([]);

    expect(totals).toEqual({
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
    });
  });

  test('should ignore invalid price or quantity values', () => {
    const totals = calculateTotals([
      { quantity: 'abc', product: { price: 1500 } },
      { quantity: 1, product: { price: 'bad-price' } },
      { quantity: 2, product: { price: 1000 } },
    ]);

    expect(totals.subtotal).toBe(2000);
    expect(totals.total).toBe(2360);
  });
});

describe('Checkout Order Data Construction', () => {
  test('should build valid order items from cart items', () => {
    const orderItems = buildOrderItems(sampleCartItems);

    expect(orderItems).toEqual([
      { qty: 1, product: 'product1', size: 'S' },
      { qty: 2, product: 'product2', size: 'M' },
    ]);
  });

  test('should remove cart rows without product ids or valid quantities', () => {
    const orderItems = buildOrderItems([
      { quantity: 1, product: null, size: 'S' },
      { quantity: 0, product: { _id: 'product2' }, size: 'M' },
      { quantity: 2, product: { _id: 'product3' }, size: 'L' },
    ]);

    expect(orderItems).toEqual([{ qty: 2, product: 'product3', size: 'L' }]);
  });

  test('should trim shipping fields before creating order payload', () => {
    const orderData = buildOrderData({
      items: sampleCartItems,
      formData: {
        fullName: '  Vijaya Kumar  ',
        address: '  123 Flower Road, Kandy  ',
        city: '  Kandy  ',
        phoneNumber: '  0772585258  ',
        paymentMethod: 'cod',
      },
    });

    expect(orderData.shippingAddress).toEqual({
      fullName: 'Vijaya Kumar',
      address: '123 Flower Road, Kandy',
      city: 'Kandy',
      phoneNumber: '0772585258',
    });
  });

  test('should use selected cart item ids when cart item ids exist', () => {
    const orderData = buildOrderData({
      items: sampleCartItems,
      selectedItemIds: ['selected1'],
      formData: validFormData,
    });

    expect(orderData.cartItemIds).toEqual(['cartItem1', 'cartItem2']);
  });

  test('should fall back to route selected ids when cart item ids are missing', () => {
    const orderData = buildOrderData({
      items: [
        { quantity: 1, size: 'S', product: { _id: 'product1', price: 1000 } },
      ],
      selectedItemIds: ['selected1'],
      formData: validFormData,
    });

    expect(orderData.cartItemIds).toEqual(['selected1']);
  });
});

describe('Checkout Edge Cases', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  test('should handle network error while creating order', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    fetch.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(
      createOrder(buildOrderData({ items: sampleCartItems, formData: validFormData }))
    ).rejects.toThrow('Network request failed');
  });

  test('should handle invalid server response', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('mock-user-token');
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 500,
      text: async () => '<html>Backend error</html>',
    });

    await expect(
      createOrder(buildOrderData({ items: sampleCartItems, formData: validFormData }))
    ).rejects.toThrow('Server returned 500. Please restart the backend and try again.');
  });

  test('should not send Authorization header when token is missing', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    mockFetchSuccess({ _id: 'order123' }, 201);

    await createOrder(buildOrderData({ items: sampleCartItems, formData: validFormData }));

    const [, requestOptions] = fetch.mock.calls[0];
    expect(requestOptions.headers.Authorization).toBeUndefined();
  });

  test('should build status style keys for order list display', () => {
    expect(getStatusKey()).toBe('statusPending');
    expect(getStatusKey('Pending')).toBe('statusPending');
    expect(getStatusKey('Order Placed')).toBe('statusOrderPlaced');
    expect(getStatusKey('Order Cancelled')).toBe('statusOrderCancelled');
  });
});
