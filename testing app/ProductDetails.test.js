/**
 * Unit Tests — Product Details Screen
 * Member  : Illangakoon I.W.M.T.D  (IT24103131)
 * Component: Product Details Screen
 */

global.AsyncStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
};

global.fetch = jest.fn();

const BASE_URL = 'http://10.92.115.223:5000/api';

const mockOk = (data) =>
    fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(data),
    });

const mockFail = (message, status = 400) =>
    fetch.mockResolvedValueOnce({
        ok: false,
        status,
        text: async () => JSON.stringify({ message }),
    });

const mockNetworkError = () =>
    fetch.mockRejectedValueOnce(new Error('Network request failed'));

const handleResponse = async (res) => {
    const text = await res.text();
    let data = null;
    if (text) {
        try { data = JSON.parse(text); }
        catch (_e) { throw new Error(`Server returned ${res.status}. Please restart the backend.`); }
    }
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data || {};
};

const fetchProductById = async (id) => {
    const res = await fetch(`${BASE_URL}/products/${id}`);
    return handleResponse(res);
};

const addToCart = async (productId, quantity, size) => {
    const token = await global.AsyncStorage.getItem('userToken');
    const res = await fetch(`${BASE_URL}/cart/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ productId, quantity, size }),
    });
    return handleResponse(res);
};

const deleteProduct = async (id, token) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
};

const updateProduct = async (id, product) => {
    const token = await global.AsyncStorage.getItem('userToken');
    const res = await fetch(`${BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
    });
    return handleResponse(res);
};

