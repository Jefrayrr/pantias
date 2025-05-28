import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from '../../contexts/FormContext';
import { Download, ArrowLeft, BarChart, Eye, List, Grid } from 'lucide-react';
import Spinner from '../ui/Spinner';
import { exportToExcel } from '../../utils/excelUtils';
import { formatDateDisplay } from '../../utils/dateUtils';

const FormResponses: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { loadForm, loadResponses, currentForm, responses, isLoading } = useForm();
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'scrum'>('list');
  
  useEffect(() => {
    if (id) {
      loadForm(id);
      loadResponses(id);
    }
  }, [id]);
  
  const handleExportResponses = async () => {
    if (!currentForm || !id) return;
    
    try {
      setIsExporting(true);
      const formResponses = responses[id] || [];
      await exportToExcel(
        formResponses, 
        `respuestas_${currentForm.name.replace(/\s+/g, '_').toLowerCase()}.xlsx`,
        currentForm
      );
    } catch (error) {
      console.error('Error exporting responses:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Obtener el valor de una respuesta formateado para mostrar
  const getFormattedResponseValue = (questionId: string, responseIndex: number) => {
    if (!currentForm || !id) return '';
    
    const formResponses = responses[id] || [];
    if (!formResponses[responseIndex]) return '';
    
    const response = formResponses[responseIndex].responses.find(r => r.questionId === questionId);
    if (!response) return '';
    
    const question = currentForm.questions?.find(q => q.id === questionId);
    if (!question) return '';
    
    switch (question.type) {
      case 'select':
        const option = question.options?.find(o => o.id === response.value);
        return option ? option.text : '';
        
      case 'multiselect':
        if (!Array.isArray(response.value)) return '';
        return question.options
          ?.filter(o => response.value.includes(o.id))
          .map(o => o.text)
          .join(', ');
        
      case 'boolean':
        return response.value === true ? 'Sí' : response.value === false ? 'No' : '';
        
      default:
        return response.value;
    }
  };

  // Agrupar respuestas por estado para vista scrum
  const getScrumGroups = () => {
    if (!currentForm || !id) return {};

    const formResponses = responses[id] || [];
    const groups: Record<string, any[]> = {
      'Pendiente': [],
      'En Proceso': [],
      'Completado': []
    };

    formResponses.forEach(response => {
      // Buscar la respuesta al campo de estado
      const statusResponse = response.responses.find(r => {
        const question = currentForm.questions?.find(q => q.id === r.questionId);
        return question?.type === 'select' && question.text.toLowerCase().includes('estado');
      });

      let status = 'Pendiente';
      if (statusResponse) {
        const statusQuestion = currentForm.questions?.find(q => q.id === statusResponse.questionId);
        const statusOption = statusQuestion?.options?.find(o => o.id === statusResponse.value);
        if (statusOption) {
          status = statusOption.text;
        }
      }

      if (status in groups) {
        groups[status].push(response);
      } else {
        groups['Pendiente'].push(response);
      }
    });

    return groups;
  };
  
  if (isLoading || !currentForm) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }
  
  const formResponses = responses[id || ''] || [];
  const visibleQuestions = currentForm?.questions?.filter(q => !q.parentId) || [];
  const scrumGroups = getScrumGroups();
  
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
            <h1 className="text-2xl font-bold text-gray-800">
              Respuestas: {currentForm.name}
            </h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 mt-4 md:mt-0">
            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-l-md flex items-center ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <List size={16} className="mr-2" /> Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode('scrum')}
                className={`px-4 py-2 rounded-r-md flex items-center ${
                  viewMode === 'scrum'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Grid size={16} className="mr-2" /> Scrum
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportResponses}
              disabled={isExporting || formResponses.length === 0}
              className={`px-4 py-2 rounded-md flex items-center ${
                formResponses.length === 0
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-green-600 text-white hover:bg-green-700 transition-colors'
              }`}
            >
              {isExporting ? (
                <Spinner size="sm" color="white" />
              ) : (
                <>
                  <Download size={16} className="mr-2" /> Exportar Respuestas
                </>
              )}
            </button>
            
            <Link
              to={`/vista-previa/${id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Eye size={16} className="mr-2" /> Completar Nueva Respuesta
            </Link>
          </div>
        </div>
        
        {formResponses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="flex justify-center mb-4">
              <BarChart size={48} className="text-gray-400" />
            </div>
            <p className="text-gray-500">{t('no_responses')}</p>
            <p className="text-sm text-gray-400 mt-2">
              Complete el formulario o importe respuestas para verlas aquí
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-100">
                    Fecha
                  </th>
                  
                  {visibleQuestions.map((question) => (
                    <th 
                      key={question.id} 
                      className="py-3 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {question.text}
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-200">
                {formResponses.map((response, index) => (
                  <tr key={response.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-800 border-b sticky left-0 bg-white">
                      {formatDateDisplay(response.createdAt)}
                      {response.updatedOffline && (
                        <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                          Offline
                        </span>
                      )}
                    </td>
                    
                    {visibleQuestions.map((question) => (
                      <td key={question.id} className="py-3 px-4 text-sm text-gray-800 border-b">
                        {getFormattedResponseValue(question.id, index)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(scrumGroups).map(([status, groupResponses]) => (
              <div key={status} className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className={`w-3 h-3 rounded-full mr-2 ${
                    status === 'Completado' ? 'bg-green-500' :
                    status === 'En Proceso' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></span>
                  {status} ({groupResponses.length})
                </h3>
                <div className="space-y-4">
                  {groupResponses.map((response) => (
                    <div key={response.id} className="bg-white rounded-lg shadow p-4">
                      <div className="text-sm text-gray-500 mb-2">
                        {formatDateDisplay(response.createdAt)}
                        {response.updatedOffline && (
                          <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            Offline
                          </span>
                        )}
                      </div>
                      {visibleQuestions.slice(0, 3).map((question) => (
                        <div key={question.id} className="mb-2">
                          <span className="text-sm font-medium text-gray-700">{question.text}: </span>
                          <span className="text-sm text-gray-600">
                            {getFormattedResponseValue(question.id, formResponses.indexOf(response))}
                          </span>
                        </div>
                      ))}
                      {visibleQuestions.length > 3 && (
                        <div className="text-sm text-gray-400 mt-2">
                          + {visibleQuestions.length - 3} campos más
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormResponses;