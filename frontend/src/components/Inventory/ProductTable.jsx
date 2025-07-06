// C:\Proyectos\Label\frontend\src\components\Inventory\ProductTable.jsx
import React, { lazy, Suspense } from 'react';
import { Edit, Trash2, Package, PackageCheck, PackageX } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

const SortableHeader = lazy(() => import('./SortableHeader'));

function ProductTable({ products, handleEditClick, confirmDeleteProduct, sortBy, sortOrder, onSort, selectedProducts, onProductSelect, onSelectAll }) {
    const { formatPrice } = useCurrency();

    const getStockIndicator = (stock, reorderThreshold) => {
        if (stock <= 0) {
            return { icon: <PackageX size={20} />, color: 'text-red-500', title: 'Sin Stock' };
        }
        if (reorderThreshold > 0 && stock <= reorderThreshold) {
            return { icon: <Package size={20} />, color: 'text-yellow-500', title: 'Stock Bajo' };
        }
        return { icon: <PackageCheck size={20} />, color: 'text-green-500', title: 'Stock Óptimo' };
    };

    // Lógica para el estado del checkbox "seleccionar todo"
    const visibleProductIds = products.map(p => p._id);
    const selectedVisibleCount = visibleProductIds.filter(id => selectedProducts.has(id)).length;
    const isAllVisibleSelected = visibleProductIds.length > 0 && selectedVisibleCount === visibleProductIds.length;
    const isSomeVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;

    return (
        <div className="overflow-x-auto bg-surface rounded-lg shadow-lg border border-surface-secondary">
            <table className="min-w-full divide-y divide-surface-secondary">
                <thead className="bg-surface-secondary">
                    <Suspense fallback={<tr><th className="py-3.5 pl-4 pr-3 sm:pl-6">Cargando cabeceras...</th></tr>}>
                        <tr>
                            <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                                <input
                                    type="checkbox"
                                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-surface-tertiary bg-surface text-primary focus:ring-primary"
                                    checked={isAllVisibleSelected}
                                    ref={input => {
                                        if (input) input.indeterminate = isSomeVisibleSelected;
                                    }}
                                    onChange={onSelectAll}
                                    aria-label="Seleccionar todos los productos en esta página"
                                />
                            </th>
                            <SortableHeader columnId="name" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="pl-4 pr-3 sm:pl-6">
                                Producto
                            </SortableHeader>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-text-base">
                                SKU
                            </th>
                            <SortableHeader columnId="stock" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="px-3" innerClassName="justify-center">
                                Stock
                            </SortableHeader>
                            <SortableHeader columnId="costPrice" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="px-3">
                                Costo
                            </SortableHeader>
                            <SortableHeader columnId="price" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="px-3">
                                Precio Venta
                            </SortableHeader>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Acciones</span>
                            </th>
                        </tr>
                    </Suspense>
                </thead>
                <tbody className="divide-y divide-surface-secondary bg-surface">
                    {products.map(product => {
                        const isSelected = selectedProducts.has(product._id);
                        return (
                        <React.Fragment key={product._id}>
                            {/* Fila del Producto Principal */}
                            <tr className={`transition-colors duration-150 ${isSelected ? 'bg-primary/10' : 'hover:bg-surface-secondary/50'}`}>
                                <td className="relative px-7 sm:w-12 sm:px-6">
                                    {isSelected && <div className="absolute inset-y-0 left-0 w-0.5 bg-primary"></div>}
                                    <input
                                        type="checkbox"
                                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-surface-tertiary bg-surface text-primary focus:ring-primary"
                                        checked={isSelected}
                                        onChange={() => onProductSelect(product._id)}
                                        aria-label={`Seleccionar ${product.name}`}
                                        onClick={(e) => e.stopPropagation()} // Evita que el clic en el checkbox propague otros eventos
                                    />
                                </td>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0">
                                            <img className="h-10 w-10 rounded-md object-cover" src={product.imageUrl || 'https://via.placeholder.com/150'} alt={product.name} />
                                        </div>
                                        <div className="ml-4">
                                            <div className="font-medium text-text-base">{product.name}</div>
                                            <div className="text-text-muted">{product.category}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-text-muted font-mono">{product.sku}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                    <div className="flex items-center justify-center gap-2" title={getStockIndicator(product.stock, product.reorderThreshold).title}>
                                        <span className={getStockIndicator(product.stock, product.reorderThreshold).color}>
                                            {getStockIndicator(product.stock, product.reorderThreshold).icon}
                                        </span>
                                        <span className="text-text-base font-semibold">{product.stock}</span>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-text-muted">
                                    {formatPrice(product.costPrice, 'USD')}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-text-base font-semibold">
                                    {formatPrice(product.price, 'USD')}
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    <div className="flex items-center justify-end gap-4">
                                        <button onClick={() => handleEditClick(product)} className="text-primary hover:text-primary-dark" title="Editar Producto">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => confirmDeleteProduct(product._id)} className="text-red-500 hover:text-red-400" title="Eliminar Producto">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            {/* Filas de las Variantes (si existen) */}
                            {product.variants && product.variants.map(variant => (
                                <tr key={variant._id} className={`transition-colors duration-150 ${isSelected ? 'bg-primary/5' : 'bg-surface-secondary/30 hover:bg-surface-secondary/60'}`}>
                                    {/* Celda vacía para mantener la alineación con la columna de checkboxes */}
                                    <td></td>
                                    <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm sm:pl-6">
                                        <div className="flex items-center pl-8"> {/* Indentación para la variante */}
                                            <div className="h-8 w-8 flex-shrink-0">
                                                <img className="h-8 w-8 rounded-md object-cover" src={variant.imageUrl || product.imageUrl || 'https://via.placeholder.com/150'} alt={variant.name} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="font-medium text-text-base">{variant.name}</div>
                                                <div className="text-text-muted">{variant.color} / {variant.size}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-sm text-text-muted font-mono">{variant.sku}</td>
                                    <td className="whitespace-nowrap px-3 py-3 text-sm text-center">
                                        <div className="flex items-center justify-center gap-2" title={getStockIndicator(variant.stock, variant.reorderThreshold).title}>
                                            <span className={getStockIndicator(variant.stock, variant.reorderThreshold).color}>
                                                {getStockIndicator(variant.stock, variant.reorderThreshold).icon}
                                            </span>
                                            <span className="text-text-base font-semibold">{variant.stock}</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-sm text-text-muted">
                                        {formatPrice(variant.costPrice, 'USD')}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-sm text-text-base font-semibold">
                                        {formatPrice(variant.price, 'USD')}
                                    </td>
                                    <td className="relative whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                        {/* Las acciones de edición/eliminación se manejan a nivel de producto principal */}
                                    </td>
                                </tr>
                            ))}
                        </React.Fragment>
                    )
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default ProductTable;