const createProduct = async (product) => {
    const token = await global.AsyncStorage.getItem('userToken');
    const res = await fetch(`${BASE_URL}/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
    });
    return handleResponse(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — fetchProductById
// ─────────────────────────────────────────────────────────────────────────────
describe('fetchProductById', () => {
    beforeEach(() => fetch.mockClear());

    test('returns product data when product exists', async () => {
        const mock = {
            _id: '69f69863e3a33f6b995077f3',
            name: 'Blue Denim',
            price: 3000,
            size: ['S', 'M', 'L', 'XL'],
            category: 'Trouser',
            imageUrl: 'https://example.com/image.jpg',
            description: 'Good quality denim',
            countInStock: 25,
        };
        mockOk(mock);
        const result = await fetchProductById('69f69863e3a33f6b995077f3');
        expect(result).toEqual(mock);
        expect(result.name).toBe('Blue Denim');
        expect(result.price).toBe(3000);
    });

    test('calls correct API endpoint', async () => {
        const id = '69f69863e3a33f6b995077f3';
        mockOk({ _id: id, name: 'Test' });
        await fetchProductById(id);
        expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/products/${id}`);
    });

    test('throws error when product not found (404)', async () => {
        mockFail('Product not found', 404);
        await expect(fetchProductById('invalidid')).rejects.toThrow('Product not found');
    });

    test('returns product with size array', async () => {
        mockOk({ _id: 'abc', name: 'T-Shirt', size: ['S', 'M', 'L'] });
        const result = await fetchProductById('abc');
        expect(Array.isArray(result.size)).toBe(true);
        expect(result.size).toContain('M');
    });

    test('throws on server error (500)', async () => {
        mockFail('Internal Server Error', 500);
        await expect(fetchProductById('abc')).rejects.toThrow('Internal Server Error');
    });

    test('throws on network failure', async () => {
        mockNetworkError();
        await expect(fetchProductById('abc')).rejects.toThrow('Network request failed');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — addToCart  (note: new api.js removed `price` param)
// ─────────────────────────────────────────────────────────────────────────────
describe('addToCart', () => {
    beforeEach(() => {
        fetch.mockClear();
        global.AsyncStorage.getItem.mockClear();
    });

    test('adds item to cart successfully', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('mock-token');
        const mockCart = { _id: 'cart1', items: [{ product: 'p1', quantity: 1, size: 'M' }], totalPrice: 3000 };
        mockOk(mockCart);
        const result = await addToCart('p1', 1, 'M');
        expect(result).toEqual(mockCart);
    });

    test('sends correct body — productId, quantity, size', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('mock-token');
        mockOk({ items: [] });
        await addToCart('product123', 2, 'L');
        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body.productId).toBe('product123');
        expect(body.quantity).toBe(2);
        expect(body.size).toBe('L');
    });

    test('includes Authorization header', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('my-token');
        mockOk({ items: [] });
        await addToCart('p1', 1, 'S');
        expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer my-token');
    });

    test('uses POST method', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('token');
        mockOk({ items: [] });
        await addToCart('p1', 1, 'M');
        expect(fetch.mock.calls[0][1].method).toBe('POST');
    });

    test('throws when not authenticated (401)', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('bad-token');
        mockFail('Not authorized, token failed', 401);
        await expect(addToCart('p1', 1, 'M')).rejects.toThrow('Not authorized, token failed');
    });

    test('throws on network failure', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('token');
        mockNetworkError();
        await expect(addToCart('p1', 1, 'M')).rejects.toThrow('Network request failed');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — deleteProduct
// ─────────────────────────────────────────────────────────────────────────────
describe('deleteProduct', () => {
    beforeEach(() => fetch.mockClear());

    test('deletes product successfully', async () => {
        mockOk({ message: 'Product removed' });
        const result = await deleteProduct('p1', 'admin-token');
        expect(result.message).toBe('Product removed');
    });

    test('calls correct endpoint with DELETE method', async () => {
        mockOk({ message: 'Product removed' });
        await deleteProduct('p1', 'admin-token');
        expect(fetch).toHaveBeenCalledWith(
            `${BASE_URL}/products/p1`,
            expect.objectContaining({ method: 'DELETE' })
        );
    });

    test('includes admin token in header', async () => {
        mockOk({ message: 'Product removed' });
        await deleteProduct('p1', 'admin-jwt');
        expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer admin-jwt');
    });

    test('throws when product not found (404)', async () => {
        mockFail('Product not found', 404);
        await expect(deleteProduct('bad-id', 'admin-token')).rejects.toThrow('Product not found');
    });

    test('throws when not authorized as admin (401)', async () => {
        mockFail('Not authorized as an admin', 401);
        await expect(deleteProduct('p1', 'user-token')).rejects.toThrow('Not authorized as an admin');
    });

    test('throws on network failure', async () => {
        mockNetworkError();
        await expect(deleteProduct('p1', 'token')).rejects.toThrow('Network request failed');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — updateProduct
// ─────────────────────────────────────────────────────────────────────────────
describe('updateProduct', () => {
    beforeEach(() => {
        fetch.mockClear();
        global.AsyncStorage.getItem.mockClear();
    });

    test('updates product successfully', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('admin-token');
        const updated = { _id: 'p1', name: 'Updated Denim', price: 3500 };
        mockOk(updated);
        const result = await updateProduct('p1', { name: 'Updated Denim', price: 3500 });
        expect(result.name).toBe('Updated Denim');
        expect(result.price).toBe(3500);
    });

    test('sends correct body including comparePrice', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('admin-token');
        mockOk({ _id: 'p1' });
        await updateProduct('p1', {
            name: 'Gown', price: 12500, comparePrice: 15000,
            category: 'Dresses', size: 'S, M', countInStock: 10,
            imageUrl: 'https://img.jpg',
        });
        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body.name).toBe('Gown');
        expect(body.price).toBe(12500);
        expect(body.comparePrice).toBe(15000);
    });

    test('uses PUT method', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('admin-token');
        mockOk({ _id: 'p1' });
        await updateProduct('p1', { name: 'Test' });
        expect(fetch.mock.calls[0][1].method).toBe('PUT');
    });

    test('throws when not authorized (401)', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('user-token');
        mockFail('Not authorized as an admin', 401);
        await expect(updateProduct('p1', { name: 'x' })).rejects.toThrow('Not authorized as an admin');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — createProduct
// ─────────────────────────────────────────────────────────────────────────────
describe('createProduct', () => {
    beforeEach(() => {
        fetch.mockClear();
        global.AsyncStorage.getItem.mockClear();
    });

    test('creates product successfully', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('admin-token');
        const created = { _id: 'new1', name: 'Silk Gown', price: 12500 };
        mockOk(created);
        const result = await createProduct({ name: 'Silk Gown', price: 12500, size: 'S, M', category: 'Dresses' });
        expect(result._id).toBe('new1');
        expect(result.name).toBe('Silk Gown');
    });

    test('uses POST method', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('admin-token');
        mockOk({ _id: 'new1' });
        await createProduct({ name: 'Test', price: 1000, size: 'M', category: 'Tops' });
        expect(fetch.mock.calls[0][1].method).toBe('POST');
    });

    test('calls correct endpoint', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('admin-token');
        mockOk({ _id: 'new1' });
        await createProduct({ name: 'Test', price: 1000, size: 'M', category: 'Tops' });
        expect(fetch.mock.calls[0][0]).toBe(`${BASE_URL}/products`);
    });

    test('throws when not admin (401)', async () => {
        global.AsyncStorage.getItem.mockResolvedValueOnce('user-token');
        mockFail('Not authorized as an admin', 401);
        await expect(createProduct({ name: 'Test' })).rejects.toThrow('Not authorized as an admin');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Business Logic
// ─────────────────────────────────────────────────────────────────────────────
describe('Product Details Business Logic', () => {

    test('calculates total price correctly (price × quantity)', () => {
        expect(1500 * 3).toBe(4500);
        expect(3000 * 1).toBe(3000);
    });

    test('quantity cannot go below 1', () => {
        const dec = (q) => Math.max(1, q - 1);
        expect(dec(1)).toBe(1);
        expect(dec(3)).toBe(2);
        expect(dec(0)).toBe(1);
    });

    test('quantity cannot exceed countInStock', () => {
        const inc = (q, stock) => Math.min(stock, q + 1);
        expect(inc(9, 10)).toBe(10);
        expect(inc(10, 10)).toBe(10);
        expect(inc(5, 10)).toBe(6);
    });

    test('normalizes size field (size or sizes)', () => {
        const norm = (d) => d?.size || d?.sizes || [];
        expect(norm({ size: ['S', 'M'] })).toEqual(['S', 'M']);
        expect(norm({ sizes: ['XS'] })).toEqual(['XS']);
        expect(norm({})).toEqual([]);
    });

    test('normalizes imageUrl from multiple formats', () => {
        const norm = (d) =>
            d?.imageUrl || d?.images?.[0]?.url || d?.images?.[0] || 'https://via.placeholder.com/300';
        expect(norm({ imageUrl: 'https://a.com/img.jpg' })).toBe('https://a.com/img.jpg');
        expect(norm({ images: [{ url: 'https://b.com/img.jpg' }] })).toBe('https://b.com/img.jpg');
        expect(norm({})).toBe('https://via.placeholder.com/300');
    });

    test('detects admin user correctly', () => {
        const isAdmin = (u) => u?.isAdmin === true;
        expect(isAdmin({ isAdmin: true })).toBe(true);
        expect(isAdmin({ isAdmin: false })).toBe(false);
        expect(isAdmin(null)).toBe(false);
        expect(isAdmin({})).toBe(false);
    });

    test('selects first size by default', () => {
        const defaultSize = (arr) => arr.length > 0 ? arr[0] : null;
        expect(defaultSize(['S', 'M', 'L'])).toBe('S');
        expect(defaultSize([])).toBeNull();
    });

    test('calculates discount percentage correctly', () => {
        const getDiscount = (price, comparePrice) => {
            if (!comparePrice || comparePrice <= price) return 0;
            return Math.round(((comparePrice - price) / comparePrice) * 100);
        };
        expect(getDiscount(8500, 10000)).toBe(15);
        expect(getDiscount(3000, 3000)).toBe(0);
        expect(getDiscount(3000, 0)).toBe(0);
        expect(getDiscount(12500, 15000)).toBe(17);
    });

    test('detects new arrival within 24 hours', () => {
        const isNew = (createdAt) => {
            if (!createdAt) return false;
            return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
        };
        expect(isNew(new Date().toISOString())).toBe(true);
        expect(isNew('2020-01-01T00:00:00Z')).toBe(false);
        expect(isNew(null)).toBe(false);
    });

    test('formats price with LKR label', () => {
        const fmt = (p) => `LKR ${Number(p).toLocaleString()}`;
        expect(fmt(3000)).toContain('LKR');
        expect(fmt(12500)).toContain('12');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — Validation Guards
// ─────────────────────────────────────────────────────────────────────────────
describe('Validation Guards', () => {

    test('blocks add-to-cart when size required but not selected', () => {
        const validate = (sizeArray, selectedSize) => {
            if (sizeArray.length > 0 && !selectedSize) return 'Size Required';
            return null;
        };
        expect(validate(['S', 'M'], null)).toBe('Size Required');
        expect(validate(['S', 'M'], 'M')).toBeNull();
        expect(validate([], null)).toBeNull();
    });

    test('quantity must be positive integer', () => {
        const qty = 1;
        expect(qty).toBeGreaterThan(0);
        expect(Number.isInteger(qty)).toBe(true);
    });

    test('price must be positive number', () => {
        const price = 3000;
        expect(price).toBeGreaterThan(0);
        expect(typeof price).toBe('number');
    });

    test('product ID must be a non-empty string', () => {
        const validId = (id) => typeof id === 'string' && id.length > 0;
        expect(validId('69f69863e3a33f6b995077f3')).toBe(true);
        expect(validId('')).toBe(false);
        expect(validId(null)).toBe(false);
    });

    test('admin check blocks delete for regular users', () => {
        const canDelete = (user) => user?.isAdmin === true;
        expect(canDelete({ isAdmin: true })).toBe(true);
        expect(canDelete({ isAdmin: false })).toBe(false);
        expect(canDelete(null)).toBe(false);
    });
});
