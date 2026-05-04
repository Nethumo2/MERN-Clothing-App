import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Modal, Alert, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchCategories,
  fetchUncategorizedProducts,
  updateProductCategory,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const getProductImage = (item) => {
  if (Array.isArray(item.images) && item.images.length > 0) {
    const image = item.images[0];
    return image?.url || image?.src || image;
  }

  return item.imageUrl || 'https://via.placeholder.com/500x650?text=LUSH';
};

export default function UncategorizedProductsScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uncategorized, cats] = await Promise.all([
        fetchUncategorizedProducts(),
        fetchCategories(),
      ]);
      setProducts(Array.isArray(uncategorized) ? uncategorized : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e) {
      showAlert('Load Failed', e.message || 'Could not load uncategorized products');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const assignCategory = async (categoryId) => {
    if (!selectedProduct?._id) return;

    try {
      setSaving(true);
      await updateProductCategory(selectedProduct._id, categoryId);
      setProducts((current) => current.filter((item) => item._id !== selectedProduct._id));
      setSelectedProduct(null);
    } catch (e) {
      showAlert('Update Failed', e.message || 'Could not update product category');
    } finally {
      setSaving(false);
    }
  };

  const clearCategory = async () => {
    if (!selectedProduct?._id) return;

    try {
      setSaving(true);
      await updateProductCategory(selectedProduct._id, null);
      setSelectedProduct(null);
      await loadData();
    } catch (e) {
      showAlert('Update Failed', e.message || 'Could not clear product category');
    } finally {
      setSaving(false);
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: getProductImage(item) }} style={styles.productImage} resizeMode="cover" />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productMeta}>LKR {Number(item.price || 0).toLocaleString()}</Text>
        <Text style={styles.productMeta}>{Number(item.countInStock ?? item.stock ?? 0)} in stock</Text>
        <TouchableOpacity style={styles.assignBtn} onPress={() => setSelectedProduct(item)}>
          <Text style={styles.assignText}>Assign Category</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isAdmin) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Admin only</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backHomeText}>Back Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) return <ActivityIndicator size="large" color="#1B1B1B" style={styles.loader} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Uncategorized</Text>
        <TouchableOpacity onPress={loadData}>
          <Text style={styles.refreshBtn}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View style={styles.intro}>
            <Text style={styles.kicker}>ADMIN WORKSPACE</Text>
            <Text style={styles.title}>Products waiting for category</Text>
            <Text style={styles.subtitle}>
              Assign these products to an existing category when the collection is ready.
            </Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No uncategorized products</Text>
            <Text style={styles.emptyText}>Every product is currently assigned.</Text>
          </View>
        )}
      />

      <Modal
        transparent
        visible={!!selectedProduct}
        animationType="fade"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign Category</Text>
            <Text style={styles.modalSubtitle} numberOfLines={1}>
              {selectedProduct?.name}
            </Text>
            {categories.map((category) => (
              <TouchableOpacity
                key={category._id}
                style={[styles.categoryOption, saving && styles.disabledBtn]}
                onPress={() => assignCategory(category._id)}
                disabled={saving}
              >
                <Text style={styles.categoryOptionText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.clearCategoryBtn} onPress={clearCategory} disabled={saving}>
                <Text style={styles.clearCategoryText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedProduct(null)} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFAF7' },
  loader: { flex: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', padding: 24, paddingTop: 54,
    borderBottomWidth: 1, borderBottomColor: '#E9E2D8',
  },
  backBtn: { color: '#9F8247', fontWeight: '800', fontSize: 14 },
  refreshBtn: { color: '#9F8247', fontWeight: '800', fontSize: 14 },
  headerTitle: { color: '#1B1B1B', fontFamily: 'Georgia', fontSize: 22, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 32 },
  intro: { marginBottom: 18 },
  kicker: { color: '#9F8247', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  title: { color: '#1B1B1B', fontFamily: 'Georgia', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#8A8175', fontSize: 14, lineHeight: 20, marginTop: 6 },
  productCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E9E2D8',
    shadowColor: '#1B1B1B', shadowOpacity: 0.05, shadowRadius: 14, elevation: 3,
  },
  productImage: { width: 92, height: 116, borderRadius: 12, backgroundColor: '#F3EFE8' },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { color: '#1B1B1B', fontSize: 15, fontWeight: '800', marginTop: 2 },
  productMeta: { color: '#8A8175', fontSize: 12, fontWeight: '700', marginTop: 5 },
  assignBtn: {
    backgroundColor: '#BFA46A', borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', marginTop: 12,
  },
  assignText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBFAF7' },
  emptyTitle: { color: '#1B1B1B', fontFamily: 'Georgia', fontSize: 24, fontWeight: '700' },
  emptyText: { color: '#8A8175', fontSize: 14, marginTop: 8 },
  backHomeBtn: { backgroundColor: '#BFA46A', borderRadius: 12, padding: 14, marginTop: 16 },
  backHomeText: { color: '#FFFFFF', fontWeight: '800' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  modalTitle: { color: '#1B1B1B', fontFamily: 'Georgia', fontSize: 23, fontWeight: '700' },
  modalSubtitle: { color: '#8A8175', fontSize: 13, marginTop: 4, marginBottom: 14 },
  categoryOption: {
    borderRadius: 12, padding: 13, marginBottom: 9,
    backgroundColor: '#FBFAF7', borderWidth: 1, borderColor: '#E9E2D8',
  },
  categoryOptionText: { color: '#1B1B1B', fontWeight: '800', fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  clearCategoryBtn: {
    flex: 1, borderRadius: 12, padding: 13, alignItems: 'center',
    borderWidth: 1, borderColor: '#B63B3B',
  },
  clearCategoryText: { color: '#B63B3B', fontWeight: '800' },
  cancelBtn: { flex: 1, borderRadius: 12, padding: 13, alignItems: 'center', backgroundColor: '#BFA46A' },
  cancelText: { color: '#FFFFFF', fontWeight: '800' },
  disabledBtn: { opacity: 0.45 },
});
