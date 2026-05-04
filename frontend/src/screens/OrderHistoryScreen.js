import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, RefreshControl, Alert, Platform, Modal, TextInput,
} from 'react-native';
import {
  deleteOrder,
  fetchAllOrders,
  fetchMyOrders,
  updateOrderShipping,
  updateOrderStatus,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  Pending: { color: '#BFA46A', label: 'Pending' },
  Processing: { color: '#BFA46A', label: 'Pending' },
  'Order Placed': { color: '#0F3D33', label: 'Order Placed' },
  Accepted: { color: '#0F3D33', label: 'Order Placed' },
  Delivered: { color: '#0F3D33', label: 'Order Placed' },
  'Order Cancelled': { color: '#B63B3B', label: 'Order Cancelled' },
  Cancelled: { color: '#B63B3B', label: 'Order Cancelled' },
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

const getOrderImage = (order) => {
  const firstItem = order.orderItems?.find((item) => item?.image);
  return firstItem?.image || 'https://via.placeholder.com/300x360?text=LUSH';
};

export default function OrderHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [shippingForm, setShippingForm] = useState({
    fullName: '',
    address: '',
    city: '',
    phoneNumber: '',
  });

  const loadOrders = useCallback(async () => {
    try {
      const data = isAdmin ? await fetchAllOrders() : await fetchMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
      showAlert('Orders Error', e.message || 'Could not load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const handleStatusChange = (orderId, status) => {
    const actionText = status === 'Order Placed'
      ? 'accept this order'
      : status === 'Order Cancelled'
        ? 'cancel this order'
        : 'mark this order as pending';

    showConfirm('Update Order', `Are you sure you want to ${actionText}?`, async () => {
      try {
        setUpdatingId(orderId);
        const updated = await updateOrderStatus(orderId, status);
        setOrders((current) => current.map((order) => (
          order._id === orderId ? { ...order, status: updated.status } : order
        )));
        showAlert('Order Updated', `Order marked as ${updated.status}`);
      } catch (e) {
        showAlert('Update Failed', e.message || 'Could not update order status');
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const handleDeleteOrder = (orderId) => {
    showConfirm('Remove Order', 'Remove this order permanently?', async () => {
      try {
        setUpdatingId(orderId);
        await deleteOrder(orderId);
        setOrders((current) => current.filter((order) => order._id !== orderId));
        showAlert('Order Removed', 'Order removed successfully');
      } catch (e) {
        showAlert('Remove Failed', e.message || 'Could not remove order');
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const openShippingEditor = (order) => {
    setEditingOrder(order);
    setShippingForm({
      fullName: order.shippingAddress?.fullName || '',
      address: order.shippingAddress?.address || '',
      city: order.shippingAddress?.city || '',
      phoneNumber: order.shippingAddress?.phoneNumber || '',
    });
  };

  const saveShippingDetails = async () => {
    if (!editingOrder?._id) {
      showAlert('Update Failed', 'Order ID is missing. Please refresh orders and try again.');
      return;
    }

    if (!shippingForm.fullName.trim() || !shippingForm.address.trim()
      || !shippingForm.city.trim() || !shippingForm.phoneNumber.trim()) {
      showAlert('Missing Details', 'Please fill all shipping fields');
      return;
    }

    try {
      setUpdatingId(editingOrder._id);
      const updated = await updateOrderShipping(editingOrder._id, shippingForm);
      setOrders((current) => current.map((order) => (
        order._id === editingOrder._id ? { ...order, shippingAddress: updated.shippingAddress } : order
      )));
      setEditingOrder(null);
      showAlert('Shipping Updated', 'Your order shipping details were updated');
    } catch (e) {
      showAlert('Update Failed', e.message || 'Could not update shipping details');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusStyle = (status) => STATUS_STYLES[status] || { color: '#8A8175', label: status || 'Pending' };

  const renderOrder = ({ item }) => {
    const isExpanded = expanded === item._id;
    const statusStyle = getStatusStyle(item.status);
    const canMarkPending = isAdmin && statusStyle.label !== 'Pending';
    const canAccept = isAdmin && statusStyle.label !== 'Order Placed';
    const canCancel = isAdmin && statusStyle.label !== 'Order Cancelled';
    const isUpdating = updatingId === item._id;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setExpanded(isExpanded ? null : item._id)}
        activeOpacity={0.85}
      >
        <View style={styles.orderVisualRow}>
          <Image source={{ uri: getOrderImage(item) }} style={styles.orderImage} resizeMode="cover" />
          <View style={styles.orderVisualInfo}>
            <Text style={styles.orderEyebrow}>{isAdmin ? 'Customer Order' : 'LUSH Order'}</Text>
            <Text style={styles.orderId}>Order #{item._id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.orderHeader}>
          <View style={styles.orderTitleBlock}>
            {isAdmin ? (
              <Text style={styles.customerText}>
                {item.user?.name || 'Customer'}{item.user?.email ? ` - ${item.user.email}` : ''}
              </Text>
            ) : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusStyle.color}20` }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.itemCount}>{item.orderItems?.length || 0} item(s)</Text>
          <Text style={styles.orderTotal}>LKR {Number(item.totalPrice || 0).toLocaleString()}</Text>
        </View>

        {isAdmin ? (
          <View style={styles.adminPanel}>
            <Text style={styles.adminLabel}>Update Status</Text>
            <View style={styles.adminActions}>
              <TouchableOpacity
                style={[styles.statusActionBtn, styles.pendingBtn, (!canMarkPending || isUpdating) && styles.disabledBtn]}
                onPress={() => handleStatusChange(item._id, 'Pending')}
                disabled={!canMarkPending || isUpdating}
              >
                <Text style={styles.pendingBtnText}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusActionBtn, styles.acceptBtn, (!canAccept || isUpdating) && styles.disabledBtn]}
                onPress={() => handleStatusChange(item._id, 'Order Placed')}
                disabled={!canAccept || isUpdating}
              >
                <Text style={styles.acceptBtnText}>{isUpdating ? 'Updating...' : 'Placed'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusActionBtn, styles.cancelBtn, (!canCancel || isUpdating) && styles.disabledBtn]}
                onPress={() => handleStatusChange(item._id, 'Order Cancelled')}
                disabled={!canCancel || isUpdating}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.removeOrderBtn, isUpdating && styles.disabledBtn]}
              onPress={() => handleDeleteOrder(item._id)}
              disabled={isUpdating}
            >
              <Text style={styles.removeOrderText}>Remove Order</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isExpanded && (
          <View style={styles.expandedDetails}>
            <View style={styles.divider} />

            <Text style={styles.detailsTitle}>Items</Text>
            {item.orderItems?.map((oi, i) => (
              <View key={`${oi.product || oi.name}-${i}`} style={styles.orderItem}>
                <Image
                  source={{ uri: oi.image || 'https://via.placeholder.com/80x100?text=LUSH' }}
                  style={styles.orderItemImage}
                  resizeMode="cover"
                />
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName} numberOfLines={1}>{oi.name}</Text>
                  <Text style={styles.orderItemQty}>Qty {oi.qty}</Text>
                </View>
                <Text style={styles.orderItemPrice}>LKR {Number(oi.price * oi.qty).toLocaleString()}</Text>
              </View>
            ))}

            <View style={styles.divider} />
            <Text style={styles.detailsTitle}>Shipping To</Text>
            <Text style={styles.shippingText}>{item.shippingAddress?.fullName}</Text>
            <Text style={styles.shippingText}>{item.shippingAddress?.address}</Text>
            <Text style={styles.shippingText}>{item.shippingAddress?.city}</Text>
            <Text style={styles.shippingText}>{item.shippingAddress?.phoneNumber}</Text>
            {!isAdmin && statusStyle.label !== 'Order Cancelled' ? (
              <TouchableOpacity
                style={styles.editShippingBtn}
                onPress={() => openShippingEditor(item)}
              >
                <Text style={styles.editShippingText}>Edit Address / Contact</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <Text style={styles.expandHint}>{isExpanded ? 'Hide details' : 'View details'}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator size="large" color="#1B1B1B" style={styles.loader} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isAdmin ? 'Manage Orders' : 'My Orders'}</Text>
        <View style={{ width: 44 }} />
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>Orders</Text>
          <Text style={styles.emptyText}>{isAdmin ? 'No customer orders yet' : 'No orders yet'}</Text>
          <Text style={styles.emptySubtext}>
            {isAdmin ? 'New customer orders will appear here' : 'Your orders will appear here'}
          </Text>
          {!isAdmin ? (
            <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.shopBtnText}>Start Shopping</Text>
            </TouchableOpacity>
          ) : null}
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

      <Modal
        transparent
        visible={!!editingOrder}
        animationType="fade"
        onRequestClose={() => setEditingOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Shipping Details</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Full name"
              placeholderTextColor="#8A8175"
              value={shippingForm.fullName}
              onChangeText={(text) => setShippingForm((form) => ({ ...form, fullName: text }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Address"
              placeholderTextColor="#8A8175"
              value={shippingForm.address}
              onChangeText={(text) => setShippingForm((form) => ({ ...form, address: text }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="City"
              placeholderTextColor="#8A8175"
              value={shippingForm.city}
              onChangeText={(text) => setShippingForm((form) => ({ ...form, city: text }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone number"
              placeholderTextColor="#8A8175"
              value={shippingForm.phoneNumber}
              keyboardType="phone-pad"
              onChangeText={(text) => setShippingForm((form) => ({ ...form, phoneNumber: text }))}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingOrder(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, updatingId === editingOrder?._id && styles.disabledBtn]}
                onPress={saveShippingDetails}
                disabled={updatingId === editingOrder?._id}
              >
                <Text style={styles.modalSaveText}>Save</Text>
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
    backgroundColor: '#FFFFFF', padding: 24, paddingTop: 54, borderBottomWidth: 1, borderBottomColor: '#E9E2D8',
  },
  backBtn: { color: '#9F8247', fontSize: 14, fontWeight: '700' },
  headerTitle: { color: '#1B1B1B', fontSize: 24, fontFamily: 'Georgia', fontWeight: '700' },
  list: { padding: 14, paddingBottom: 30 },
  orderCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 14,
    shadowColor: '#1B1B1B', shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  orderVisualRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  orderImage: { width: 82, height: 104, borderRadius: 14, backgroundColor: '#F7F3EC' },
  orderVisualInfo: { flex: 1, justifyContent: 'center' },
  orderEyebrow: {
    color: '#9F8247', fontSize: 10, fontWeight: '900',
    letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase',
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  orderTitleBlock: { flex: 1 },
  orderId: { fontSize: 14, fontWeight: '800', color: '#1B1B1B' },
  orderDate: { fontSize: 12, color: '#8A8175', marginTop: 2 },
  customerText: { fontSize: 12, color: '#3B3B3B', marginTop: 4 },
  statusBadge: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCount: { fontSize: 13, color: '#8A8175' },
  orderTotal: { fontSize: 16, fontWeight: '900', color: '#1B1B1B' },
  adminPanel: {
    marginTop: 14, backgroundColor: '#FBFAF7', borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: '#E9E2D8',
  },
  adminLabel: {
    color: '#8A8175', fontSize: 11, fontWeight: '900',
    textTransform: 'uppercase', marginBottom: 8,
  },
  adminActions: { flexDirection: 'row', gap: 8 },
  statusActionBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  pendingBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BFA46A' },
  pendingBtnText: { color: '#9F8247', fontWeight: '800', fontSize: 12 },
  acceptBtn: { backgroundColor: '#BFA46A' },
  acceptBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  cancelBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#B63B3B' },
  cancelBtnText: { color: '#B63B3B', fontWeight: '800', fontSize: 13 },
  removeOrderBtn: {
    marginTop: 10, borderRadius: 12, paddingVertical: 11, alignItems: 'center',
    backgroundColor: '#B63B3B',
  },
  removeOrderText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  disabledBtn: { opacity: 0.45 },
  expandedDetails: { marginTop: 12 },
  divider: { height: 1, backgroundColor: '#F5F1EA', marginVertical: 12 },
  detailsTitle: { fontSize: 13, fontWeight: '800', color: '#8A8175', marginBottom: 8, textTransform: 'uppercase' },
  orderItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 10, backgroundColor: '#FBFAF7', borderRadius: 12, padding: 8,
  },
  orderItemImage: { width: 48, height: 60, borderRadius: 10, backgroundColor: '#F7F3EC' },
  orderItemInfo: { flex: 1 },
  orderItemName: { fontSize: 13, color: '#1B1B1B', fontWeight: '700' },
  orderItemQty: { fontSize: 12, color: '#8A8175', marginTop: 3 },
  orderItemPrice: { fontSize: 13, fontWeight: '800', color: '#BFA46A' },
  shippingText: { fontSize: 13, color: '#3B3B3B', marginBottom: 3 },
  editShippingBtn: {
    marginTop: 10, borderRadius: 12, paddingVertical: 11, alignItems: 'center',
    borderWidth: 1, borderColor: '#BFA46A', backgroundColor: '#FFFCF4',
  },
  editShippingText: { color: '#9F8247', fontWeight: '800', fontSize: 13 },
  expandHint: { textAlign: 'center', color: '#8A8175', fontSize: 11, marginTop: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 28, fontFamily: 'Georgia', fontWeight: '700', color: '#1B1B1B' },
  emptyText: { fontSize: 24, fontFamily: 'Georgia', fontWeight: '700', color: '#1B1B1B', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#8A8175', textAlign: 'center' },
  shopBtn: { marginTop: 8, backgroundColor: '#BFA46A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  shopBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
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
});
