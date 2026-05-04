import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, ScrollView, Image, Alert, Platform,
} from 'react-native';
import { createProduct } from '../services/api';

const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
        window.alert(message ? `${title}\n${message}` : title);
    } else {
        Alert.alert(title, message);
    }
};

export default function AddProductScreen({ navigation }) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');
    const [description, setDescription] = useState('');
    const [countInStock, setCountInStock] = useState('');
    const [size, setSize] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !price || !size) {
            showAlert('Error', 'Please fill name, price and size');
            return;
        }
        setLoading(true);
        try {
            await createProduct({
                name,
                price,
                discountPercent: discountPercent.trim() ? discountPercent : 0,
                category: null,
                description,
                countInStock: countInStock || 0,
                size,
                imageUrl: imageUrl || 'https://via.placeholder.com/300x300?text=No+Image',
            });
            showAlert('Success', 'Product added!');
            navigation.navigate('Home');
        } catch (e) {
            showAlert('Error', e.message || 'Failed to add product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Product</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Blue T-Shirt"
                    value={name}
                    onChangeText={setName}
                />

                <Text style={styles.label}>Price (LKR) *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 1500"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                />

                <Text style={styles.label}>Discount (%)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 20, leave empty if no discount"
                    keyboardType="numeric"
                    value={discountPercent}
                    onChangeText={setDiscountPercent}
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
                    placeholder="e.g. 50"
                    keyboardType="numeric"
                    value={countInStock}
                    onChangeText={setCountInStock}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Product description..."
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

                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="cover" />
                ) : null}

                <Text style={styles.hint}>Upload an image and paste the URL here.</Text>

                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitBtnText}>Add Product</Text>
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
    backBtn: { color: '#9F8247', fontSize: 14, fontWeight: '700' },
    headerTitle: { color: '#1B1B1B', fontSize: 22, fontFamily: 'Georgia', fontWeight: '700' },
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
    submitBtn: {
        backgroundColor: '#BFA46A', borderRadius: 12,
        padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40,
    },
    submitBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
