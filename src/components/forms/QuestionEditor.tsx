import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Question, QuestionType } from '../../types';
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import QuestionForm from './QuestionForm';

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

  // Buscar subpreguntas para una opción específica
  const getSubQuestionsForOption = (optionId: string) => {
    return allQuestions.filter(q => q.parentOptionId === optionId);
  };

  // Crear una nueva subpregunta
  const createSubQuestion = (optionId: string): Question => {
    return {
      id: uuidv4(),
      text: '',
      type: 'text' as QuestionType,
      required: false,
      includeInPowerBI: false,
      parentId: question.id,
      parentOptionId: optionId
    };
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
        <div>
          <QuestionForm
            question={question}
            onUpdate={onUpdate}
            nestLevel={nestLevel}
          />
          
          {/* Subpreguntas para opciones */}
          {['select', 'multiselect'].includes(question.type) && question.options && (
            <div className="mt-4">
              {question.options.map((option) => (
                <div key={option.id} className="mt-2">
                  {/* Botón para agregar subpregunta */}
                  <div className="flex items-center pl-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowSubQuestionForm(option.id)}
                      className="text-sm flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <Plus size={14} className="mr-1" /> {t('add_sub_question')}
                    </button>
                  </div>
                  
                  {/* Editor de subpregunta */}
                  {showSubQuestionForm === option.id && (
                    <div className="pl-6 mt-2 p-4 border-l-2 border-blue-300 bg-blue-50 rounded">
                      <QuestionEditor
                        question={createSubQuestion(option.id)}
                        allQuestions={allQuestions}
                        onUpdate={(newSubQuestion) => {
                          onUpdate(newSubQuestion);
                          setShowSubQuestionForm(null);
                        }}
                        onDelete={() => setShowSubQuestionForm(null)}
                        onMoveUp={() => {}}
                        onMoveDown={() => {}}
                        canMoveUp={false}
                        canMoveDown={false}
                        nestLevel={nestLevel + 1}
                      />
                    </div>
                  )}
                  
                  {/* Mostrar subpreguntas existentes */}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionEditor;