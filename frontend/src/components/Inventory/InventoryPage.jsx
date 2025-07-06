// C:\Proyectos\Label\frontend\src\components\Inventory\InventoryPage.jsx
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProducts } from '../../redux/productSlice';
import axiosInstance from '../../api/axiosInstance';
import ErrorBoundary from '../Common/ErrorBoundary';

// Importaciones de componentes lazily loaded
const ProductModal = lazy(() => import('../Common/ProductModal'));
const ConfirmDeleteModal = lazy(() => import('../Common/ConfirmModal'));
const ProductFilterAndSearch = lazy(() => import('./ProductFilterAndSearch'));
const ProductList = lazy(() => import('./ProductList'));
const InventoryAlerts = lazy(() => import('./InventoryAlerts'));
const VariantReportTable = lazy(() => import('./VariantReportTable'));
const PaginationControls = lazy(() => import('../Common/PaginationControls'));
const MessageDisplay = lazy(() => import('../Common/MessageDisplay'));

// Importa el nuevo componente lógico del formulario
const AddEditProductFormLogic = lazy(() => import('./AddEditProductFormLogic'));
const InventoryPageHeader = lazy(() => import('./InventoryPageHeader')); // <-- ¡NUEVA LÍNEA!
const ViewSwitcher = lazy(() => import('./ViewSwitcher'));
const ProductTable = lazy(() => import('./ProductTable')); // <-- ¡NUEVA LÍNEA!
const BulkActionsBar = lazy(() => import('./BulkActionsBar'));
const BulkEditCategoryModal = lazy(() => import('./BulkEditCategoryModal'));

// NUEVAS IMPORTACIONES
import { useCurrency } from '../../context/CurrencyContext'; // <-- ¡NUEVA LÍNEA!
const ExchangeRateDisplay = lazy(() => import('../Currency/ExchangeRateDisplay')); // <-- ¡NUEVA LÍNEA!
const ExchangeRateModal = lazy(() => import('../Currency/ExchangeRateModal'));   // <-- ¡NUEVA LÍNEA!

// Íconos de Lucide React, si se usan directamente en este componente principal
import { Loader2, Upload } from 'lucide-react';

