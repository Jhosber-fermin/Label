// C:\Proyectos\Label\backend\controllers\productController.js
const asyncHandler = require('express-async-handler');
const Product = require('../models/productModel'); // Asegúrate de que esta línea sea correcta
const logInventoryMovement = require('../utils/inventoryLogger'); // <-- ¡NUEVA LÍNEA!

// @desc    Obtener todos los productos
// @route   GET /api/products
// @access  Private
const getProducts = asyncHandler(async (req, res) => {
    // Asegura que solo se vean los productos del usuario autenticado
    const userId = req.user.id;

    // Destructure new sorting parameters
    const { searchTerm, category, brand, supplier, variantColor, variantSize, page, limit, sortBy, sortOrder } = req.query;

    const query = { user: userId };

    if (searchTerm) {
        query.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { sku: { $regex: searchTerm, '$options': 'i' } },
            { brand: { $regex: searchTerm, '$options': 'i' } },
            { supplier: { $regex: searchTerm, '$options': 'i' } },
            { color: { $regex: searchTerm, '$options': 'i' } },
            { size: { $regex: searchTerm, '$options': 'i' } },
            { material: { $regex: searchTerm, '$options': 'i' } },
            // Search also in variants
            { 'variants.name': { $regex: searchTerm, $options: 'i' } },
            { 'variants.sku': { $regex: searchTerm, '$options': 'i' } },
            { 'variants.color': { $regex: searchTerm, '$options': 'i' } },
            { 'variants.size': { $regex: searchTerm, '$options': 'i' } },
            { 'variants.material': { $regex: searchTerm, '$options': 'i' } },
        ];
    }

    if (category && category !== 'Todas las Categorías') {
        query.category = category;
    }
    if (brand && brand !== 'Todas las Marcas') {
        query.brand = brand;
    }
    if (supplier && supplier !== 'Todos los Proveedores') {
        query.supplier = supplier;
    }
    if (variantColor && variantColor !== 'Todos los Colores') {
        query['variants.color'] = variantColor;
    }
    if (variantSize && variantSize !== 'Todas las Tallas') {
        query['variants.size'] = variantSize;
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Define sorting options based on sortBy and sortOrder
    let sortOptions = {};
    if (sortBy) {
        const order = sortOrder === 'desc' ? -1 : 1;
        switch (sortBy) {
            case 'name':
                sortOptions.name = order;
                break;
            case 'price':
                sortOptions.price = order;
                break;
            case 'stock':
                sortOptions.stock = order;
                break;
            case 'category':
                sortOptions.category = order;
                break;
            case 'brand':
                sortOptions.brand = order;
                break;
            case 'createdAt':
                sortOptions.createdAt = order;
                break;
            default:
                sortOptions.createdAt = -1;
        }
    } else {
        sortOptions.createdAt = -1;
    }

    const products = await Product.find(query)
        .sort(sortOptions) // Apply the dynamic sortOptions
        .skip(skip)
        .limit(limitNum);

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limitNum);

    res.status(200).json({
        products,
        pagination: {
            currentPage: pageNum,
            totalPages,
            totalProducts,
            limit: limitNum,
        },
    });
});

// @desc    Obtener un producto por ID
// @route   GET /api/products/:id
// @access  Private
const getProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    if (product.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized to view this product');
    }

    res.status(200).json(product);
});

