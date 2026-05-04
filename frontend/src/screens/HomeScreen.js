import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    Image, TextInput, ActivityIndicator, RefreshControl, useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchProducts } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFocusEffect } from '@react-navigation/native';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200';
const RECENTLY_VIEWED_KEY = 'recentlyViewed';

export default function HomeScreen({ navigation }) {
    const { user, logout } = useAuth();
    const { cartCount } = useCart();
    const { width } = useWindowDimensions();
    const productColumns = width >= 900 ? 3 : 2;
    const productCardWidth = productColumns === 3 ? '32%' : '48%';
    const productImageHeight = productColumns === 3 ? 230 : 170;

    // 🛠️ ADMIN MODE
    const isAdmin = user?.isAdmin === true;

    const [products, setProducts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [productFilter, setProductFilter] = useState('all');
    const [recentlyViewedIds, setRecentlyViewedIds] = useState([]);
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

    const loadRecentlyViewed = async () => {
        try {
            const stored = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
            setRecentlyViewedIds(stored ? JSON.parse(stored) : []);
        } catch (_e) {
            setRecentlyViewedIds([]);
        }
    };

    const clearRecentlyViewed = async () => {
        await AsyncStorage.removeItem(RECENTLY_VIEWED_KEY);
        setRecentlyViewedIds([]);
    };
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#FBFAF7',
        },

        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 24,
            paddingTop: 54,
            paddingBottom: 18,
            borderBottomWidth: 1,
            borderBottomColor: '#E9E2D8',
        },

        brandLabel: {
            color: '#9F8247',
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 2,
            marginBottom: 4,
        },

        greeting: {
            color: '#1B1B1B',
            fontSize: 30,
            fontFamily: 'Georgia',
            fontWeight: '700',
        },

        tagline: {
            color: '#8A8175',
            fontSize: 13,
        },

        cartBtn: {
            position: 'relative',
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 1,
            borderColor: '#E9E2D8',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
        },

        cartIcon: {
            fontSize: 12,
            fontWeight: '900',
            color: '#0F3D33',
        },

        badge: {
            position: 'absolute',
            top: -5,
            right: -5,
            backgroundColor: '#BFA46A',
            borderRadius: 12,
            paddingHorizontal: 5,
        },

        badgeText: {
            color: '#FFFFFF',
            fontSize: 10,
        },

        adminAddBtn: {
            flex: 1,
            backgroundColor: '#BFA46A',
            padding: 12,
            borderRadius: 12,
            alignItems: 'center',
        },

        adminActions: {
            flexDirection: 'row',
            gap: 10,
            margin: 10,
        },

        adminAddText: {
            color: '#FFFFFF',
            fontWeight: '700',
        },

        adminGhostBtn: {
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#BFA46A',
            padding: 12,
            borderRadius: 12,
            alignItems: 'center',
        },

        adminGhostText: {
            color: '#9F8247',
            fontWeight: '800',
        },

        search: {
            backgroundColor: '#FFFFFF',
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#E8D8B8',
            color: '#1B1B1B',
        },

        hero: {
            backgroundColor: '#FFFFFF',
            margin: 16,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#E9E2D8',
            shadowColor: '#1B1B1B',
            shadowOpacity: 0.06,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 3,
        },

        heroImage: {
            width: '100%',
            height: 240,
        },

        heroVeil: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(255,255,255,0.18)',
        },

        heroCopy: {
            position: 'absolute',
            left: 22,
            right: 22,
            bottom: 24,
        },

        heroEyebrow: {
            color: '#8A6F35',
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 1.6,
            marginBottom: 6,
            textShadowColor: 'rgba(255,255,255,0.85)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 8,
        },

        heroTitle: {
            color: '#1B1B1B',
            fontFamily: 'Georgia',
            fontSize: 26,
            fontWeight: '700',
            textShadowColor: 'rgba(255,255,255,0.9)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 10,
        },

        heroText: {
            color: '#4F473F',
            fontSize: 13,
            lineHeight: 20,
            marginTop: 8,
            textShadowColor: 'rgba(255,255,255,0.9)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 8,
        },

        quickNav: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginVertical: 10,
        },

        navBtn: {
            backgroundColor: '#FFFFFF',
            padding: 10,
            borderRadius: 12,
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
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E9E2D8',
        },

        filterBtnActive: {
            backgroundColor: '#0F3D33',
            borderColor: '#0F3D33',
        },

        filterBtnText: {
            fontSize: 12,
            fontWeight: '800',
            color: '#3B3B3B',
        },

        filterBtnTextActive: {
            color: '#FFFFFF',
        },

        recentHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            marginTop: 8,
            marginBottom: 10,
        },

        recentTitle: {
            color: '#1B1B1B',
            fontFamily: 'Georgia',
            fontSize: 20,
            fontWeight: '700',
        },

        clearRecentText: {
            color: '#9F8247',
            fontSize: 12,
            fontWeight: '800',
        },

        recentRail: {
            paddingHorizontal: 16,
            paddingBottom: 14,
            gap: 10,
        },

        recentCard: {
            width: 132,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#E9E2D8',
        },

        recentImage: {
            width: '100%',
            height: 148,
            backgroundColor: '#F3EFE8',
        },

        recentName: {
            color: '#1B1B1B',
            fontSize: 12,
            fontWeight: '800',
            padding: 8,
        },

        list: {
            padding: 10,
            paddingBottom: 28,
        },

        row: {
            justifyContent: 'space-between',
        },

        card: {
            backgroundColor: '#FFFFFF',
            marginBottom: 10,
            borderRadius: 12,
            overflow: 'hidden',
        },

        image: {
            width: '100%',
        },

        imageWrap: {
            position: 'relative',
        },

        badgePill: {
            position: 'absolute',
            top: 8,
            left: 8,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: '#1B1B1B',
        },

        badgePillSale: {
            backgroundColor: '#BFA46A',
        },

        badgePillText: {
            color: '#FFFFFF',
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
            color: '#8A8175',
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
            color: '#8A8175',
            fontSize: 11,
            textDecorationLine: 'line-through',
            marginTop: 5,
        },

        emptyText: {
            color: '#8A8175',
            fontSize: 14,
            fontWeight: '700',
            marginTop: 28,
            textAlign: 'center',
        },
    });

    useFocusEffect(
        useCallback(() => {
            loadProducts();
            loadRecentlyViewed();
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

    const recentlyViewedProducts = recentlyViewedIds
        .map((id) => products.find((product) => product._id === id))
        .filter(Boolean);

    const listHeader = (
        <>
            {isAdmin && (
                <View style={styles.adminActions}>
                    <TouchableOpacity
                        style={styles.adminAddBtn}
                        onPress={() => navigation.navigate('AddProduct')}
                    >
                        <Text style={styles.adminAddText}>Add New Product</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.adminGhostBtn}
                        onPress={() => navigation.navigate('UncategorizedProducts')}
                    >
                        <Text style={styles.adminGhostText}>Uncategorized</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.hero}>
                <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} resizeMode="cover" />
                <View style={styles.heroVeil} />
                <View style={styles.heroCopy}>
                    <Text style={styles.heroEyebrow}>SPRING ATELIER</Text>
                    <Text style={styles.heroTitle}>Quiet pieces, exquisite details.</Text>
                    <Text style={styles.heroText}>Explore refined silhouettes in champagne neutrals and deep emerald accents.</Text>
                </View>
            </View>

            <TextInput
                style={styles.search}
                placeholder="Search the collection"
                placeholderTextColor="#8A8175"
                value={search}
                onChangeText={setSearch}
            />

            <View style={styles.quickNav}>
                <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Categories')}>
                    <Text style={styles.navBtnText}>Categories</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('OrderHistory')}>
                    <Text style={styles.navBtnText}>Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navBtn} onPress={logout}>
                    <Text style={styles.navBtnText}>Logout</Text>
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

            {recentlyViewedProducts.length > 0 ? (
                <View>
                    <View style={styles.recentHeader}>
                        <Text style={styles.recentTitle}>Recently Viewed</Text>
                        <TouchableOpacity onPress={clearRecentlyViewed}>
                            <Text style={styles.clearRecentText}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        horizontal
                        data={recentlyViewedProducts}
                        keyExtractor={(item) => item._id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recentRail}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.recentCard}
                                onPress={() => navigation.navigate('ProductDetails', { productId: item._id })}
                            >
                                <Image
                                    source={{ uri: item.imageUrl || 'https://via.placeholder.com/200' }}
                                    style={styles.recentImage}
                                    resizeMode="cover"
                                />
                                <Text style={styles.recentName} numberOfLines={2}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            ) : null}
        </>
    );


    const renderProduct = ({ item }) => {
        const discountPercent = getDiscountPercent(item);

        return (
            <TouchableOpacity
                style={[styles.card, { width: productCardWidth }]}
                onPress={() => navigation.navigate('ProductDetails', { productId: item._id })}
                activeOpacity={0.85}
            >
                <View style={styles.imageWrap}>
                    <Image
                        source={{ uri: item.imageUrl || 'https://via.placeholder.com/200' }}
                        style={[styles.image, { height: productImageHeight }]}
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
                    <Text style={styles.brandLabel}>LUSH</Text>
                    <Text style={styles.greeting}>New Luxury</Text>
                    <Text style={styles.tagline}>Curated for {user?.name?.split(' ')[0] || 'you'}</Text>
                </View>

                <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
                    <Text style={styles.cartIcon}>BAG</Text>
                    {cartCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{cartCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* 🛠️ ADMIN BUTTON (NEW) */}
            {/* LIST */}
            {loading ? (
                <ActivityIndicator size="large" color="#1B1B1B" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filtered}
                    key={`products-${productColumns}`}
                    keyExtractor={(item) => item._id}
                    renderItem={renderProduct}
                    numColumns={productColumns}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={listHeader}
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
