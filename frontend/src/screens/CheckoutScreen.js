import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { createOrder, clearCart } from '../services/api';
import { useCart } from '../context/CartContext';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function CheckoutScreen({ route, navigation }) {
  const { cart } = route.params || {};
  const { refreshCart } = useCart();
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const validate = () => {
    if (!fullName.trim()) { showAlert('Error', 'Please enter your full name'); return false; }
    if (!address.trim()) { showAlert('Error', 'Please enter your address'); return false; }
    if (!city.trim()) { showAlert('Error', 'Please enter your city'); return false; }
    if (!phoneNumber.trim() || phoneNumber.length < 9) { showAlert('Error', 'Please enter a valid phone number'); return false; }
    if (!items.length) { showAlert('Error', 'Your cart is empty'); return false; }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const orderItems = (cart?.items || []).map((item) => ({
        qty: Number(item.quantity || 0),
        product: item.product?._id,
      })).filter((item) => item.product && item.qty > 0);

      if (orderItems.length === 0) {
        showAlert('Error', 'Your cart does not have valid items');
        return;
      }

      const orderData = {
        orderItems,
        shippingAddress: { fullName, address, city, phoneNumber },
      };

      const result = await createOrder(orderData);

      if (result._id) {
        await clearCart();
        refreshCart();
        showAlert('Order Placed!', `Order ID: ${result._id.slice(-8).toUpperCase()}`);
        navigation.navigate('OrderHistory');
      } else {
        showAlert('Error', result.message || 'Failed to place order');
      }
    } catch (e) {
      showAlert('Error', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const items = cart?.items || [];
  const getLineTotal = (item) => {
    const price = Number(item.product?.price);
    const quantity = Number(item.quantity);
    return Number.isFinite(price) && Number.isFinite(quantity) ? price * quantity : 0;
  };
  const orderTotal = items.reduce((total, item) => total + getLineTotal(item), 0);

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
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryBox}>
          {items.map((item, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryItem} numberOfLines={1}>
                {item.product?.name} ({item.size}) x {item.quantity}
              </Text>
              <Text style={styles.summaryPrice}>
                LKR {getLineTotal(item).toLocaleString()}
              </Text>
            </View>
          ))}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>LKR {orderTotal.toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Shipping Details</Text>
        <View style={styles.formBox}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor="#bbb"
            value={fullName}
            onChangeText={setFullName}
          />
          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Main Street"
            placeholderTextColor="#bbb"
            value={address}
            onChangeText={setAddress}
          />
          <Text style={styles.inputLabel}>City *</Text>
          <TextInput
            style={styles.input}
            placeholder="Colombo"
            placeholderTextColor="#bbb"
            value={city}
            onChangeText={setCity}
          />
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="0771234567"
            placeholderTextColor="#bbb"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        <View style={styles.paymentNote}>
          <Text style={styles.paymentNoteIcon}>COD</Text>
          <Text style={styles.paymentNoteText}>Cash on Delivery - Pay when your order arrives.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, loading && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderBtnText}>
              Place Order - LKR {orderTotal.toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a1a', padding: 20, paddingTop: 50,
  },
  backBtn: { color: '#fff', fontSize: 14, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 30 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginBottom: 12, marginTop: 8 },
  summaryBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryItem: { fontSize: 13, color: '#555', flex: 1, marginRight: 8 },
  summaryPrice: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 4, marginBottom: 0 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  totalValue: { fontSize: 16, fontWeight: '900', color: '#e63946' },
  formBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 5, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#1a1a1a', marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  paymentNote: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 14, gap: 10,
    borderLeftWidth: 4, borderLeftColor: '#2ecc71',
  },
  paymentNoteIcon: { fontSize: 13, fontWeight: '900', color: '#2ecc71' },
  paymentNoteText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 18 },
  footer: {
    backgroundColor: '#fff', padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  placeOrderBtn: { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 18, alignItems: 'center' },
  placeOrderBtnDisabled: { backgroundColor: '#aaa' },
  placeOrderBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
