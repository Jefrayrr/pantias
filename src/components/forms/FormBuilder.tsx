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
  
  const initialFormState = {
    name: '',
    description: '',
    questions: []
  };
  
  const [formData, setFormData] = useState(initialFormState);
  
  useEffect(() => {
    if (id) {
      loadForm(id);
    } else {
      // Reset form when creating a new one
      setFormData(initialFormState);
    }
  }, [id]);
  
  useEffect(() => {
    if (currentForm && id) {
      setFormData({
        name: currentForm.name,
        description: currentForm.description,
        questions: currentForm.questions
      });
    }
  }, [currentForm, id]);
  
  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: uuidv4(),
      text: '',
      type: 'text' as QuestionType,
      required: false,
      includeInPowerBI: false
    };
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };
  
  const handleUpdateQuestion = (updatedQuestion: Question) => {
    // Ensure the question has a valid ID
    const questionWithValidId = {
      ...updatedQuestion,
      id: updatedQuestion.id || uuidv4()
    };
    
    setFormData(prev => {
      // If this is a new sub-question being added
      if (!prev.questions.find(q => q.id === questionWithValidId.id)) {
        return {
          ...prev,
          questions: [...prev.questions, questionWithValidId]
        };
      }
      
      // If this is an existing question being updated
      return {
        ...prev,
        questions: prev.questions.map(q => 
          q.id === questionWithValidId.id ? questionWithValidId : q
        )
      };
    });
  };
  
  const handleDeleteQuestion = (questionId: string) => {
    setFormData(prev => {
      const questionsToDelete = new Set<string>();
      
      // Find the question and all its sub-questions recursively
      const findQuestionsToDelete = (qId: string) => {
        questionsToDelete.add(qId);
        prev.questions.forEach(q => {
          if (q.parentId === qId) {
            findQuestionsToDelete(q.id);
          }
        });
      };
      
      findQuestionsToDelete(questionId);
      
      return {
        ...prev,
        questions: prev.questions.filter(q => !questionsToDelete.has(q.id))
      };
    });
  };
  
  const handleMoveQuestionUp = (index: number) => {
    if (index === 0) return;
    
    setFormData(prev => {
      const updatedQuestions = [...prev.questions];
      [updatedQuestions[index], updatedQuestions[index - 1]] = 
        [updatedQuestions[index - 1], updatedQuestions[index]];
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  const handleMoveQuestionDown = (index: number) => {
    setFormData(prev => {
      if (index === prev.questions.length - 1) return prev;
      
      const updatedQuestions = [...prev.questions];
      [updatedQuestions[index], updatedQuestions[index + 1]] = 
        [updatedQuestions[index + 1], updatedQuestions[index]];
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  const handleSaveForm = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre del formulario es obligatorio');
      return;
    }

    // If we're editing and the form hasn't loaded yet, show an error
    if (id && !currentForm) {
      toast.error('Error al cargar el formulario. Por favor, intente nuevamente.');
      return;
    }
    
    try {
      // First ensure all questions have valid IDs, then filter out empty ones
      const validQuestions = formData.questions
        .map(q => ({
          ...q,
          id: q.id || uuidv4() // Ensure each question has a valid ID
        }))
        .filter(q => q.text.trim() !== '');
      
      const formToSave = {
        ...formData,
        questions: validQuestions,
        id: id || uuidv4() // Ensure form has a valid ID whether new or existing
      };
      
      const savedId = await saveForm(formToSave);
      toast.success('Formulario guardado correctamente');
      
      // Reset form data if creating a new form
      if (!id) {
        setFormData(initialFormState);
      }
      
      navigate(`/vista-previa/${savedId}`);
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Error al guardar el formulario');
    }
  };
  
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
          {id ? `Editar: ${formData.name}` : 'Crear Formulario'}
        </h1>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Formulario <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Nombre del formulario"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Descripción del formulario"
                rows={3}
              />
            </div>
          </div>
          
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Preguntas</h2>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <span className="mr-1">+</span> Agregar Pregunta
              </button>
            </div>
            
            {mainQuestions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No hay preguntas en este formulario</p>
                <p className="text-sm text-gray-400 mt-2">Haz clic en "Agregar Pregunta" para comenzar</p>
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
          
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveForm}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="sm" /> : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
