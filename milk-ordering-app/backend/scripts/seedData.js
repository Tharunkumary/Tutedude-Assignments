const bcrypt = require('bcryptjs');
const { pool, testConnection } = require('../config/database');

const seedData = async () => {
    try {
        console.log('🌱 Starting database seeding...');
        
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Database connection failed');
            return;
        }

        // Create admin user
        console.log('👤 Creating admin user...');
        const adminPassword = await bcrypt.hash('admin123', 12);
        
        await pool.execute(`
            INSERT IGNORE INTO admin_users (username, email, password_hash, role) 
            VALUES (?, ?, ?, ?)
        `, ['admin', 'admin@milkapp.com', adminPassword, 'super_admin']);

        // Create categories
        console.log('📂 Creating categories...');
        const categories = [
            {
                name: 'Milk',
                description: 'Fresh and pure milk products',
                image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300'
            },
            {
                name: 'Dairy Products',
                description: 'Various dairy products like curd, paneer, butter',
                image_url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=300'
            },
            {
                name: 'Organic',
                description: 'Organic and natural dairy products',
                image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300'
            }
        ];

        for (const category of categories) {
            await pool.execute(`
                INSERT IGNORE INTO categories (name, description, image_url) 
                VALUES (?, ?, ?)
            `, [category.name, category.description, category.image_url]);
        }

        // Get category IDs
        const [categoryResults] = await pool.execute('SELECT id, name FROM categories');
        const categoryMap = {};
        categoryResults.forEach(cat => {
            categoryMap[cat.name] = cat.id;
        });

        // Create products
        console.log('🥛 Creating products...');
        const products = [
            // Milk products
            {
                category_id: categoryMap['Milk'],
                name: 'Full Cream Milk',
                description: 'Rich and creamy full fat milk, perfect for daily consumption',
                price: 60.00,
                unit: '1 Liter',
                stock_quantity: 50,
                image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300'
            },
            {
                category_id: categoryMap['Milk'],
                name: 'Toned Milk',
                description: 'Low fat toned milk for health conscious customers',
                price: 55.00,
                unit: '1 Liter',
                stock_quantity: 45,
                image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300'
            },
            {
                category_id: categoryMap['Milk'],
                name: 'Skimmed Milk',
                description: 'Fat-free skimmed milk for weight watchers',
                price: 50.00,
                unit: '1 Liter',
                stock_quantity: 40,
                image_url: 'https://images.unsplash.com/photo-1559656914-a30970c1affd?w=300'
            },
            
            // Dairy products
            {
                category_id: categoryMap['Dairy Products'],
                name: 'Fresh Curd',
                description: 'Homemade style fresh curd, rich in probiotics',
                price: 80.00,
                unit: '500g',
                stock_quantity: 30,
                image_url: 'https://images.unsplash.com/photo-1571212515416-ddc38b67bee4?w=300'
            },
            {
                category_id: categoryMap['Dairy Products'],
                name: 'Paneer',
                description: 'Fresh cottage cheese made from pure milk',
                price: 180.00,
                unit: '250g',
                stock_quantity: 25,
                image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300'
            },
            {
                category_id: categoryMap['Dairy Products'],
                name: 'Butter',
                description: 'Creamy fresh butter made from pure cream',
                price: 120.00,
                unit: '200g',
                stock_quantity: 35,
                image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300'
            },
            {
                category_id: categoryMap['Dairy Products'],
                name: 'Ghee',
                description: 'Pure clarified butter with traditional taste',
                price: 450.00,
                unit: '500ml',
                stock_quantity: 20,
                image_url: 'https://images.unsplash.com/photo-1609501676725-7186f27c29d8?w=300'
            },
            {
                category_id: categoryMap['Dairy Products'],
                name: 'Cheese Slices',
                description: 'Processed cheese slices perfect for sandwiches',
                price: 150.00,
                unit: '200g (8 slices)',
                stock_quantity: 40,
                image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=300'
            },

            // Organic products
            {
                category_id: categoryMap['Organic'],
                name: 'Organic Milk',
                description: 'Certified organic milk from grass-fed cows',
                price: 85.00,
                unit: '1 Liter',
                stock_quantity: 15,
                image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300'
            },
            {
                category_id: categoryMap['Organic'],
                name: 'Organic Curd',
                description: 'Organic curd made from certified organic milk',
                price: 110.00,
                unit: '500g',
                stock_quantity: 20,
                image_url: 'https://images.unsplash.com/photo-1571212515416-ddc38b67bee4?w=300'
            },
            {
                category_id: categoryMap['Organic'],
                name: 'A2 Milk',
                description: 'Premium A2 milk from indigenous cow breeds',
                price: 95.00,
                unit: '1 Liter',
                stock_quantity: 12,
                image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300'
            },
            {
                category_id: categoryMap['Organic'],
                name: 'Organic Ghee',
                description: 'Pure organic ghee made from organic milk',
                price: 650.00,
                unit: '500ml',
                stock_quantity: 10,
                image_url: 'https://images.unsplash.com/photo-1609501676725-7186f27c29d8?w=300'
            }
        ];

        for (const product of products) {
            await pool.execute(`
                INSERT IGNORE INTO products (category_id, name, description, price, unit, stock_quantity, image_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                product.category_id,
                product.name,
                product.description,
                product.price,
                product.unit,
                product.stock_quantity,
                product.image_url
            ]);
        }

        console.log('✅ Database seeding completed successfully!');
        console.log('\n📊 Seeded data summary:');
        console.log(`   👤 Admin User: admin@milkapp.com (password: admin123)`);
        console.log(`   📂 Categories: ${categories.length}`);
        console.log(`   🥛 Products: ${products.length}`);
        console.log('\n🚀 You can now start using the application!');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    }
};

// Run seeding if called directly
if (require.main === module) {
    seedData().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });
}

module.exports = { seedData };