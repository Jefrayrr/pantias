import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDatabase } from './DatabaseContext';
import { Form, FormResponse, FormContextState } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// Acciones
type FormAction = 
  | { type: 'SET_FORMS'; payload: Form[] }
  | { type: 'SET_CURRENT_FORM'; payload: Form | null }
  | { type: 'SET_RESPONSES'; payload: { formId: string, responses: FormResponse[] } }
  | { type: 'ADD_FORM'; payload: Form }
  | { type: 'UPDATE_FORM'; payload: Form }
  | { type: 'DELETE_FORM'; payload: string }
  | { type: 'ADD_RESPONSE'; payload: FormResponse }
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

// Reducer
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
  const { db, isLoading: dbLoading } = useDatabase();
  const { t } = useTranslation();

  // Cargar formularios cuando la base de datos esté lista
  useEffect(() => {
    if (db && !dbLoading) {
      loadForms();
    }
  }, [db, dbLoading]);

  // Cargar todos los formularios
  const loadForms = async () => {
    if (!db) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const forms = await db.getAll('forms');
      dispatch({ type: 'SET_FORMS', payload: forms });
    } catch (error) {
      console.error('Error loading forms:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al cargar los formularios' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Cargar un formulario específico
  const loadForm = async (id: string) => {
    if (!db) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const form = await db.get('forms', id);
      dispatch({ type: 'SET_CURRENT_FORM', payload: form || null });
    } catch (error) {
      console.error('Error loading form:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al cargar el formulario' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Cargar respuestas de un formulario
  const loadResponses = async (formId: string) => {
    if (!db) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const index = db.transaction('responses').store.index('by-form-id');
      const responses = await index.getAll(formId);
      dispatch({ type: 'SET_RESPONSES', payload: { formId, responses } });
    } catch (error) {
      console.error('Error loading responses:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al cargar las respuestas' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Guardar formulario (crear o actualizar)
  const saveForm = async (formData: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { id?: string }) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const now = Date.now();
      let form: Form;
      
      if (formData.id) {
        // Actualizar formulario existente
        const existingForm = await db.get('forms', formData.id);
        if (!existingForm) throw new Error('Form not found');
        
        form = {
          ...existingForm,
          ...formData,
          updatedAt: now,
          version: existingForm.version + 1
        };
      } else {
        // Crear nuevo formulario
        form = {
          id: uuidv4(),
          ...formData,
          createdAt: now,
          updatedAt: now,
          version: 1
        };
      }
      
      await db.put('forms', form);
      
      if (formData.id) {
        dispatch({ type: 'UPDATE_FORM', payload: form });
      } else {
        dispatch({ type: 'ADD_FORM', payload: form });
      }
      
      dispatch({ type: 'SET_CURRENT_FORM', payload: form });
      toast.success(t('form_saved'));
      
      return form.id;
    } catch (error) {
      console.error('Error saving form:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al guardar el formulario' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Eliminar formulario
  const deleteForm = async (id: string) => {
    if (!db) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await db.delete('forms', id);
      
      // También eliminar todas las respuestas asociadas
      const index = db.transaction('responses', 'readwrite').store.index('by-form-id');
      let cursor = await index.openCursor(id);
      
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      
      dispatch({ type: 'DELETE_FORM', payload: id });
      toast.success(t('form_deleted'));
    } catch (error) {
      console.error('Error deleting form:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al eliminar el formulario' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Guardar respuesta a un formulario
  const saveResponse = async (responseData: Omit<FormResponse, 'id' | 'createdAt'>) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response: FormResponse = {
        id: uuidv4(),
        ...responseData,
        createdAt: Date.now()
      };
      
      await db.put('responses', response);
      dispatch({ type: 'ADD_RESPONSE', payload: response });
      
      return response.id;
    } catch (error) {
      console.error('Error saving response:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al guardar la respuesta' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Importar formularios (desde archivo)
  const importForms = async (formsData: Form[]) => {
    if (!db) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const tx = db.transaction('forms', 'readwrite');
      
      for (const form of formsData) {
        await tx.store.put(form);
      }
      
      await tx.done;
      await loadForms();
      toast.success(t('import_success'));
    } catch (error) {
      console.error('Error importing forms:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al importar los formularios' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Importar respuestas (desde archivo)
  const importResponses = async (responsesData: FormResponse[]) => {
    if (!db) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const tx = db.transaction('responses', 'readwrite');
      
      for (const response of responsesData) {
        await tx.store.put(response);
      }
      
      await tx.done;
      
      // Actualizar el estado para cada formulario afectado
      const formIds = new Set(responsesData.map(r => r.formId));
      for (const formId of formIds) {
        await loadResponses(formId);
      }
      
      toast.success(t('import_success'));
    } catch (error) {
      console.error('Error importing responses:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al importar las respuestas' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Exportar todos los formularios
  const exportForms = async () => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const forms = await db.getAll('forms');
      return forms;
    } catch (error) {
      console.error('Error exporting forms:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al exportar los formularios' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Exportar respuestas de un formulario
  const exportFormResponses = async (formId: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const index = db.transaction('responses').store.index('by-form-id');
      const responses = await index.getAll(formId);
      return responses;
    } catch (error) {
      console.error('Error exporting responses:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al exportar las respuestas' });
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
    importForms,
    importResponses,
    exportForms,
    exportFormResponses
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};