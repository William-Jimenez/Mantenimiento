import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/Layout';
import { LoginScreen } from './screens/LoginScreen';
import { ChangePasswordScreen } from './screens/ChangePasswordScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { NewRequestScreen } from './screens/NewRequestScreen';
import { RequestsListScreen } from './screens/RequestsListScreen';
import { RequestDetailScreen } from './screens/RequestDetailScreen';
import {
  EmployeeFormScreen,
  EmployeesListScreen,
} from './screens/EmployeesScreens';
import { UsersScreen } from './screens/UsersScreen';
import {
  ResourceFormScreen,
  ResourcesListScreen,
} from './screens/ResourcesScreens';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { ErrorScreen } from './screens/ErrorScreen';
import { tienePermisoRuta } from './services/domainRules';

function RouterView() {
  const { pathname, currentUser } = useApp();

  // P-01: Anonymous login screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // P-02: Mandatory temporary password change
  if (currentUser.debeCambiarPassword) {
    return <ChangePasswordScreen />;
  }

  // Authenticated routes inside AppLayout with central RBAC guard
  const renderScreen = () => {
    if (pathname === '/error') {
      return <ErrorScreen tipo="sin-permiso" />;
    }

    if (!tienePermisoRuta(currentUser, pathname)) {
      return <ErrorScreen tipo="sin-permiso" />;
    }

    if (pathname === '/' || pathname === '') {
      return <DashboardScreen />; // P-03
    }
    if (pathname === '/solicitudes/nueva') {
      return <NewRequestScreen />; // P-04
    }
    if (pathname === '/solicitudes' || pathname === '/tecnico' || pathname === '/tecnico/solicitudes') {
      return <RequestsListScreen />; // P-05
    }
    const solMatch = pathname.match(/^\/solicitudes\/(\d+)$/);
    if (solMatch) {
      return <RequestDetailScreen solicitudId={Number(solMatch[1])} />; // P-06 (+ P-07, P-08, P-09)
    }

    if (pathname === '/admin/empleados') {
      return <EmployeesListScreen />; // P-10
    }
    if (pathname === '/admin/empleados/nuevo') {
      return <EmployeeFormScreen />; // P-11
    }
    const empMatch = pathname.match(/^\/admin\/empleados\/(\d+)$/);
    if (empMatch) {
      return <EmployeeFormScreen empleadoId={Number(empMatch[1])} />; // P-11
    }

    if (pathname === '/admin/usuarios') {
      return <UsersScreen />; // P-12
    }

    if (pathname === '/admin/recursos') {
      return <ResourcesListScreen />; // P-13
    }
    if (pathname === '/admin/recursos/nuevo') {
      return <ResourceFormScreen />; // P-14
    }
    const recMatch = pathname.match(/^\/admin\/recursos\/(\d+)$/);
    if (recMatch) {
      return <ResourceFormScreen recursoId={Number(recMatch[1])} />; // P-14
    }

    if (pathname === '/admin/categorias') {
      return <CategoriesScreen />; // P-15
    }

    return <ErrorScreen tipo="no-encontrado" />; // P-16
  };

  return <AppLayout>{renderScreen()}</AppLayout>;
}

export default function App() {
  return (
    <AppProvider>
      <RouterView />
    </AppProvider>
  );
}
