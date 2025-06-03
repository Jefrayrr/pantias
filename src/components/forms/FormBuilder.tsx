import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from '../../contexts/FormContext'; // Contexto para manejar formularios
import { useTranslation } from 'react-i18next'; // Internacionalización
import { v4 as uuidv4 } from 'uuid'; // Generador de IDs únicos
import { Question, QuestionType, Form } from '../../types'; // Tipos de datos
import QuestionEditor from './QuestionEditor'; // Componente para editar preguntas
import Spinner from '../ui/Spinner'; // Componente de carga
import toast from 'react-hot-toast'; // Notificaciones

const FormBuilder: React.FC = () => {
  // ======================
  // HOOKS Y ESTADO INICIAL
  // ======================
  const { id } = useParams<{ id: string }>(); // ID del formulario desde la URL
  const navigate = useNavigate(); // Navegación programática
  const { loadForm, saveForm, currentForm, isLoading } = useForm(); // Funciones del contexto
  const { t } = useTranslation(); // Función de traducción
  
  // Estado inicial del formulario
  const initialFormState = {
    name: '',
    description: '',
    questions: []
  };
  
  // Estado local del formulario
  const [formData, setFormData] = useState(initialFormState);

  // ======================
  // EFECTOS SECUNDARIOS
  // ======================

  // Carga el formulario cuando cambia el ID
  useEffect(() => {
    if (id) {
      loadForm(id); // Carga el formulario existente
    } else {
      setFormData(initialFormState); // Resetea para nuevo formulario
    }
  }, [id]);

  // Sincroniza el estado local cuando cambia el formulario cargado
  useEffect(() => {
    if (currentForm && id) {
      setFormData({
        name: currentForm.name,
        description: currentForm.description,
        questions: currentForm.questions
      });
    }
  }, [currentForm, id]);

  // ======================
  // MANEJO DE PREGUNTAS
  // ======================

  /**
   * Agrega una nueva pregunta al formulario
   */
  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: uuidv4(), // ID único
      text: '',
      type: 'text' as QuestionType, // Tipo por defecto
      required: false,
      includeInPowerBI: false
    };
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  /**
   * Actualiza una pregunta existente
   * @param updatedQuestion - Pregunta con los cambios
   */
  const handleUpdateQuestion = (updatedQuestion: Question) => {
    const questionWithValidId = {
      ...updatedQuestion,
      id: updatedQuestion.id || uuidv4() // Asegura un ID válido
    };
    
    setFormData(prev => {
      // Si es una pregunta nueva (sin ID en el array)
      if (!prev.questions.find(q => q.id === questionWithValidId.id)) {
        return {
          ...prev,
          questions: [...prev.questions, questionWithValidId]
        };
      }
      
      // Actualiza la pregunta existente
      return {
        ...prev,
        questions: prev.questions.map(q => 
          q.id === questionWithValidId.id ? questionWithValidId : q
        )
      };
    });
  };

  /**
   * Elimina una pregunta y sus subpreguntas
   * @param questionId - ID de la pregunta a eliminar
   */
  const handleDeleteQuestion = (questionId: string) => {
    setFormData(prev => {
      const questionsToDelete = new Set<string>(); // IDs de preguntas a eliminar
      
      // Función recursiva para encontrar todas las subpreguntas
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

  // ======================
  // REORGANIZACIÓN DE PREGUNTAS
  // ======================

  /**
   * Reorganiza las preguntas con IDs secuenciales manteniendo jerarquías
   * @param questions - Array de preguntas a reorganizar
   * @returns Array de preguntas reorganizadas
   */
  const reorganizeQuestions = (questions: Question[]): Question[] => {
    // Separa preguntas principales y secundarias
    const mainQuestions = questions.filter(q => !q.parentId);
    const subQuestions = questions.filter(q => q.parentId);
    
    // Mapa para agrupar subpreguntas por padre
    const questionsByParent = new Map<string, Question[]>();
    subQuestions.forEach(q => {
      if (!questionsByParent.has(q.parentId!)) {
        questionsByParent.set(q.parentId!, []);
      }
      questionsByParent.get(q.parentId!)!.push(q);
    });
    
    /**
     * Procesa una pregunta y su jerarquía completa
     * @param question - Pregunta principal
     * @returns Array con la pregunta y todas sus subpreguntas
     */
    const processQuestionHierarchy = (question: Question): Question[] => {
      const result: Question[] = [question];
      
      // Procesa subpreguntas de opciones (para preguntas condicionales)
      if (question.options) {
        question.options.forEach(option => {
          const optionSubQuestions = questionsByParent.get(question.id)?.filter(
            q => q.parentOptionId === option.id
          ) || [];
          
          optionSubQuestions.forEach(subQ => {
            result.push(...processQuestionHierarchy(subQ));
          });
        });
      }
      
      return result;
    };
    
    // Procesa todas las preguntas principales y sus jerarquías
    const organizedQuestions = mainQuestions.flatMap(q => processQuestionHierarchy(q));
    
    // Mapea IDs viejos a nuevos (para mantener referencias)
    const idMap = new Map<string, string>();
    
    // Asigna nuevos IDs secuenciales (q001, q002, etc.)
    return organizedQuestions.map((q, index) => {
      const oldId = q.id;
      const newId = `q${(index + 1).toString().padStart(3, '0')}`;
      idMap.set(oldId, newId);
      
      return {
        ...q,
        id: newId,
        parentId: q.parentId ? idMap.get(q.parentId) : undefined,
        parentOptionId: q.parentOptionId
      };
    });
  };

  // ======================
  // GUARDADO DEL FORMULARIO
  // ======================

  /**
   * Maneja el guardado del formulario
   */
  const handleSaveForm = async () => {
    // Validación del nombre
    if (!formData.name.trim()) {
      toast.error(t('El nombre del formulario es obligatorio'));
      return;
    }

    // Validación para edición
    if (id && !currentForm) {
      toast.error(t('El formulario no se encuentra'));
      navigate('/');
      return;
    }
    
    try {
      // Filtra preguntas vacías y asegura IDs válidos
      const validQuestions = formData.questions
        .filter(q => q.text.trim() !== '')
        .map(q => ({
          ...q,
          id: q.id || uuidv4()
        }));
      
      // Reorganiza preguntas
      const organizedQuestions = reorganizeQuestions(validQuestions);
      
      // Prepara el formulario para guardar
      const formToSave = {
        ...formData,
        questions: organizedQuestions,
        id: id || uuidv4() // Nuevo ID para formularios nuevos
      };
      
      // Guarda el formulario
      const savedId = await saveForm(formToSave);
      toast.success(t('Formulario guardado correctamente'));
      
      // Resetea para nuevos formularios
      if (!id) {
        setFormData(initialFormState);
      }
      
      // Navega a vista previa
      navigate(`/vista-previa/${savedId}`);
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error(t('Error al guardar el formulario'));
    }
  };

  // Filtra solo preguntas principales para mostrar
  const mainQuestions = formData.questions.filter(q => !q.parentId);

  // ======================
  // RENDERIZADO
  // ======================

  // Muestra spinner mientras carga
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
        {/* Encabezado */}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {id ? `Editar: ${formData.name}` : t('Crear Formulario')}
        </h1>
        
        <div className="space-y-6">
          {/* Sección de información básica */}
          <div className="grid grid-cols-1 gap-6">
            {/* Campo nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Nombre del Formulario')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={t('Nombre del formulario')}
                required
              />
            </div>
            
            {/* Campo descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Descripción')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={t('Descripción del formulario')}
                rows={3}
              />
            </div>
          </div>
          
          {/* Sección de preguntas */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">{t('Preguntas')}</h2>
              {/* Botón agregar pregunta */}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <span className="mr-1">+</span> {t('Agregar Pregunta')}
              </button>
            </div>
            
            {/* Lista de preguntas o mensaje vacío */}
            {mainQuestions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">{t('No hay preguntas en este formulario')}</p>
                <p className="text-sm text-gray-400 mt-2">{t('Haz clic en "Agregar Pregunta" para comenzar')}</p>
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
              {t('Cancelar')}
            </button>
            <button
              type="button"
              onClick={handleSaveForm}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="sm" /> : t('Guardar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;