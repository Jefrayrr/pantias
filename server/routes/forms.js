import express from 'express';
import pool from '../config/db.js'; // Pool de conexiones a PostgreSQL
import { authenticateToken } from '../middleware/auth.js'; // Middleware de autenticación

const router = express.Router();

// ==============================================
// GET / - Obtener todos los formularios (ordenados por fecha)
// ==============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Consulta a la DB: Selecciona todos los formularios ordenados por updated_at DESC
    const { rows: forms } = await pool.query('SELECT * FROM forms ORDER BY updated_at DESC');
    res.json(forms); // Devuelve el listado
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==============================================
// GET /:id - Obtener un formulario por ID
// ==============================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { rows: forms } = await pool.query('SELECT * FROM forms WHERE id = $1', [req.params.id]);
    
    // Si no existe, devuelve 404
    if (forms.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    res.json(forms[0]); // Devuelve el primer resultado
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==============================================
// POST / - Crear formulario (solo admin)
// ==============================================
router.post('/', authenticateToken, async (req, res) => {
  // Verifica el rol del usuario (solo admin puede crear)
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  
  try {
    const { name, description, questions } = req.body;
    
    // Inserta el formulario en la DB
    const { rows: [newForm] } = await pool.query(
      `INSERT INTO forms 
       (name, description, questions, created_at, updated_at, version) 
       VALUES ($1, $2, $3, NOW(), NOW(), 1)
       RETURNING id`,
      [name, description, JSON.stringify(questions)] // questions se guarda como JSON
    );
    
    res.json({ id: newForm.id }); // Devuelve el ID del nuevo formulario
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==============================================
// PUT /:id - Actualizar formulario (solo admin)
// ==============================================
router.put('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  
  try {
    const { name, description, questions } = req.body;
    
    // Actualiza el formulario y incrementa la versión
    await pool.query(
      `UPDATE forms 
       SET name = $1, description = $2, questions = $3, 
           updated_at = NOW(), version = version + 1 
       WHERE id = $4`,
      [name, description, JSON.stringify(questions), req.params.id]
    );
    
    res.json({ message: 'Form updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==============================================
// DELETE /:id - Eliminar formulario (solo admin)
// ==============================================
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  
  try {
    // Elimina el formulario y sus respuestas asociadas
    await pool.query('DELETE FROM forms WHERE id = $1', [req.params.id]);
    await pool.query('DELETE FROM responses WHERE form_id = $1', [req.params.id]);
    
    res.json({ message: 'Form deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;