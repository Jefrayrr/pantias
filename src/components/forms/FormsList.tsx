import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Trash2, BarChart, Download } from 'lucide-react';
import { useForm } from '../../contexts/FormContext';
import { useTranslation } from 'react-i18next';
import { exportToExcel } from '../../utils/excelUtils';
import ConfirmDialog from '../ui/ConfirmDialog';
import Spinner from '../ui/Spinner';

const FormsList: React.FC = () => {
  const { forms, loadForms, deleteForm, isLoading } = useForm();
  const { t } = useTranslation();
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadForms();
  }, []);

  const handleExportForm = async (id: string, name: string) => {
    const form = forms.find(f => f.id === id);
    if (form) {
      await exportToExcel([form], `formulario_${name.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
    }
  };

  const filteredForms = forms.filter(form => 
    form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedForms = [...filteredForms].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="container mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">{t('forms')}</h1>
          
          <div className="w-full md:w-auto">
            <input
              type="text"
              placeholder="Buscar formularios..."
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center my-12">
            <Spinner />
          </div>
        ) : sortedForms.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">{searchTerm ? 'No se encontraron formularios que coincidan con la búsqueda' : 'No hay formularios creados'}</p>
            <Link 
              to="/crear" 
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <span className="mr-2">+</span> {t('create_form')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Nombre</th>
                  <th className="py-3 px-6 text-left hidden md:table-cell">Descripción</th>
                  <th className="py-3 px-6 text-center hidden md:table-cell">Preguntas</th>
                  <th className="py-3 px-6 text-center hidden md:table-cell">Versión</th>
                  <th className="py-3 px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {sortedForms.map((form) => (
                  <tr key={form.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 text-left">
                      <div className="font-medium">{form.name}</div>
                      <div className="text-xs text-gray-500 md:hidden">{new Date(form.updatedAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-6 text-left hidden md:table-cell">
                      <div className="line-clamp-2">{form.description}</div>
                    </td>
                    <td className="py-3 px-6 text-center hidden md:table-cell">{form.questions?.length ?? 0}</td>
                    <td className="py-3 px-6 text-center hidden md:table-cell">{form.version}</td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex justify-center space-x-2">
                        <Link to={`/editar/${form.id}`} className="text-blue-600 hover:text-blue-900" title="Editar">
                          <Edit size={18} />
                        </Link>
                        <Link to={`/vista-previa/${form.id}`} className="text-green-600 hover:text-green-900" title="Vista Previa">
                          <Eye size={18} />
                        </Link>
                        <Link to={`/respuestas/${form.id}`} className="text-purple-600 hover:text-purple-900" title="Ver Respuestas">
                          <BarChart size={18} />
                        </Link>
                        <button 
                          onClick={() => handleExportForm(form.id, form.name)} 
                          className="text-orange-600 hover:text-orange-900"
                          title="Exportar Formulario"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => setFormToDelete(form.id)} 
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!formToDelete}
        title={t('confirm_delete')}
        message="Esta acción no se puede deshacer y eliminará todas las respuestas asociadas."
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onConfirm={() => {
          if (formToDelete) {
            deleteForm(formToDelete);
            setFormToDelete(null);
          }
        }}
        onCancel={() => setFormToDelete(null)}
      />
    </div>
  );
};

export default FormsList;