// @desc    Crear un nuevo producto
// @route   POST /api/products
// @access  Private
const createProduct = asyncHandler(async (req, res) => {
    console.log('Product data received in createProduct:', JSON.stringify(req.body, null, 2));

    const {
        name,
        description,
        category,
        price,
        stock,
        costPrice,
        sku,
        unitOfMeasure,
        brand,
        supplier,
        imageUrl,
        color,
        size,
        material,
        isPerishable,
        reorderThreshold,
        optimalMaxStock,
        shelfLifeDays,
        variants
    } = req.body;

    if (!variants || variants.length === 0) {
        if (!name || !category || price === undefined || stock === undefined || costPrice === undefined || !sku || !unitOfMeasure) {
            res.status(400);
            throw new Error('Please complete all mandatory fields for the main product if there are no variants.');
        }
        if (isNaN(Number(price)) || Number(price) <= 0) {
            res.status(400);
            throw new Error('Selling price must be a positive number.');
        }
        if (isNaN(Number(costPrice)) || Number(costPrice) < 0) {
            res.status(400);
            throw new Error('Unit cost must be a non-negative number.');
        }
        if (isNaN(Number(stock)) || Number(stock) < 0) {
            res.status(400);
            throw new Error('Stock must be a non-negative number.');
        }
    } else {
        for (const variant of variants) {
            if (!variant.name || variant.price === undefined || variant.costPrice === undefined || variant.stock === undefined || !variant.unitOfMeasure) {
                res.status(400);
                throw new Error('All variants must have name, price, cost, stock, and unit of measure.');
            }
            if (isNaN(Number(variant.price)) || Number(variant.price) <= 0) {
                res.status(400);
                throw new Error('Variant price must be a positive number.');
            }
            if (isNaN(Number(variant.costPrice)) || Number(variant.costPrice) < 0) {
                res.status(400);
                throw new Error('Variant cost must be a non-negative number.');
            }
            if (isNaN(Number(variant.stock)) || Number(variant.stock) < 0) {
                res.status(400);
                throw new Error('Variant stock must be a non-negative number.');
            }
        }
    }

    const processedVariants = variants ? variants.map(variant => {
        const finalVariantSku = variant.sku || variant.autoGeneratedVariantSku || '';
        
        return {
            ...variant,
            sku: finalVariantSku,
            price: Number(variant.price),
            costPrice: Number(variant.costPrice),
            stock: Number(variant.stock),
            isPerishable: Boolean(variant.isPerishable),
            reorderThreshold: Number(variant.reorderThreshold) || 0,
            optimalMaxStock: Number(variant.optimalMaxStock) || 0,
            shelfLifeDays: Number(variant.shelfLifeDays) || 0,
        };
    }) : [];

    const productFields = {
        user: req.user.id,
        name,
        description,
        category,
        brand,
        supplier,
        imageUrl: imageUrl || '',
        color: color || '',
        size: size || '',
        material: material || '',
        variants: processedVariants,
        sku: sku,
        price: price,
        stock: stock,
        costPrice: costPrice,
        unitOfMeasure: unitOfMeasure,
        isPerishable: Boolean(isPerishable),
        reorderThreshold: Number(reorderThreshold) || 0,
        optimalMaxStock: Number(optimalMaxStock) || 0,
        shelfLifeDays: Number(shelfLifeDays) || 0,
        // ¡NUEVOS CAMPOS DE MONEDA!
        baseCurrency: req.body.baseCurrency || 'USD',
        costCurrency: req.body.costCurrency || 'USD', // <-- Asegúrate de pasar estos
        saleCurrency: req.body.saleCurrency || 'USD', // <-- Asegúrate de pasar estos
        displayCurrency: req.body.displayCurrency || req.body.saleCurrency || 'USD', // <-- Asegúrate de pasar este

        // Los campos `price`, `stock`, `costPrice`, `sku`, `unitOfMeasure` deben venir del `req.body`
        // y no ser redefinidos aquí si no es necesario, ya que el `pre-save hook` los ajusta.
    };

    try {
        const product = await Product.create(productFields);

        // --- REGISTRAR MOVIMIENTO DE INVENTARIO POR CREACIÓN DE PRODUCTO ---
    if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
            if (variant.stock > 0) {
                await logInventoryMovement({
                    user: req.user.id,
                    product: product._id,
                    variantId: variant._id,
                    productName: product.name,
                    variantName: variant.name,
                    sku: variant.sku,
                    movementType: 'in',
                    quantityChange: variant.stock,
                    finalStock: variant.stock, // Stock inicial de la variante
                    reason: 'initial_stock',
                    session: undefined, // No es parte de una transacción de venta
                });
            }
        }
    } else if (product.stock > 0) {
        await logInventoryMovement({
            user: req.user.id,
            product: product._id,
            productName: product.name,
            sku: product.sku,
            movementType: 'in',
            quantityChange: product.stock,
            finalStock: product.stock, // Stock inicial del producto principal
            reason: 'initial_stock',
            session: undefined,
        });
    }
    // --- FIN REGISTRO MOVIMIENTO DE INVENTARIO ---

        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        if (error.code === 11000 && error.keyPattern && error.keyPattern.sku) {
            return res.status(400).json({ message: 'The main product SKU already exists. Please enter a unique SKU.' });
        }
        res.status(500).json({ message: 'Internal server error creating product.' });
    }
});


