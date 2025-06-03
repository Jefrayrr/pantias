import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, UserRole, AuthContextState } from '../types';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

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
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const decoded = jwtDecode<User>(token);
        dispatch({ type: 'LOGIN_SUCCESS', payload: decoded });
      } catch (error) {
        localStorage.removeItem('auth_token');
        console.error('Token inválido:', error);
        toast.error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
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
      
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Credenciales inválidas');
      }

      const { token } = await response.json();
      localStorage.setItem('auth_token', token);
      
      const decoded = jwtDecode<User>(token);
      dispatch({ type: 'LOGIN_SUCCESS', payload: decoded });
      
      toast.success(`Bienvenido ${decoded.username}`);
    } catch (error) {
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
  const logout = () => {
    localStorage.removeItem('auth_token');
    dispatch({ type: 'LOGOUT' });
    toast.success('Sesión cerrada correctamente');
  };

  /**
   * Función para registrar nuevo usuario
   * @param username - Nombre de usuario
   * @param password - Contraseña
   * @param role - Rol del usuario (opcional, default 'user')
   */
  const register = async (username: string, password: string, role: UserRole) => {
  try {
    console.log('🔄 Iniciando proceso de registro...');
    dispatch({ type: 'SET_LOADING', payload: true });

    const payload = { username, password, role };
    console.log('📦 Enviando datos al backend:', payload);

    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('📡 Solicitud enviada a: http://localhost:3000/api/auth/register');
    console.log('📨 Esperando respuesta del backend...');

    const data = await response.json();
    console.log('✅ Respuesta recibida del backend:', data);

    if (!response.ok) {
      console.error('❌ Error en el registro:', data.message);
      throw new Error(data.message || 'Registration failed');
    }

    const token = data.token;
    console.log('🔐 Token recibido:', token);

    const payloadDecoded = JSON.parse(atob(token.split('.')[1]));
    console.log('🧾 Payload decodificado del token:', payloadDecoded);

    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: {
        id: payloadDecoded.id,
        username: payloadDecoded.username,
        role: payloadDecoded.role
      }
    });

    localStorage.setItem('authToken', token);
    console.log('💾 Token guardado en localStorage');
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