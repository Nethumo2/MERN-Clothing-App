import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevApiUrl = () => {
    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.manifest2?.extra?.expoClient?.hostUri ||
        Constants.manifest?.debuggerHost;

    const host = hostUri?.split(':')[0];
    if (host) return `http://${host}:5000/api`;

    if (Platform.OS === 'android') return 'http://10.0.2.2:5000/api';

    return 'http://localhost:5000/api';
};

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDevApiUrl();

const getToken = async () => {
    return await AsyncStorage.getItem('userToken');
};

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

export const registerUser = async (name, email, password) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });

    return handleResponse(res);
};

export const loginUser = async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    return handleResponse(res);
};

export const guestLogin = async () => {
    const res = await fetch(`${BASE_URL}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });

    return handleResponse(res);
};

export const fetchProducts = async () => {
    const res = await fetch(`${BASE_URL}/products`);
    return handleResponse(res);
};

export const fetchProductById = async (id) => {
    const res = await fetch(`${BASE_URL}/products/${id}`);
    return handleResponse(res);
};

export const createProduct = async (product) => {
    const token = await AsyncStorage.getItem('userToken');
    const res = await fetch(`${BASE_URL}/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            name: product.name,
            price: product.price,
            comparePrice: product.comparePrice,
            discountPercent: product.discountPercent,
            category: product.category,
            description: product.description || '',
            countInStock: product.countInStock || 0,
            size: product.size,
            imageUrl: product.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image',
        }),
    });
    return handleResponse(res);
};

export const updateProduct = async (id, product) => {
    const token = await AsyncStorage.getItem('userToken');
    const res = await fetch(`${BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            name: product.name,
            price: product.price,
            comparePrice: product.comparePrice,
            discountPercent: product.discountPercent,
            category: product.category,
            description: product.description || '',
            countInStock: product.countInStock || 0,
            size: product.size,
            imageUrl: product.imageUrl || '',
        }),
    });
    return handleResponse(res);
};

export const deleteProduct = async (id, token) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return handleResponse(res);
};

export const fetchCategories = async () => {
    const res = await fetch(`${BASE_URL}/categories`);
    return handleResponse(res);
};

export const fetchCart = async () => {
    const res = await fetch(`${BASE_URL}/cart`, {
        headers: await authHeaders(),
    });

    return handleResponse(res);
};

export const addToCart = async (productId, quantity, size) => {
    const res = await fetch(`${BASE_URL}/cart/add`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ productId, quantity, size }),
    });

    return handleResponse(res);
};

export const removeFromCart = async (itemId) => {
    const res = await fetch(`${BASE_URL}/cart/remove/${itemId}`, {
        method: 'DELETE',
        headers: await authHeaders(),
    });

    return handleResponse(res);
};

export const updateCartItem = async (itemId, quantity) => {
    const res = await fetch(`${BASE_URL}/cart/update/${itemId}`, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({ quantity }),
    });

    return handleResponse(res);
};

export const clearCart = async () => {
    const res = await fetch(`${BASE_URL}/cart/clear`, {
        method: 'DELETE',
        headers: await authHeaders(),
    });

    return handleResponse(res);
};

export const createOrder = async (orderData) => {
    const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(orderData),
    });

    return handleResponse(res);
};

export const fetchMyOrders = async () => {
    const res = await fetch(`${BASE_URL}/orders/myorders`, {
        headers: await authHeaders(),
    });

    return handleResponse(res);
};