// @desc    Actualizar un producto
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = asyncHandler(async (req, res) => {
    console.log('Product data received in updateProduct:', JSON.stringify(req.body, null, 2));

    const { id } = req.params;
    const {
        name,
        description,
        category,
        price,
        stock,
        costPrice,
        sku,
        unitOfMeasure,
        brand,
        supplier,
        imageUrl,
        color,
        size,
        material,
        isPerishable,
        reorderThreshold,
        optimalMaxStock,
        shelfLifeDays,
        variants
    } = req.body;

    const product = await Product.findById(id);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    if (product.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized to update this product');
    }

    if (!variants || variants.length === 0) {
        if (!name || !category || price === undefined || stock === undefined || costPrice === undefined || !sku || !unitOfMeasure) {
            res.status(400);
            throw new Error('Please complete all mandatory fields for the main product if there are no variants.');
        }
        if (isNaN(Number(price)) || Number(price) <= 0) {
            res.status(400);
            throw new Error('Selling price must be a positive number.');
        }
        if (isNaN(Number(costPrice)) || Number(costPrice) < 0) {
            res.status(400);
            throw new Error('Unit cost must be a non-negative number.');
        }
        if (isNaN(Number(stock)) || Number(stock) < 0) {
            res.status(400);
            throw new Error('Stock must be a non-negative number.');
        }
    } else {
        for (const variant of variants) {
            if (!variant.name || variant.price === undefined || variant.costPrice === undefined || variant.stock === undefined || !variant.unitOfMeasure) { // Corrected: variant.price !== undefined
                res.status(400);
                throw new Error('All variants must have name, price, cost, stock, and unit of measure.');
            }
            if (isNaN(Number(variant.price)) || Number(variant.price) <= 0) {
                res.status(400);
                throw new Error('Variant price must be a positive number.');
            }
            if (isNaN(Number(variant.costPrice)) || Number(variant.costPrice) < 0) {
                res.status(400);
                throw new Error('Variant cost must be a non-negative number.');
            }
            if (isNaN(Number(variant.stock)) || Number(variant.stock) < 0) {
                res.status(400);
                throw new Error('Variant stock must be a non-negative number.');
            }
        }
    }

    const processedVariants = variants ? variants.map(variant => {
        const finalVariantSku = variant.sku || variant.autoGeneratedVariantSku || '';

        return {
            ...variant,
            sku: finalVariantSku,
            price: Number(variant.price),
            costPrice: Number(variant.costPrice),
            stock: Number(variant.stock),
            isPerishable: Boolean(variant.isPerishable),
            reorderThreshold: Number(variant.reorderThreshold) || 0,
            optimalMaxStock: Number(variant.optimalMaxStock) || 0,
            shelfLifeDays: Number(variant.shelfLifeDays) || 0,
        };
    }) : [];

    product.name = name;
    product.description = description;
    product.category = category;
    product.brand = brand;
    product.supplier = supplier;
    product.imageUrl = imageUrl || '';
    
    product.sku = sku;
    product.price = price;
    product.stock = stock;
    product.costPrice = costPrice;
    product.unitOfMeasure = unitOfMeasure;
    product.color = color;
    product.size = size;
    product.material = material;
    product.isPerishable = Boolean(isPerishable);
    product.reorderThreshold = Number(reorderThreshold) || 0;
    product.optimalMaxStock = Number(optimalMaxStock) || 0;
    product.shelfLifeDays = Number(shelfLifeDays) || 0;

    // ¡NUEVOS CAMPOS DE MONEDA!
    product.baseCurrency = req.body.baseCurrency || 'USD';
    product.costCurrency = req.body.costCurrency || product.costCurrency || 'USD'; // Mantener el valor existente si no se provee
    product.saleCurrency = req.body.saleCurrency || product.saleCurrency || 'USD';
    product.displayCurrency = req.body.displayCurrency || product.saleCurrency || product.displayCurrency || 'USD';

    product.sku = sku; // Asegúrate de que este también se actualice si cambia
    product.price = price;
    product.stock = stock;
    product.costPrice = costPrice;
    product.unitOfMeasure = unitOfMeasure;

    product.variants = processedVariants;
    product.baseCurrency = req.body.baseCurrency || 'USD'; // <-- ¡AÑADE ESTO!

// --- LÓGICA DE REGISTRO DE MOVIMIENTOS DE INVENTARIO POR ACTUALIZACIÓN ---
const oldProduct = await Product.findById(id); // Traemos el producto viejo para comparar stock

try {
    const updatedProduct = await product.save();

    if (oldProduct) {
        if (oldProduct.variants && oldProduct.variants.length > 0) {
            // Lógica para productos con variantes
            for (const updatedVariant of updatedProduct.variants) {
                const oldVariant = oldProduct.variants.id(updatedVariant._id);

                if (oldVariant && oldVariant.stock !== updatedVariant.stock) {
                    const quantityDiff = Math.abs(updatedVariant.stock - oldVariant.stock);
                    const movementType = updatedVariant.stock > oldVariant.stock ? 'in' : 'out';
                    const reason = 'adjustment'; // Asumimos que es un ajuste manual por update

                    await logInventoryMovement({
                        user: req.user.id,
                        product: updatedProduct._id,
                        variantId: updatedVariant._id,
                        productName: updatedProduct.name,
                        variantName: updatedVariant.name,
                        sku: updatedVariant.sku,
                        movementType: movementType,
                        quantityChange: quantityDiff,
                        finalStock: updatedVariant.stock,
                        reason: reason,
                        session: undefined,
                    });
                }
            }
            // Si se añadieron nuevas variantes con stock
            for (const newVariant of updatedProduct.variants) {
                if (!oldProduct.variants.some(ov => ov._id.equals(newVariant._id)) && newVariant.stock > 0) {
                    await logInventoryMovement({
                        user: req.user.id,
                        product: updatedProduct._id,
                        variantId: newVariant._id,
                        productName: updatedProduct.name,
                        variantName: newVariant.name,
                        sku: newVariant.sku,
                        movementType: 'in',
                        quantityChange: newVariant.stock,
                        finalStock: newVariant.stock,
                        reason: 'initial_stock_variant_added',
                        session: undefined,
                    });
                }
            }
        } else if (oldProduct.stock !== updatedProduct.stock) {
            // Lógica para productos sin variantes
            const quantityDiff = Math.abs(updatedProduct.stock - oldProduct.stock);
            const movementType = updatedProduct.stock > oldProduct.stock ? 'in' : 'out';
            const reason = 'adjustment';

            await logInventoryMovement({
                user: req.user.id,
                product: updatedProduct._id,
                productName: updatedProduct.name,
                sku: updatedProduct.sku,
                movementType: movementType,
                quantityChange: quantityDiff,
                finalStock: updatedProduct.stock,
                reason: reason,
                session: undefined,
            });
        }
    }
    // --- FIN LÓGICA DE REGISTRO ---

        res.status(200).json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        if (error.code === 11000 && error.keyPattern && error.keyPattern.sku) {
            return res.status(400).json({ message: 'The main product SKU already exists. Please enter a unique SKU.' });
        }
        res.status(500).json({ message: 'Internal server error updating product.' });
    }
});

