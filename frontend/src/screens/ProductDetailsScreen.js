import React, { useState, useEffect } from 'react';
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, Modal, Alert, Platform, useWindowDimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    fetchProductById,
    addToCart,
    deleteProduct
} from '../services/api';

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n${message}`);
    } else {
        Alert.alert(title, message);
    }
};

const getDiscountPercent = (product) => {
    const directDiscount = Number(product?.discountPercent ?? product?.discount);
    if (Number.isFinite(directDiscount) && directDiscount > 0) {
        return Math.round(directDiscount);
    }

    const price = Number(product?.price);
    const comparePrice = Number(product?.comparePrice);
    if (!Number.isFinite(price) || !Number.isFinite(comparePrice) || comparePrice <= price) return 0;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
};

const hasComparePrice = (product) => {
    const price = Number(product?.price);
    const comparePrice = Number(product?.comparePrice);
    return Number.isFinite(price) && Number.isFinite(comparePrice) && comparePrice > price;
};

const isNewArrival = (product) => {
    if (!product?.createdAt) return false;
    const createdTime = new Date(product.createdAt).getTime();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return Number.isFinite(createdTime) && createdTime >= oneDayAgo;
};

const firstImage = (images) => {
    if (!Array.isArray(images) || images.length === 0) return '';
    return images.map((image) => {
        if (typeof image === 'string') return image;
        return image?.url || image?.src || image?.secure_url || image?.imageUrl || image?.image || '';
    }).find(Boolean) || '';
};

const getProductImage = (product) => (
    firstImage([product?.imageUrl, product?.imageURL, product?.image, product?.thumbnail, ...(product?.images || [])]) ||
    'https://via.placeholder.com/500x650?text=LUSH'
);

const RECENTLY_VIEWED_KEY = 'recentlyViewed';

export default function ProductDetailsScreen({ route, navigation }) {
    const { width } = useWindowDimensions();
    const { productId } = route.params;
    const { refreshCart } = useCart();
    const { user } = useAuth();

    const isAdmin = user?.isAdmin === true;

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCartModal, setShowCartModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        const loadProduct = async () => {
            try {
                const data = await fetchProductById(productId);
                setProduct(data);
                const stored = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
                const currentIds = stored ? JSON.parse(stored) : [];
                const nextIds = [productId, ...currentIds.filter((id) => id !== productId)].slice(0, 8);
                await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(nextIds));
                const sizeArray = data?.size || data?.sizes || [];
                if (sizeArray.length > 0) setSelectedSize(sizeArray[0]);
            } catch (_e) {
                showAlert('Error', 'Failed to load product');
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [productId]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const token = user?.token;
            await deleteProduct(product._id, token);
            setShowDeleteModal(false);
            navigation.goBack();
        } catch (err) {
            setShowDeleteModal(false);
            showAlert('Error', err.message || 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const handleAddToCart = async () => {
        const sizeArray = product?.size || product?.sizes || [];
        const stockCount = Number(product?.countInStock ?? product?.stock ?? 0);

        if (sizeArray.length > 0 && !selectedSize) {
            showAlert('Size Required', 'Please select a size before adding this item to cart');
            return;
        }

        if (!Number.isFinite(stockCount) || stockCount < 1) {
            showAlert('Out of Stock', 'This product is currently out of stock');
            return;
        }

        if (quantity > stockCount) {
            showAlert('Stock Limit', `Only ${stockCount} item${stockCount === 1 ? '' : 's'} available`);
            setQuantity(stockCount);
            return;
        }

        try {
            setAddingToCart(true);
            await addToCart(product._id, quantity, selectedSize);
            await refreshCart();
            setShowCartModal(true);
        } catch (e) {
            showAlert('Error', e.message || 'Could not add to cart');
        } finally {
            setAddingToCart(false);
        }
    };

    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color="#1B1B1B" />;
    }

    if (!product) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Product not found</Text>
                <Text style={styles.errorText}>Please check your connection and try again.</Text>
                <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.btnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const sizeArray = product?.size || product?.sizes || [];
    const discountPercent = getDiscountPercent(product);
    const stockCount = Number(product?.countInStock ?? product?.stock ?? 0);
    const hasStock = Number.isFinite(stockCount) && stockCount > 0;
    const canIncreaseQuantity = hasStock && quantity < stockCount;

    return (
        <View style={styles.wrapper}>
            <ScrollView style={styles.container}>

                {/* IMAGE */}
                <Image
                    source={{ uri: getProductImage(product) }}
                    style={[styles.image, { height: width >= 900 ? 460 : 360 }]}
                    resizeMode="contain"
                />
                {(discountPercent > 0 || isNewArrival(product)) && (
                    <View style={[styles.productBadge, discountPercent > 0 && styles.productBadgeSale]}>
                        <Text style={styles.productBadgeText}>
                            {discountPercent > 0 ? `${discountPercent}% OFF` : 'NEW ARRIVAL'}
                        </Text>
                    </View>
                )}

                {/* BACK BUTTON */}
                <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>

                <View style={styles.details}>
                    {/* CATEGORY */}
                    <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>🏷️ {product.category}</Text>
                    </View>

                    {/* NAME AND PRICE */}
                    <Text style={styles.name}>{product.name}</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>LKR {Number(product.price).toLocaleString()}</Text>
                        {hasComparePrice(product) && (
                            <Text style={styles.comparePrice}>
                                LKR {Number(product.comparePrice).toLocaleString()}
                            </Text>
                        )}
                    </View>

                    {/* DESCRIPTION */}
                    {product.description ? (
                        <Text style={styles.description}>{product.description}</Text>
                    ) : null}

                    {/* SIZES */}
                    {sizeArray.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Size</Text>
                            <View style={styles.sizeRow}>
                                {sizeArray.map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.sizeBtn, selectedSize === s && styles.sizeBtnActive]}
                                        onPress={() => setSelectedSize(s)}
                                    >
                                        <Text style={[styles.sizeBtnText, selectedSize === s && styles.sizeBtnTextActive]}>
                                            {s}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* QUANTITY (user only) */}
                    {!isAdmin && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Quantity</Text>
                            <View style={styles.qtyRow}>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
                                    <Text style={styles.qtyBtnText}>−</Text>
                                </TouchableOpacity>
                                <Text style={styles.qtyValue}>{quantity}</Text>
                                <TouchableOpacity
                                    style={[styles.qtyBtn, !canIncreaseQuantity && styles.disabledQtyBtn]}
                                    onPress={() => setQuantity(q => Math.min(stockCount, q + 1))}
                                    disabled={!canIncreaseQuantity}
                                >
                                    <Text style={styles.qtyBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.stockText}>
                                {hasStock ? `${stockCount} available` : 'Out of stock'}
                            </Text>
                        </View>
                    )}

                    {/* ADMIN CONTROLS FOR EDIT AND DELETE */}
                    {isAdmin && (
                        <View style={styles.adminBox}>
                            <TouchableOpacity
                                style={styles.editBtn}
                                onPress={() => navigation.navigate('EditProduct', { productId: product._id })}
                            >
                                <Text style={styles.btnText}>✏️ Edit Product</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => setShowDeleteModal(true)}
                            >
                                <Text style={styles.btnText}>🗑️ Delete Product</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* USER CONTROLS FOR ADD TO CART*/}
                    {!isAdmin && (
                        <TouchableOpacity
                            style={[styles.cartBtn, (addingToCart || !hasStock) && { opacity: 0.65 }]}
                            onPress={handleAddToCart}
                            disabled={addingToCart || !hasStock}
                        >
                            <Text style={styles.btnText}>
                                {addingToCart ? 'Adding...' : '🛒 Add to Cart'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* DELETE CONFIRMATION MODAL */}
            <Modal transparent visible={showDeleteModal} animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>🗑️ Delete Product</Text>
                        <Text style={styles.modalMessage}>
                            {`Are you sure you want to delete "${product?.name}"? This cannot be undone.`}
                        </Text>
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirmBtn, deleting && { opacity: 0.6 }]}
                                onPress={handleDelete}
                                disabled={deleting}
                            >
                                <Text style={styles.modalConfirmText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ADDED TO CART MODAL */}
            <Modal transparent visible={showCartModal} animationType="fade" onRequestClose={() => setShowCartModal(false)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.cartModalHero}>
                            <Image
                                source={{ uri: getProductImage(product) }}
                                style={styles.cartModalImage}
                                resizeMode="cover"
                            />
                            <View style={styles.cartModalInfo}>
                                <Text style={styles.modalEyebrow}>Added to Bag</Text>
                                <Text style={styles.modalMeta}>
                                    {selectedSize ? `Size ${selectedSize} - ` : ''}Qty {quantity}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.modalTitle}>✅ Added to Cart!</Text>
                        <Text style={styles.modalMessage}>
                            {product?.name} ({selectedSize} × {quantity}) has been added to your cart.
                        </Text>
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCartModal(false)}>
                                <Text style={styles.modalCancelText}>Continue Shopping</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={() => { setShowCartModal(false); navigation.navigate('Cart'); }}
                            >
                                <Text style={styles.modalConfirmText}>View Cart</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: '#FBFAF7' },
    container: { flex: 1 },
    errorContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FBFAF7', padding: 24,
    },
    errorTitle: { fontSize: 24, fontFamily: 'Georgia', fontWeight: '700', color: '#1B1B1B', marginBottom: 8 },
    errorText: { fontSize: 14, color: '#3B3B3B', textAlign: 'center', marginBottom: 18 },
    errorBtn: {
        backgroundColor: '#BFA46A', paddingVertical: 12,
        paddingHorizontal: 24, borderRadius: 12,
    },
    image: { width: '100%', backgroundColor: '#F7F3EC' },
    productBadge: {
        position: 'absolute', top: 58, right: 16,
        backgroundColor: '#1B1B1B', borderRadius: 16,
        paddingHorizontal: 12, paddingVertical: 7,
    },
    productBadgeSale: { backgroundColor: '#BFA46A' },
    productBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
    backCircle: {
        position: 'absolute', top: 48, left: 16,
        backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 22,
        width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, fontWeight: '700', color: '#1B1B1B' },
    details: { padding: 20 },
    categoryTag: {
        alignSelf: 'flex-start', backgroundColor: '#F5F1EA',
        borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 12,
    },
    categoryTagText: { fontSize: 12, color: '#3B3B3B', fontWeight: '600' },
    name: { fontSize: 28, fontFamily: 'Georgia', fontWeight: '700', color: '#1B1B1B', marginBottom: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
    price: { fontSize: 22, fontWeight: '900', color: '#BFA46A' },
    comparePrice: { fontSize: 14, color: '#8A8175', textDecorationLine: 'line-through', fontWeight: '700' },
    description: { fontSize: 14, color: '#3B3B3B', lineHeight: 22, marginBottom: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1B1B1B', marginBottom: 10 },
    sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    sizeBtn: {
        borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
        paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#FFFFFF',
    },
    sizeBtnActive: { borderColor: '#1B1B1B', backgroundColor: '#1B1B1B' },
    sizeBtnText: { fontSize: 14, fontWeight: '600', color: '#3B3B3B' },
    sizeBtnTextActive: { color: '#FFFFFF' },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    qtyBtn: {
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: '#1B1B1B', alignItems: 'center', justifyContent: 'center',
    },
    disabledQtyBtn: { opacity: 0.4 },
    qtyBtnText: { color: '#FFFFFF', fontSize: 22 },
    qtyValue: { fontSize: 22, fontWeight: '800', color: '#1B1B1B', minWidth: 30, textAlign: 'center' },
    stockText: { color: '#8A8175', fontSize: 12, fontWeight: '700', marginTop: 8 },
    adminBox: { gap: 12, marginTop: 10 },
    editBtn: {
        backgroundColor: '#BFA46A', padding: 16,
        borderRadius: 12, alignItems: 'center',
    },
    deleteBtn: {
        backgroundColor: '#BFA46A', padding: 16,
        borderRadius: 12, alignItems: 'center',
    },
    cartBtn: {
        backgroundColor: '#BFA46A', padding: 16,
        borderRadius: 12, alignItems: 'center', marginTop: 10,
        shadowColor: '#BFA46A', shadowOpacity: 0.22, shadowRadius: 14, elevation: 4,
    },
    btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

    // Modal styles
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modal: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 400,
        shadowColor: '#1B1B1B', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
    },
    cartModalHero: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 16 },
    cartModalImage: { width: 88, height: 112, borderRadius: 14, backgroundColor: '#F7F3EC' },
    cartModalInfo: { flex: 1 },
    modalEyebrow: {
        color: '#9F8247', fontSize: 10, fontWeight: '900',
        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
    },
    modalMeta: { fontSize: 13, color: '#8A8175', fontWeight: '700' },
    modalTitle: { fontSize: 22, fontFamily: 'Georgia', fontWeight: '700', color: '#1B1B1B', marginBottom: 10 },
    modalMessage: { fontSize: 14, color: '#3B3B3B', lineHeight: 22, marginBottom: 24 },
    modalBtnRow: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: {
        flex: 1, borderWidth: 1.5, borderColor: '#ddd',
        borderRadius: 12, padding: 14, alignItems: 'center',
    },
    modalCancelText: { color: '#3B3B3B', fontWeight: '700', fontSize: 14 },
    modalConfirmBtn: {
        flex: 1, backgroundColor: '#BFA46A',
        borderRadius: 12, padding: 14, alignItems: 'center',
    },
    modalConfirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
