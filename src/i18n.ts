import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  es: {
    translation: {
      // Navegación
      "app_title": "Creador de Formularios Dinámicos",
      "forms": "Formularios",
      "create_form": "Crear Formulario",
      "import_export": "Importar/Exportar",
      
      // Formularios
      "form_name": "Nombre del Formulario",
      "form_description": "Descripción",
      "add_question": "Añadir Pregunta",
      "question_text": "Texto de la Pregunta",
      "question_type": "Tipo de Pregunta",
      "question_required": "Obligatorio",
      "add_option": "Añadir Opción",
      "option_text": "Texto de Opción",
      "add_sub_question": "Añadir Subpregunta",
      "save_form": "Guardar Formulario",
      "preview_form": "Vista Previa",
      
      // Tipos de preguntas
      "text": "Texto",
      "number": "Número",
      "select": "Selección",
      "multiselect": "Selección Múltiple",
      "date": "Fecha",
      "boolean": "Sí/No",
      
      // Respuestas
      "responses": "Respuestas",
      "no_responses": "No hay respuestas para este formulario",
      "export_responses": "Exportar Respuestas",
      
      // Importar/Exportar
      "export_forms": "Exportar Formularios",
      "import_forms": "Importar Formularios",
      "export_form": "Exportar Formulario",
      "import_responses": "Importar Respuestas",
      "drag_drop": "Arrastra y suelta archivos o haz clic para seleccionar",
      
      // Power BI
      "power_bi_field": "Campo para Power BI",
      "include_in_power_bi": "Incluir en Power BI",
      
      // Mensajes
      "form_saved": "Formulario guardado correctamente",
      "form_deleted": "Formulario eliminado correctamente",
      "import_success": "Importación realizada correctamente",
      "export_success": "Exportación realizada correctamente",
      "confirm_delete": "¿Estás seguro de que deseas eliminar este formulario?",
      
      // Acciones
      "save": "Guardar",
      "cancel": "Cancelar",
      "delete": "Eliminar",
      "edit": "Editar",
      "view": "Ver",
      "download": "Descargar",
      "upload": "Subir",
      "confirm": "Confirmar",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;