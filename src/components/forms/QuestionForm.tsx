import React from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Question, QuestionType, Option } from '../../types';
import { Plus } from 'lucide-react';

interface QuestionFormProps {
  question: Question;
  onUpdate: (question: Question) => void;
  nestLevel?: number;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  question,
  onUpdate,
  nestLevel = 0
}) => {
  const { t } = useTranslation();

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

  // Agregar una nueva opción
  const handleAddOption = () => {
    const newOption: Option = { id: uuidv4(), text: '' };
    onUpdate({
      ...question,
      options: [...(question.options || []), newOption]
    });
  };

  // Actualizar texto de una opción
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
    const updatedOptions = question.options.filter(opt => opt.id !== optionId);
    onUpdate({
      ...question,
      options: updatedOptions
    });
  };

  return (
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
      
      {/* Opciones para preguntas de selección */}
      {hasOptions && (
        <div className="pl-4 mt-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">Opciones</label>
          
          {question.options?.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
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
                ×
              </button>
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
      )}
      
      {/* Configuración para Power BI */}
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
    </div>
  );
};

export default QuestionForm;