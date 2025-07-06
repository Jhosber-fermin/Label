// productController.js
import asyncHandler from 'express-async-handler';
import { productService } from '../services/productService.js';

// @desc    Obtener todos los productos del usuario con filtros, paginación y ordenamiento
// @route   GET /api/products
// @access  Private
const getProducts = asyncHandler(async (req, res) => {
    const result = await productService.getProducts(req.user.id, req.query);
    res.status(200).json(result);
});

// @desc    Obtener un producto por ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = asyncHandler(async (req, res) => {
    const product = await productService.getProductById(req.params.id, req.user.id);
    res.status(200).json(product);
});

// @desc    Crear un nuevo producto
// @route   POST /api/products
// @access  Private
const createProduct = asyncHandler(async (req, res) => {
    const product = await productService.createProduct(req.body, req.user.id);
    res.status(201).json(product);
});

// @desc    Actualizar un producto
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = asyncHandler(async (req, res) => {
    const updatedProduct = await productService.updateProduct(
        req.params.id,
        req.body,
        req.user.id
    );
    res.status(200).json(updatedProduct);
});

// @desc    Actualizar campos en múltiples productos (en lote)
// @route   PUT /api/products/bulk-update
// @access  Private
const updateMultipleProducts = asyncHandler(async (req, res) => {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('Se requiere un array de IDs de productos.');
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
        res.status(400);
        throw new Error('Se requieren los campos a actualizar.');
    }

    // La lógica de actualización se delega al servicio para mantener el controlador limpio.
    const result = await productService.updateMultipleProducts(ids, updates, req.user.id);

    res.status(200).json({ message: `${result.modifiedCount} productos actualizados exitosamente.` });
});

// @desc    Eliminar un producto
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = asyncHandler(async (req, res) => {
    await productService.deleteProduct(req.params.id, req.user.id);
    res.status(200).json({ message: 'Producto eliminado exitosamente.' });
});

// @desc    Eliminar múltiples productos
// @route   DELETE /api/products
// @access  Private
const deleteMultipleProducts = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('Se requiere un array de IDs de productos.');
    }

    // Asumimos que tienes un método en tu servicio para esto.
    // Si no, la lógica de Product.deleteMany iría aquí.
    const result = await productService.deleteMultipleProducts(ids, req.user.id);

    res.status(200).json({ message: `${result.deletedCount} productos eliminados exitosamente.` });
});

// @desc    Obtener reporte de inventario detallado por variante
// @route   GET /api/products/reports/variants
// @access  Private
const getVariantInventoryReport = asyncHandler(async (req, res) => {
    const report = await productService.getVariantInventoryReport(req.user.id);
    res.status(200).json(report);
});

// @desc    Obtener productos con stock bajo
// @route   GET /api/products/alerts/low-stock
// @access  Private
const getLowStockProducts = asyncHandler(async (req, res) => {
    const products = await productService.getLowStockProducts(req.user.id);
    res.status(200).json(products);
});

// @desc    Obtener productos con stock alto (perecederos)
// @route   GET /api/products/alerts/high-stock
// @access  Private
const getHighStockProducts = asyncHandler(async (req, res) => {
    const products = await productService.getHighStockProducts(req.user.id);
    res.status(200).json(products);
});

// @desc    Obtener las opciones de filtro para el inventario
// @route   GET /api/products/filter-options
// @access  Private
const getProductFilterOptions = asyncHandler(async (req, res) => {
    const options = await productService.getFilterOptions(req.user.id);
    res.status(200).json(options);
});


export {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    updateMultipleProducts,
    deleteProduct,
    deleteMultipleProducts, // <-- Exportar la nueva función
    getLowStockProducts,
    getHighStockProducts,
    getVariantInventoryReport,
    getProductFilterOptions, // <-- Exportar la nueva función
};
