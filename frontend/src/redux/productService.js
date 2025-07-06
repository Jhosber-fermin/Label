// C:\Proyectos\Label\frontend\src\redux\productService.js
import axiosInstance from '../api/axiosInstance';

// Obtener productos del usuario con filtros, paginación y ordenamiento
const getProducts = async (params = {}) => {
    const {
        searchTerm,
        category,
        brand,
        supplier,
        variantColor,
        variantSize,
        page,
        limit,
        sortBy,
        sortOrder,
    } = params;

    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.append('searchTerm', searchTerm);
    if (category && category !== 'Todas las Categorías') queryParams.append('category', category);
    if (brand && brand !== 'Todas las Marcas') queryParams.append('brand', brand);
    if (supplier && supplier !== 'Todos los Proveedores') queryParams.append('supplier', supplier);
    if (variantColor && variantColor !== 'Todos los Colores') queryParams.append('variantColor', variantColor);
    if (variantSize && variantSize !== 'Todas las Tallas') queryParams.append('variantSize', variantSize);
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (sortBy) queryParams.append('sortBy', sortBy);
    if (sortOrder) queryParams.append('sortOrder', sortOrder);

    const response = await axiosInstance.get(`/products?${queryParams.toString()}`);
    return response.data;
};

const productService = {
  getProducts,
};

export default productService;