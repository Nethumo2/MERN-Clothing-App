import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image, Alert, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAllCarts } from '../services/api';
import { useAuth } from '../context/AuthContext';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const firstImage = (images) => {
  if (!Array.isArray(images) || images.length === 0) return '';
  const image = images[0];
  return image?.url || image?.src || image?.imageUrl || image?.image || image;
};

const getProductImage = (product) => (
  product?.imageUrl ||
  product?.imageURL ||
  product?.image ||
  product?.thumbnail ||
  firstImage(product?.images) ||
  'https://via.placeholder.com/120x140?text=LUSH'
);

const formatDate = (value) => {
  if (!value) return 'Not updated';
  return new Date(value).toLocaleString('en-LK', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminCartsScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCarts = async () => {
    try {
      const data = await fetchAllCarts();
      setCarts(Array.isArray(data) ? data : []);
    } catch (e) {
      showAlert('Cart Activity Error', e.message || 'Could not load cart activity');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCarts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCarts();
  };

  const renderCart = ({ item }) => {
    const items = item.items || [];
    const itemCount = items.reduce((total, cartItem) => total + Number(cartItem.quantity || 0), 0);

    return (
      <View style={styles.cartCard}>
        <View style={styles.cartHeader}>
          <View>
            <Text style={styles.customerName}>{item.user?.name || 'Customer'}</Text>
            <Text style={styles.customerEmail}>{item.user?.email || 'No email'}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{itemCount} items</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Cart Total</Text>
          <Text style={styles.totalValue}>LKR {Number(item.totalPrice || 0).toLocaleString()}</Text>
        </View>
        <Text style={styles.updatedText}>Updated {formatDate(item.updatedAt)}</Text>

        {items.length === 0 ? (
          <Text style={styles.emptyCartText}>Cart is empty</Text>
        ) : (
          items.map((cartItem) => (
            <View key={cartItem._id} style={styles.itemRow}>
              <Image source={{ uri: getProductImage(cartItem.product) }} style={styles.itemImage} resizeMode="cover" />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{cartItem.product?.name || 'Product unavailable'}</Text>
                <Text style={styles.itemMeta}>Size: {cartItem.size || 'N/A'} | Qty: {cartItem.quantity}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Admin only</Text>
        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeBtnText}>Back Home</Text>
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
        <Text style={styles.headerTitle}>Cart Activity</Text>
        <TouchableOpacity onPress={loadCarts}>
          <Text style={styles.refreshBtn}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={carts}
        keyExtractor={(item) => item._id}
        renderItem={renderCart}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={(
          <View style={styles.intro}>
            <Text style={styles.kicker}>ADMIN CARTS</Text>
            <Text style={styles.title}>Customer cart activity</Text>
            <Text style={styles.subtitle}>Quickly see active carts and items customers have not checked out yet.</Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No carts yet</Text>
            <Text style={styles.emptyText}>Customer cart activity will appear here.</Text>
          </View>
        )}
      />
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
  intro: { marginBottom: 16 },
  kicker: { color: '#9F8247', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  title: { color: '#1B1B1B', fontFamily: 'Georgia', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#8A8175', fontSize: 14, lineHeight: 20, marginTop: 6 },
  cartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#E9E2D8', shadowColor: '#1B1B1B',
    shadowOpacity: 0.05, shadowRadius: 14, elevation: 3,
  },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  customerName: { color: '#1B1B1B', fontWeight: '900', fontSize: 15 },
  customerEmail: { color: '#8A8175', fontWeight: '700', fontSize: 12, marginTop: 2 },
  countBadge: {
    backgroundColor: '#FFFCF4', borderWidth: 1, borderColor: '#BFA46A',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'flex-start',
  },
  countText: { color: '#9F8247', fontWeight: '900', fontSize: 11 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  summaryLabel: { color: '#8A8175', fontWeight: '800', fontSize: 12 },
  totalValue: { color: '#1B1B1B', fontWeight: '900', fontSize: 15 },
  updatedText: { color: '#8A8175', fontSize: 11, fontWeight: '700', marginTop: 4 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FBFAF7', borderRadius: 12, padding: 8, marginTop: 10,
  },
  itemImage: { width: 44, height: 56, borderRadius: 10, backgroundColor: '#F3EFE8' },
  itemInfo: { flex: 1 },
  itemName: { color: '#1B1B1B', fontWeight: '800', fontSize: 13 },
  itemMeta: { color: '#8A8175', fontWeight: '700', fontSize: 11, marginTop: 3 },
  emptyCartText: { color: '#8A8175', fontWeight: '700', marginTop: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyWrap: { flex: 1, backgroundColor: '#FBFAF7', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#1B1B1B', fontFamily: 'Georgia', fontSize: 24, fontWeight: '700' },
  emptyText: { color: '#8A8175', fontSize: 14, marginTop: 8 },
  homeBtn: { marginTop: 14, backgroundColor: '#BFA46A', borderRadius: 12, padding: 14 },
  homeBtnText: { color: '#FFFFFF', fontWeight: '800' },
});
