// C:\Proyectos\Label\frontend\src\components\Inventory\InventoryPageHeader.jsx
import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Plus, ChevronDown, BarChart, Upload, AlertTriangle } from 'lucide-react';

function InventoryPageHeader({
    onAddProductClick,
    onShowReportClick,
    onExportClick,
    onSuggestPricesClick,
    isReportVisible,
    canExport,
}) {
    return (
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-4xl font-bold text-text-base">Inventario</h2>
            <div className="flex items-center gap-4">
                {/* Menú para acciones secundarias */}
                <Menu as="div" className="relative inline-block text-left">
                    <div>
                        <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-surface-secondary px-4 py-2.5 text-sm font-semibold text-text-muted shadow-sm ring-1 ring-inset ring-surface-tertiary hover:bg-surface-tertiary">
                            Acciones
                            <ChevronDown className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                        </Menu.Button>
                    </div>
                    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-surface shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1">
                                <Menu.Item>
                                    {({ active }) => ( <button onClick={onShowReportClick} className={`${ active ? 'bg-surface-secondary text-text-base' : 'text-text-muted' } group flex w-full items-center rounded-md px-2 py-2 text-sm`} > <BarChart className="mr-2 h-5 w-5" /> {isReportVisible ? 'Ocultar Reporte' : 'Ver Reporte de Variantes'} </button> )}
                                </Menu.Item>
                                {canExport && (
                                    <Menu.Item>
                                        {({ active }) => ( <button onClick={onExportClick} className={`${ active ? 'bg-surface-secondary text-text-base' : 'text-text-muted' } group flex w-full items-center rounded-md px-2 py-2 text-sm`} > <Upload className="mr-2 h-5 w-5" /> Exportar Reporte a CSV </button> )}
                                    </Menu.Item>
                                )}
                                <Menu.Item>
                                    {({ active }) => ( <button onClick={onSuggestPricesClick} className={`${ active ? 'bg-surface-secondary text-text-base' : 'text-text-muted' } group flex w-full items-center rounded-md px-2 py-2 text-sm`} > <AlertTriangle className="mr-2 h-5 w-5" /> Sugerir Precios </button> )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>

                {/* Botón de acción principal */}
                <button
                    onClick={onAddProductClick}
                    className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-lg transition duration-200 flex items-center justify-center text-sm shadow-md"
                >
                    <Plus size={18} className="mr-2" />
                    Añadir Producto
                </button>
            </div>
        </div>
    );
}

export default InventoryPageHeader;