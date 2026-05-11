const fs = require('fs');
let content = fs.readFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx', 'utf8');

const replacement = `  const handleBuyNow = () => {
    const variantString = [selectedColor, selectedSize].filter(Boolean).join(' - ');
    const cartPayload = { 
      ...product, 
      price: displayPriceValue,      
      countInStock: displayStock,    
      image: mainImage,              
      variant: variantString || null, 
      qty: 1 
    };

    if (!userInfo) {
      dispatch(setPendingItem(cartPayload));
      navigate('/cart');
    } else {
      dispatch(addToCart(cartPayload));
      if (displayStock === 0) {
          toast.error('Added to cart, but currently out of stock. Checkout is disabled until restocked.');
      } else {
          navigate('/checkout');
      }
    }
  };

  const handleNotifySubmit`;

content = content.replace('  const handleNotifySubmit', replacement);

fs.writeFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx', content, 'utf8');
console.log('Inserted handleBuyNow successfully!');
