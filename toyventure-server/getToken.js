const jwt = require('jsonwebtoken');

// We are using a dummy ID and your exact secret key
const dummyUserId = "64b1f28e932a9e1028374xyz"; // Example MongoDB ID
const secretKey = "super_secret_toyblix_key_2026";

const token = jwt.sign({ id: dummyUserId }, secretKey, {
    expiresIn: '30d',
});

console.log("==========================================");
console.log("🔑 YOUR TEST JWT TOKEN:");
console.log(token);
console.log("==========================================");