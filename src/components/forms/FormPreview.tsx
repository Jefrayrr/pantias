import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from '../../contexts/FormContext';
import { FormResponse, QuestionResponse, Question } from '../../types';
import Spinner from '../ui/Spinner';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Download } from 'lucide-react';
import { exportToExcel } from '../../utils/excelUtils';

const FormPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { loadForm, currentForm, saveResponse, isLoading } = useForm();
  
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    if (id) {
      loadForm(id);
    }
  }, [id]);
  
  // Filtrar las preguntas que deben mostrarse según las respuestas actuales
  const getVisibleQuestions = () => {
    if (!currentForm) return [];
    
    return currentForm.questions.filter(question => {
      // Si no es una subpregunta, siempre es visible
      if (!question.parentId) {
        return true;
      }
      
      // Es una subpregunta, buscar la pregunta padre
      const parentQuestion = currentForm.questions.find(q => q.id === question.parentId);
      if (!parentQuestion) return false;
      
      // Si la pregunta padre no es de tipo selección, no mostrar subpreguntas
      if (!['select', 'multiselect'].includes(parentQuestion.type)) {
        return false;
      }
      
      // Obtener la respuesta actual para la pregunta padre
      const parentResponse = responses[parentQuestion.id];
      
      // Para preguntas de selección única
      if (parentQuestion.type === 'select') {
        return parentResponse === question.parentOptionId;
      }
      
      // Para preguntas de selección múltiple
      if (parentQuestion.type === 'multiselect') {
        return Array.isArray(parentResponse) && parentResponse.includes(question.parentOptionId);
      }
      
      return false;
    });
  };
  
  const handleInputChange = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
    
    // Limpiar error si existe
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const visibleQuestions = getVisibleQuestions();
    
    visibleQuestions.forEach(question => {
      if (question.required) {
        const value = responses[question.id];
        
        if (value === undefined || value === null || value === '') {
          newErrors[question.id] = 'Este campo es obligatorio';
        }
        
        if (Array.isArray(value) && value.length === 0) {
          newErrors[question.id] = 'Selecciona al menos una opción';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!currentForm || !id) return;
    
    if (!validateForm()) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Convertir las respuestas al formato esperado
      const questionResponses: QuestionResponse[] = Object.entries(responses).map(([questionId, value]) => ({
        questionId,
        value
      }));
      
      const formResponse: Omit<FormResponse, 'id' | 'createdAt'> = {
        formId: id,
        formVersion: currentForm.version,
        responses: questionResponses,
        updatedOffline: false
      };
      
      await saveResponse(formResponse);
      toast.success('Respuestas guardadas correctamente');
      navigate('/');
    } catch (error) {
      console.error('Error saving response:', error);
      toast.error('Error al guardar las respuestas');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleExportBlank = async () => {
    if (!currentForm) return;
    
    try {
      const excelData = {
        form: currentForm,
        responses: {}
      };
      
      await exportToExcel([excelData], `formulario_${currentForm.name.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
      toast.success('Formulario exportado correctamente');
    } catch (error) {
      console.error('Error exporting form:', error);
      toast.error('Error al exportar el formulario');
    }
  };
  
  // Renderizar los componentes de entrada según el tipo de pregunta
  const renderQuestionInput = (question: Question) => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors[question.id] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value ? parseFloat(e.target.value) : '')}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors[question.id] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
        
      case 'date':
        return (
          <input
            type="date"
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors[question.id] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
        
      case 'boolean':
        return (
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={responses[question.id] === true}
                onChange={() => handleInputChange(question.id, true)}
                className="h-5 w-5 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2">Sí</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={responses[question.id] === false}
                onChange={() => handleInputChange(question.id, false)}
                className="h-5 w-5 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2">No</span>
            </label>
          </div>
        );
        
      case 'select':
        return (
          <select
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors[question.id] ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar...</option>
            {question.options?.map(option => (
              <option key={option.id} value={option.id}>
                {option.text}
              </option>
            ))}
          </select>
        );
        
      case 'multiselect':
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <label key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(responses[question.id] || []).includes(option.id)}
                  onChange={(e) => {
                    const currentValues = responses[question.id] || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.id]
                      : currentValues.filter((id: string) => id !== option.id);
                    handleInputChange(question.id, newValues);
                  }}
                  className="h-5 w-5 text-green-600 focus:ring-green-500 rounded"
                />
                <span className="ml-2">{option.text}</span>
              </label>
            ))}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  if (isLoading || !currentForm) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft size={16} className="mr-1" /> Volver
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{currentForm.name}</h1>
            {currentForm.description && (
              <p className="text-gray-600 mt-2">{currentForm.description}</p>
            )}
          </div>
          
          <button
            type="button"
            onClick={handleExportBlank}
            className="mt-4 md:mt-0 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center"
          >
            <Download size={16} className="mr-2" /> Exportar para completar sin conexión
          </button>
        </div>
        
        <div className="space-y-8 mt-8">
          {getVisibleQuestions().map((question) => (
            <div key={question.id} className="border-b border-gray-200 pb-6">
              <div className="mb-2 flex items-start">
                <label className="block text-gray-800 font-medium">
                  {question.text}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>
              
              <div className="mt-2">
                {renderQuestionInput(question)}
                {errors[question.id] && (
                  <p className="mt-1 text-sm text-red-500">{errors[question.id]}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-8">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
          >
            {submitting ? (
              <Spinner size="sm" color="white" />
            ) : (
              <>
                <Save size={16} className="mr-2" /> Guardar Respuestas
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormPreview;