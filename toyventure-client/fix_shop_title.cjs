const fs = require('fs');
let content = fs.readFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\Shop.jsx', 'utf8');

const helper = `  const getPageTitle = () => {
    if (searchQuery) return \`Results for "\${searchQuery}"\`;
    const numTags = activeFilters.selectedTags.length;
    const numAges = activeFilters.selectedAges.length;
    const hasPrice = activeFilters.minPrice > 0 || activeFilters.maxPrice < MAX_SLIDER_PRICE;
    
    if (numTags === 1 && numAges === 0 && !hasPrice) return activeFilters.selectedTags[0];
    if (numAges === 1 && numTags === 0 && !hasPrice) return \`\${activeFilters.selectedAges[0]} Toys\`;
    if (numTags > 0 || numAges > 0 || hasPrice) return "Filtered Products";
    
    return "All Products";
  };`;

content = content.replace('  const displayPrice = (price) => {', helper + '\n\n  const displayPrice = (price) => {');
content = content.replace('{searchQuery ? `Results for "${searchQuery}"` : \'Magic Collection\'}', '{getPageTitle()}');

fs.writeFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\Shop.jsx', content, 'utf8');
console.log('Title logic updated');
