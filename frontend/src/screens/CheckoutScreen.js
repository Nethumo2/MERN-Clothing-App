import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  Modal, FlatList,
} from 'react-native';
import { createOrder, fetchMyOrders, removeSelectedFromCart } from '../services/api';
import { useCart } from '../context/CartContext';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const validateCheckoutForm = (formData) => {
  const errors = {};

  if (!formData.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (formData.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  } else if (formData.fullName.trim().length > 50) {
    errors.fullName = 'Full name must be less than 50 characters';
  }

  if (!formData.address.trim()) {
    errors.address = 'Address is required';
  } else if (formData.address.trim().length < 10) {
    errors.address = 'Address must be at least 10 characters';
  } else if (formData.address.trim().length > 200) {
    errors.address = 'Address must be less than 200 characters';
  }

  if (!formData.city.trim()) {
    errors.city = 'City is required';
  } else if (formData.city.trim().length < 2) {
    errors.city = 'City must be at least 2 characters';
  } else if (!/^[a-zA-Z\s]+$/.test(formData.city.trim())) {
    errors.city = 'City should contain only letters and spaces';
  }

  if (!formData.phoneNumber.trim()) {
    errors.phoneNumber = 'Phone number is required';
  } else if (!/^[+]?[\d\s\-()]{10,}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
    errors.phoneNumber = 'Please enter a valid phone number (at least 10 digits)';
  }

  if (!formData.paymentMethod) {
    errors.paymentMethod = 'Payment method is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default function CheckoutScreen({ route, navigation }) {
  const { cart, selectedItemIds = [] } = route.params || {};
  const { refreshCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    city: '',
    phoneNumber: '',
    paymentMethod: 'cod',
  });
  const [formErrors, setFormErrors] = useState({});

  const items = cart?.items || [];

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const userOrders = await fetchMyOrders();
      setOrders(Array.isArray(userOrders) ? userOrders : []);
    } catch (_error) {
      showAlert('Error', 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    if (!items.length) {
      showAlert('Error', 'Your cart is empty');
      return false;
    }

    const validation = validateCheckoutForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      showAlert('Validation Error', firstError);
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const orderItems = items
        .map((item) => ({
          qty: Number(item.quantity || 0),
          product: item.product?._id,
          size: item.size || '',
        }))
        .filter((item) => item.product && item.qty > 0);

      if (orderItems.length === 0) {
        showAlert('Error', 'Your cart does not have valid items');
        return;
      }

      const checkoutItemIds = items.map((item) => item._id).filter(Boolean);

      const orderData = {
        orderItems,
        shippingAddress: {
          fullName: formData.fullName.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          phoneNumber: formData.phoneNumber.trim(),
        },
        cartItemIds: checkoutItemIds.length ? checkoutItemIds : selectedItemIds,
        paymentMethod: formData.paymentMethod,
      };

      const result = await createOrder(orderData);

      if (result._id) {
        const itemIdsToRemove = orderData.cartItemIds || [];

        try {
          if (itemIdsToRemove.length > 0) {
            await removeSelectedFromCart(itemIdsToRemove);
          }
        } catch (cleanupError) {
          console.log('Cart cleanup fallback failed after order placement', cleanupError);
        }

        await refreshCart();
        setFormData({
          fullName: '',
          address: '',
          city: '',
          phoneNumber: '',
          paymentMethod: 'cod',
        });
        setFormErrors({});
        showAlert('Order Placed!', `Order ID: ${result._id.slice(-8).toUpperCase()}`);
        await loadOrders();
        setShowOrders(true);
      } else {
        showAlert('Error', result.message || 'Failed to place order');
      }
    } catch (e) {
      showAlert('Error', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getLineTotal = (item) => {
    const price = Number(item.product?.price);
    const quantity = Number(item.quantity);
    return Number.isFinite(price) && Number.isFinite(quantity) ? price * quantity : 0;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((total, item) => total + getLineTotal(item), 0);
    const shipping = subtotal > 0 ? 200 : 0;
    const tax = subtotal * 0.08;
    const voucher = cart?.voucher || {};
    const voucherDiscount = voucher.status === 'Accepted'
      ? Math.min(Number(voucher.amount || 0), subtotal + shipping + tax)
      : 0;
    const total = subtotal + shipping + tax - voucherDiscount;

    return { subtotal, shipping, tax, voucherDiscount, total };
  };

  const { subtotal, shipping, tax, voucherDiscount, total } = calculateTotals();

  const renderOrderItem = ({ item }) => {
    const statusKey = `status${(item.status || 'Pending').replace(/\s+/g, '')}`;

    return (
      <View style={styles.orderItem}>
        <View style={styles.orderItemHeader}>
          <Text style={styles.orderId}>Order ID: {item._id.slice(-8).toUpperCase()}</Text>
          <Text style={[styles.orderStatus, styles[statusKey]]}>{item.status || 'Pending'}</Text>
        </View>
        <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.orderTotal}>LKR {Number(item.totalPrice || 0).toLocaleString()}</Text>
        <TouchableOpacity
          style={styles.viewOrderBtn}
          onPress={() => {
            setShowOrders(false);
            navigation.navigate('OrderHistory');
          }}
        >
          <Text style={styles.viewOrderBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <TouchableOpacity onPress={() => { loadOrders(); setShowOrders(true); }}>
          <Text style={styles.ordersBtn}>My Orders</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryBox}>
          {items.map((item, i) => (
            <View key={item._id || i} style={styles.summaryRow}>
              <Text style={styles.summaryItem} numberOfLines={1}>
                {item.product?.name} ({item.size}) x {item.quantity}
              </Text>
              <Text style={styles.summaryPrice}>LKR {getLineTotal(item).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryPrice}>LKR {subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryPrice}>LKR {shipping.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (8%)</Text>
            <Text style={styles.summaryPrice}>LKR {tax.toLocaleString()}</Text>
          </View>
          {voucherDiscount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Accepted Voucher</Text>
              <Text style={styles.discountPrice}>- LKR {voucherDiscount.toLocaleString()}</Text>
            </View>
          ) : null}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>LKR {total.toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Shipping Details</Text>
        <View style={styles.formBox}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={[styles.input, formErrors.fullName && styles.inputError]}
            placeholder="John Doe"
            placeholderTextColor="#8A8175"
            value={formData.fullName}
            onChangeText={(value) => handleInputChange('fullName', value)}
          />
          {formErrors.fullName ? <Text style={styles.errorText}>{formErrors.fullName}</Text> : null}

          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={[styles.input, formErrors.address && styles.inputError]}
            placeholder="123 Main Street"
            placeholderTextColor="#8A8175"
            value={formData.address}
            onChangeText={(value) => handleInputChange('address', value)}
            multiline
          />
          {formErrors.address ? <Text style={styles.errorText}>{formErrors.address}</Text> : null}

          <Text style={styles.inputLabel}>City *</Text>
          <TextInput
            style={[styles.input, formErrors.city && styles.inputError]}
            placeholder="Colombo"
            placeholderTextColor="#8A8175"
            value={formData.city}
            onChangeText={(value) => handleInputChange('city', value)}
          />
          {formErrors.city ? <Text style={styles.errorText}>{formErrors.city}</Text> : null}

          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={[styles.input, formErrors.phoneNumber && styles.inputError]}
            placeholder="0771234567"
            placeholderTextColor="#8A8175"
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={(value) => handleInputChange('phoneNumber', value)}
          />
          {formErrors.phoneNumber ? <Text style={styles.errorText}>{formErrors.phoneNumber}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.formBox}>
          <TouchableOpacity
            style={[styles.paymentOption, formData.paymentMethod === 'cod' && styles.paymentOptionSelected]}
            onPress={() => handleInputChange('paymentMethod', 'cod')}
          >
            <View style={[styles.radioBtn, formData.paymentMethod === 'cod' && styles.radioBtnSelected]} />
            <View style={styles.paymentOptionContent}>
              <Text style={styles.paymentOptionTitle}>Cash on Delivery</Text>
              <Text style={styles.paymentOptionDesc}>Pay when your order arrives</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, formData.paymentMethod === 'card' && styles.paymentOptionSelected]}
            onPress={() => handleInputChange('paymentMethod', 'card')}
          >
            <View style={[styles.radioBtn, formData.paymentMethod === 'card' && styles.radioBtnSelected]} />
            <View style={styles.paymentOptionContent}>
              <Text style={styles.paymentOptionTitle}>Credit/Debit Card</Text>
              <Text style={styles.paymentOptionDesc}>Secure online payment (Coming Soon)</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, loading && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.placeOrderBtnText}>Place Order - LKR {total.toLocaleString()}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showOrders}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOrders(false)}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowOrders(false)}>
            <Text style={styles.modalCloseBtn}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>My Orders</Text>
          <View style={{ width: 60 }} />
        </View>

        {ordersLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#BFA46A" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubText}>Place your first order to see it here</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.ordersList}
          />
        )}
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFAF7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', padding: 24, paddingTop: 54, borderBottomWidth: 1, borderBottomColor: '#E9E2D8',
  },
  backBtn: { color: '#9F8247', fontSize: 14, fontWeight: '700' },
  headerTitle: { color: '#1B1B1B', fontSize: 24, fontFamily: 'Georgia', fontWeight: '700' },
  ordersBtn: { color: '#9F8247', fontSize: 14, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 30 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1B1B1B', marginBottom: 12, marginTop: 8 },
  summaryBox: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20,
    shadowColor: '#1B1B1B', shadowOpacity: 0.04, shadowRadius: 14, elevation: 3,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 13, color: '#8A8175', flex: 1, marginRight: 8 },
  summaryItem: { fontSize: 13, color: '#3B3B3B', flex: 1, marginRight: 8 },
  summaryPrice: { fontSize: 13, fontWeight: '700', color: '#1B1B1B' },
  discountPrice: { fontSize: 13, fontWeight: '800', color: '#0F3D33' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E9E2D8', paddingTop: 10, marginTop: 4, marginBottom: 0 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#1B1B1B' },
  totalValue: { fontSize: 16, fontWeight: '900', color: '#BFA46A' },
  formBox: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#1B1B1B', shadowOpacity: 0.04, shadowRadius: 14, elevation: 3,
  },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#8A8175', marginBottom: 5, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: '#E9E2D8', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#1B1B1B', marginBottom: 14,
    backgroundColor: '#FBFAF7',
  },
  inputError: { borderColor: '#E74C3C', borderWidth: 2 },
  errorText: { color: '#E74C3C', fontSize: 12, marginBottom: 10, marginTop: -5 },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderWidth: 1, borderColor: '#E9E2D8', borderRadius: 12, marginBottom: 12,
  },
  paymentOptionSelected: { borderColor: '#BFA46A', backgroundColor: '#FBFAF7' },
  radioBtn: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#E9E2D8',
    marginRight: 12,
  },
  radioBtnSelected: { borderColor: '#BFA46A', backgroundColor: '#BFA46A' },
  paymentOptionContent: { flex: 1 },
  paymentOptionTitle: { fontSize: 14, fontWeight: '700', color: '#1B1B1B', marginBottom: 2 },
  paymentOptionDesc: { fontSize: 12, color: '#8A8175' },
  footer: {
    backgroundColor: '#FFFFFF', padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#E9E2D8',
  },
  placeOrderBtn: {
    backgroundColor: '#BFA46A', borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: '#BFA46A', shadowOpacity: 0.22, shadowRadius: 14, elevation: 4,
  },
  placeOrderBtnDisabled: { backgroundColor: '#8A8175' },
  placeOrderBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', padding: 24, paddingTop: 54, borderBottomWidth: 1, borderBottomColor: '#E9E2D8',
  },
  modalCloseBtn: { color: '#9F8247', fontSize: 14, fontWeight: '700' },
  modalTitle: { color: '#1B1B1B', fontSize: 24, fontFamily: 'Georgia', fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#8A8175' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#1B1B1B', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#8A8175', textAlign: 'center' },
  ordersList: { padding: 16 },
  orderItem: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#1B1B1B', shadowOpacity: 0.04, shadowRadius: 14, elevation: 3,
  },
  orderItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 14, fontWeight: '700', color: '#1B1B1B' },
  orderStatus: {
    fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  statusPending: { backgroundColor: '#FFF3CD', color: '#856404' },
  statusOrderPlaced: { backgroundColor: '#D4EDDA', color: '#155724' },
  statusOrderCancelled: { backgroundColor: '#F8D7DA', color: '#721C24' },
  orderDate: { fontSize: 12, color: '#8A8175', marginBottom: 4 },
  orderTotal: { fontSize: 16, fontWeight: '800', color: '#BFA46A', marginBottom: 12 },
  viewOrderBtn: { backgroundColor: '#BFA46A', borderRadius: 8, padding: 10, alignItems: 'center' },
  viewOrderBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
});
