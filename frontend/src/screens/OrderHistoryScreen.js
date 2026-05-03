import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { fetchMyOrders } from '../services/api';
const STATUS_COLORS = {
  Pending: '#f39c12',
  Processing: '#3498db',
  Shipped: '#9b59b6',
  Delivered: '#2ecc71',
  Cancelled: '#e63946',
};

const STATUS_ICONS = {
  Pending: '⏳',
  Processing: '⚙️',
  Shipped: '🚚',
  Delivered: '✅',
  Cancelled: '❌',
};

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const loadOrders = async () => {
    try {
      const data = await fetchMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderOrder = ({ item }) => {
    const isExpanded = expanded === item._id;
    const statusColor = STATUS_COLORS[item.status] || '#888';
    const statusIcon = STATUS_ICONS[item.status] || '📦';

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setExpanded(isExpanded ? null : item._id)}
        activeOpacity={0.85}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item._id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusIcon} {item.status}
            </Text>
          </View>
        </View>

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <Text style={styles.itemCount}>{item.orderItems?.length} item(s)</Text>
          <Text style={styles.orderTotal}>LKR {Number(item.totalPrice).toLocaleString()}</Text>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedDetails}>
            <View style={styles.divider} />

            <Text style={styles.detailsTitle}>Items</Text>
            {item.orderItems?.map((oi, i) => (
              <View key={i} style={styles.orderItem}>
                <Text style={styles.orderItemName} numberOfLines={1}>{oi.name}</Text>
                <Text style={styles.orderItemQty}>× {oi.qty}</Text>
                <Text style={styles.orderItemPrice}>LKR {(oi.price * oi.qty).toLocaleString()}</Text>
              </View>
            ))}

            <View style={styles.divider} />
            <Text style={styles.detailsTitle}>Shipping To</Text>
            <Text style={styles.shippingText}>{item.shippingAddress?.fullName}</Text>
            <Text style={styles.shippingText}>{item.shippingAddress?.address}</Text>
            <Text style={styles.shippingText}>{item.shippingAddress?.city}</Text>
            <Text style={styles.shippingText}>📞 {item.shippingAddress?.phoneNumber}</Text>
          </View>
        )}

        <Text style={styles.expandHint}>{isExpanded ? '▲ Hide details' : '▼ View details'}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator size="large" color="#1a1a1a" style={styles.loader} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>Your orders will appear here</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loader: { flex: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a1a', padding: 20, paddingTop: 50,
  },
  backBtn: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  list: { padding: 14, paddingBottom: 30 },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderId: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  orderDate: { fontSize: 12, color: '#888', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCount: { fontSize: 13, color: '#888' },
  orderTotal: { fontSize: 16, fontWeight: '900', color: '#1a1a1a' },
  expandedDetails: { marginTop: 12 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  detailsTitle: { fontSize: 13, fontWeight: '800', color: '#888', marginBottom: 8, textTransform: 'uppercase' },
  orderItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  orderItemName: { flex: 1, fontSize: 13, color: '#1a1a1a' },
  orderItemQty: { fontSize: 12, color: '#888', marginHorizontal: 8 },
  orderItemPrice: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  shippingText: { fontSize: 13, color: '#555', marginBottom: 3 },
  expandHint: { textAlign: 'center', color: '#bbb', fontSize: 11, marginTop: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  emptySubtext: { fontSize: 14, color: '#888' },
  shopBtn: { marginTop: 8, backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
