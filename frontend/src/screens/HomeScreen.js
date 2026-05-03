import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    Image, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';

import { fetchProducts } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFocusEffect } from '@react-navigation/native';
export default function HomeScreen({ navigation }) {
    const { user, logout } = useAuth();
    const { cartCount } = useCart();

    // 🛠️ ADMIN MODE
    const isAdmin = user?.isAdmin === true;

    const [products, setProducts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [productFilter, setProductFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isNewArrival = (product) => {
        if (!product.createdAt) return false;
        const createdTime = new Date(product.createdAt).getTime();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return Number.isFinite(createdTime) && createdTime >= oneDayAgo;
    };

    const getDiscountPercent = (product) => {
        const directDiscount = Number(product.discountPercent ?? product.discount);
        if (Number.isFinite(directDiscount) && directDiscount > 0) {
            return Math.round(directDiscount);
        }

        const price = Number(product.price);
        const comparePrice = Number(product.comparePrice);
        if (!Number.isFinite(price) || !Number.isFinite(comparePrice) || comparePrice <= price) return 0;
        return Math.round(((comparePrice - price) / comparePrice) * 100);
    };

    const hasComparePrice = (product) => {
        const price = Number(product.price);
        const comparePrice = Number(product.comparePrice);
        return Number.isFinite(price) && Number.isFinite(comparePrice) && comparePrice > price;
    };

    const getSearchText = (product) => [
        product.name,
        product.category,
        product.description,
        ...(Array.isArray(product.colors) ? product.colors : []),
        ...(Array.isArray(product.size) ? product.size : []),
        ...(Array.isArray(product.sizes) ? product.sizes : []),
    ].filter(Boolean).join(' ').toLowerCase();

    const loadProducts = async () => {
        try {
            const data = await fetchProducts();
            setProducts(Array.isArray(data) ? data : []);
            setFiltered(Array.isArray(data) ? data : []);
        } catch (e) {
            console.log('Error loading products', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#f5f5f5',
        },

        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#1a1a1a',
            padding: 20,
            paddingTop: 50,
        },

        greeting: {
            color: '#fff',
            fontSize: 20,
            fontWeight: '800',
        },

        tagline: {
            color: '#aaa',
            fontSize: 13,
        },

        cartBtn: {
            position: 'relative',
        },

        cartIcon: {
            fontSize: 24,
        },

        badge: {
            position: 'absolute',
            top: -5,
            right: -5,
            backgroundColor: 'red',
            borderRadius: 10,
            paddingHorizontal: 5,
        },

        badgeText: {
            color: '#fff',
            fontSize: 10,
        },

        adminAddBtn: {
            backgroundColor: '#e63946',
            margin: 10,
            padding: 12,
            borderRadius: 10,
            alignItems: 'center',
        },

        adminAddText: {
            color: '#fff',
            fontWeight: '700',
        },

        search: {
            backgroundColor: '#fff',
            margin: 10,
            padding: 10,
            borderRadius: 10,
        },

        quickNav: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginVertical: 10,
        },

        navBtn: {
            backgroundColor: '#fff',
            padding: 10,
            borderRadius: 10,
        },

        navBtnText: {
            fontSize: 12,
            fontWeight: '600',
        },

        filterRow: {
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 10,
            marginBottom: 8,
        },

        filterBtn: {
            flex: 1,
            backgroundColor: '#fff',
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#eee',
        },

        filterBtnActive: {
            backgroundColor: '#1a1a1a',
            borderColor: '#1a1a1a',
        },

        filterBtnText: {
            fontSize: 12,
            fontWeight: '800',
            color: '#555',
        },

        filterBtnTextActive: {
            color: '#fff',
        },

        list: {
            padding: 10,
        },

        row: {
            justifyContent: 'space-between',
        },

        card: {
            backgroundColor: '#fff',
            width: '48%',
            marginBottom: 10,
            borderRadius: 10,
            overflow: 'hidden',
        },

        image: {
            width: '100%',
            height: 150,
        },

        imageWrap: {
            position: 'relative',
        },

        badgePill: {
            position: 'absolute',
            top: 8,
            left: 8,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: '#1a1a1a',
        },

        badgePillSale: {
            backgroundColor: '#e63946',
        },

        badgePillText: {
            color: '#fff',
            fontSize: 10,
            fontWeight: '900',
        },

        cardInfo: {
            padding: 10,
        },

        cardName: {
            fontWeight: '700',
        },

        cardCategory: {
            fontSize: 12,
            color: '#777',
        },

        cardPrice: {
            color: 'red',
            fontWeight: '700',
            marginTop: 5,
        },

        priceRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
        },

        comparePrice: {
            color: '#888',
            fontSize: 11,
            textDecorationLine: 'line-through',
            marginTop: 5,
        },

        emptyText: {
            color: '#777',
            fontSize: 14,
            fontWeight: '700',
            marginTop: 28,
            textAlign: 'center',
        },
    });

    useFocusEffect(
        useCallback(() => {
            loadProducts();
        }, [])
    );

    useEffect(() => { loadProducts(); }, []);

    useEffect(() => {
        const q = search.trim().toLowerCase();
        setFiltered(products.filter((p) => {
            const matchesSearch = !q || getSearchText(p).includes(q);
            const matchesFilter =
                productFilter === 'new'
                    ? isNewArrival(p)
                    : productFilter === 'discounts'
                        ? getDiscountPercent(p) > 0
                        : true;
            return matchesSearch && matchesFilter;
        }));
    }, [search, products, productFilter]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadProducts();
    }, []);

    const renderProduct = ({ item }) => {
        const discountPercent = getDiscountPercent(item);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('ProductDetails', { productId: item._id })}
                activeOpacity={0.85}
            >
                <View style={styles.imageWrap}>
                    <Image
                        source={{ uri: item.imageUrl || 'https://via.placeholder.com/200' }}
                        style={styles.image}
                    />
                    {discountPercent > 0 ? (
                        <View style={[styles.badgePill, styles.badgePillSale]}>
                            <Text style={styles.badgePillText}>{discountPercent}% OFF</Text>
                        </View>
                    ) : isNewArrival(item) ? (
                        <View style={styles.badgePill}>
                            <Text style={styles.badgePillText}>NEW</Text>
                        </View>
                    ) : null}
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.cardCategory}>{item.category}</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.cardPrice}>LKR {Number(item.price).toLocaleString()}</Text>
                        {hasComparePrice(item) && (
                            <Text style={styles.comparePrice}>
                                LKR {Number(item.comparePrice).toLocaleString()}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>

            {/* HEADER */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0]} 👋</Text>
                    <Text style={styles.tagline}>What are you looking for?</Text>
                </View>

                <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
                    <Text style={styles.cartIcon}>🛒</Text>
                    {cartCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{cartCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* 🛠️ ADMIN BUTTON (NEW) */}
            {isAdmin && (
                <TouchableOpacity
                    style={styles.adminAddBtn}
                    onPress={() => navigation.navigate('AddProduct')}
                >
                    <Text style={styles.adminAddText}>➕ Add New Product</Text>
                </TouchableOpacity>
            )}

            {/* SEARCH */}
            <TextInput
                style={styles.search}
                placeholder="Search products..."
                value={search}
                onChangeText={setSearch}
            />

            {/* QUICK NAV */}
            <View style={styles.quickNav}>
                <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Categories')}>
                    <Text style={styles.navBtnText}>🏷️ Categories</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('OrderHistory')}>
                    <Text style={styles.navBtnText}>📦 Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navBtn} onPress={logout}>
                    <Text style={styles.navBtnText}>🚪 Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filterRow}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'new', label: 'New Arrivals' },
                    { key: 'discounts', label: 'Discounts' },
                ].map((item) => (
                    <TouchableOpacity
                        key={item.key}
                        style={[styles.filterBtn, productFilter === item.key && styles.filterBtnActive]}
                        onPress={() => setProductFilter(item.key)}
                    >
                        <Text style={[
                            styles.filterBtnText,
                            productFilter === item.key && styles.filterBtnTextActive,
                        ]}
                        >
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* LIST */}
            {loading ? (
                <ActivityIndicator size="large" color="#1a1a1a" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item._id}
                    renderItem={renderProduct}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            No products found. Try another search or filter.
                        </Text>
                    }
                />
            )}

        </View>
    );
}
