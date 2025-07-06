// c:\Respaldo Jhosber\Proyectos\Label\frontend\src\components\Inventory\BulkEditCategoryModal.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import Button from '../Common/Button';

function BulkEditCategoryModal({ isOpen, onClose, onSave, availableCategories, selectedCount }) {
    const [selectedCategory, setSelectedCategory] = useState('');

    if (!isOpen) return null;

    // Removemos "Todas las Categorías" de la lista para que no sea una opción de edición
    const categoryOptions = availableCategories.filter(cat => cat !== 'Todas las Categorías');

    const handleSave = () => {
        if (selectedCategory) {
            onSave(selectedCategory);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <motion.div
                        className="bg-surface-secondary rounded-lg shadow-2xl p-6 w-full max-w-md border border-surface-tertiary"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-text-base">Editar Categoría en Lote</h3>
                            <button onClick={onClose} className="text-text-muted hover:text-text-base">
                                <X size={24} />
                            </button>
                        </div>
                        <p className="text-text-muted mb-6">
                            Selecciona una nueva categoría para los <span className="font-bold text-primary">{selectedCount}</span> productos seleccionados.
                        </p>

                        <div className="space-y-2">
                            <label htmlFor="category-select" className="block text-sm font-medium text-text-muted">
                                Nueva Categoría
                            </label>
                            <select
                                id="category-select"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full p-2 bg-surface border border-surface-tertiary rounded-md text-text-base focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                                <option value="" disabled>Selecciona una categoría...</option>
                                {categoryOptions.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-8 flex justify-end gap-4">
                            <Button onClick={onClose} variant="secondary">
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={!selectedCategory}>
                                <Save size={18} className="mr-2" />
                                Guardar Cambios
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default BulkEditCategoryModal;