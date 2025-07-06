// C:\Proyectos\Label\frontend\src\components\Inventory\ViewSwitcher.jsx
import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

function ViewSwitcher({ currentView, setCurrentView }) {
    const baseClasses = "p-2 rounded-md transition-colors duration-200";
    const activeClasses = "bg-primary text-white";
    const inactiveClasses = "bg-surface-secondary text-text-muted hover:bg-surface-tertiary";

    return (
        <div className="flex items-center gap-2 p-1 bg-surface rounded-lg">
            <button
                onClick={() => setCurrentView('grid')}
                className={`${baseClasses} ${currentView === 'grid' ? activeClasses : inactiveClasses}`}
                aria-label="Vista de tarjetas"
                title="Vista de tarjetas"
            >
                <LayoutGrid size={20} />
            </button>
            <button
                onClick={() => setCurrentView('table')}
                className={`${baseClasses} ${currentView === 'table' ? activeClasses : inactiveClasses}`}
                aria-label="Vista de tabla"
                title="Vista de tabla"
            >
                <List size={20} />
            </button>
        </div>
    );
}

export default ViewSwitcher;