// @desc    Obtener productos con stock bajo
// @route   GET /api/products/alerts/low-stock
// @access  Private
const getLowStockProducts = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const lowStockMainProducts = await Product.aggregate([
        { $match: { user: userId, variants: { $size: 0 } } },
        { $match: { $expr: { $lte: ['$stock', '$reorderThreshold'] } } }
    ]);

    const lowStockVariantProducts = await Product.aggregate([
        { $match: { user: userId, 'variants.0': { $exists: true } } },
        { $unwind: '$variants' },
        { $match: { $expr: { $lte: ['$variants.stock', '$variants.reorderThreshold'] } } },
        {
            $group: {
                _id: '$_id',
                name: { $first: '$name' },
                sku: { $first: '$sku' },
                imageUrl: { $first: '$imageUrl' },
                variants: {
                    $push: {
                        _id: '$variants._id',
                        name: '$variants.name',
                        sku: '$variants.sku',
                        stock: '$variants.stock',
                        reorderThreshold: '$variants.reorderThreshold',
                        imageUrl: '$variants.imageUrl',
                    }
                }
            }
        }
    ]);

    const combinedLowStock = [];

    lowStockMainProducts.forEach(p => {
        combinedLowStock.push({
            _id: p._id,
            name: p.name,
            sku: p.sku,
            stock: p.stock,
            reorderThreshold: p.reorderThreshold,
            imageUrl: p.imageUrl,
            isMainProduct: true,
        });
    });

    lowStockVariantProducts.forEach(p => {
        combinedLowStock.push({
            _id: p._id,
            name: p.name,
            sku: p.sku,
            imageUrl: p.imageUrl,
            variantsInAlert: p.variants,
            isMainProduct: false,
        });
    });

    res.status(200).json(combinedLowStock);
});

