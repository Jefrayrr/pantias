import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from '../../contexts/FormContext';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Question, QuestionType, Form } from '../../types';
import QuestionEditor from './QuestionEditor';
import Spinner from '../ui/Spinner';
import toast from 'react-hot-toast';

const FormBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadForm, saveForm, currentForm, isLoading } = useForm();
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    questions: Question[];
  }>({
    name: '',
    description: '',
    questions: []
  });
  
  // Cargar formulario existente si estamos editando
  useEffect(() => {
    if (id) {
      loadForm(id);
    }
  }, [id]);
  
  // Actualizar estado local cuando se carga el formulario
  useEffect(() => {
    if (currentForm) {
      setFormData({
        name: currentForm.name,
        description: currentForm.description,
        questions: currentForm.questions
      });
    }
  }, [currentForm]);
  
  // Agregar nueva pregunta
  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: uuidv4(),
      text: '',
      type: 'text' as QuestionType,
      required: false,
      includeInPowerBI: false
    };
    
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };
  
  // Actualizar pregunta existente
  const handleUpdateQuestion = (updatedQuestion: Question) => {
    setFormData({
      ...formData,
      questions: formData.questions.map(q => 
        q.id === updatedQuestion.id ? updatedQuestion : q
      )
    });
  };
  
  // Eliminar pregunta
  const handleDeleteQuestion = (questionId: string) => {
    // Encontrar todas las subpreguntas relacionadas para eliminarlas también
    const getAllSubQuestionIds = (qId: string): string[] => {
      const subQuestions: string[] = [];
      
      // Buscar en todas las preguntas
      formData.questions.forEach(q => {
        // Si esta pregunta es una subpregunta de la pregunta que queremos eliminar
        if (q.parentId === qId) {
          subQuestions.push(q.id);
          // Recursivamente buscar subpreguntas de esta subpregunta
          subQuestions.push(...getAllSubQuestionIds(q.id));
        }
        
        // Buscar en las opciones si es una pregunta de selección
        if (q.options) {
          q.options.forEach(opt => {
            // Si alguna opción tiene subpreguntas que dependen de la pregunta a eliminar
            if (opt.subQuestions) {
              opt.subQuestions.forEach(subQ => {
                if (subQ.parentId === qId) {
                  subQuestions.push(subQ.id);
                  subQuestions.push(...getAllSubQuestionIds(subQ.id));
                }
              });
            }
          });
        }
      });
      
      return subQuestions;
    };
    
    const subQuestionIds = getAllSubQuestionIds(questionId);
    const allIdsToRemove = [questionId, ...subQuestionIds];
    
    setFormData({
      ...formData,
      questions: formData.questions.filter(q => !allIdsToRemove.includes(q.id))
    });
  };
  
  // Mover pregunta hacia arriba
  const handleMoveQuestionUp = (index: number) => {
    if (index === 0) return;
    
    const updatedQuestions = [...formData.questions];
    [updatedQuestions[index], updatedQuestions[index - 1]] = 
      [updatedQuestions[index - 1], updatedQuestions[index]];
    
    setFormData({
      ...formData,
      questions: updatedQuestions
    });
  };
  
  // Mover pregunta hacia abajo
  const handleMoveQuestionDown = (index: number) => {
    if (index === formData.questions.length - 1) return;
    
    const updatedQuestions = [...formData.questions];
    [updatedQuestions[index], updatedQuestions[index + 1]] = 
      [updatedQuestions[index + 1], updatedQuestions[index]];
    
    setFormData({
      ...formData,
      questions: updatedQuestions
    });
  };
  
  // Guardar formulario
  const handleSaveForm = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre del formulario es obligatorio');
      return;
    }
    
    try {
      // Filtrar preguntas sin texto
      const validQuestions = formData.questions.filter(q => q.text.trim() !== '');
      
      // Serializar los datos del formulario para asegurar tipos de datos válidos
      const formToSave = JSON.parse(JSON.stringify({
        ...formData,
        questions: validQuestions,
        id // Si id existe, estamos actualizando
      }));
      
      const savedId = await saveForm(formToSave);
      toast.success(t('form_saved'));
      
      // Redirigir a la vista previa
      navigate(`/vista-previa/${savedId}`);
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Error al guardar el formulario');
    }
  };
  
  // Obtener solo las preguntas principales (no subpreguntas)
  const mainQuestions = formData.questions.filter(q => !q.parentId);
  
  if (isLoading && id) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {id ? `${t('edit')}: ${formData.name}` : t('create_form')}
        </h1>
        
        <div className="space-y-6">
          {/* Información básica del formulario */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form_name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Nombre del formulario"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form_description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Descripción del formulario"
                rows={3}
              />
            </div>
          </div>
          
          {/* Lista de preguntas */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Preguntas</h2>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <span className="mr-1">+</span> {t('add_question')}
              </button>
            </div>
            
            {mainQuestions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No hay preguntas en este formulario</p>
                <p className="text-sm text-gray-400 mt-2">Haz clic en "Añadir Pregunta" para comenzar</p>
              </div>
            ) : (
              <div className="space-y-6">
                {mainQuestions.map((question, index) => (
                  <QuestionEditor
                    key={question.id}
                    question={question}
                    allQuestions={formData.questions}
                    onUpdate={handleUpdateQuestion}
                    onDelete={() => handleDeleteQuestion(question.id)}
                    onMoveUp={() => handleMoveQuestionUp(index)}
                    onMoveDown={() => handleMoveQuestionDown(index)}
                    canMoveUp={index > 0}
                    canMoveDown={index < mainQuestions.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSaveForm}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="sm" /> : t('save_form')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;