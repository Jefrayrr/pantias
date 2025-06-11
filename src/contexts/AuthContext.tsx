import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, UserRole, AuthContextState } from '../types';
import toast from 'react-hot-toast';

// ======================
// CONFIGURACIÓN DE API
// ======================

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost/api';

// ======================
// TIPOS Y CONFIGURACIONES
// ======================

/**
 * Tipos de acciones para el reducer de autenticación
 */
type AuthAction = 
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

/**
 * Estado inicial del contexto de autenticación
 */
const initialState: AuthContextState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

/**
 * Interfaz del contexto de autenticación
 */
interface AuthContextProps extends AuthContextState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, password: string, role?: UserRole) => Promise<void>;
}

// ======================
// CONTEXTO Y REDUCER
// ======================

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

/**
 * Reducer para manejar el estado de autenticación
 */
const authReducer = (state: AuthContextState, action: AuthAction): AuthContextState => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        error: null
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        error: null
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    default:
      return state;
  }
};

// ======================
// HOOK PERSONALIZADO
// ======================

/**
 * Hook personalizado para acceder al contexto de autenticación
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ======================
// PROVIDER PRINCIPAL
// ======================

/**
 * Proveedor del contexto de autenticación
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ======================
  // EFECTOS SECUNDARIOS
  // ======================

  /**
   * Efecto para verificar autenticación al cargar la aplicación
   */
  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } catch (error) {
        localStorage.removeItem('user_data');
        console.error('Invalid user data:', error);
      }
    }
  }, []);

  // ======================
  // FUNCIONES PRINCIPALES
  // ======================

  /**
   * Función para iniciar sesión
   * @param username - Nombre de usuario
   * @param password - Contraseña
   */
  const login = async (username: string, password: string) => {
    try {
      // Validación básica
      if (!username.trim() || !password.trim()) {
        throw new Error('Usuario y contraseña son requeridos');
      }

      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Credenciales inválidas');
      }

      const { user } = await response.json();
      
      // Store user data in localStorage
      localStorage.setItem('user_data', JSON.stringify(user));
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      
      toast.success(`Bienvenido ${user.username}`);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(error.message || 'Error al iniciar sesión');
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Función para cerrar sesión
   */
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    
    localStorage.removeItem('user_data');
    dispatch({ type: 'LOGOUT' });
    toast.success('Sesión cerrada correctamente');
  };

  /**
   * Función para registrar nuevo usuario
   * @param username - Nombre de usuario
   * @param password - Contraseña
   * @param role - Rol del usuario (opcional, default 'user')
   */
  const register = async (username: string, password: string, role: UserRole = 'user') => {
    try {
      console.log('🔄 Iniciando proceso de registro...');
      dispatch({ type: 'SET_LOADING', payload: true });

      const payload = { username, password, role };
      console.log('📦 Enviando datos al backend:', payload);

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify(payload)
      });

      console.log(`📡 Solicitud enviada a: ${API_BASE}/auth/register`);
      console.log('📨 Esperando respuesta del backend...');

      const data = await response.json();
      console.log('✅ Respuesta recibida del backend:', data);

      if (!response.ok) {
        console.error('❌ Error en el registro:', data.message);
        throw new Error(data.message || 'Registration failed');
      }

      const user = data.user;
      console.log('👤 Usuario registrado:', user);

      // Store user data in localStorage
      localStorage.setItem('user_data', JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: user
      });

      console.log('💾 Datos de usuario guardados en localStorage');
      toast.success('Registration successful');
    } catch (error: any) {
      console.error('🚨 Error durante el registro:', error.message);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      console.log('✅ Registro completado (o fallido). Estado actualizado');
    }
  };

  // ======================
  // RENDERIZADO
  // ======================

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      register
    }}>
      {children}
    </AuthContext.Provider>
  );
};