// C:\Proyectos\Label\frontend\src\components\Inventory\SortableHeader.jsx
import React from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';

function SortableHeader({ children, columnId, sortBy, sortOrder, onSort, className = '', innerClassName = '' }) {
    const isSorted = sortBy === columnId;
    const isAsc = sortOrder === 'asc';

    const Icon = isSorted ? (isAsc ? ArrowUp : ArrowDown) : ChevronsUpDown;

    const baseClasses = "py-3.5 text-left text-sm font-semibold text-text-base cursor-pointer hover:bg-surface-tertiary transition-colors group";
    const finalClassName = `${baseClasses} ${className}`;

    return (
        <th
            scope="col"
            className={finalClassName}
            onClick={() => onSort(columnId)}
            aria-sort={isSorted ? (isAsc ? 'ascending' : 'descending') : 'none'}
            title={`Ordenar por ${children}`}
        >
            <div className={`flex items-center gap-2 ${innerClassName}`}>
                {children}
                <Icon
                    size={16}
                    className={isSorted ? 'text-primary' : 'text-text-muted opacity-0 group-hover:opacity-100 transition-opacity'}
                />
            </div>
        </th>
    );
}

export default SortableHeader;