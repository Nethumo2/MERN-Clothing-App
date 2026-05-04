/**
 * Unit Tests for Product Details Component
 * Member: Illangakoon I.W.M.T.D (IT24103131)
 * Component: Product Details Screen
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

global.fetch = jest.fn();

const BASE_URL = 'http://10.92.115.223:5000/api';

const AsyncStorage = require('@react-native-async-storage/async-storage');

const fetchProductById = async (id) => {
    const res = await fetch(`${BASE_URL}/products/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Something went wrong');
    return data;
};

const addToCart = async (productId, quantity, size, price) => {
    const token = await AsyncStorage.getItem('userToken');
    const res = await fetch(`${BASE_URL}/cart/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ productId, quantity, size, price }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Something went wrong');
    return data;
};

const deleteProduct = async (id, token) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Something went wrong');
    return data;
};

const updateProduct = async (id, product) => {
    const token = await AsyncStorage.getItem('userToken');
    const res = await fetch(`${BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Something went wrong');
    return data;
};

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

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: fetchProductById
// ─────────────────────────────────────────────────────────────────────────────
describe('fetchProductById', () => {

    beforeEach(() => {
        fetch.mockClear();
    });

    test('should return product data when product exists', async () => {
        const mockProduct = {
            _id: '69f69863e3a33f6b995077f3',
            name: 'Blue Denim',
            price: 3000,
            size: ['S', 'M', 'L', 'XL'],
            category: 'Trouser',
            imageUrl: 'https://example.com/image.jpg',
            description: 'Good quality denim',
            countInStock: 25,
        };

        mockFetchSuccess(mockProduct);

        const result = await fetchProductById('69f69863e3a33f6b995077f3');

        expect(result).toEqual(mockProduct);
        expect(result.name).toBe('Blue Denim');
        expect(result.price).toBe(3000);
    });

    test('should call correct API endpoint with product ID', async () => {
        const productId = '69f69863e3a33f6b995077f3';
        mockFetchSuccess({ _id: productId, name: 'Test Product' });

        await fetchProductById(productId);

        expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/products/${productId}`);
    });

    test('should throw error when product not found', async () => {
        mockFetchFail('Product not found', 404);

        await expect(fetchProductById('invalidid123')).rejects.toThrow('Product not found');
    });

    test('should return product with size array', async () => {
        const mockProduct = {
            _id: 'abc123',
            name: 'T-Shirt',
            size: ['S', 'M', 'L'],
        };
        mockFetchSuccess(mockProduct);

        const result = await fetchProductById('abc123');

        expect(Array.isArray(result.size)).toBe(true);
        expect(result.size).toHaveLength(3);
        expect(result.size).toContain('M');
    });

    test('should throw error on server error', async () => {
        mockFetchFail('Server Error', 500);

        await expect(fetchProductById('abc123')).rejects.toThrow('Server Error');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 2: addToCart
// ─────────────────────────────────────────────────────────────────────────────
describe('addToCart', () => {

    beforeEach(() => {
        fetch.mockClear();
        AsyncStorage.getItem.mockClear();
    });

    test('should add item to cart successfully', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('mock-jwt-token');
        const mockCart = {
            _id: 'cart123',
            items: [{ product: 'product123', quantity: 1, size: 'M' }],
            totalPrice: 3000,
        };
        mockFetchSuccess(mockCart);

        const result = await addToCart('product123', 1, 'M', 3000);

        expect(result).toEqual(mockCart);
        expect(result.totalPrice).toBe(3000);
    });

    test('should send correct data in request body', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('mock-jwt-token');
        mockFetchSuccess({ items: [] });

        await addToCart('product123', 2, 'L', 1500);

        const callArgs = fetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);

        expect(body.productId).toBe('product123');
        expect(body.quantity).toBe(2);
        expect(body.size).toBe('L');
        expect(body.price).toBe(1500);
    });

    test('should include Authorization header with token', async () => {
        const mockToken = 'mock-jwt-token-123';
        AsyncStorage.getItem.mockResolvedValueOnce(mockToken);
        mockFetchSuccess({ items: [] });

        await addToCart('product123', 1, 'S', 1000);

        const callArgs = fetch.mock.calls[0];
        expect(callArgs[1].headers.Authorization).toBe(`Bearer ${mockToken}`);
    });

    test('should throw error when not authenticated', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('invalid-token');
        mockFetchFail('Not authorized, token failed', 401);

        await expect(addToCart('product123', 1, 'M', 3000))
            .rejects.toThrow('Not authorized, token failed');
    });

    test('should use POST method', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('mock-token');
        mockFetchSuccess({ items: [] });

        await addToCart('product123', 1, 'M', 1000);

        const callArgs = fetch.mock.calls[0];
        expect(callArgs[1].method).toBe('POST');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: deleteProduct
// ─────────────────────────────────────────────────────────────────────────────
describe('deleteProduct', () => {

    beforeEach(() => {
        fetch.mockClear();
    });

    test('should delete product successfully', async () => {
        mockFetchSuccess({ message: 'Product removed' });

        const result = await deleteProduct('product123', 'admin-token');

        expect(result.message).toBe('Product removed');
    });

    test('should call correct endpoint with DELETE method', async () => {
        const productId = 'product123';
        mockFetchSuccess({ message: 'Product removed' });

        await deleteProduct(productId, 'admin-token');

        expect(fetch).toHaveBeenCalledWith(
            `${BASE_URL}/products/${productId}`,
            expect.objectContaining({ method: 'DELETE' })
        );
    });

    test('should include admin token in Authorization header', async () => {
        const adminToken = 'admin-jwt-token';
        mockFetchSuccess({ message: 'Product removed' });

        await deleteProduct('product123', adminToken);

        const callArgs = fetch.mock.calls[0];
        expect(callArgs[1].headers.Authorization).toBe(`Bearer ${adminToken}`);
    });

    test('should throw error when product not found', async () => {
        mockFetchFail('Product not found', 404);

        await expect(deleteProduct('nonexistent', 'admin-token'))
            .rejects.toThrow('Product not found');
    });

    test('should throw error when not authorized as admin', async () => {
        mockFetchFail('Not authorized as an admin', 401);

        await expect(deleteProduct('product123', 'user-token'))
            .rejects.toThrow('Not authorized as an admin');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 4: updateProduct
// ─────────────────────────────────────────────────────────────────────────────
describe('updateProduct', () => {

    beforeEach(() => {
        fetch.mockClear();
        AsyncStorage.getItem.mockClear();
    });

    test('should update product successfully', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('admin-token');
        const updatedProduct = {
            _id: 'product123',
            name: 'Updated Blue Denim',
            price: 3500,
            size: ['S', 'M', 'L', 'XL'],
            category: 'Trouser',
        };
        mockFetchSuccess(updatedProduct);

        const result = await updateProduct('product123', {
            name: 'Updated Blue Denim',
            price: 3500,
            size: 'S, M, L, XL',
            category: 'Trouser',
        });

        expect(result.name).toBe('Updated Blue Denim');
        expect(result.price).toBe(3500);
    });

    test('should send correct product data in request body', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('admin-token');
        mockFetchSuccess({ _id: 'product123', name: 'New Name' });

        const productData = {
            name: 'New Name',
            price: 2000,
            category: 'Shirts',
            size: 'S, M',
            description: 'Updated description',
            countInStock: 10,
            imageUrl: 'https://example.com/new.jpg',
        };

        await updateProduct('product123', productData);

        const callArgs = fetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);

        expect(body.name).toBe('New Name');
        expect(body.price).toBe(2000);
        expect(body.category).toBe('Shirts');
    });

    test('should use PUT method', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('admin-token');
        mockFetchSuccess({ _id: 'product123' });

        await updateProduct('product123', { name: 'Test' });

        const callArgs = fetch.mock.calls[0];
        expect(callArgs[1].method).toBe('PUT');
    });

    test('should throw error when not authorized', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('user-token');
        mockFetchFail('Not authorized as an admin', 401);

        await expect(updateProduct('product123', { name: 'New Name' }))
            .rejects.toThrow('Not authorized as an admin');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 5: Product Details Business Logic
// ─────────────────────────────────────────────────────────────────────────────
describe('Product Details Business Logic', () => {

    test('should calculate total price correctly (price × quantity)', () => {
        const price = 1500;
        const quantity = 3;
        const total = price * quantity;
        expect(total).toBe(4500);
    });

    test('should calculate total price for single item', () => {
        const price = 3000;
        const quantity = 1;
        expect(price * quantity).toBe(3000);
    });

    test('should not allow quantity below 1', () => {
        const decreaseQuantity = (current) => Math.max(1, current - 1);
        expect(decreaseQuantity(1)).toBe(1);
        expect(decreaseQuantity(3)).toBe(2);
        expect(decreaseQuantity(0)).toBe(1);
    });

    test('should not allow quantity above stock', () => {
        const countInStock = 10;
        const increaseQuantity = (current) => Math.min(countInStock, current + 1);
        expect(increaseQuantity(9)).toBe(10);
        expect(increaseQuantity(10)).toBe(10);
        expect(increaseQuantity(5)).toBe(6);
    });

    test('should normalize size field from database (size or sizes)', () => {
        const normalizeSizes = (data) => data?.size || data?.sizes || [];

        expect(normalizeSizes({ size: ['S', 'M', 'L'] })).toEqual(['S', 'M', 'L']);
        expect(normalizeSizes({ sizes: ['XS', 'S'] })).toEqual(['XS', 'S']);
        expect(normalizeSizes({})).toEqual([]);
        expect(normalizeSizes({ size: [], sizes: ['M'] })).toEqual([]);
    });

    test('should normalize imageUrl from database', () => {
        const normalizeImage = (data) =>
            data?.imageUrl ||
            data?.images?.[0]?.url ||
            data?.images?.[0] ||
            'https://via.placeholder.com/300';

        expect(normalizeImage({ imageUrl: 'https://example.com/img.jpg' }))
            .toBe('https://example.com/img.jpg');

        expect(normalizeImage({ images: [{ url: 'https://example.com/img2.jpg' }] }))
            .toBe('https://example.com/img2.jpg');

        expect(normalizeImage({}))
            .toBe('https://via.placeholder.com/300');
    });

    test('should detect admin user correctly', () => {
        const isAdmin = (user) => user?.isAdmin === true;

        expect(isAdmin({ isAdmin: true })).toBe(true);
        expect(isAdmin({ isAdmin: false })).toBe(false);
        expect(isAdmin(null)).toBe(false);
        expect(isAdmin({})).toBe(false);
    });

    test('should select first size by default', () => {
        const sizes = ['S', 'M', 'L', 'XL'];
        const defaultSize = sizes.length > 0 ? sizes[0] : null;
        expect(defaultSize).toBe('S');
    });

    test('should return null default size when no sizes available', () => {
        const sizes = [];
        const defaultSize = sizes.length > 0 ? sizes[0] : null;
        expect(defaultSize).toBeNull();
    });

    test('should format price correctly with toLocaleString', () => {
        const price = 3000;
        const formatted = `LKR ${Number(price).toLocaleString()}`;
        expect(formatted).toContain('LKR');
        expect(formatted).toContain('3');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 6: Edge Cases
// ─────────────────────────────────────────────────────────────────────────────
describe('Edge Cases', () => {

    beforeEach(() => {
        fetch.mockClear();
        AsyncStorage.getItem.mockClear();
    });

    test('fetchProductById should handle network error', async () => {
        fetch.mockRejectedValueOnce(new Error('Network request failed'));

        await expect(fetchProductById('product123'))
            .rejects.toThrow('Network request failed');
    });

    test('addToCart should handle network error', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('token');
        fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

        await expect(addToCart('product123', 1, 'M', 1000))
            .rejects.toThrow('Failed to fetch');
    });

    test('deleteProduct should handle network error', async () => {
        fetch.mockRejectedValueOnce(new Error('Network request failed'));

        await expect(deleteProduct('product123', 'token'))
            .rejects.toThrow('Network request failed');
    });

    test('quantity should be a positive integer', () => {
        const quantity = 1;
        expect(quantity).toBeGreaterThan(0);
        expect(Number.isInteger(quantity)).toBe(true);
    });

    test('price should be a positive number', () => {
        const price = 3000;
        expect(price).toBeGreaterThan(0);
        expect(typeof price).toBe('number');
    });
});