// @desc    Obtener productos con stock alto (perecederos)
// @route   GET /api/products/alerts/high-stock
// @access  Private
const getHighStockProducts = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const highStockMainProducts = await Product.aggregate([
        { $match: { user: userId, variants: { $size: 0 }, isPerishable: true } },
        { $match: { $expr: { $gt: ['$stock', '$optimalMaxStock'] } } }
    ]);

    const highStockVariantProducts = await Product.aggregate([
        { $match: { user: userId, 'variants.0': { $exists: true } } },
        { $unwind: '$variants' },
        { $match: {
            'variants.isPerishable': true,
            $expr: { $gt: ['$variants.stock', '$variants.optimalMaxStock'] }
        } },
        {
            $group: {
                _id: '$_id',
                name: { $first: '$name' },
                sku: { $first: '$sku' },
                imageUrl: { $first: '$imageUrl' },
                variants: {
                    $push: {
                        _id: '$variants._id',
                        name: '$variants.name',
                        sku: '$variants.sku',
                        stock: '$variants.stock',
                        optimalMaxStock: '$variants.optimalMaxStock',
                        shelfLifeDays: '$variants.shelfLifeDays',
                        imageUrl: '$variants.imageUrl',
                    }
                }
            }
        }
    ]);

    const combinedHighStock = [];

    highStockMainProducts.forEach(p => {
        combinedHighStock.push({
            _id: p._id,
            name: p.name,
            sku: p.sku,
            stock: p.stock,
            optimalMaxStock: p.optimalMaxStock,
            shelfLifeDays: p.shelfLifeDays,
            imageUrl: p.imageUrl,
            isMainProduct: true,
        });
    });

    highStockVariantProducts.forEach(p => {
        combinedHighStock.push({
            _id: p._id,
            name: p.name,
            sku: p.sku,
            imageUrl: p.imageUrl,
            variantsInAlert: p.variants,
            isMainProduct: false,
        });
    });

    res.status(200).json(combinedHighStock);
});


// @desc    Eliminar un producto
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    if (product.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized to delete this product');
    }

    await product.deleteOne();

    res.status(200).json({ message: 'Product removed' });
});