// --- FUNCIÓN UTILITARIA (MEJORA DE CALIDAD) ---
// Al mover esta función fuera del componente, se define una sola vez
// y no se recrea en cada renderizado, optimizando el rendimiento.
const generateSkuFromName = (name) => {
    if (!name || name.trim() === '') return '';
    const cleanedName = name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .toUpperCase()
        .split(/\s+/)
        .slice(0, 4)
        .join('-');
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cleanedName.substring(0, 15)}-${hash}`;
};

function InventoryPage() {
    const dispatch = useDispatch();

    // --- ESTADO GLOBAL DE REDUX ---
    // Leemos el estado directamente desde el slice de productos.
    const { products, pagination, status, error: reduxError } = useSelector((state) => state.products);
    const isLoading = status === 'loading';

    // --- ESTADOS LOCALES DE UI ---
    // Estos estados controlan los modales y mensajes, no los datos principales.
    const [localError, setLocalError] = useState(''); // Para errores de UI que no vienen de Redux
    const [successMessage, setSuccessMessage] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const [expandedProducts, setExpandedProducts] = useState(new Set());
    const [currentView, setCurrentView] = useState('grid'); // 'grid' o 'table'

    // Estados para selección múltiple
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
    const [showBulkEditCategoryModal, setShowBulkEditCategoryModal] = useState(false);
    // Estado para el reporte de inventario por variante
    const [variantReport, setVariantReport] = useState([]);
    const [showVariantReport, setShowVariantReport] = useState(false);

    // Estados para filtros y paginación
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todas las Categorías');
    const [currentPage, setCurrentPage] = useState(1);
    const { totalPages } = pagination; // Obtenemos totalPages de la paginación de Redux

    // Estados para opciones de filtro dinámicas
    const [availableCategories, setAvailableCategories] = useState([]);
    const [availableBrands, setAvailableBrands] = useState(['Todas las Marcas']);
    const [selectedBrand, setSelectedBrand] = useState('Todas las Marcas');
    const [availableSuppliers, setAvailableSuppliers] = useState(['Todos los Proveedores']);
    const [selectedSupplier, setSelectedSupplier] = useState('Todos los Proveedores');
    const [availableVariantColors, setAvailableVariantColors] = useState(['Todos los Colores']);
    const [selectedVariantColor, setSelectedVariantColor] = useState('Todos los Colores');
    const [availableVariantSizes, setAvailableVariantSizes] = useState(['Todas las Tallas']);
    const [selectedVariantSize, setSelectedVariantSize] = useState('Todas las Tallas');

    // Estados para ordenamiento
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Referencia para el debounce en la búsqueda de productos globales
    const debounceTimeoutRef = useRef(null);

    // Estado para los datos del producto nuevo (se usa como initialProductData para AddEditProductFormLogic)
    const defaultNewProductState = {
        name: '', description: '', category: '', price: '', stock: '',
        costPrice: '', sku: '', unitOfMeasure: 'unidad', brand: '', supplier: '', imageUrl: '',
        color: '', size: '', material: '', variants: [],
        isPerishable: false, reorderThreshold: 0, optimalMaxStock: 0, shelfLifeDays: 0,
    };
    const [newProductInitialData, setNewProductInitialData] = useState(defaultNewProductState);


    // Opciones predefinidas para la unidad de medida
    const unitOfMeasureOptions = ['unidad', 'kg', 'litro', 'metro', 'paquete', 'caja', 'docena', 'otro'];

    // --- NUEVOS ESTADOS PARA ALERTAS DE STOCK ---
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [highStockAlerts, setHighStockAlerts] = useState([]);

    // Usa el contexto de moneda
    const { exchangeRate, loadingCurrency, currencyError, fetchExchangeRate, updateExchangeRate, convertPrice, formatPrice } = useCurrency(); // <-- ¡NUEVA LÍNEA!

    // Estado para controlar la visibilidad del modal de tasa de cambio
    const [showExchangeRateModal, setShowExchangeRateModal] = useState(false); // <-- ¡NUEVA LÍNEA!

    // Función auxiliar para mostrar mensajes de éxito o error al usuario
    const displayMessage = useCallback((msg, type) => {
        if (type === 'success') {
            setSuccessMessage(msg);
            setLocalError('');
        } else {
            setLocalError(msg);
            setSuccessMessage('');
        }
        setTimeout(() => {
            setSuccessMessage('');
            setLocalError('');
        }, 5000);
    }, []);

    // Obtiene todas las categorías, marcas, proveedores, colores y tallas disponibles para los filtros.
    const fetchFilterOptions = useCallback(async () => {
        try {
            // ¡LLAMADA OPTIMIZADA! Ahora le pegamos al nuevo endpoint.
            const response = await axiosInstance.get('/products/filter-options');
            const { categories, brands, suppliers, variantColors, variantSizes } = response.data;

            setAvailableCategories(['Todas las Categorías', ...categories.sort()]);
            setAvailableBrands(['Todas las Marcas', ...brands.sort()]);
            setAvailableSuppliers(['Todos los Proveedores', ...suppliers.sort()]);
            setAvailableVariantColors(['Todos los Colores', ...variantColors.sort()]);
            setAvailableVariantSizes(['Todas las Tallas', ...variantSizes.sort()]);

        } catch (err) {
            console.error("Error fetching filter options:", err);
            displayMessage('Error al cargar las opciones de filtro. Algunos filtros pueden no estar disponibles.', 'error');
        }
    }, [displayMessage]);

    // --- FUNCIONES PARA OBTENER ALERTAS DE STOCK DESDE EL BACKEND ---
    const fetchLowStockAlerts = useCallback(async () => {
        try {
            const response = await axiosInstance.get('/products/alerts/low-stock');
            setLowStockAlerts(response.data);
        } catch (err) {
            console.error('Error al cargar alertas de stock bajo:', err.response?.data?.message || err.message);
        }
    }, []);

    const fetchHighStockAlerts = useCallback(async () => {
        try {
            const response = await axiosInstance.get('/products/alerts/high-stock');
            setHighStockAlerts(response.data);
        } catch (err) {
            console.error('Error al cargar alertas de stock alto:', err.response?.data?.message || err.message);
        }
    }, []);

    // Extraemos la lógica de edición a una función reutilizable
    const handleEditClick = useCallback((product) => {
        // Prepara los datos del producto para el modal de edición
        setEditingProduct({
            ...product,
            price: product.price !== undefined && product.price !== null ? parseFloat(product.price).toFixed(2) : '',
            costPrice: product.costPrice !== undefined && product.costPrice !== null ? parseFloat(product.costPrice).toFixed(2) : '',
            unitOfMeasure: product.unitOfMeasure || 'unidad',
            brand: product.brand || '',
            supplier: product.supplier || '',
            description: product.description || '',
            imageUrl: product.imageUrl || '',
            color: product.color || '',
            size: product.size || '',
            material: product.material || '',
            isPerishable: product.isPerishable || false,
            reorderThreshold: product.reorderThreshold || 0,
            optimalMaxStock: product.optimalMaxStock || 0,
            shelfLifeDays: product.shelfLifeDays || 0,
            variants: product.variants ? product.variants.map(v => ({
                ...v,
                price: parseFloat(v.price).toFixed(2),
                costPrice: parseFloat(v.costPrice).toFixed(2),
                stock: Number(v.stock),
                unitOfMeasure: v.unitOfMeasure || 'unidad',
                color: v.color || '',
                size: v.size || '',
                material: v.material || '',
                imageUrl: v.imageUrl || '',
                autoGeneratedVariantSku: v.sku && v.sku.trim() !== '' ? '' : generateSkuFromName(v.name || ''),
                isPerishable: v.isPerishable || false,
                reorderThreshold: v.reorderThreshold || 0,
                optimalMaxStock: v.optimalMaxStock || 0,
                shelfLifeDays: v.shelfLifeDays || 0,
            })) : [],
        });
        setShowEditModal(true);
        setShowAddModal(false);
        setLocalError('');
        setSuccessMessage('');
    }, []); // La dependencia de generateSkuFromName se elimina porque ahora es una función estable en el scope del módulo.

    // Función para alternar la visibilidad de las variantes de un producto
    const toggleProductExpansion = useCallback((productId) => {
        setExpandedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    }, []);

    // Function to navigate to the previous page in pagination.
    const goToPrevPage = useCallback(() => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    }, []);

    // Function to navigate to the next page in pagination.
    const goToNextPage = useCallback(() => {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
    }, [totalPages]); // totalPages ahora viene de Redux

    // Función para manejar el ordenamiento de la tabla
    const handleSort = useCallback((columnId) => {
        // Si se hace clic en la misma columna, se invierte el orden.
        // Si es una columna nueva, se ordena ascendentemente por defecto.
        const newSortOrder = sortBy === columnId && sortOrder === 'asc' ? 'desc' : 'asc';
        setSortBy(columnId);
        setSortOrder(newSortOrder);
        // La búsqueda se volverá a disparar automáticamente por el useEffect principal,
        // ya que 'sortBy' y 'sortOrder' son sus dependencias.
    }, [sortBy, sortOrder]);

    // --- FUNCIONES PARA ACCIONES EN LOTE (SELECCIÓN MÚLTIPLE) ---

    const handleProductSelect = useCallback((productId) => {
        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        const visibleProductIds = new Set(products.map(p => p._id));
        const selectedVisibleCount = Array.from(selectedProducts).filter(id => visibleProductIds.has(id)).length;

        if (selectedVisibleCount === visibleProductIds.size) {
            // Todos los visibles están seleccionados, así que los deseleccionamos
            setSelectedProducts(prev => {
                const newSet = new Set(prev);
                visibleProductIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        } else {
            // No todos (o ninguno) están seleccionados, así que seleccionamos todos los visibles
            setSelectedProducts(prev => new Set([...Array.from(prev), ...visibleProductIds]));
        }
    }, [products, selectedProducts]);

    const handleClearSelection = useCallback(() => {
        setSelectedProducts(new Set());
    }, []);

    const confirmDeleteSelected = useCallback(() => {
        if (selectedProducts.size > 0) {
            setShowBulkConfirmModal(true);
        }
    }, [selectedProducts]);

    const handleDeleteSelected = useCallback(async () => {
        const idsToDelete = Array.from(selectedProducts);
        if (idsToDelete.length === 0) return;
        try {
            await axiosInstance.delete('/products', { data: { ids: idsToDelete } });
            displayMessage(`${idsToDelete.length} producto(s) eliminado(s) exitosamente.`, 'success');
            handleClearSelection();
            setShowBulkConfirmModal(false);
            // Forzar recarga de datos
            dispatch(fetchProducts({ searchTerm, category: selectedCategory, brand: selectedBrand, supplier: selectedSupplier, variantColor: selectedVariantColor, variantSize: selectedVariantSize, page: currentPage, limit: 10, sortBy, sortOrder }));
            fetchFilterOptions();
            fetchLowStockAlerts();
            fetchHighStockAlerts();
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al eliminar los productos seleccionados.';
            displayMessage(errorMessage, 'error');
        }
    }, [selectedProducts, dispatch, displayMessage, handleClearSelection, fetchFilterOptions, fetchLowStockAlerts, fetchHighStockAlerts, searchTerm, selectedCategory, selectedBrand, selectedSupplier, selectedVariantColor, selectedVariantSize, currentPage, sortBy, sortOrder]);

    const handleOpenBulkEditCategoryModal = useCallback(() => {
        if (selectedProducts.size > 0) {
            setShowBulkEditCategoryModal(true);
        }
    }, [selectedProducts]);

    const handleBulkUpdateCategory = useCallback(async (newCategory) => {
        const idsToUpdate = Array.from(selectedProducts);
        if (idsToUpdate.length === 0 || !newCategory) return;

        try {
            await axiosInstance.put('/products/bulk-update', {
                ids: idsToUpdate,
                updates: { category: newCategory }
            });
            displayMessage(`${idsToUpdate.length} producto(s) actualizados a la categoría "${newCategory}".`, 'success');
            handleClearSelection();
            setShowBulkEditCategoryModal(false);
            dispatch(fetchProducts({ searchTerm, category: selectedCategory, brand: selectedBrand, supplier: selectedSupplier, variantColor: selectedVariantColor, variantSize: selectedVariantSize, page: currentPage, limit: 10, sortBy, sortOrder }));
            fetchFilterOptions(); // Actualizar filtros por si se creó una nueva categoría
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al actualizar las categorías.';
            displayMessage(errorMessage, 'error');
        }
    }, [selectedProducts, dispatch, displayMessage, handleClearSelection, fetchFilterOptions, searchTerm, selectedCategory, selectedBrand, selectedSupplier, selectedVariantColor, selectedVariantSize, currentPage, sortBy, sortOrder]);

    // --- EFECTO PRINCIPAL PARA CARGAR PRODUCTOS ---
    // Este efecto se dispara cada vez que un filtro, el orden o la página actual cambian.
    useEffect(() => {
        const params = {
            searchTerm,
            category: selectedCategory,
            brand: selectedBrand,
            supplier: selectedSupplier,
            variantColor: selectedVariantColor,
            variantSize: selectedVariantSize,
            page: currentPage,
            limit: 10, // Límite fijo por página
            sortBy,
            sortOrder,
        };
        // Despachamos la acción de Redux para cargar los productos.
        // El slice se encargará de poner el estado en 'loading' y luego en 'succeeded' o 'failed'.
        dispatch(fetchProducts(params));
    }, [dispatch, searchTerm, selectedCategory, selectedBrand, selectedSupplier, selectedVariantColor, selectedVariantSize, currentPage, sortBy, sortOrder]);

    const fetchVariantInventoryReport = useCallback(async () => {
        // No necesitamos setLoading(true) aquí, ya que el estado de carga de Redux es independiente.
        setLocalError('');
        try {
            const response = await axiosInstance.get('/products/reports/variants');
            setVariantReport(response.data);
            setShowVariantReport(true);
        } catch (err) {
            console.error('Error al cargar el reporte de variantes:', err.response?.data?.message || err.message);
            displayMessage('Error al cargar el reporte de variantes. Por favor, inténtalo de nuevo.', 'error');
            setVariantReport([]);
            setShowVariantReport(false);
        }
    }, [displayMessage]);


    // Cierra cualquier modal abierto y reinicia los estados relacionados.
    const closeModal = useCallback(() => {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowBulkEditCategoryModal(false);
        setShowBulkConfirmModal(false);
        setShowConfirmModal(false);
        setProductToDelete(null);
        setLocalError('');
        setSuccessMessage('');
        // Reiniciar los estados del formulario para la próxima apertura del modal
        setNewProductInitialData(defaultNewProductState);
    }, [defaultNewProductState]);

    // Abre el modal para añadir un nuevo producto.
    const openAddModal = useCallback(() => {
        setNewProductInitialData(defaultNewProductState); // Asegura un estado inicial limpio
        setShowAddModal(true);
        setLocalError('');
        setSuccessMessage('');
    }, [defaultNewProductState]);


    // Maneja el envío del formulario para añadir un nuevo producto.
    const handleAddProduct = useCallback(async (productDataToSave) => {
        setLocalError('');
        setSuccessMessage('');

        // Prepara los datos para enviar al backend (ya gestionados en AddEditProductFormLogic)
        const productToSend = {
            ...productDataToSave,
            price: Number(productDataToSave.price),
            stock: Number(productDataToSave.stock),
            costPrice: Number(productDataToSave.costPrice),
            isPerishable: Boolean(productDataToSave.isPerishable),
            reorderThreshold: Number(productDataToSave.reorderThreshold),
            optimalMaxStock: Number(productDataToSave.optimalMaxStock),
            shelfLifeDays: Number(productDataToSave.shelfLifeDays),
        };

        productToSend.variants = productDataToSave.variants.map(variant => ({
            ...variant,
            price: Number(variant.price),
            costPrice: Number(variant.costPrice),
            stock: Number(variant.stock),
            isPerishable: Boolean(variant.isPerishable),
            reorderThreshold: Number(variant.reorderThreshold),
            optimalMaxStock: Number(variant.optimalMaxStock),
            shelfLifeDays: Number(variant.shelfLifeDays),
        }));


        try {
            await axiosInstance.post('/products', productToSend);
            displayMessage('Producto añadido exitosamente.', 'success');
            closeModal();
            // Despachamos la acción para que Redux recargue la lista.
            // Esto asegura que la paginación y los filtros se respeten.
            dispatch(fetchProducts({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })); // Volver a la primera página para ver el nuevo producto
            fetchFilterOptions();
            fetchLowStockAlerts();
            fetchHighStockAlerts();
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al añadir producto. Por favor, inténtalo de nuevo.';
            displayMessage(errorMessage, 'error');
        }
    }, [dispatch, displayMessage, closeModal, fetchFilterOptions, fetchLowStockAlerts, fetchHighStockAlerts]);


    // Maneja el envío del formulario para actualizar un producto existente.
    const handleUpdateProduct = useCallback(async (productDataToSave) => {
        if (!productDataToSave || !productDataToSave._id) return;

        setLocalError('');
        setSuccessMessage('');

        const productToSend = {
            ...productDataToSave,
            price: Number(productDataToSave.price),
            stock: Number(productDataToSave.stock),
            costPrice: Number(productDataToSave.costPrice),
            isPerishable: Boolean(productDataToSave.isPerishable),
            reorderThreshold: Number(productDataToSave.reorderThreshold),
            optimalMaxStock: Number(productDataToSave.optimalMaxStock),
            shelfLifeDays: Number(productDataToSave.shelfLifeDays),
        };

        productToSend.variants = productDataToSave.variants.map(variant => ({
            ...variant,
            price: Number(variant.price),
            costPrice: Number(variant.costPrice),
            stock: Number(variant.stock),
            isPerishable: Boolean(variant.isPerishable),
            reorderThreshold: Number(variant.reorderThreshold),
            optimalMaxStock: Number(variant.optimalMaxStock),
            shelfLifeDays: Number(variant.shelfLifeDays),
            ...(variant._id && { _id: variant._id }) // Mantener _id para variantes existentes
        }));

        try {
            await axiosInstance.put(`/products/${productDataToSave._id}`, productToSend);
            displayMessage('Producto actualizado exitosamente.', 'success');
            closeModal();
            // Despachamos la acción para que Redux recargue la lista con los datos actualizados.
            dispatch(fetchProducts({ searchTerm, category: selectedCategory, brand: selectedBrand, supplier: selectedSupplier, variantColor: selectedVariantColor, variantSize: selectedVariantSize, page: currentPage, limit: 10, sortBy, sortOrder }));
            fetchFilterOptions();
            fetchLowStockAlerts();
            fetchHighStockAlerts();
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al actualizar producto. Por favor, inténtalo de nuevo.';
            displayMessage(errorMessage, 'error');
        }
    }, [dispatch, displayMessage, closeModal, fetchFilterOptions, fetchLowStockAlerts, fetchHighStockAlerts, searchTerm, selectedCategory, selectedBrand, selectedSupplier, selectedVariantColor, selectedVariantSize, currentPage, sortBy, sortOrder]);


    // Displays a confirmation modal before deleting a product.
    const confirmDeleteProduct = useCallback((productId) => {
        setProductToDelete(productId);
        setShowConfirmModal(true);
        setSuccessMessage('');
    }, []);

    // Handles the actual deletion of a product after user confirmation.
    const handleDeleteProduct = useCallback(async (e) => {
        e.stopPropagation();
        if (!productToDelete) {
            displayMessage('No se pudo identificar el producto a eliminar.', 'error');
            return;
        }

        try {
            setLocalError('');
            setSuccessMessage('');
            await axiosInstance.delete(`/products/${productToDelete}`);

            displayMessage('Producto eliminado exitosamente.', 'success');

            // Ajustar página actual si se eliminó el último producto de la página
            if (products.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                // Refrescar la lista actual
                dispatch(fetchProducts({ searchTerm, category: selectedCategory, brand: selectedBrand, supplier: selectedSupplier, variantColor: selectedVariantColor, variantSize: selectedVariantSize, page: currentPage, limit: 10, sortBy, sortOrder }));
            }

            closeModal();
            fetchFilterOptions();
            fetchLowStockAlerts();
            fetchHighStockAlerts();

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al eliminar producto. Por favor, inténtalo de nuevo.';
            displayMessage(errorMessage, 'error');
        }
    }, [dispatch, productToDelete, products.length, currentPage, closeModal, fetchFilterOptions, fetchLowStockAlerts, fetchHighStockAlerts, displayMessage, searchTerm, selectedCategory, selectedBrand, selectedSupplier, selectedVariantColor, selectedVariantSize, sortBy, sortOrder]);

    // NUEVA FUNCIÓN PARA EXPORTAR EL REPORTE A CSV (pasa a VariantReportTable)
    const exportVariantReportToCSV = useCallback((data) => {
        if (!data || data.length === 0) {
            displayMessage('No hay datos en el reporte para exportar.', 'error');
            return;
        }

        const headers = [
            'Producto Principal', 'Variante', 'SKU Variante', 'Stock', 'Precio Venta Unitario',
            'Valor Total (Stock * Precio)', 'Costo Unitario', 'Costo Total (Stock * Costo)',
            'Perecedero', 'Umbral Reapro.', 'Vida Útil (Días)'
        ];

        const csvRows = data.map(item => {
            return [
                `"${item.productName}"`,
                `"${item.variantName}"`,
                `"${item.variantSku}"`,
                item.variantStock,
                parseFloat(item.variantPrice).toFixed(2),
                parseFloat(item.variantTotalValue).toFixed(2), // Valor total de venta
                parseFloat(item.variantTotalCostValue).toFixed(2), // Valor total de costo
                item.variantIsPerishable ? 'Sí' : 'No',
                item.variantReorderThreshold,
                item.variantShelfLifeDays > 0 ? `${item.variantShelfLifeDays} días` : 'N/A'
            ].join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'reporte_inventario_variantes.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            displayMessage('Reporte exportado exitosamente a CSV.', 'success');
        } else {
            window.open('data:text/csv;charset=utf-8,' + escape(csvContent));
            displayMessage('Reporte generado en una nueva ventana. Por favor, guarda el archivo manualmente.', 'success');
        }
    }, [displayMessage]);

    // Efecto para obtener productos y opciones de filtro al montar el componente y cuando las dependencias cambian.
    useEffect(() => {
        // Este efecto se ejecuta UNA SOLA VEZ al montar la página para cargar datos que no cambian con frecuencia.
        // Se encadenan con async/await para que se ejecuten en orden y no ahoguen al navegador.
        const loadInitialData = async () => {
            await fetchFilterOptions();
            await fetchLowStockAlerts();
            await fetchHighStockAlerts();
            // Ya no llamamos a fetchExchangeRate aquí, el CurrencyContext se encarga.
        };
        loadInitialData();
    }, [fetchFilterOptions, fetchLowStockAlerts, fetchHighStockAlerts]);


    // JSX para renderizar el componente de la página de inventario
    return (
        <ErrorBoundary>
            {/* Este div ya no necesita clases de layout (padding, background, height)
                porque el DashboardLayout ya las proporciona. Solo actúa como un contenedor. */}
            <div>
                {/* Mensaje de error destacado */}
                {(reduxError || localError) && (
                    <div className="mb-4 p-4 bg-red-900 bg-opacity-30 text-red-300 rounded-lg text-center font-semibold">
                        {reduxError || localError}
                    </div>
                )}

                {/* RECOMENDACIÓN 1: Cabecera de Página Unificada */}
                <Suspense fallback={<div>Cargando cabecera...</div>}>
                    <InventoryPageHeader
                        onAddProductClick={openAddModal}
                        onShowReportClick={() => {
                            if (!showVariantReport) fetchVariantInventoryReport();
                            else setShowVariantReport(false);
                        }}
                        isReportVisible={showVariantReport}
                        canExport={showVariantReport && variantReport.length > 0}
                        onExportClick={() => exportVariantReportToCSV(variantReport)}
                        onSuggestPricesClick={() => displayMessage('La lógica de actualización inteligente de precios se implementará aquí.', 'info')}
                    />
                </Suspense>

                {/* Modal de Confirmación para Eliminación MÚLTIPLE */}
                <Suspense fallback={<div>Cargando confirmación...</div>}>
                    <ConfirmDeleteModal
                        isOpen={showBulkConfirmModal}
                        onClose={closeModal}
                        onConfirm={handleDeleteSelected}
                        title={`Confirmar Eliminación Múltiple (${selectedProducts.size})`}
                        message={`¿Estás seguro de que quieres eliminar los ${selectedProducts.size} productos seleccionados? Esta acción no se puede deshacer.`}
                        confirmButtonText="Sí, Eliminar Todo"
                        confirmButtonVariant="danger"
                    />
                </Suspense>

                {/* Modal para Editar Categoría en Lote */}
                <Suspense fallback={<div>Cargando modal de edición...</div>}>
                    <BulkEditCategoryModal
                        isOpen={showBulkEditCategoryModal}
                        onClose={closeModal}
                        onSave={handleBulkUpdateCategory}
                        availableCategories={availableCategories}
                        selectedCount={selectedProducts.size}
                    />
                </Suspense>


                <Suspense fallback={<div>Cargando tasa...</div>}>
                    <ExchangeRateDisplay
                        exchangeRate={exchangeRate}
                        loading={loadingCurrency}
                        error={currencyError}
                        formatPrice={formatPrice}
                        primaryCurrency={exchangeRate?.fromCurrency || 'USD'}
                        secondaryCurrency={exchangeRate?.toCurrency || 'VES'}
                    />
                </Suspense>

                {/* Visualización de Mensajes de Éxito y Error */}
                <Suspense fallback={<div>Cargando mensajes...</div>}>
                    <MessageDisplay successMessage={successMessage} error={reduxError || localError} />
                </Suspense>

                {/* Modal de Confirmación para Eliminación */}
                <Suspense fallback={<div>Cargando confirmación...</div>}>
                    <ConfirmDeleteModal
                        isOpen={showConfirmModal}
                        onClose={closeModal}
                        onConfirm={handleDeleteProduct}
                        title="Confirmar Eliminación"
                        message="¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer."
                    />
                </Suspense>

                {/* Sección de Búsqueda, Filtros y Añadir Producto */}
                <Suspense fallback={<div className="bg-deep-night-blue p-6 rounded-lg shadow-inner mb-8 border border-neutral-gray-700 h-32 flex items-center justify-center text-neutral-light">Cargando filtros...</div>}>
                    <ProductFilterAndSearch
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        availableCategories={availableCategories}
                        selectedBrand={selectedBrand}
                        setSelectedBrand={setSelectedBrand}
                        availableBrands={availableBrands}
                        selectedSupplier={selectedSupplier}
                        setSelectedSupplier={setSelectedSupplier}
                        availableSuppliers={availableSuppliers}
                        selectedVariantColor={selectedVariantColor}
                        setSelectedVariantColor={setSelectedVariantColor}
                        availableVariantColors={availableVariantColors}
                        selectedVariantSize={selectedVariantSize}
                        setSelectedVariantSize={setSelectedVariantSize}
                        availableVariantSizes={availableVariantSizes}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        sortOrder={sortOrder}
                        setSortOrder={setSortOrder}
                        onAddProductClick={openAddModal}
                    />
                </Suspense>

                {/* Modal para Configurar Tasa de Cambio */}
                <Suspense fallback={<div>Cargando modal de tasa...</div>}>
                    {showExchangeRateModal && (
                        <ExchangeRateModal
                            isOpen={showExchangeRateModal}
                            onClose={() => setShowExchangeRateModal(false)}
                            currentExchangeRate={exchangeRate}
                            loading={loadingCurrency}
                            error={currencyError}
                            onSave={updateExchangeRate}
                        />
                    )}
                </Suspense>

                {/* Sección de Alertas de Stock */}
                <Suspense fallback={<div className="mb-6 p-4 border rounded-md bg-yellow-900 bg-opacity-20 text-yellow-300">Cargando alertas...</div>}>
                    <InventoryAlerts lowStockAlerts={lowStockAlerts} highStockAlerts={highStockAlerts} />
                </Suspense>

                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-3xl font-semibold text-text-base border-b border-surface-secondary pb-3 flex-grow">
                        Lista de Productos
                    </h3>
                    <Suspense fallback={<div className="w-24 h-10 bg-surface-secondary rounded-lg animate-pulse" />}>
                        <ViewSwitcher currentView={currentView} setCurrentView={setCurrentView} />
                    </Suspense>
                </div>

                {/* Renderizado condicional para carga, no hay productos o lista de productos */}
                {isLoading && !products?.length ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 size={48} className="animate-spin text-copper-rose-accent" />
                        <span className="sr-only">Cargando...</span>
                    </div>
                ) : products?.length === 0 ? (
                    <p className="text-neutral-gray-300 text-lg text-center mt-10">No hay productos que coincidan con la búsqueda o el filtro. ¡Intenta añadir uno!</p>
                ) : (
                    <Suspense fallback={
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <div className="h-64 bg-deep-night-blue rounded-lg animate-pulse"></div>
                            <div className="h-64 bg-deep-night-blue rounded-lg animate-pulse"></div>
                            <div className="h-64 bg-deep-night-blue rounded-lg animate-pulse"></div>
                        </div>
                    }>
                        {currentView === 'grid' ? (
                            <ProductList
                                products={products}
                                handleEditClick={handleEditClick}
                                confirmDeleteProduct={confirmDeleteProduct}
                                expandedProducts={expandedProducts}
                                toggleProductExpansion={toggleProductExpansion}
                            />
                        ) : (
                            <ProductTable
                                products={products}
                                handleEditClick={handleEditClick}
                                confirmDeleteProduct={confirmDeleteProduct}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSort={handleSort}
                                selectedProducts={selectedProducts}
                                onProductSelect={handleProductSelect}
                                onSelectAll={handleSelectAll}
                            />
                        )}
                    </Suspense>
                )}

                {/* Modal para Añadir Producto */}
                <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"><Loader2 size={48} className="animate-spin text-action-blue" /></div>}>
                    {showAddModal && (
                        <ProductModal
                            isOpen={showAddModal}
                            onClose={closeModal}
                            title="Añadir Nuevo Producto"
                        >
                            {/* Ahora renderizamos AddEditProductFormLogic */}
                            <AddEditProductFormLogic
                                isNewProduct={true}
                                initialProductData={newProductInitialData} // Pasa el estado inicial para el nuevo producto
                                onProductSave={handleAddProduct} // Callback para guardar
                                loading={isLoading}
                                displayMessage={displayMessage}
                                unitOfMeasureOptions={unitOfMeasureOptions}
                                debounceTimeoutRef={debounceTimeoutRef}
                                currencyContext={useCurrency()} // Pasamos el contexto completo
                            />
                        </ProductModal>
                    )}
                </Suspense>

                {/* Modal para Editar Producto */}
                <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"><Loader2 size={48} className="animate-spin text-action-blue" /></div>}>
                    {showEditModal && editingProduct && (
                        <ProductModal
                            isOpen={showEditModal}
                            onClose={closeModal}
                            title={`Editar Producto: ${editingProduct?.name || ''}`}
                        >
                            {/* Ahora renderizamos AddEditProductFormLogic */}
                            <AddEditProductFormLogic
                                isNewProduct={false}
                                initialProductData={editingProduct} // Pasa el producto a editar
                                onProductSave={handleUpdateProduct} // Callback para actualizar
                                loading={isLoading}
                                displayMessage={displayMessage}
                                unitOfMeasureOptions={unitOfMeasureOptions}
                                debounceTimeoutRef={debounceTimeoutRef}
                                currencyContext={useCurrency()} // Pasamos el contexto completo
                            />
                        </ProductModal>
                    )}
                </Suspense>


                {/* Reporte de Inventario por Variante */}
                <Suspense fallback={<div className="mt-12 bg-deep-night-blue p-8 rounded-lg shadow-2xl border border-action-blue-light h-64 flex items-center justify-center text-neutral-light">Cargando reporte...</div>}>
                    {showVariantReport && variantReport.length > 0 && (
                        <VariantReportTable
                            variantReport={variantReport}
                            loading={isLoading}
                            exportVariantReportToCSV={exportVariantReportToCSV}
                        />
                    )}
                    {showVariantReport && variantReport.length === 0 && !isLoading && (
                        <p className="text-neutral-gray-300 text-lg text-center mt-10">No hay datos de variantes para generar el reporte.</p>
                    )}
                </Suspense>

                {/* Controles de Paginación */}
                <Suspense fallback={<div>Cargando paginación...</div>}>
                    {totalPages > 1 && (
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            goToPrevPage={goToPrevPage}
                            goToNextPage={goToNextPage}
                            loading={isLoading}
                        />
                    )}
                </Suspense>

                {/* Barra de Acciones en Lote */}
                <AnimatePresence>
                    {selectedProducts.size > 0 && (
                        <Suspense>
                            <BulkActionsBar
                                selectedCount={selectedProducts.size}
                                onClearSelection={handleClearSelection}
                                onDeleteSelected={confirmDeleteSelected}
                                onEditCategory={handleOpenBulkEditCategoryModal}
                            />
                        </Suspense>
                    )}
                </AnimatePresence>

            </div>
        </ErrorBoundary>
    );
}

export default InventoryPage;