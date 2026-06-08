import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/src/modules/shared/contexts/AuthContext';
import { AlertProvider } from '@/src/modules/shared/contexts/AlertContext';
import { ConfirmProvider } from '@/src/modules/shared/contexts/ConfirmContext';
import AppRoutes from '@/src/routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AlertProvider>
        <ConfirmProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ConfirmProvider>
      </AlertProvider>
    </BrowserRouter>
  );
}


