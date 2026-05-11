// toyventure-server/controllers/chatController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini with your API Key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

const systemInstruction = `
You are the 'ToyBlix chatbot', the official customer support AI for ToyBlix.
Tone: Friendly, concise, helpful, and professional. 
Rules:
1. STRICT RETURN POLICY: ToyBlix has a strict NO-RETURN policy for all toys due to hygiene and child safety standards. We NEVER offer refunds for 'change of mind'.
2. DEFECTS: We only offer exact replacements if the toy is defective upon arrival. The customer MUST provide an unboxing video within 48 hours to request an exchange.
3. SAFETY STANDARDS: All our toys are certified non-toxic, BPA-free, and comply with international child safety regulations.
4. SHIPPING: Standard shipping takes 3-5 business days.
5. If a user is angry, asks a complex question you don't know, or demands to speak to a human, include the exact word "HANDOFF_TO_HUMAN" somewhere in your response.

Always keep your responses under 3 sentences. Use emojis sparingly.
`;

const handleChat = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction 
        });

        // 1. Clean out any empty messages from the frontend
        let formattedHistory = [];
        if (history && Array.isArray(history)) {
            for (const msg of history) {
                const text = msg.text ? msg.text.trim() : '';
                if (text) {
                    formattedHistory.push({
                        role: msg.sender === 'bot' ? 'model' : 'user',
                        parts: [{ text: text }]
                    });
                }
            }
        }

        // 2. The Sanitizer: Gemini crashes if roles don't strictly alternate.
        // We will merge consecutive messages of the same role together.
        let safeHistory = [];
        for (const msg of formattedHistory) {
            if (safeHistory.length === 0) {
                if (msg.role === 'user') safeHistory.push(msg); // History MUST start with 'user'
            } else {
                const lastMsg = safeHistory[safeHistory.length - 1];
                if (lastMsg.role === msg.role) {
                    // Combine back-to-back messages
                    lastMsg.parts[0].text += "\n" + msg.parts[0].text; 
                } else {
                    safeHistory.push(msg);
                }
            }
        }

        // 3. Ensure the final history item is 'model' 
        // (because the incoming `chat.sendMessage(message)` will act as the next 'user' message)
        if (safeHistory.length > 0 && safeHistory[safeHistory.length - 1].role === 'user') {
            safeHistory.pop(); 
        }

        // Start a chat session with the perfectly sanitized history
        const chat = model.startChat({
            history: safeHistory,
        });

        // Send the new message to the bot
        const result = await chat.sendMessage(message);
        
        let responseText = "";
        try {
            // Attempt to read the text. (This can throw if Gemini triggers a false-positive safety block)
            responseText = result.response.text();
        } catch (e) {
            console.warn("Gemini Blocked Response:", e);
            responseText = "I apologize, but I am unable to process that specific request. Let me get a human to assist you! HANDOFF_TO_HUMAN";
        }

        // Check if the bot triggered the human handoff protocol
        const needsHuman = responseText.includes("HANDOFF_TO_HUMAN");
        
        // Clean the secret trigger word out of the final message sent to the user
        const cleanResponse = responseText.replace("HANDOFF_TO_HUMAN", "").trim();

        res.json({ 
            reply: cleanResponse,
            needsHuman: needsHuman 
        });

    } catch (error) {
        console.error("AI Chatbot Error:", error);
        res.status(500).json({ message: "Sorry, my circuits are crossed! Please try again later." });
    }
};

module.exports = { handleChat };