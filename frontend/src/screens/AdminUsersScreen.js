import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteUser, fetchUsers, fetchUsersWithActivity, updateUser } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

const formatDate = (value) => {
  if (!value) return 'No activity';
  return new Date(value).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function AdminUsersScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadUsers = async () => {
    try {
      setErrorMessage('');
      let data = await fetchUsersWithActivity();

      if (!Array.isArray(data)) {
        data = await fetchUsers();
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      try {
        const fallbackData = await fetchUsers();
        setUsers(Array.isArray(fallbackData) ? fallbackData : []);
        setErrorMessage('Activity details could not load, but users were loaded.');
      } catch (fallbackError) {
        const message = fallbackError.message || e.message || 'Could not load users';
        setUsers([]);
        setErrorMessage(message);
        showAlert('Users Error', message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const updateAndRefresh = async (targetUser, payload, successMessage) => {
    try {
      setUpdatingId(targetUser._id);
      await updateUser(targetUser._id, payload);
      await loadUsers();
      showAlert('User Updated', successMessage);
    } catch (e) {
      showAlert('Update Failed', e.message || 'Could not update user');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleRole = (targetUser) => {
    const nextAdmin = !targetUser.isAdmin;
    const action = nextAdmin ? 'promote this user to admin' : 'change this admin to customer';

    showConfirm('Update Role', `Are you sure you want to ${action}?`, () => {
      updateAndRefresh(
        targetUser,
        { isAdmin: nextAdmin },
        nextAdmin ? 'User promoted to admin' : 'User changed to customer'
      );
    });
  };

  const toggleActive = (targetUser) => {
    const nextActive = targetUser.isActive === false;
    const action = nextActive ? 'reactivate this user' : 'deactivate this user';

    showConfirm('Update Account', `Are you sure you want to ${action}?`, () => {
      updateAndRefresh(
        targetUser,
        { isActive: nextActive },
        nextActive ? 'User reactivated' : 'User deactivated'
      );
    });
  };

  const removeUser = (targetUser) => {
    showConfirm('Delete User', `Delete ${targetUser.email}? This cannot be undone.`, async () => {
      try {
        setUpdatingId(targetUser._id);
        await deleteUser(targetUser._id);
        setUsers((current) => current.filter((item) => item._id !== targetUser._id));
        showAlert('User Deleted', 'User removed successfully');
      } catch (e) {
        showAlert('Delete Failed', e.message || 'Could not delete user');
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const renderUser = ({ item }) => {
    const activity = item.activity || {};
    const isSelf = item._id === user?._id;
    const isUpdating = updatingId === item._id;

    return (
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.name || item.email || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name || 'Unnamed User'}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={[styles.roleBadge, item.isAdmin && styles.adminBadge]}>
            <Text style={[styles.roleText, item.isAdmin && styles.adminRoleText]}>
              {item.isAdmin ? 'Admin' : 'Customer'}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{activity.orderCount || 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>LKR {Number(activity.totalSpent || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{activity.cartItemCount || 0}</Text>
            <Text style={styles.statLabel}>Cart Items</Text>
          </View>
        </View>

        <View style={styles.activityRows}>
          <Text style={styles.activityText}>Pending: {activity.pendingOrders || 0}</Text>
          <Text style={styles.activityText}>Placed: {activity.placedOrders || 0}</Text>
          <Text style={styles.activityText}>Cancelled: {activity.cancelledOrders || 0}</Text>
          <Text style={styles.activityText}>Last order: {formatDate(activity.lastOrderDate)}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.accountStatus, item.isActive === false && styles.inactiveText]}>
            {item.isActive === false ? 'Inactive account' : 'Active account'}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, isUpdating && styles.disabledBtn]}
            onPress={() => toggleRole(item)}
            disabled={isUpdating || isSelf}
          >
            <Text style={styles.actionText}>{item.isAdmin ? 'Make Customer' : 'Make Admin'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.outlineBtn, isUpdating && styles.disabledBtn]}
            onPress={() => toggleActive(item)}
            disabled={isUpdating || isSelf}
          >
            <Text style={styles.outlineText}>{item.isActive === false ? 'Reactivate' : 'Deactivate'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, isUpdating && styles.disabledBtn]}
            onPress={() => removeUser(item)}
            disabled={isUpdating || isSelf}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {isSelf ? <Text style={styles.selfNote}>You cannot change your own admin account here.</Text> : null}
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
        <Text style={styles.headerTitle}>Manage Users</Text>
        <TouchableOpacity onPress={loadUsers}>
          <Text style={styles.refreshBtn}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={(
          <View style={styles.intro}>
            <Text style={styles.kicker}>ADMIN DASHBOARD</Text>
            <Text style={styles.title}>Users and activity</Text>
            <Text style={styles.subtitle}>Review accounts, cart activity, order status, and role access.</Text>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>No users found</Text>
            <Text style={styles.emptyCardText}>
              Pull down to refresh. If this stays empty, restart the backend from the WMT-Assignment backend folder.
            </Text>
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
  errorText: { color: '#B63B3B', fontSize: 12, fontWeight: '800', marginTop: 10 },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, alignItems: 'center',
    borderWidth: 1, borderColor: '#E9E2D8',
  },
  emptyCardTitle: { color: '#1B1B1B', fontFamily: 'Georgia', fontSize: 22, fontWeight: '700' },
  emptyCardText: { color: '#8A8175', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  userCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#E9E2D8', shadowColor: '#1B1B1B',
    shadowOpacity: 0.05, shadowRadius: 14, elevation: 3,
  },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FBFAF7',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E9E2D8',
  },
  avatarText: { color: '#9F8247', fontWeight: '900', fontSize: 18 },
  userInfo: { flex: 1 },
  userName: { color: '#1B1B1B', fontWeight: '900', fontSize: 15 },
  userEmail: { color: '#8A8175', fontWeight: '700', fontSize: 12, marginTop: 2 },
  roleBadge: { backgroundColor: '#F5F1EA', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  adminBadge: { backgroundColor: '#0F3D3320' },
  roleText: { color: '#8A8175', fontWeight: '800', fontSize: 11 },
  adminRoleText: { color: '#0F3D33' },
  statsGrid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statBox: { flex: 1, backgroundColor: '#FBFAF7', borderRadius: 12, padding: 10 },
  statValue: { color: '#1B1B1B', fontWeight: '900', fontSize: 13 },
  statLabel: { color: '#8A8175', fontSize: 11, fontWeight: '700', marginTop: 4 },
  activityRows: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  activityText: { color: '#3B3B3B', fontSize: 12, fontWeight: '700' },
  statusRow: { marginTop: 10 },
  accountStatus: { color: '#0F3D33', fontSize: 12, fontWeight: '800' },
  inactiveText: { color: '#B63B3B' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, backgroundColor: '#BFA46A', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  actionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  outlineBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BFA46A' },
  outlineText: { color: '#9F8247', fontWeight: '800', fontSize: 11 },
  deleteBtn: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 11,
    alignItems: 'center', borderWidth: 1, borderColor: '#B63B3B',
  },
  deleteText: { color: '#B63B3B', fontWeight: '800', fontSize: 11 },
  disabledBtn: { opacity: 0.45 },
  selfNote: { color: '#8A8175', fontSize: 11, marginTop: 8, fontWeight: '700' },
  emptyWrap: { flex: 1, backgroundColor: '#FBFAF7', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#1B1B1B', fontFamily: 'Georgia', fontSize: 24, fontWeight: '700' },
  homeBtn: { marginTop: 14, backgroundColor: '#BFA46A', borderRadius: 12, padding: 14 },
  homeBtnText: { color: '#FFFFFF', fontWeight: '800' },
});
