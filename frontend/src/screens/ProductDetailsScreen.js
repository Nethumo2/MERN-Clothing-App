import React, { useState, useEffect } from 'react';
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, Modal, Alert, Platform
} from 'react-native';

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

export default function ProductDetailsScreen({ route, navigation }) {
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

        if (sizeArray.length > 0 && !selectedSize) {
            showAlert('Size Required', 'Please select a size before adding this item to cart');
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
        return <ActivityIndicator style={{ flex: 1 }} size="large" color="#1a1a1a" />;
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

    return (
        <View style={styles.wrapper}>
            <ScrollView style={styles.container}>

                {/* IMAGE */}
                <Image
                    source={{ uri: product.imageUrl || product.images?.[0]?.url || product.images?.[0] || 'https://via.placeholder.com/300' }}
                    style={styles.image}
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

                    {/* NAME & PRICE */}
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
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => q + 1)}>
                                    <Text style={styles.qtyBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ADMIN CONTROLS */}
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

                    {/* USER CONTROLS */}
                    {!isAdmin && (
                        <TouchableOpacity
                            style={[styles.cartBtn, addingToCart && { opacity: 0.65 }]}
                            onPress={handleAddToCart}
                            disabled={addingToCart}
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
    wrapper: { flex: 1, backgroundColor: '#f5f5f5' },
    container: { flex: 1 },
    errorContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f5f5f5', padding: 24,
    },
    errorTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
    errorText: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 18 },
    errorBtn: {
        backgroundColor: '#1a1a1a', paddingVertical: 12,
        paddingHorizontal: 24, borderRadius: 12,
    },
    image: { width: '100%', height: 320 },
    productBadge: {
        position: 'absolute', top: 58, right: 16,
        backgroundColor: '#1a1a1a', borderRadius: 14,
        paddingHorizontal: 12, paddingVertical: 7,
    },
    productBadgeSale: { backgroundColor: '#e63946' },
    productBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    backCircle: {
        position: 'absolute', top: 48, left: 16,
        backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 22,
        width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
    details: { padding: 20 },
    categoryTag: {
        alignSelf: 'flex-start', backgroundColor: '#f0f0f0',
        borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 12,
    },
    categoryTagText: { fontSize: 12, color: '#555', fontWeight: '600' },
    name: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
    price: { fontSize: 22, fontWeight: '900', color: '#e63946' },
    comparePrice: { fontSize: 14, color: '#888', textDecorationLine: 'line-through', fontWeight: '700' },
    description: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
    sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    sizeBtn: {
        borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
        paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#fff',
    },
    sizeBtnActive: { borderColor: '#1a1a1a', backgroundColor: '#1a1a1a' },
    sizeBtnText: { fontSize: 14, fontWeight: '600', color: '#555' },
    sizeBtnTextActive: { color: '#fff' },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    qtyBtn: {
        width: 42, height: 42, borderRadius: 10,
        backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
    },
    qtyBtnText: { color: '#fff', fontSize: 22 },
    qtyValue: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', minWidth: 30, textAlign: 'center' },
    adminBox: { gap: 12, marginTop: 10 },
    editBtn: {
        backgroundColor: '#3498db', padding: 16,
        borderRadius: 12, alignItems: 'center',
    },
    deleteBtn: {
        backgroundColor: '#e63946', padding: 16,
        borderRadius: 12, alignItems: 'center',
    },
    cartBtn: {
        backgroundColor: '#1a1a1a', padding: 16,
        borderRadius: 12, alignItems: 'center', marginTop: 10,
    },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // Modal styles
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modal: {
        backgroundColor: '#fff', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 400,
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
    modalMessage: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 24 },
    modalBtnRow: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: {
        flex: 1, borderWidth: 1.5, borderColor: '#ddd',
        borderRadius: 10, padding: 14, alignItems: 'center',
    },
    modalCancelText: { color: '#555', fontWeight: '700', fontSize: 14 },
    modalConfirmBtn: {
        flex: 1, backgroundColor: '#e63946',
        borderRadius: 10, padding: 14, alignItems: 'center',
    },
    modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
