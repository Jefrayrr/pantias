import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Plus, Upload, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-green-700 text-white' : 'text-white hover:bg-green-700';
  };

  return (
    <nav className="bg-green-800 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="py-3 flex items-center">
            <FileText className="mr-2" size={24} />
            <span className="text-xl font-bold">{t('app_title')}</span>
          </div>
          
          <div className="flex flex-wrap py-3 md:py-0">
            <Link 
              to="/" 
              className={`${isActive('/')} px-3 py-2 rounded-md text-sm font-medium flex items-center mx-1 my-1 md:my-0`}
            >
              <FileText className="mr-1" size={16} />
              {t('forms')}
            </Link>
            
            <Link 
              to="/crear" 
              className={`${isActive('/crear')} px-3 py-2 rounded-md text-sm font-medium flex items-center mx-1 my-1 md:my-0`}
            >
              <Plus className="mr-1" size={16} />
              {t('create_form')}
            </Link>
            
            <Link 
              to="/importar-exportar" 
              className={`${isActive('/importar-exportar')} px-3 py-2 rounded-md text-sm font-medium flex items-center mx-1 my-1 md:my-0`}
            >
              <Upload className="mr-1" size={16} />
              {t('import_export')}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;