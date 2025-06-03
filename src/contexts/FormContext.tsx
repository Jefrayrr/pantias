import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Form, FormResponse, FormContextState } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

// Acciones
type FormAction = 
  | { type: 'SET_FORMS'; payload: Form[] }
  | { type: 'SET_CURRENT_FORM'; payload: Form | null }
  | { type: 'SET_RESPONSES'; payload: { formId: string, responses: FormResponse[] } }
  | { type: 'ADD_FORM'; payload: Form }
  | { type: 'UPDATE_FORM'; payload: Form }
  | { type: 'DELETE_FORM'; payload: string }
  | { type: 'ADD_RESPONSE'; payload: FormResponse }
  | { type: 'DELETE_RESPONSE'; payload: { formId: string, responseId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Estado inicial
const initialState: FormContextState = {
  forms: [],
  currentForm: null,
  responses: {},
  isLoading: false,
  error: null
};

// Reducer (se mantiene igual ya que solo maneja el estado local)
const formReducer = (state: FormContextState, action: FormAction): FormContextState => {
  switch (action.type) {
    case 'SET_FORMS':
      return { ...state, forms: action.payload };
    case 'SET_CURRENT_FORM':
      return { ...state, currentForm: action.payload };
    case 'SET_RESPONSES':
      return { 
        ...state, 
        responses: { 
          ...state.responses, 
          [action.payload.formId]: action.payload.responses 
        } 
      };
    case 'ADD_FORM':
      return { ...state, forms: [...state.forms, action.payload] };
    case 'UPDATE_FORM':
      return { 
        ...state, 
        forms: state.forms.map(form => 
          form.id === action.payload.id ? action.payload : form
        ),
        currentForm: state.currentForm?.id === action.payload.id 
          ? action.payload 
          : state.currentForm
      };
    case 'DELETE_FORM':
      return { 
        ...state, 
        forms: state.forms.filter(form => form.id !== action.payload),
        currentForm: state.currentForm?.id === action.payload ? null : state.currentForm
      };
    case 'ADD_RESPONSE':
      const existingResponses = state.responses[action.payload.formId] || [];
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.formId]: [...existingResponses, action.payload]
        }
      };
    case 'DELETE_RESPONSE':
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.formId]: state.responses[action.payload.formId]?.filter(
            response => response.id !== action.payload.responseId
          ) || []
        }
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

// Contexto
interface FormContextProps extends FormContextState {
  loadForms: () => Promise<void>;
  loadForm: (id: string) => Promise<void>;
  loadResponses: (formId: string) => Promise<void>;
  saveForm: (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { id?: string }) => Promise<string>;
  deleteForm: (id: string) => Promise<void>;
  saveResponse: (response: Omit<FormResponse, 'id' | 'createdAt'>) => Promise<string>;
  deleteResponse: (formId: string, responseId: string) => Promise<void>;
  importForms: (formsData: Form[]) => Promise<void>;
  importResponses: (responsesData: FormResponse[]) => Promise<void>;
  exportForms: () => Promise<Form[]>;
  exportFormResponses: (formId: string) => Promise<FormResponse[]>;
}

const FormContext = createContext<FormContextProps | undefined>(undefined);

export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};

