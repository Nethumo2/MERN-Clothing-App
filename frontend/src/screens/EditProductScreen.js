import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, ScrollView, Image, Alert, Platform
} from 'react-native';
import { fetchProductById, updateProduct } from '../services/api';

const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n${message}`);
    } else {
        Alert.alert(title, message);
    }
};

export default function EditProductScreen({ route, navigation }) {
    const { productId } = route.params;

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');
    const [description, setDescription] = useState('');
    const [countInStock, setCountInStock] = useState('');
    const [size, setSize] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        const loadProduct = async () => {
            try {
                const data = await fetchProductById(productId);
                setName(data.name || '');
                setPrice(String(data.price || ''));
                setDiscountPercent(data.discountPercent ? String(data.discountPercent) : '');

                setDescription(data.description || '');
                setCountInStock(String(data.countInStock ?? data.stock ?? ''));

                const sizeData = data.size || data.sizes || [];
                setSize(Array.isArray(sizeData) ? sizeData.join(', ') : String(sizeData));

                const img = data.imageUrl ||
                    data.images?.[0]?.url ||
                    (typeof data.images?.[0] === 'string' ? data.images[0] : '') ||
                    '';
                setImageUrl(img);

            } catch (_e) {
                showAlert('Error', 'Failed to load product');
            } finally {
                setFetching(false);
            }
        };

        loadProduct();
    }, [productId]);

    const handleSubmit = async () => {
        if (!name || !price || !size) {
            showAlert('Error', 'Please fill name, price and size');
            return;
        }
        setLoading(true);
        try {
            await updateProduct(productId, {
                name,
                price,
                discountPercent: discountPercent.trim() ? discountPercent : 0,
                description,
                countInStock,
                size,
                imageUrl,
            });
            showAlert('Success', 'Product updated!');
            navigation.navigate('Home');
        } catch (e) {
            showAlert('Error', e.message || 'Failed to update product');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <ActivityIndicator size="large" color="#1B1B1B" style={{ flex: 1 }} />;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Product</Text>
                <View style={{ width: 30 }} />
            </View>

            <View style={styles.form}>

                <Text style={styles.label}>Product Name *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} />

                <Text style={styles.label}>Price (LKR) *</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} />

                <Text style={styles.label}>Discount (%)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={discountPercent}
                    onChangeText={setDiscountPercent}
                    placeholder="Leave empty if no discount"
                />
                <Text style={styles.hint}>
                    Add a percentage to show this item in Discounts.
                </Text>

                <Text style={styles.label}>Sizes * (comma separated)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. S, M, L, XL"
                    value={size}
                    onChangeText={setSize}
                />

                <Text style={styles.label}>Count In Stock</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={countInStock}
                    onChangeText={setCountInStock}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                />

                <Text style={styles.label}>Image URL</Text>
                <TextInput
                    style={styles.input}
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    autoCapitalize="none"
                />

                {/* Image Preview */}
                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.previewImage}
                        resizeMode="cover"
                    />
                ) : null}

                <Text style={styles.hint}>
                    💡 You can use any image URL or upload to imgur.com for free
                </Text>

                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitBtnText}>Update Product</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FBFAF7' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FFFFFF', padding: 24, paddingTop: 54, borderBottomWidth: 1, borderBottomColor: '#E9E2D8',
    },
    backBtn: { color: '#9F8247', fontSize: 22, fontWeight: '700' },
    headerTitle: { color: '#1B1B1B', fontSize: 22, fontFamily: 'Georgia', fontWeight: '700' },
    form: { padding: 16 },
    label: {
        fontSize: 13, fontWeight: '700', color: '#3B3B3B',
        marginBottom: 5, marginTop: 12, textTransform: 'uppercase'
    },
    input: {
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: '#E9E2D8', fontSize: 14, color: '#1B1B1B',
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    previewImage: {
        width: '100%', height: 180, borderRadius: 12, marginTop: 10,
    },
    hint: { fontSize: 12, color: '#8A8175', marginTop: 6, fontStyle: 'italic' },
    submitBtn: {
        backgroundColor: '#BFA46A', borderRadius: 14,
        padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40,
    },
    submitBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
