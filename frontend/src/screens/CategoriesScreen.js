import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, useWindowDimensions, Modal, TextInput, Alert, Platform,
} from 'react-native';
import {
  createCategory, deleteCategory, fetchCategories, fetchProducts, updateCategory,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORY_FALLBACKS = [
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900',
  'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900',
];

const emptyCategoryForm = {
  name: '',
  description: '',
  image: '',
};

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const showConfirm = (title, message, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'OK', onPress: onConfirm },
  ]);
};

export default function CategoriesScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;
  const { width } = useWindowDimensions();
  const productColumns = width >= 900 ? 3 : 2;
  const productCardWidth = productColumns === 3 ? '32%' : '48%';
  const productImageHeight = productColumns === 3 ? 260 : 210;
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [savingCategory, setSavingCategory] = useState(false);

  const loadData = async () => {
    try {
      const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCategoryModal = (category = null) => {
    setEditingCategory(category);
    setCategoryForm(category ? {
      name: category.name || '',
      description: category.description || '',
      image: category.image || '',
    } : emptyCategoryForm);
    setCategoryModalVisible(true);
  };

  const closeCategoryModal = () => {
    setCategoryModalVisible(false);
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      showAlert('Missing Name', 'Please enter a category name');
      return;
    }

    try {
      setSavingCategory(true);
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        image: categoryForm.image.trim(),
      };
      if (editingCategory) {
        await updateCategory(editingCategory._id, payload);
      } else {
        await createCategory(payload);
      }

      await loadData();
      showAlert('Category Saved', editingCategory ? 'Category updated successfully' : 'Category added successfully');
      closeCategoryModal();
    } catch (e) {
      showAlert('Category Error', e.message || 'Could not save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const removeCategory = (category) => {
    showConfirm('Delete Category', `Delete "${category.name}"?`, async () => {
      try {
        await deleteCategory(category._id);
        await loadData();
        if (selected === category.name) setSelected(null);
        showAlert('Category Deleted', 'Category removed successfully');
      } catch (e) {
        showAlert('Delete Failed', e.message || 'Could not delete category');
      }
    });
  };

  const getCategoryName = (category) => {
    if (!category) return '';
    if (typeof category === 'string') return category;
    return category.name || category.slug || category._id || '';
  };

  const getCategoryImage = (item, index) => (
    item.image || item.imageUrl || CATEGORY_FALLBACKS[index % CATEGORY_FALLBACKS.length]
  );

  const getProductImage = (item) => {
    if (Array.isArray(item.images) && item.images.length > 0) return item.images[0];
    return item.imageUrl || item.image || 'https://via.placeholder.com/500x650?text=LUSH';
  };

  const filteredProducts = selected
    ? products.filter((p) => getCategoryName(p.category).toLowerCase() === selected.toLowerCase())
    : products;

  const renderCategory = ({ item, index }) => {
    const itemCount = products.filter(
      (p) => getCategoryName(p.category).toLowerCase() === item.name.toLowerCase(),
    ).length;

    return (
      <TouchableOpacity
        style={[styles.catCard, selected === item.name && styles.catCardActive]}
        onPress={() => setSelected(selected === item.name ? null : item.name)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: getCategoryImage(item, index) }}
          style={styles.catImage}
          resizeMode="cover"
        />
        <View style={styles.catMeta}>
          <Text style={styles.catName}>{item.name}</Text>
          <Text style={styles.catCount}>{itemCount} pieces</Text>
          {isAdmin ? (
            <View style={styles.catActions}>
              <TouchableOpacity style={styles.catActionBtn} onPress={() => openCategoryModal(item)}>
                <Text style={styles.catActionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.catDeleteBtn} onPress={() => removeCategory(item)}>
                <Text style={styles.catDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={[styles.productCard, { width: productCardWidth }]}
      onPress={() => navigation.navigate('ProductDetails', { productId: item._id })}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: getProductImage(item) }}
        style={[styles.productImage, { height: productImageHeight }]}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>LKR {Number(item.price).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.kicker}>LUSH COLLECTIONS</Text>
      <Text style={styles.categoryTitle}>Shop by Category</Text>
      {isAdmin ? (
        <TouchableOpacity style={styles.addCategoryBtn} onPress={() => openCategoryModal()}>
          <Text style={styles.addCategoryText}>Add Category</Text>
        </TouchableOpacity>
      ) : null}
      <FlatList
        data={categories}
        keyExtractor={(item) => item._id}
        renderItem={renderCategory}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRail}
      />
      <View style={styles.productsHeader}>
        <Text style={styles.sectionTitle}>{selected ? selected : 'All Products'}</Text>
        <Text style={styles.countText}>{filteredProducts.length} items</Text>
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#1B1B1B" style={styles.loader} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerAction} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtn}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => (selected ? setSelected(null) : navigation.navigate('Home'))}
        >
          <Text style={styles.clearBtn}>{selected ? 'Clear' : 'Home'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts}
        key={`category-products-${productColumns}`}
        keyExtractor={(item) => item._id}
        renderItem={renderProduct}
        numColumns={productColumns}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productList}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <Text style={styles.empty}>No products in this category.</Text>
        }
      />

      <Modal
        transparent
        visible={categoryModalVisible}
        animationType="fade"
        onRequestClose={closeCategoryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingCategory ? 'Edit Category' : 'Add Category'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Category name"
              placeholderTextColor="#8A8175"
              value={categoryForm.name}
              onChangeText={(text) => setCategoryForm((form) => ({ ...form, name: text }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              placeholderTextColor="#8A8175"
              value={categoryForm.description}
              onChangeText={(text) => setCategoryForm((form) => ({ ...form, description: text }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Image URL"
              placeholderTextColor="#8A8175"
              value={categoryForm.image}
              onChangeText={(text) => setCategoryForm((form) => ({ ...form, image: text }))}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={closeCategoryModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, savingCategory && styles.disabledBtn]}
                onPress={saveCategory}
                disabled={savingCategory}
              >
                <Text style={styles.modalSaveText}>{savingCategory ? 'Saving...' : 'Save'}</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', padding: 24, paddingTop: 54, borderBottomWidth: 1, borderBottomColor: '#E9E2D8',
  },
  headerAction: { width: 64 },
  backBtn: { color: '#9F8247', fontWeight: '700', fontSize: 14 },
  headerTitle: { color: '#1B1B1B', fontSize: 22, fontWeight: '800' },
  clearBtn: { color: '#9F8247', fontWeight: '700', fontSize: 14 },
  productList: { paddingHorizontal: 16, paddingBottom: 24 },
  listHeader: { paddingTop: 26, paddingBottom: 8 },
  kicker: {
    color: '#9F8247', fontSize: 11, fontWeight: '800',
    letterSpacing: 2, textAlign: 'center', marginBottom: 8,
  },
  categoryTitle: {
    color: '#1B1B1B', fontSize: 24, fontWeight: '800',
    textAlign: 'center', marginBottom: 22,
  },
  addCategoryBtn: {
    alignSelf: 'center', backgroundColor: '#BFA46A', borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 22, marginBottom: 18,
  },
  addCategoryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  categoryRail: { gap: 14, paddingHorizontal: 2, paddingBottom: 22 },
  catCard: {
    width: 188, backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E9E2D8', overflow: 'hidden',
    shadowColor: '#1B1B1B', shadowOpacity: 0.06, shadowRadius: 14, elevation: 3,
  },
  catCardActive: { borderColor: '#BFA46A', backgroundColor: '#FFFCF4' },
  catImage: { width: '100%', height: 228, backgroundColor: '#F3EFE8' },
  catMeta: { padding: 12, alignItems: 'center' },
  catName: { fontSize: 15, fontWeight: '800', color: '#1B1B1B', textAlign: 'center' },
  catCount: { fontSize: 11, color: '#8A8175', marginTop: 4, fontWeight: '700' },
  catActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  catActionBtn: {
    borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10,
    backgroundColor: '#F5F1EA',
  },
  catActionText: { color: '#9F8247', fontWeight: '800', fontSize: 11 },
  catDeleteBtn: {
    borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#B63B3B',
  },
  catDeleteText: { color: '#B63B3B', fontWeight: '800', fontSize: 11 },
  productsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: 14, paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 26, fontFamily: 'Georgia', fontWeight: '700', color: '#1B1B1B',
  },
  countText: { color: '#8A8175', fontWeight: '700', marginBottom: 3 },
  productRow: { justifyContent: 'space-between', marginBottom: 14 },
  productCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, width: '48%',
    overflow: 'hidden',
    shadowColor: '#1B1B1B', shadowOpacity: 0.06, shadowRadius: 14, elevation: 3,
  },
  productImage: { width: '100%', height: 210, backgroundColor: '#F3EFE8' },
  productInfo: { padding: 12 },
  productName: { fontSize: 13, fontWeight: '700', color: '#1B1B1B' },
  productPrice: { fontSize: 13, fontWeight: '800', color: '#BFA46A', marginTop: 4 },
  empty: { textAlign: 'center', color: '#8A8175', marginTop: 30, fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 20,
  },
  modalTitle: {
    color: '#1B1B1B', fontFamily: 'Georgia', fontSize: 22,
    fontWeight: '700', marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#FBFAF7', borderWidth: 1, borderColor: '#E9E2D8',
    borderRadius: 12, padding: 13, color: '#1B1B1B', marginBottom: 10,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: {
    flex: 1, borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#E9E2D8',
  },
  modalCancelText: { color: '#3B3B3B', fontWeight: '800' },
  modalSaveBtn: {
    flex: 1, borderRadius: 12, padding: 14, alignItems: 'center',
    backgroundColor: '#BFA46A',
  },
  modalSaveText: { color: '#FFFFFF', fontWeight: '800' },
  disabledBtn: { opacity: 0.45 },
});
