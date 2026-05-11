const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateInvoice = (order, user) => {
    return new Promise((resolve, reject) => {
        try {
            // Initialize document with A4 size
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // ==========================================
            // 1. HEADER & COMPANY INFO (From Contact.jsx)
            // ==========================================
            
            // LOGO LOGIC: 
            // If you have a logo file on your server (e.g., in a 'public' folder), put the path here.
            // If the file exists, it uses the image. If not, it falls back to a stylized text logo.
            const logoPath = path.join(__dirname, '../public/logo.png'); 
            
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 45, { width: 100 });
            } else {
                // Fallback Text Logo
                doc.fillColor('#dc2626') // Red color matching your theme
                   .font('Helvetica-Bold')
                   .fontSize(28)
                   .text('ToyBlix', 50, 45);
            }

            // Company Contact Details
            doc.fillColor('#444444')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('(Akshar-Toys)', 50, 75)
               .font('Helvetica')
               .text('YogiChowk-Katargam, Surat, Gujarat', 50, 90)
               .text('Phone: +91 9898528152 / +91 9974530204', 50, 105)
               .text('Email: toyblix@gmail.com', 50, 120);

            // ==========================================
            // 2. INVOICE DETAILS (Top Right)
            // ==========================================
            doc.fillColor('#333333')
               .fontSize(24)
               .font('Helvetica-Bold')
               .text('INVOICE', 400, 45, { align: 'right' });

            doc.fontSize(10)
               .font('Helvetica')
               .text(`Invoice No: ${String(order._id).slice(-8).toUpperCase()}`, 350, 75, { align: 'right' })
               .text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}`, 350, 90, { align: 'right' })
               .text(`Status: ${(order.paymentStatus || 'Paid').toUpperCase()}`, 350, 105, { align: 'right' });

            // Draw a subtle separator line
            doc.moveTo(50, 145).lineTo(545, 145).lineWidth(0.5).stroke('#e5e5e5');

            // ==========================================
            // 3. CUSTOMER DETAILS
            // ==========================================
            const shipping = order.shippingDetails || {};
            doc.fillColor('#333333')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text('Billed To:', 50, 165)
               .fontSize(10)
               .font('Helvetica')
               .text(user.name || shipping.fullName || 'Customer', 50, 185)
               .text(`${shipping.flatNumber || ''}, ${shipping.street || ''}`.replace(/^, /, ''), 50, 200);
            
            if (shipping.landmark) {
                doc.text(shipping.landmark, 50, 215);
                doc.text(`${shipping.city || ''} - ${shipping.pincode || ''}`, 50, 230);
                doc.text(`Phone: ${shipping.phone || user.mobileNumber || ''}`, 50, 245);
            } else {
                doc.text(`${shipping.city || ''} - ${shipping.pincode || ''}`, 50, 215);
                doc.text(`Phone: ${shipping.phone || user.mobileNumber || ''}`, 50, 230);
            }

            // ==========================================
            // 4. ITEMS TABLE
            // ==========================================
            let y = 290;

            // Table Header Background
            doc.rect(50, y, 495, 25).fill('#fef2f2'); // Light red background matching your theme

            // Table Header Text
            doc.fillColor('#dc2626')
               .fontSize(10)
               .font('Helvetica-Bold');
            doc.text('Item Description', 60, y + 8);
            doc.text('Qty', 350, y + 8, { width: 40, align: 'center' });
            doc.text('Price', 410, y + 8, { width: 60, align: 'right' });
            doc.text('Total', 480, y + 8, { width: 55, align: 'right' });

            y += 35;
            doc.font('Helvetica').fillColor('#333333');

            // Order Items Loop
            (order.orderItems || []).forEach(item => {
                const title = (item.title || 'Product').substring(0, 45); // Truncate long names
                const qty = item.qty || 1;
                const price = parseFloat(item.price) || 0;
                const total = price * qty;

                doc.text(title, 60, y);
                doc.text(qty.toString(), 350, y, { width: 40, align: 'center' });
                doc.text(`Rs ${price.toFixed(2)}`, 410, y, { width: 60, align: 'right' });
                doc.text(`Rs ${total.toFixed(2)}`, 480, y, { width: 55, align: 'right' });
                
                y += 25;
                
                // Add a page break if table gets too long
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
            });

            // Table Bottom Border
            doc.moveTo(50, y - 5).lineTo(545, y - 5).stroke('#e5e5e5');
            y += 10;

            // ==========================================
            // 5. TOTALS CALCULATION
            // ==========================================
            const subtotal = (order.orderItems || []).reduce((acc, item) => acc + ((parseFloat(item.price) || 0) * (item.qty || 1)), 0);
            const discountAmount = Math.max(Number(order.discountAmount) || 0, 0);
            const deliveryFee = Math.max(Number(order.deliveryFee) || 0, 0);
            const giftWrapFee = Math.max(Number(order.giftWrapFee) || 0, 0);
            const codFee = Math.max(Number(order.codFee) || 0, 0);
            const totalPrice = Number(order.totalPrice) || 0;

            const drawTotalRow = (label, amountText, color = '#333333') => {
                doc.fontSize(10).font('Helvetica').fillColor(color);
                doc.text(label, 350, y, { width: 100, align: 'right' });
                doc.text(amountText, 460, y, { width: 75, align: 'right' });
                y += 18;
            };

            drawTotalRow('Subtotal:', `Rs ${subtotal.toFixed(2)}`);

            if (discountAmount > 0) {
                const discountLabel = order.couponCode ? `Discount (${order.couponCode}):` : 'Discount:';
                drawTotalRow(discountLabel, `-Rs ${discountAmount.toFixed(2)}`, '#16a34a');
            }

            if (deliveryFee > 0) {
                drawTotalRow('Shipping:', `Rs ${deliveryFee.toFixed(2)}`);
            }

            if (giftWrapFee > 0) {
                drawTotalRow('Gift Wrap:', `Rs ${giftWrapFee.toFixed(2)}`);
            }

            if (codFee > 0) {
                drawTotalRow('COD Handling Fee:', `Rs ${codFee.toFixed(2)}`);
            }

            y += 2;

            // Final Amount Box
            doc.rect(340, y - 5, 205, 30).fill('#fafafa').stroke('#e5e5e5');
            doc.fillColor('#333333').font('Helvetica-Bold').fontSize(12);
            doc.text('Final Amount:', 350, y + 3, { width: 100, align: 'right' });
            doc.fillColor('#dc2626').text(`Rs ${totalPrice.toFixed(2)}`, 460, y + 3, { width: 75, align: 'right' });

            // ==========================================
            // 6. TERMS & CONDITIONS (From Terms.jsx)
            // ==========================================
            y += 50;
            
            // Check if we need a new page for T&C
            if (y > 650) {
                doc.addPage();
                y = 50;
            }

            doc.fillColor('#333333')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('Terms & Conditions:', 50, y);
            
            doc.fillColor('#666666')
               .fontSize(8)
               .font('Helvetica')
               .text('1. Online Store Terms: By using our services, you agree to our policies. Products may not be used for illegal purposes.', 50, y + 15)
               .text('2. Products and Pricing: Prices are subject to change without notice. We reserve the right to modify or cancel orders.', 50, y + 27)
               .text('3. Intellectual Property: All products and brand assets are the property of ToyBlix and are protected by law.', 50, y + 39);

            // ==========================================
            // 7. FOOTER
            // ==========================================
            doc.fillColor('#999999')
               .fontSize(9)
               .font('Helvetica-Oblique')
               .text(
                'Thank you for shopping with ToyBlix - Where Imagination Comes to Life!',
                50,
                780, // Positioned at the very bottom of the A4 page
                { align: 'center', width: 495 }
            );

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = generateInvoice;
