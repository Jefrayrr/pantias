// Tipos de pregunta disponibles
export type QuestionType = 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean';

// Opción para preguntas de selección
export interface Option {
  id: string;
  text: string;
  subQuestions?: Question[]; // Preguntas anidadas que dependen de esta opción
}

// Estructura de una pregunta
export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: Option[]; // Para select y multiselect
  includeInPowerBI: boolean;
  powerBIFieldName?: string;
  parentId?: string; // ID de la pregunta padre (si es una subpregunta)
  parentOptionId?: string; // ID de la opción padre (si es una subpregunta)
}

// Estructura de un formulario
export interface Form {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  createdAt: number;
  updatedAt: number;
  version: number;
}

// Respuesta a una pregunta individual
export interface QuestionResponse {
  questionId: string;
  value: string | string[] | number | boolean | null;
}

// Respuesta completa a un formulario
export interface FormResponse {
  id: string;
  formId: string;
  formVersion: number;
  responses: QuestionResponse[];
  createdAt: number;
  updatedOffline: boolean;
}

// Estado del contexto para gestión de formularios
export interface FormContextState {
  forms: Form[];
  currentForm: Form | null;
  responses: Record<string, FormResponse[]>;
  isLoading: boolean;
  error: string | null;
}