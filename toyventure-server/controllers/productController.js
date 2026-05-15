const sendEmail = require('../utils/sendEmail');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { getProductId } = require('../utils/orderInventory');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { z } = require('zod');
const AdmZip = require('adm-zip');

const getProducts = async (req, res) => {
    try {
        const pageSize = Number(req.query.limit) || 12; 
        const page = Number(req.query.page) || 1;
        const isExact = req.query.exact === 'true'; // Check if user clicked "Search instead for..."
        
        const pipeline = [];
        const matchConditions = {};
        const andConditions = [];

        // 1. INTELLIGENT SEARCH STAGE
        if (req.query.keyword && req.query.keyword.trim() !== '') {
            pipeline.push({
                $search: {
                    index: 'default',
                    text: {
                        query: req.query.keyword,
                        path: ['title', 'description', 'tag', 'category'],
                        // Turn off fuzzy if they want the EXACT spelling
                        ...(isExact ? {} : { fuzzy: { maxEdits: 2, prefixLength: 1 } })
                    },
                    // Request highlights to see what word Atlas actually matched
                    highlight: { path: ['title', 'tag', 'category'] }
                }
            });
            // Extract the highlights metadata
            pipeline.push({
                $addFields: { highlights: { $meta: "searchHighlights" } }
            });
        }

        // 2. DYNAMIC FILTERING STAGE
        if (req.query.specs && req.query.specs.trim() !== '') {
            const specPairs = req.query.specs.split(',');
            const specMap = {};
            
            // Group values by Spec Name (so users can select multiple values like Material: Wood OR Plastic)
            specPairs.forEach(pair => {
                const [name, value] = pair.split(':');
                if (name && value) {
                    if (!specMap[name]) specMap[name] = [];
                    // Escape regex characters for safety
                    specMap[name].push(new RegExp(`^${value.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i'));
                }
            });
            
            // Require ALL selected categories to match ($and), but allow ANY value within a category ($in)
            for (const [name, values] of Object.entries(specMap)) {
                andConditions.push({
                    specifications: {
                        $elemMatch: {
                            name: new RegExp(`^${name.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i'),
                            value: { $in: values }
                        }
                    }
                });
            }
        }
        // --- END OF NEW CODE ---
        if (req.query.tags && req.query.tags.trim() !== '') {
            const tagsArray = req.query.tags.split(',').map(t => new RegExp(t.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i'));
            andConditions.push({ tag: { $in: tagsArray } });
        }
        if (req.query.category && req.query.category.trim() !== '') {
            const ageArray = req.query.category.split(',').map(c => new RegExp(c.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i'));
            andConditions.push({ $or: [{ category: { $in: ageArray } }, { category: { $in: [new RegExp('All Age', 'i')] } }] });
        }
        if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
            const priceFilter = {};
            if (req.query.minPrice !== undefined && req.query.minPrice !== '') priceFilter.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') priceFilter.$lte = Number(req.query.maxPrice);
            if (Object.keys(priceFilter).length > 0) andConditions.push({ price: priceFilter });
        }
        if (req.query.minRating && req.query.minRating.trim() !== '') {
            andConditions.push({ rating: { $gte: Number(req.query.minRating) } });
        }
        if (req.query.isPopular === 'true') andConditions.push({ isPopular: true });
        if (req.query.isBestSelling === 'true') andConditions.push({ isBestSelling: true });
        if (req.query.isLimitedEdition === 'true') andConditions.push({ isLimitedEdition: true });

        // Admin vs User Rules
        if (req.query.isAdmin !== 'true') {
            andConditions.push({ isDraft: { $ne: true } }); 
            andConditions.push({ title: { $ne: 'New Toy' } }); 
            const wantInStock = req.query.inStock === 'true';
            const wantOutOfStock = req.query.outOfStock === 'true';
            if (wantInStock && !wantOutOfStock) andConditions.push({ countInStock: { $gt: 0 } });
            else if (!wantInStock && wantOutOfStock) andConditions.push({ countInStock: { $lte: 0 } });
            else if (!wantInStock && !wantOutOfStock) andConditions.push({ countInStock: { $gt: 0 } }); 
        }

        if (andConditions.length > 0) {
            matchConditions.$and = andConditions;
            pipeline.push({ $match: matchConditions });
        }

        // 3. SORTING STAGE
        let sortOption = { createdAt: -1 }; 
        if (req.query.sort === 'price_asc') sortOption = { price: 1 };
        if (req.query.sort === 'price_desc') sortOption = { price: -1 };
        if (req.query.sort === 'rating_desc') sortOption = { rating: -1 };

        if (req.query.keyword && req.query.keyword.trim() !== '') {
            if (req.query.sort !== 'newest') pipeline.push({ $sort: sortOption });
        } else {
            pipeline.push({ $sort: sortOption });
        }

        // 4. FACET STAGE
        pipeline.push({
            $facet: {
                metadata: [ { $count: "total" } ],
                data: [ { $skip: pageSize * (page - 1) }, { $limit: pageSize } ]
            }
        });

        const result = await Product.aggregate(pipeline);
        const products = result[0].data;
        const totalProducts = result[0].metadata.length > 0 ? result[0].metadata[0].total : 0;
        const pages = Math.ceil(totalProducts / pageSize);

        // 5. DID YOU MEAN LOGIC
        let suggestedTerm = null;
        if (!isExact && req.query.keyword && products.length > 0) {
            const queryLower = req.query.keyword.toLowerCase().trim();
            for (const prod of products) {
                if (prod.highlights && prod.highlights.length > 0) {
                    for (const hl of prod.highlights) {
                        const hit = hl.texts.find(t => t.type === 'hit');
                        if (hit) {
                            // If the word Atlas matched is NOT in the user's typo query, it means Atlas corrected a typo!
                            if (!queryLower.includes(hit.value.toLowerCase())) {
                                suggestedTerm = hit.value;
                                break;
                            }
                        }
                    }
                }
                if (suggestedTerm) break;
            }
        }

        // Remove highlights from response payload to save bandwidth
        products.forEach(p => delete p.highlights);

        res.json({ products, page, pages, totalProducts, suggestedTerm });
        
    } catch (error) {
        console.error("Intelligent Search Aggregation Error:", error);
        res.status(500).json({ message: "Server Error: Could not fetch products" });
    }
};
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) res.json(product);
        else res.status(404).json({ message: 'Product not found' });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const userHasDeliveredProduct = async (userId, productId) => {
    const orders = await Order.find({
        user: userId,
        orderStatus: { $in: ['delivered', 'fulfilled'] },
    }).select('orderItems');
    const pid = String(productId);
    return orders.some((order) =>
        order.orderItems.some((item) => String(getProductId(item)) === pid)
    );
};

const createProductReview = async (req, res) => {
    try {
        const { rating, comment, images } = req.body;
        const product = await Product.findById(req.params.id);
        if (product) {
            const hasDelivered = await userHasDeliveredProduct(req.user._id, product._id);
            if (!hasDelivered) {
                return res.status(403).json({ message: 'You can only review products from a delivered order.' });
            }

            const alreadyReviewed = product.reviews.find(
                (r) => r.user && r.user.toString() === req.user._id.toString()
            );
            if (alreadyReviewed) return res.status(400).json({ message: 'You have already reviewed this toy.' });

            const review = {
                user: req.user._id,
                name: req.user.name,
                rating: Number(rating),
                comment,
                images: images || [],
                isVerifiedPurchase: true,
            };
            product.reviews.push(review);
            product.numReviews = product.reviews.length;
            product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;
            await product.save();
            res.status(201).json({ message: 'Review added successfully!' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to add review' });
    }
};

const deleteProductReview = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            const reviewIndex = product.reviews.findIndex(r => r._id.toString() === req.params.reviewId);
            if (reviewIndex !== -1) {
                product.reviews.splice(reviewIndex, 1);
                product.numReviews = product.reviews.length;
                product.rating = product.reviews.length > 0 ? product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length : 0;
                await product.save();
                res.json({ message: 'Review successfully deleted by Admin' });
            } else {
                res.status(404).json({ message: 'Review not found' });
            }
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error handling review deletion' });
    }
};

const notifyMeWhenAvailable = async (req, res) => {
    try {
        const { email } = req.body;
        const product = await Product.findById(req.params.id);
        if (product) {
            if (!product.notifyList.includes(email)) {
                product.notifyList.push(email);
                await product.save();
            }
            res.status(200).json({ message: "You're on the list! We'll alert you when it's back." });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to add to waitlist' });
    }
};

const createProduct = async (req, res) => {
    try {
        const product = new Product({
            title: 'New Toy',
            price: 0,
            user: req.user._id,
            img: 'https://via.placeholder.com/400x400?text=Upload+Image',
            images: [],
            tag: 'General',         
            category: ['All Age'],    
            countInStock: 0,
            isPopular: false, 
            isBestSelling: false,
            isLimitedEdition: false,
            isDraft: true, // NEW: Creates template securely hidden as a draft!
            videoUrl: '',
            numReviews: 0,
            description: 'Enter a product description here...',
            notifyList: [],
            variants: [] 
        });
        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create product template' });
    }
};

const updateProduct = async (req, res) => {
    try {
        // FIX 1: Added 'specifications' to the destructuring list so the backend doesn't ignore it
        const { title, price, description, img, tag, category, oldPrice, countInStock, images, variants, isPopular, isBestSelling, isLimitedEdition, videoUrl, sku, isDraft, specifications } = req.body; 
        const product = await Product.findById(req.params.id);

        if (product) {
            const wasOutOfStock = product.countInStock === 0;
            const isRestocked = countInStock > 0;

            if (sku !== undefined) product.sku = sku; 

            product.title = title ?? product.title;
            product.price = price ?? product.price;
            product.description = description ?? product.description;
            product.tag = tag ?? product.tag;
            product.category = category ?? product.category; 
            product.oldPrice = oldPrice ?? product.oldPrice;
            product.countInStock = countInStock ?? product.countInStock;
            product.videoUrl = videoUrl ?? product.videoUrl;
            
            // ==========================================
            // FIX 2: Save the Dynamic Attributes/Specifications
            // ==========================================
            if (specifications !== undefined) {
               product.specifications = specifications;
                product.markModified('specifications');
            }

            // Safe Checkbox Parsing
            product.isPopular = isPopular !== undefined ? (isPopular === 'true' || isPopular === true) : false;
            product.isBestSelling = isBestSelling !== undefined ? (isBestSelling === 'true' || isBestSelling === true) : false;
            product.isLimitedEdition = isLimitedEdition !== undefined ? (isLimitedEdition === 'true' || isLimitedEdition === true) : false;
            product.isDraft = isDraft !== undefined ? (isDraft === 'true' || isDraft === true) : false;

            if (variants) product.variants = variants;
            if (images && images.length > 0) {
                product.images = images;
                product.img = images[0]; 
            } else {
                product.img = img ?? product.img;
            }

            // Restock Notification Email Logic
            if (wasOutOfStock && isRestocked && product.notifyList && product.notifyList.length > 0) {
                const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
                const emailPromises = product.notifyList.map(async (userEmail) => {
                    try {
                        await sendEmail({
                            email: userEmail,
                            subject: `🎉 It's Back! ${product.title} is fully restocked!`,
                            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;"><h2>Great news! 🚀</h2><p>You asked us to let you know when the <strong>${product.title}</strong> was back in stock. Well, the wait is over!</p><div style="text-align: center; margin: 30px 0;"><img src="${product.img}" style="max-width: 250px; border-radius: 10px;" /></div><div style="text-align: center; margin-top: 30px;"><a href="${clientUrl}/product/${product._id}" style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Shop Now</a></div></div>`
                        });
                    } catch (emailErr) {}
                });
                await Promise.all(emailPromises);
                product.notifyList = [];
            }

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: 'Failed to update product' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            await Product.deleteOne({ _id: product._id });
            res.json({ message: 'Product completely removed from store' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete product' });
    }
};

const bulkUploadProducts = async (req, res) => {
    let extractPath = '';
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No zip file uploaded' });
        }

        const zipPath = req.file.path;
        extractPath = path.join(__dirname, '../temp/extracted_', Date.now().toString());
        
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractPath, true);

        const files = fs.readdirSync(extractPath, { recursive: true });
        const spreadsheetFile = files.find(f => f.endsWith('.xlsx') || f.endsWith('.csv'));

        if (!spreadsheetFile) {
            return res.status(400).json({ message: 'No .xlsx or .csv file found in the ZIP archive.' });
        }

        const workbook = xlsx.readFile(path.join(extractPath, spreadsheetFile));
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rows.length === 0) {
            return res.status(400).json({ message: 'The uploaded spreadsheet is empty.' });
        }

        const productSchema = z.object({
            title: z.string().min(1, 'Title is required'),
            price: z.number().min(0, 'Price must be a positive number'),
            oldPrice: z.number().min(0, 'Old Price must be a positive number').optional().default(0),
            countInStock: z.number().int().min(0, 'Stock count must be a non-negative integer').default(0),
            description: z.string().min(1, 'Description is required').default('No description provided'),
            category: z.string().min(1, 'Category is required'),
            tag: z.string().optional().default('General'),
            isPopular: z.boolean().optional().default(false)
        });

        const validProducts = [];
        const errors = [];

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const rowNumber = index + 2;
            
            const rawProduct = {
                title: row['Toy Name'] || row['Title'] || row['Name'] || row['title'],
                price: Number(row['Retail Price'] || row['Price'] || row['price']),
                oldPrice: Number(row['Old Price'] || row['MRP'] || row['oldPrice']) || 0,
                countInStock: Number(row['Stock Count'] || row['Stock'] || row['countInStock']) || 0,
                description: row['Description'] || row['description'],
                category: row['Category'] || row['Age Group'] || row['category'],
                tag: row['Tag'] || row['Toy Category'] || row['tag'] || 'General',
                isPopular: String(row['Is Popular'] || row['Popular'] || '').toLowerCase() === 'true' || row['isPopular'] === true
            };

            const result = productSchema.safeParse(rawProduct);

            if (result.success) {
                let productImages = [];
                const toyTitle = result.data.title.trim();
                
                const imageFiles = files.filter(f => {
                    const ext = path.extname(f).toLowerCase();
                    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return false;
                    
                    const normalizedFile = f.replace(/\\/g, '/'); 
                    return normalizedFile.toLowerCase().includes(toyTitle.toLowerCase());
                });

                if (imageFiles.length > 0) {
                    for (const imgPath of imageFiles) {
                        const fullPath = path.join(extractPath, imgPath);
                        const newFilename = `bulk-${Date.now()}-${path.basename(fullPath)}`;
                        const targetPath = path.join(__dirname, '../uploads/', newFilename);
                        
                        if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isFile()) {
                            fs.copyFileSync(fullPath, targetPath);
                            productImages.push(`/uploads/${newFilename}`);
                        }
                    }
                }

                if (productImages.length === 0) {
                    productImages.push('https://via.placeholder.com/400x400?text=Upload+Image');
                }

                validProducts.push({
                    ...result.data,
                    user: req.user._id,
                    img: productImages[0], 
                    images: productImages, 
                    numReviews: 0,
                    rating: 0,
                    isDraft: false, // Bulk uploads are live by default
                    reviews: [],
                    variants: [],
                    notifyList: []
                });
            } else {
                const rowErrors = result.error.errors.map(err => err.message).join(', ');
                errors.push(`Row ${rowNumber}: ${rowErrors}`);
            }
        }

        if (validProducts.length > 0) {
            await Product.insertMany(validProducts);
        }

        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

        res.status(201).json({ 
            message: 'Bulk upload completed.',
            insertedCount: validProducts.length,
            errors: errors.length > 0 ? errors : null
        });

    } catch (error) {
        console.error('Bulk upload error:', error);
        if (extractPath && fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        
        res.status(500).json({ message: 'Failed to process bulk upload: ' + error.message });
    }
};

module.exports = { getProducts, getProductById, createProductReview, deleteProductReview, notifyMeWhenAvailable, createProduct, updateProduct, deleteProduct, bulkUploadProducts };