export const FormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(formReducer, initialState);
  const { user } = useAuth();
  const { t } = useTranslation();
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3000/api';

  // Cargar formularios al iniciar
  useEffect(() => {
    if (user) {
      loadForms();
    }
  }, [user]);

  /**
   * Carga todos los formularios desde PostgreSQL
   */
  const loadForms = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar formularios');
      }
      
      const forms = await response.json();
      dispatch({ type: 'SET_FORMS', payload: forms });
    } catch (error) {
      console.error('Error loading forms:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_loading_forms'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Carga un formulario específico por ID
   */
  const loadForm = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Formulario no encontrado');
      }
      
      const form = await response.json();
      dispatch({ type: 'SET_CURRENT_FORM', payload: form });
    } catch (error) {
      console.error('Error loading form:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_loading_form'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Carga las respuestas de un formulario específico
   */
  const loadResponses = async (formId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${formId}/responses`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar respuestas');
      }
      
      const responses = await response.json();
      dispatch({ type: 'SET_RESPONSES', payload: { formId, responses } });
    } catch (error) {
      console.error('Error loading responses:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_loading_responses'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Guarda o actualiza un formulario en PostgreSQL
   */
  const saveForm = async (
    formData: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { id?: string }
  ) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      let url = `${API_BASE}/forms`;
      let method = 'POST';
      
      if (formData.id) {
        url += `/${formData.id}`;
        method = 'PUT';
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el formulario');
      }
      
      const savedForm = await response.json();
      
      if (formData.id) {
        dispatch({ type: 'UPDATE_FORM', payload: savedForm });
      } else {
        dispatch({ type: 'ADD_FORM', payload: savedForm });
      }
      
      dispatch({ type: 'SET_CURRENT_FORM', payload: savedForm });
      toast.success(t('form_saved'));
      
      return savedForm.id;
    } catch (error) {
      console.error('Error saving form:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_saving_form'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Elimina un formulario de PostgreSQL
   */
  const deleteForm = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar el formulario');
      }
      
      dispatch({ type: 'DELETE_FORM', payload: id });
      toast.success(t('form_deleted'));
    } catch (error) {
      console.error('Error deleting form:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_deleting_form'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Guarda una respuesta en PostgreSQL
   */
  const saveResponse = async (responseData: Omit<FormResponse, 'id' | 'createdAt'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const responseToSave = {
        ...responseData,
        id: uuidv4(),
        createdAt: new Date().toISOString()
      };
      
      const response = await fetch(`${API_BASE}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(responseToSave)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la respuesta');
      }
      
      const savedResponse = await response.json();
      dispatch({ type: 'ADD_RESPONSE', payload: savedResponse });
      
      return savedResponse.id;
    } catch (error) {
      console.error('Error saving response:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_saving_response'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Elimina una respuesta de PostgreSQL
   */
  const deleteResponse = async (formId: string, responseId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/responses/${responseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar la respuesta');
      }
      
      dispatch({ type: 'DELETE_RESPONSE', payload: { formId, responseId } });
      toast.success(t('response_deleted'));
    } catch (error) {
      console.error('Error deleting response:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_deleting_response'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Importa múltiples formularios a PostgreSQL
   */
  const importForms = async (formsData: Form[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formsData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al importar formularios');
      }
      
      await loadForms();
      toast.success(t('import_success'));
    } catch (error) {
      console.error('Error importing forms:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_importing_forms'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Importa múltiples respuestas a PostgreSQL
   */
  const importResponses = async (responsesData: FormResponse[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/responses/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(responsesData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al importar respuestas');
      }
      
      // Recargar respuestas para los formularios afectados
      const formIds = new Set(responsesData.map(r => r.formId));
      for (const formId of formIds) {
        await loadResponses(formId);
      }
      
      toast.success(t('import_success'));
    } catch (error) {
      console.error('Error importing responses:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_importing_responses'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Exporta formularios desde PostgreSQL
   */
  const exportForms = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al exportar formularios');
      }
      
      const forms = await response.json();
      return forms;
    } catch (error) {
      console.error('Error exporting forms:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_exporting_forms'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Exporta respuestas de un formulario específico desde PostgreSQL
   */
  const exportFormResponses = async (formId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${formId}/responses/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al exportar respuestas');
      }
      
      const responses = await response.json();
      return responses;
    } catch (error) {
      console.error('Error exporting responses:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_exporting_responses'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const value = {
    ...state,
    loadForms,
    loadForm,
    loadResponses,
    saveForm,
    deleteForm,
    saveResponse,
    deleteResponse,
    importForms,
    importResponses,
    exportForms,
    exportFormResponses
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};