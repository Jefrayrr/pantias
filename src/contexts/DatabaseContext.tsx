import React, { createContext, useContext, useState, useEffect } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Definición del esquema de la base de datos
interface FormDB extends DBSchema {
  forms: {
    key: string;
    value: any;
    indexes: { 'by-created': number };
  };
  responses: {
    key: string;
    value: any;
    indexes: { 'by-form-id': string };
  };
}

interface DatabaseContextType {
  db: IDBPDatabase<FormDB> | null;
  isLoading: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<IDBPDatabase<FormDB> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await openDB<FormDB>('dynamic-forms-db', 1, {
          upgrade(db) {
            // Crear almacén para formularios
            const formsStore = db.createObjectStore('forms', { keyPath: 'id' });
            formsStore.createIndex('by-created', 'createdAt');

            // Crear almacén para respuestas
            const responsesStore = db.createObjectStore('responses', { keyPath: 'id' });
            responsesStore.createIndex('by-form-id', 'formId');
          },
        });
        
        setDb(database);
      } catch (err) {
        console.error('Error initializing database:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize database'));
      } finally {
        setIsLoading(false);
      }
    };

    initDB();

    return () => {
      db?.close();
    };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isLoading, error }}>
      {children}
    </DatabaseContext.Provider>
  );
};