import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { fetchCart, removeFromCart, clearCart, updateCartItem } from '../services/api';
import { useCart } from '../context/CartContext';
import { useFocusEffect } from '@react-navigation/native';

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
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirm },
    ]);
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

export default function CartScreen({ navigation }) {
  const { refreshCart } = useCart();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const data = await fetchCart();
      setCart(data);
      setSelectedItemIds([]);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );

  const handleRemove = async (itemId) => {
    try {
      setUpdatingItemId(itemId);
      const updated = await removeFromCart(itemId);
      setCart(updated);
      setSelectedItemIds((current) => current.filter((id) => id !== itemId));
      refreshCart();
    } catch (_e) {
      showAlert('Error', 'Failed to remove item');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleQuantityChange = async (item, nextQuantity) => {
    if (nextQuantity < 1) {
      handleRemove(item._id);
      return;
    }

    try {
      setUpdatingItemId(item._id);
      const updated = await updateCartItem(item._id, nextQuantity);
      setCart(updated);
      refreshCart();
    } catch (_e) {
      showAlert('Error', 'Failed to update quantity');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleClear = () => {
    showConfirm('Clear Cart', 'Remove all items from cart?', async () => {
      try {
        const updated = await clearCart();
        setCart(updated);
        setSelectedItemIds([]);
        refreshCart();
      } catch (_e) {
        showAlert('Error', 'Failed to clear cart');
      }
    });
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItemIds((current) => (
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    ));
  };

  const toggleSelectAll = () => {
    const items = cart?.items || [];
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([]);
      return;
    }

    setSelectedItemIds(items.map((item) => item._id));
  };

  const renderItem = ({ item }) => {
    const product = item.product || {};
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(product.price || 0);
    const lineTotal = unitPrice * quantity;
    const isUpdating = updatingItemId === item._id;
    const isSelected = selectedItemIds.includes(item._id);

    return (
      <View style={[styles.cartItem, isSelected && styles.cartItemSelected]}>
        <TouchableOpacity
          style={[styles.selectBox, isSelected && styles.selectBoxActive]}
          onPress={() => toggleItemSelection(item._id)}
          activeOpacity={0.8}
        >
          <Text style={[styles.selectBoxText, isSelected && styles.selectBoxTextActive]}>
            {isSelected ? '✓' : ''}
          </Text>
        </TouchableOpacity>
        <Image
          source={{ uri: getProductImage(product) }}
          style={styles.itemImage}
          resizeMode="contain"
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{product.name || 'Product unavailable'}</Text>
          <Text style={styles.itemMeta}>Category: {product.category || 'N/A'}</Text>
          <Text style={styles.itemMeta}>Size: {item.size || 'N/A'}</Text>
          <Text style={styles.itemMeta}>Unit: LKR {unitPrice.toLocaleString()}</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={[styles.quantityBtn, isUpdating && styles.disabledBtn]}
              onPress={() => handleQuantityChange(item, quantity - 1)}
              disabled={isUpdating}
            >
              <Text style={styles.quantityBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.itemQty}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.quantityBtn, isUpdating && styles.disabledBtn]}
              onPress={() => handleQuantityChange(item, quantity + 1)}
              disabled={isUpdating}
            >
              <Text style={styles.quantityBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.itemPrice}>Line total: LKR {lineTotal.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.removeBtn, isUpdating && styles.disabledBtn]}
          onPress={() => handleRemove(item._id)}
          disabled={isUpdating}
        >
          <Text style={styles.removeBtnText}>x</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) return <ActivityIndicator size="large" color="#1B1B1B" style={styles.loader} />;

  const items = cart?.items || [];
  const selectedItems = items.filter((item) => selectedItemIds.includes(item._id));
  const quantityTotal = selectedItems.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const selectedTotal = selectedItems.reduce((total, item) => {
    const price = Number(item.product?.price || 0);
    const quantity = Number(item.quantity || 0);
    return total + price * quantity;
  }, 0);
  const allSelected = items.length > 0 && selectedItemIds.length === items.length;

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      showAlert('Select Items', 'Please select at least one item to checkout');
      return;
    }

    navigation.navigate('Checkout', {
      cart: { ...cart, items: selectedItems, totalPrice: selectedTotal },
      selectedItemIds,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearBtn}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>Cart</Text>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.selectionBar}>
            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
              <Text style={styles.selectAllText}>{allSelected ? 'Unselect All' : 'Select All'}</Text>
            </TouchableOpacity>
            <Text style={styles.selectedCount}>{selectedItems.length} of {items.length} selected</Text>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Selected ({quantityTotal} items)</Text>
              <Text style={styles.totalValue}>LKR {selectedTotal.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, selectedItems.length === 0 && styles.disabledBtn]}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  clearBtn: { color: '#9F8247', fontWeight: '700', fontSize: 14 },
  list: { padding: 14, paddingBottom: 20 },
  selectionBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  selectAllBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#E9E2D8',
  },
  selectAllText: { color: '#9F8247', fontWeight: '800', fontSize: 13 },
  selectedCount: { color: '#8A8175', fontWeight: '700', fontSize: 12 },
  cartItem: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'transparent',
    shadowColor: '#1B1B1B', shadowOpacity: 0.06, shadowRadius: 14, elevation: 3,
  },
  cartItemSelected: { borderColor: '#BFA46A', backgroundColor: '#FFFCF4' },
  selectBox: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 1,
    borderColor: '#D8CCB6', alignItems: 'center', justifyContent: 'center',
    marginRight: 10, alignSelf: 'center', backgroundColor: '#FFFFFF',
  },
  selectBoxActive: { backgroundColor: '#BFA46A', borderColor: '#BFA46A' },
  selectBoxText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  selectBoxTextActive: { color: '#FFFFFF' },
  itemImage: { width: 88, height: 108, borderRadius: 12, backgroundColor: '#F7F3EC' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1B1B1B', marginBottom: 4 },
  itemMeta: { fontSize: 12, color: '#8A8175', marginTop: 2 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  quantityBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#F5F1EA', alignItems: 'center', justifyContent: 'center',
  },
  quantityBtnText: { fontSize: 16, fontWeight: '800', color: '#1B1B1B' },
  disabledBtn: { opacity: 0.45 },
  itemQty: { minWidth: 32, textAlign: 'center', fontSize: 14, fontWeight: '800', color: '#1B1B1B' },
  itemPrice: { fontSize: 15, fontWeight: '800', color: '#BFA46A', marginTop: 4 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 16,
    backgroundColor: '#F5F1EA', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  removeBtnText: { color: '#BFA46A', fontSize: 12, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 28, fontFamily: 'Georgia', fontWeight: '700', color: '#1B1B1B' },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#3B3B3B' },
  shopBtn: {
    backgroundColor: '#BFA46A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28,
    shadowColor: '#BFA46A', shadowOpacity: 0.2, shadowRadius: 12, elevation: 3,
  },
  shopBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  footer: {
    backgroundColor: '#FFFFFF', padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#E9E2D8',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  totalLabel: { fontSize: 15, color: '#8A8175' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#1B1B1B' },
  checkoutBtn: {
    backgroundColor: '#BFA46A', borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#BFA46A', shadowOpacity: 0.22, shadowRadius: 14, elevation: 4,
  },
  checkoutBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
