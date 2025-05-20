import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Question, QuestionType, Option } from '../../types';
import { ChevronUp, ChevronDown, Plus, Trash2, MoveVertical, ArrowDown } from 'lucide-react';

interface QuestionEditorProps {
  question: Question;
  allQuestions: Question[];
  onUpdate: (question: Question) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  nestLevel?: number;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  allQuestions,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  nestLevel = 0,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSubQuestionForm, setShowSubQuestionForm] = useState<string | null>(null);
  
  // Determinar si este tipo de pregunta puede tener opciones
  const hasOptions = ['select', 'multiselect'].includes(question.type);
  
  // Manejar cambio en el tipo de pregunta
  const handleTypeChange = (newType: QuestionType) => {
    let updatedQuestion: Question = { ...question, type: newType };
    
    // Si el nuevo tipo no soporta opciones, eliminar las opciones
    if (!['select', 'multiselect'].includes(newType) && updatedQuestion.options) {
      delete updatedQuestion.options;
    }
    
    // Si el nuevo tipo soporta opciones y no hay opciones, inicializar con una opción
    if (['select', 'multiselect'].includes(newType) && !updatedQuestion.options) {
      updatedQuestion.options = [{ id: uuidv4(), text: '' }];
    }
    
    onUpdate(updatedQuestion);
  };
  
  // Agregar una nueva opción a la pregunta
  const handleAddOption = () => {
    const newOption: Option = { id: uuidv4(), text: '' };
    
    onUpdate({
      ...question,
      options: [...(question.options || []), newOption]
    });
  };
  
  // Actualizar texto de una opción existente
  const handleUpdateOption = (optionId: string, text: string) => {
    if (!question.options) return;
    
    const updatedOptions = question.options.map(opt => 
      opt.id === optionId ? { ...opt, text } : opt
    );
    
    onUpdate({
      ...question,
      options: updatedOptions
    });
  };
  
  // Eliminar una opción
  const handleDeleteOption = (optionId: string) => {
    if (!question.options) return;
    
    // Encontrar todas las subpreguntas relacionadas a esta opción
    const subQuestionIds = allQuestions
      .filter(q => q.parentOptionId === optionId)
      .map(q => q.id);
    
    // Eliminar la opción y actualizar la pregunta
    const updatedOptions = question.options.filter(opt => opt.id !== optionId);
    
    onUpdate({
      ...question,
      options: updatedOptions
    });
  };
  
  // Agregar una subpregunta a una opción
  const handleAddSubQuestion = (optionId: string) => {
    const newSubQuestion: Question = {
      id: uuidv4(),
      text: '',
      type: 'text',
      required: false,
      includeInPowerBI: false,
      parentId: question.id,
      parentOptionId: optionId
    };
    
    // Agregar la nueva subpregunta a la lista de todas las preguntas
    const updatedQuestions = [...allQuestions, newSubQuestion];
    onUpdate(newSubQuestion);
    setShowSubQuestionForm(null);
  };
  
  // Buscar subpreguntas para una opción específica
  const getSubQuestionsForOption = (optionId: string) => {
    return allQuestions.filter(q => q.parentOptionId === optionId);
  };
  
  // Renderizar las opciones de selección para preguntas de tipo select/multiselect
  const renderOptions = () => {
    if (!hasOptions || !question.options) return null;
    
    return (
      <div className="pl-4 mt-4 space-y-4">
        <label className="block text-sm font-medium text-gray-700">Opciones</label>
        
        {question.options.map((option) => (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={option.text}
                onChange={(e) => handleUpdateOption(option.id, e.target.value)}
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="Texto de la opción"
              />
              
              <button
                type="button"
                onClick={() => handleDeleteOption(option.id)}
                className="p-2 text-red-500 hover:text-red-700 focus:outline-none"
                title="Eliminar opción"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            {/* Botón para agregar subpregunta a esta opción */}
            <div className="flex items-center pl-4">
              <button
                type="button"
                onClick={() => setShowSubQuestionForm(option.id)}
                className="text-sm flex items-center text-blue-600 hover:text-blue-800"
              >
                <Plus size={14} className="mr-1" /> {t('add_sub_question')}
              </button>
            </div>
            
            {/* Mostrar formulario para agregar subpregunta */}
            {showSubQuestionForm === option.id && (
              <div className="pl-6 mt-2 p-3 border-l-2 border-blue-300 bg-blue-50 rounded">
                <button
                  type="button"
                  onClick={() => handleAddSubQuestion(option.id)}
                  className="w-full text-left text-sm px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus size={14} className="inline mr-1" /> Añadir nueva subpregunta
                </button>
              </div>
            )}
            
            {/* Renderizar subpreguntas existentes para esta opción */}
            {getSubQuestionsForOption(option.id).map((subQuestion) => (
              <div key={subQuestion.id} className="pl-6 mt-2 border-l-2 border-blue-300">
                <QuestionEditor
                  question={subQuestion}
                  allQuestions={allQuestions}
                  onUpdate={onUpdate}
                  onDelete={() => {
                    const updatedQuestions = allQuestions.filter(q => q.id !== subQuestion.id);
                    onUpdate({...question});
                  }}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  canMoveUp={false}
                  canMoveDown={false}
                  nestLevel={nestLevel + 1}
                />
              </div>
            ))}
          </div>
        ))}
        
        <button
          type="button"
          onClick={handleAddOption}
          className="mt-2 text-sm flex items-center text-green-600 hover:text-green-800"
        >
          <Plus size={14} className="mr-1" /> {t('add_option')}
        </button>
      </div>
    );
  };
  
  // Renderizar configuración para Power BI
  const renderPowerBISettings = () => {
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id={`powerbi-${question.id}`}
            checked={question.includeInPowerBI}
            onChange={(e) => onUpdate({...question, includeInPowerBI: e.target.checked})}
            className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 rounded"
          />
          <label htmlFor={`powerbi-${question.id}`} className="text-sm text-gray-700">
            {t('include_in_power_bi')}
          </label>
        </div>
        
        {question.includeInPowerBI && (
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              {t('power_bi_field')}
            </label>
            <input
              type="text"
              value={question.powerBIFieldName || ''}
              onChange={(e) => onUpdate({...question, powerBIFieldName: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Nombre del campo en Power BI"
            />
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${nestLevel > 0 ? 'bg-blue-50' : 'bg-white'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-grow">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            
            <span className="text-sm font-medium text-gray-500">
              {question.type === 'text' && 'Texto'}
              {question.type === 'number' && 'Número'}
              {question.type === 'select' && 'Selección'}
              {question.type === 'multiselect' && 'Selección Múltiple'}
              {question.type === 'date' && 'Fecha'}
              {question.type === 'boolean' && 'Sí/No'}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {nestLevel === 0 && (
            <>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className={`p-1 rounded focus:outline-none ${canMoveUp ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                title="Mover hacia arriba"
              >
                <ChevronUp size={18} />
              </button>
              
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className={`p-1 rounded focus:outline-none ${canMoveDown ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                title="Mover hacia abajo"
              >
                <ChevronDown size={18} />
              </button>
            </>
          )}
          
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-red-500 hover:text-red-700 focus:outline-none"
            title="Eliminar pregunta"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('question_text')}
            </label>
            <input
              type="text"
              value={question.text}
              onChange={(e) => onUpdate({...question, text: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Texto de la pregunta"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('question_type')}
              </label>
              <select
                value={question.type}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="text">{t('text')}</option>
                <option value="number">{t('number')}</option>
                <option value="select">{t('select')}</option>
                <option value="multiselect">{t('multiselect')}</option>
                <option value="date">{t('date')}</option>
                <option value="boolean">{t('boolean')}</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`required-${question.id}`}
                checked={question.required}
                onChange={(e) => onUpdate({...question, required: e.target.checked})}
                className="mr-2 h-5 w-5 text-green-600 focus:ring-green-500 rounded"
              />
              <label htmlFor={`required-${question.id}`} className="text-sm text-gray-700">
                {t('question_required')}
              </label>
            </div>
          </div>
          
          {/* Renderizar opciones para preguntas de selección */}
          {renderOptions()}
          
          {/* Configuración para Power BI */}
          {renderPowerBISettings()}
        </div>
      )}
    </div>
  );
};

export default QuestionEditor;