import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n${message}`);
    } else {
        Alert.alert(title, message);
    }
};

export default function RegisterScreen({ navigation }) {
    const { register } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password) {
            return showAlert('Error', 'All fields are required');
        }

        try {
            setLoading(true);
            await register(name, email, password);
        } catch (e) {
            showAlert('Register Failed', e.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Create Account 🛍️</Text>
                <Text style={styles.subtitle}>Join and start shopping</Text>
            </View>

            {/* Form */}
            <View style={styles.card}>
                <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={handleRegister}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.registerTextBtn}>Register</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.loginText}>
                        Already have an account? <Text style={styles.loginLink}>Login</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },

    header: {
        backgroundColor: '#1a1a1a',
        padding: 24,
        paddingTop: 80,
    },
    title: { color: '#fff', fontSize: 24, fontWeight: '800' },
    subtitle: { color: '#aaa', marginTop: 6, fontSize: 14 },

    card: {
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 16,
        padding: 18,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },

    input: {
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        color: '#1a1a1a',
    },

    registerBtn: {
        backgroundColor: '#e63946',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 4,
    },
    registerTextBtn: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },

    loginText: {
        textAlign: 'center',
        marginTop: 14,
        color: '#666',
        fontSize: 13,
    },
    loginLink: {
        color: '#1a1a1a',
        fontWeight: '700',
    },
});
