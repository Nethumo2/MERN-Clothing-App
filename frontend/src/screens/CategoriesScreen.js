import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image,
} from 'react-native';
import { fetchCategories, fetchProducts } from '../services/api';
const CATEGORY_COLORS = [
  '#FFE5D9', '#D9F0FF', '#D9FFE5', '#F5D9FF',
  '#FFF3D9', '#FFD9D9', '#D9FFF5', '#E5D9FF',
];

export default function CategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

  const filteredProducts = selected
    ? products.filter(p => p.category?.toLowerCase() === selected.toLowerCase())
    : products;

  const renderCategory = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.catCard,
        { backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] },
        selected === item.name && styles.catCardActive,
      ]}
      onPress={() => setSelected(selected === item.name ? null : item.name)}
    >
      <Text style={styles.catIcon}>🏷️</Text>
      <Text style={styles.catName}>{item.name}</Text>
      {item.description ? (
        <Text style={styles.catDesc} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <Text style={styles.catCount}>
        {products.filter(p => p.category?.toLowerCase() === item.name.toLowerCase()).length} items
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetails', { productId: item._id })}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/150x150?text=No+Image' }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>LKR {Number(item.price).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" color="#1a1a1a" style={styles.loader} />;

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

      {/* Category Grid */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item._id}
        renderItem={renderCategory}
        numColumns={2}
        columnWrapperStyle={styles.catRow}
        horizontal={false}
        style={styles.catList}
        ListFooterComponent={
          <>
            <Text style={styles.sectionTitle}>
              {selected ? `${selected} Products` : 'All Products'}
              <Text style={styles.countText}> ({filteredProducts.length})</Text>
            </Text>
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item._id}
              renderItem={renderProduct}
              numColumns={2}
              columnWrapperStyle={styles.catRow}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={styles.empty}>No products in this category.</Text>
              }
            />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loader: { flex: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1a1a1a', padding: 20, paddingTop: 50,
  },
  headerAction: { width: 64 },
  backBtn: { color: '#fff', fontWeight: '700', fontSize: 14 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  clearBtn: { color: '#e63946', fontWeight: '700', fontSize: 14 },
  catList: { padding: 12 },
  catRow: { justifyContent: 'space-between', marginBottom: 12 },
  catCard: {
    width: '48%', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  catCardActive: { borderColor: '#1a1a1a' },
  catIcon: { fontSize: 28, marginBottom: 6 },
  catName: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  catDesc: { fontSize: 11, color: '#555', textAlign: 'center', marginTop: 4 },
  catCount: { fontSize: 11, color: '#888', marginTop: 6, fontWeight: '600' },
  sectionTitle: {
    fontSize: 18, fontWeight: '800', color: '#1a1a1a',
    marginTop: 8, marginBottom: 12, paddingHorizontal: 4,
  },
  countText: { color: '#888', fontWeight: '400' },
  productCard: {
    backgroundColor: '#fff', borderRadius: 12, width: '48%',
    overflow: 'hidden', marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  productImage: { width: '100%', height: 140 },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  productPrice: { fontSize: 13, fontWeight: '800', color: '#e63946', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', marginTop: 30, fontSize: 15 },
});
