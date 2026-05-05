import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, ScrollView, Image, Alert, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { fetchProductById, updateProduct } from '../services/api';

const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
        window.alert(message ? `${title}\n${message}` : title);
    } else {
        Alert.alert(title, message);
    }
};

const firstImage = (images) => {
    if (!Array.isArray(images) || images.length === 0) return '';
    return images.map((img) => {
        if (typeof img === 'string') return img;
        return img?.url || img?.src || img?.secure_url || img?.imageUrl || img?.image || '';
    }).find(Boolean) || '';
};

const getProductImage = (product) =>
    firstImage([
        product?.imageUrl,
        product?.imageURL,
        product?.image,
        product?.thumbnail,
        ...(product?.images || []),
    ]) || '';

export default function EditProductScreen({ route, navigation }) {
    const { productId } = route.params;

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [comparePrice, setComparePrice] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');
    const [description, setDescription] = useState('');
    const [countInStock, setCountInStock] = useState('');
    const [size, setSize] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        const loadProduct = async () => {
            try {
                const data = await fetchProductById(productId);
                setName(data.name || '');
                setPrice(String(data.price || ''));
                setComparePrice(data.comparePrice ? String(data.comparePrice) : '');
                setDiscountPercent(data.discountPercent ? String(data.discountPercent) : '');
                setDescription(data.description || '');
                setCountInStock(String(data.countInStock ?? data.stock ?? ''));

                // Handle both size and sizes fields
                const sizeData = data.size || data.sizes || [];
                setSize(Array.isArray(sizeData) ? sizeData.join(', ') : String(sizeData));

                // Use same image resolution logic as backend normalize()
                setImageUrl(getProductImage(data));
            } catch (_e) {
                showAlert('Error', 'Failed to load product');
            } finally {
                setFetching(false);
            }
        };
        loadProduct();
    }, [productId]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
        if (!result.canceled) {
            setImageFile(result.assets[0]);
            setImageUrl('');
        }
    };

    const buildFormData = async () => {
        const payload = new FormData();
        payload.append('name', name);
        payload.append('price', price);
        if (comparePrice.trim()) payload.append('comparePrice', comparePrice);
        payload.append('discountPercent', discountPercent.trim() ? discountPercent : 0);
        payload.append('description', description);
        payload.append('countInStock', countInStock || 0);
        payload.append('size', size);

        if (Platform.OS === 'web') {
            if (imageFile.file) {
                payload.append('image', imageFile.file);
            } else {
                const response = await fetch(imageFile.uri);
                const blob = await response.blob();
                payload.append('image', blob, imageFile.fileName || 'product.jpg');
            }
        } else {
            const localUri = imageFile.uri;
            let filename = imageFile.fileName || localUri.split('/').pop() || 'product.jpg';
            if (!filename.includes('.')) filename += '.jpg';
            payload.append('image', {
                uri: localUri,
                name: filename,
                type: imageFile.mimeType || 'image/jpeg',
            });
        }
        return payload;
    };

    const handleSubmit = async () => {
        if (!name || !price || !size) {
            showAlert('Error', 'Please fill name, price and size');
            return;
        }
        setLoading(true);
        try {
            const payload = imageFile
                ? await buildFormData()
                : {
                    name,
                    price,
                    comparePrice: comparePrice.trim() ? comparePrice : undefined,
                    discountPercent: discountPercent.trim() ? discountPercent : 0,
                    description,
                    countInStock,
                    size,
                    imageUrl,
                };

            await updateProduct(productId, payload);
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

                {/* Product Name */}
                <Text style={styles.label}>Product Name *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} />

                {/* Price */}
                <Text style={styles.label}>Price (LKR) *</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                />

                {/* Compare Price */}
                <Text style={styles.label}>Original Price (LKR)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="e.g. 5000 (shown as strikethrough)"
                    value={comparePrice}
                    onChangeText={setComparePrice}
                />
                <Text style={styles.hint}>
                    Set higher than price to show a strikethrough original price.
                </Text>

                {/* Discount */}
                <Text style={styles.label}>Discount (%)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="e.g. 20 — leave empty to auto-calculate"
                    value={discountPercent}
                    onChangeText={setDiscountPercent}
                />
                <Text style={styles.hint}>
                    Auto-calculated from price vs original price if left empty.
                </Text>

                {/* Sizes */}
                <Text style={styles.label}>Sizes * (comma separated)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. S, M, L, XL"
                    value={size}
                    onChangeText={setSize}
                />

                {/* Stock */}
                <Text style={styles.label}>Count In Stock</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={countInStock}
                    onChangeText={setCountInStock}
                />

                {/* Description */}
                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                />

                {/* Image URL */}
                <Text style={styles.label}>Image URL</Text>
                <TextInput
                    style={styles.input}
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChangeText={(val) => {
                        setImageUrl(val);
                        if (val) setImageFile(null);
                    }}
                    autoCapitalize="none"
                />

                {/* Image Picker */}
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                    <Text style={styles.imagePickerText}>
                        {imageFile ? '🔄 Change Uploaded Image' : '📷 Upload New Image'}
                    </Text>
                </TouchableOpacity>

                {/* Preview */}
                {(imageFile || imageUrl) ? (
                    <Image
                        source={{ uri: imageFile ? imageFile.uri : imageUrl }}
                        style={styles.previewImage}
                        resizeMode="cover"
                    />
                ) : null}

                <Text style={styles.hint}>
                    Upload a new image or paste an image URL. Leave blank to keep existing image.
                </Text>

                {/* Submit */}
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
        backgroundColor: '#FFFFFF', padding: 24, paddingTop: 54,
        borderBottomWidth: 1, borderBottomColor: '#E9E2D8',
    },
    backBtn: { color: '#9F8247', fontSize: 22, fontWeight: '700' },
    headerTitle: { color: '#1B1B1B', fontSize: 22, fontWeight: '700' },
    form: { padding: 16 },
    label: {
        fontSize: 13, fontWeight: '700', color: '#3B3B3B',
        marginBottom: 5, marginTop: 12, textTransform: 'uppercase',
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
    imagePickerBtn: {
        backgroundColor: '#F5F1EA', borderWidth: 1, borderColor: '#E9E2D8',
        borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 10,
    },
    imagePickerText: { color: '#9F8247', fontWeight: '700', fontSize: 14 },
    submitBtn: {
        backgroundColor: '#BFA46A', borderRadius: 14,
        padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40,
    },
    submitBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