// @desc    Obtener sugerencias de productos globales (para todos los usuarios)
// @route   GET /api/products/globalproducts
// @access  Public (o ajusta si lo quieres privado)
const getGlobalProducts = asyncHandler(async (req, res) => {
    const { searchTerm } = req.query;

    let query = {};
    if (searchTerm) {
        query.name = { $regex: searchTerm, $options: 'i' };
    }

    const globalProducts = [
        {
            sku: 'CAMI-ALG-ROJO-M',
            name: 'Basic Cotton T-shirt',
            description: 'Soft and comfortable cotton t-shirt for daily use.',
            category: 'Clothing',
            unitOfMeasure: 'unit',
            brand: 'Generic',
            imageUrl: 'https://res.cloudinary.com/your_cloud_name/image/upload/v1678901234/label_products/camiseta_roja.jpg',
            color: 'Red',
            size: 'M',
            material: 'Cotton',
            variants: [
                {
                    name: 'Size S - Red', sku: 'CAMI-S-ROJO', price: 15.00, costPrice: 7.00, stock: 50, unitOfMeasure: 'unit', color: 'Red', size: 'S', material: 'Cotton', imageUrl: 'https://placehold.co/150x100/A02C2C/F8F8F2?text=S-Red'
                },
                {
                    name: 'Size M - Red', sku: 'CAMI-M-ROJO', price: 15.00, costPrice: 7.00, stock: 45, unitOfMeasure: 'unit', color: 'Red', size: 'M', material: 'Cotton', imageUrl: 'https://placehold.co/150x100/A02C2C/F8F8F2?text=M-Red'
                },
                {
                    name: 'Size L - Red', sku: 'CAMI-L-ROJO', price: 15.00, costPrice: 7.00, stock: 30, unitOfMeasure: 'unit', color: 'Red', size: 'L', material: 'Cotton', imageUrl: 'https://placehold.co/150x100/A02C2C/F8F8F2?text=L-Red'
                },
                {
                    name: 'Size M - Blue', sku: 'CAMI-M-AZUL', price: 16.00, costPrice: 7.50, stock: 60, unitOfMeasure: 'unit', color: 'Blue', size: 'M', material: 'Cotton', imageUrl: 'https://placehold.co/150x100/2C3CA0/F8F8F2?text=M-Blue'
                },
            ]
        },
        {
            sku: 'PANT-JEAN-AZUL-32',
            name: 'Classic Blue Jean Pants',
            description: 'Classic blue jean pants, straight fit.',
            category: 'Clothing',
            unitOfMeasure: 'unit',
            brand: 'DenimCo',
            imageUrl: 'https://res.cloudinary.com/your_cloud_name/image/upload/v1678901235/label_products/jean_azul.jpg',
            color: 'Blue',
            size: '32',
            material: 'Jean',
            variants: [
                { name: 'Size 30', sku: 'PANT-30-AZUL', price: 45.00, costPrice: 20.00, stock: 25, unitOfMeasure: 'unit', size: '30', color: 'Blue' },
                { name: 'Size 32', sku: 'PANT-32-AZUL', price: 45.00, costPrice: 20.00, stock: 40, unitOfMeasure: 'unit', size: '32', color: 'Blue' },
                { name: 'Size 34', sku: 'PANT-34-AZUL', price: 45.00, costPrice: 20.00, stock: 35, unitOfMeasure: 'unit', size: '34', color: 'Blue' },
            ]
        },
        {
            sku: 'CEL-SMART-ULTRA-256',
            name: 'Smartphone Ultra X',
            description: 'Latest smartphone model with high-resolution camera and large storage.',
            category: 'Electronics',
            unitOfMeasure: 'unit',
            brand: 'TechGadget',
            imageUrl: 'https://res.cloudinary.com/your_cloud_name/image/upload/v1678901236/label_products/smartphone_ultra.jpg',
            color: 'Black',
            size: '256GB',
            material: 'Metal/Glass',
            variants: [
                { name: 'Black Color - 128GB', sku: 'SMART-NEGRO-128', price: 799.99, costPrice: 500.00, stock: 15, unitOfMeasure: 'unit', color: 'Black', size: '128GB' },
                { name: 'Black Color - 256GB', price: 899.99, costPrice: 600.00, stock: 10, unitOfMeasure: 'unit', color: 'Black', size: '256GB' },
                { name: 'Silver Color - 256GB', price: 899.99, costPrice: 600.00, stock: 8, unitOfMeasure: 'unit', color: 'Silver', size: '256GB' },
            ]
        },
        {
            sku: 'AUDI-BLUETOOTH-SPORT',
            name: 'Sport Bluetooth Headphones',
            description: 'Wireless headphones ideal for exercise, with high-fidelity sound.',
            category: 'Electronics',
            unitOfMeasure: 'unit',
            brand: 'SoundBlast',
            imageUrl: 'https://placehold.co/600x400/2D3748/F8F8F2?text=Headphones',
            color: 'Black',
            size: 'N/A',
            material: 'Plastic',
            variants: []
        },
        {
            sku: 'CAFE-ESPECIAL-KG',
            name: 'Special Origin Coffee',
            description: 'Arabica coffee beans, medium roasted, from selected farms.',
            category: 'Food and Beverages',
            unitOfMeasure: 'kg',
            brand: 'AromaPuro',
            imageUrl: 'https://placehold.co/600x400/2D3748/F8F8F2?text=Coffee',
            color: 'Brown',
            size: '1KG',
            material: 'Grain',
            variants: []
        },
        {
            sku: 'ZAP-DEP-CORR-40',
            name: 'Running Sports Shoes',
            description: 'Lightweight and breathable running shoes.',
            category: 'Footwear',
            unitOfMeasure: 'unit',
            brand: 'RunFast',
            imageUrl: 'https://placehold.co/600x400/2D3748/F8F8F2?text=Shoes',
            color: 'Blue',
            size: '40',
            material: 'Mesh/Synthetic',
            variants: [
                { name: 'Size 40 - Blue', sku: 'ZAP-40-AZUL', price: 60.00, costPrice: 30.00, stock: 20, unitOfMeasure: 'unit', size: '40', color: 'Blue' },
                { name: 'Size 42 - Black', sku: 'ZAP-42-NEGRO', price: 65.00, costPrice: 32.00, stock: 15, unitOfMeasure: 'unit', size: '42', color: 'Black' },
            ]
        },
    ];

    const filteredSuggestions = globalProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.variants && p.variants.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    res.status(200).json(filteredSuggestions.slice(0, 5));
});

