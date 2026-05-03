import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import AppNavigator from '../src/navigation/AppNavigator';

export default function RootLayout() {
    return (
        <AuthProvider>
            <CartProvider>
                <AppNavigator />
            </CartProvider>
        </AuthProvider>
    );
}