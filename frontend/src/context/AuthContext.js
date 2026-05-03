import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // ─── LOAD USER FROM STORAGE ───
    const loadUser = async () => {
        try {
            const data = await AsyncStorage.getItem('userData');
            if (data) {
                setUser(JSON.parse(data));
            } else {
                setUser(null);
            }
        } catch (e) {
            console.log('Load user error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    // ─── LOGIN ───
    const login = async (email, password) => {
        const res = await loginUser(email, password);

        if (!res?.token) throw new Error(res?.message || 'Login failed');

        await AsyncStorage.setItem('userData', JSON.stringify(res));
        await AsyncStorage.setItem('userToken', res.token);

        setUser(res);
        return res;
    };

    // ─── REGISTER ───
    const register = async (name, email, password) => {
        const res = await registerUser(name, email, password);

        if (!res?.token) throw new Error(res?.message || 'Register failed');

        await AsyncStorage.setItem('userData', JSON.stringify(res));
        await AsyncStorage.setItem('userToken', res.token);

        setUser(res);
        return res;
    };

    // ─── LOGOUT ───
    const logout = async () => {
        try {
            await AsyncStorage.removeItem('userData');
            await AsyncStorage.removeItem('userToken');
            setUser(null);
        } catch (e) {
            console.log('Logout error:', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);