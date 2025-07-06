// C:\Proyectos\Label\frontend\src\components\Inventory\BulkActionsBar.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, X, Edit } from 'lucide-react';

function BulkActionsBar({ selectedCount, onClearSelection, onDeleteSelected, onEditCategory }) {
    // El componente no se renderiza si no hay selección.
    // La animación de entrada/salida se maneja con AnimatePresence en el componente padre.
    if (selectedCount === 0) return null;

    return (
        <motion.div
            className="fixed bottom-5 left-1/2 -translate-x-1/2 w-auto bg-surface-secondary shadow-2xl rounded-lg p-3 flex items-center gap-4 z-40 border border-surface-tertiary"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            <span className="text-sm font-semibold text-text-base">{selectedCount} {selectedCount === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}</span>
            <div className="h-6 w-px bg-surface-tertiary"></div>
            <button
                onClick={onEditCategory}
                className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors text-sm font-medium"
                title="Editar categoría de los seleccionados"
            >
                <Edit size={16} />
                Editar Categoría
            </button>
            <button
                onClick={onDeleteSelected}
                className="flex items-center gap-2 text-error hover:text-red-400 transition-colors text-sm font-medium"
                title="Eliminar seleccionados"
            >
                <Trash2 size={16} />
                Eliminar
            </button>
            <button
                onClick={onClearSelection}
                className="text-text-muted hover:text-text-base transition-colors"
                title="Limpiar selección"
            >
                <X size={20} />
            </button>
        </motion.div>
    );
}

export default BulkActionsBar;