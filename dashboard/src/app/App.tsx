import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <CurrencyProvider>
          <RouterProvider router={router} />
          <Toaster position="top-center" richColors closeButton />
        </CurrencyProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}