// @desc    Obtener reporte de inventario detallado por variante
// @route   GET /api/products/reports/variants
// @access  Private
const getVariantInventoryReport = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const report = await Product.aggregate([
        {
            $match: {
                user: userId,
                'variants.0': { $exists: true } // Solo incluye productos que tienen variantes
            }
        },
        { $unwind: '$variants' },
        {
            $project: {
                _id: 0,
                productId: '$_id',
                productName: '$name',
                productSku: '$sku',
                productCategory: '$category',
                productBrand: '$brand',
                productImageUrl: '$imageUrl',

                variantId: '$variants._id',
                variantName: '$variants.name',
                variantSku: '$variants.sku',
                variantStock: '$variants.stock',
                variantPrice: '$variants.price',
                variantCostPrice: '$variants.costPrice',
                variantUnitOfMeasure: '$variants.unitOfMeasure',
                variantColor: '$variants.color',
                variantSize: '$variants.size',
                variantMaterial: '$variants.material',
                variantImageUrl: '$variants.imageUrl',

                variantIsPerishable: '$variants.isPerishable',
                variantReorderThreshold: '$variants.reorderThreshold',
                variantOptimalMaxStock: '$variants.optimalMaxStock',
                variantShelfLifeDays: '$variants.shelfLifeDays',

                variantTotalValue: { $multiply: ['$variants.stock', '$variants.price'] },
                variantTotalCostValue: { $multiply: ['$variants.stock', '$variants.costPrice'] }
            }
        },
        {
            $sort: {
                productName: 1,
                variantName: 1
            }
        }
    ]);

    res.status(200).json(report);
});

module.exports = {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getGlobalProducts,
    getLowStockProducts, // Export new function
    getHighStockProducts, // Export new function
    getVariantInventoryReport, // <-- NUEVA FUNCIÓN EXPORTADA
};
