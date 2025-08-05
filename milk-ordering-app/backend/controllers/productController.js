const { pool } = require('../config/database');
const { sanitizeString } = require('../utils/helpers');

// Get all categories
const getCategories = async (req, res) => {
    try {
        const [categories] = await pool.execute(
            'SELECT * FROM categories WHERE is_active = TRUE ORDER BY name'
        );

        res.status(200).json({
            success: true,
            message: 'Categories fetched successfully',
            data: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching categories'
        });
    }
};

// Get all products with optional category filter
const getProducts = async (req, res) => {
    try {
        const { category_id, search, page = 1, limit = 20 } = req.query;
        
        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.is_available = TRUE AND c.is_active = TRUE
        `;
        let params = [];

        // Add category filter
        if (category_id) {
            query += ' AND p.category_id = ?';
            params.push(category_id);
        }

        // Add search filter
        if (search) {
            query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        // Add pagination
        const offset = (page - 1) * limit;
        query += ' ORDER BY p.name LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [products] = await pool.execute(query, params);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.is_available = TRUE AND c.is_active = TRUE
        `;
        let countParams = [];

        if (category_id) {
            countQuery += ' AND p.category_id = ?';
            countParams.push(category_id);
        }

        if (search) {
            countQuery += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.status(200).json({
            success: true,
            message: 'Products fetched successfully',
            data: {
                products,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching products'
        });
    }
};

// Get single product by ID
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const [products] = await pool.execute(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ? AND p.is_available = TRUE`,
            [id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get average rating
        const [ratingResult] = await pool.execute(
            'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ?',
            [id]
        );

        const product = products[0];
        product.avg_rating = ratingResult[0].avg_rating || 0;
        product.review_count = ratingResult[0].review_count || 0;

        res.status(200).json({
            success: true,
            message: 'Product fetched successfully',
            data: product
        });
    } catch (error) {
        console.error('Get product by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching product'
        });
    }
};

// Admin: Create category
const createCategory = async (req, res) => {
    try {
        const { name, description, image_url } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const sanitizedName = sanitizeString(name);
        const sanitizedDescription = sanitizeString(description || '');

        // Check if category already exists
        const [existingCategories] = await pool.execute(
            'SELECT id FROM categories WHERE name = ?',
            [sanitizedName]
        );

        if (existingCategories.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Category already exists'
            });
        }

        const [result] = await pool.execute(
            'INSERT INTO categories (name, description, image_url) VALUES (?, ?, ?)',
            [sanitizedName, sanitizedDescription, image_url || null]
        );

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: {
                id: result.insertId,
                name: sanitizedName,
                description: sanitizedDescription,
                image_url: image_url || null
            }
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating category'
        });
    }
};

// Admin: Create product
const createProduct = async (req, res) => {
    try {
        const { category_id, name, description, price, unit, image_url, stock_quantity } = req.body;

        if (!category_id || !name || !price || !unit) {
            return res.status(400).json({
                success: false,
                message: 'Category ID, name, price, and unit are required'
            });
        }

        if (price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Price must be greater than 0'
            });
        }

        const sanitizedName = sanitizeString(name);
        const sanitizedDescription = sanitizeString(description || '');
        const sanitizedUnit = sanitizeString(unit);

        // Check if category exists
        const [categories] = await pool.execute(
            'SELECT id FROM categories WHERE id = ? AND is_active = TRUE',
            [category_id]
        );

        if (categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID'
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO products (category_id, name, description, price, unit, image_url, stock_quantity) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [category_id, sanitizedName, sanitizedDescription, price, sanitizedUnit, 
             image_url || null, stock_quantity || 0]
        );

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: {
                id: result.insertId,
                category_id,
                name: sanitizedName,
                description: sanitizedDescription,
                price,
                unit: sanitizedUnit,
                image_url: image_url || null,
                stock_quantity: stock_quantity || 0
            }
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating product'
        });
    }
};

// Admin: Update product
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { category_id, name, description, price, unit, image_url, stock_quantity, is_available } = req.body;

        // Check if product exists
        const [existingProducts] = await pool.execute(
            'SELECT id FROM products WHERE id = ?',
            [id]
        );

        if (existingProducts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Build update query dynamically
        let updateFields = [];
        let params = [];

        if (category_id !== undefined) {
            // Verify category exists
            const [categories] = await pool.execute(
                'SELECT id FROM categories WHERE id = ? AND is_active = TRUE',
                [category_id]
            );
            if (categories.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category ID'
                });
            }
            updateFields.push('category_id = ?');
            params.push(category_id);
        }

        if (name !== undefined) {
            updateFields.push('name = ?');
            params.push(sanitizeString(name));
        }

        if (description !== undefined) {
            updateFields.push('description = ?');
            params.push(sanitizeString(description));
        }

        if (price !== undefined) {
            if (price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Price must be greater than 0'
                });
            }
            updateFields.push('price = ?');
            params.push(price);
        }

        if (unit !== undefined) {
            updateFields.push('unit = ?');
            params.push(sanitizeString(unit));
        }

        if (image_url !== undefined) {
            updateFields.push('image_url = ?');
            params.push(image_url);
        }

        if (stock_quantity !== undefined) {
            updateFields.push('stock_quantity = ?');
            params.push(stock_quantity);
        }

        if (is_available !== undefined) {
            updateFields.push('is_available = ?');
            params.push(is_available);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        params.push(id);
        const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;

        await pool.execute(query, params);

        // Fetch updated product
        const [updatedProduct] = await pool.execute(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct[0]
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating product'
        });
    }
};

// Admin: Delete product
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if product exists
        const [existingProducts] = await pool.execute(
            'SELECT id FROM products WHERE id = ?',
            [id]
        );

        if (existingProducts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Soft delete by setting is_available to false
        await pool.execute(
            'UPDATE products SET is_available = FALSE WHERE id = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting product'
        });
    }
};

// Admin: Get all products (including inactive)
const getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        const offset = (page - 1) * limit;
        
        const [products] = await pool.execute(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             ORDER BY p.created_at DESC 
             LIMIT ? OFFSET ?`,
            [parseInt(limit), parseInt(offset)]
        );

        // Get total count
        const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM products');
        const total = countResult[0].total;

        res.status(200).json({
            success: true,
            message: 'All products fetched successfully',
            data: {
                products,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching products'
        });
    }
};

module.exports = {
    getCategories,
    getProducts,
    getProductById,
    createCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts
};