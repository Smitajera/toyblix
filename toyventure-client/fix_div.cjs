const fs = require('fs');
let content = fs.readFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx', 'utf8');

const targetStr = `<p className="text-zinc-600 font-medium leading-relaxed mb-8 text-lg">
              {displayDescription || "Bring home the magic with this incredible toy! Spark creativity, imagination, and endless hours of joy."}
            </p></div>

            <p className="text-zinc-600 font-medium leading-relaxed mb-8 text-lg">
              {displayDescription || "Bring home the magic with this incredible toy! Spark creativity, imagination, and endless hours of joy."}
            </p>`;

content = content.replace(targetStr, '            </div>');

fs.writeFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx', content, 'utf8');
console.log('Fixed div');
