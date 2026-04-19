/**
 * OpenAI Service
 * Powers the AI travel assistant chatbot
 *
 * Uses the OpenAI Chat Completions API (gpt-3.5-turbo)
 * Graceful fallback if key is missing or quota exceeded
 */

const axios = require('axios');

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';

// ─── System prompt — defines the AI's persona ─────────────────────────────────
const SYSTEM_PROMPT = `You are TravelBot, an expert AI travel assistant for the Travel Super App — a platform for booking homestays, hotels, flights, transport, and tour packages across India.

Your role:
- Help users plan trips and suggest destinations
- Recommend hotels, homestays, and packages
- Provide travel tips, best times to visit, and local insights
- Assist with budget planning for trips
- Answer questions about Indian travel destinations
- Suggest itineraries (e.g., "3-day Goa trip", "weekend in Manali")
- Help with transport options between cities

Guidelines:
- Be friendly, concise, and helpful
- Focus on Indian travel destinations primarily
- Provide specific, actionable suggestions
- Mention price ranges in INR when relevant
- Keep responses under 200 words unless a detailed itinerary is requested
- Use emojis sparingly to make responses engaging
- If asked about booking, guide users to use the app's features`;

/**
 * Send a message to OpenAI and get a travel assistant response
 * @param {Array} messages - Chat history [{role, content}]
 * @param {string} userMessage - Latest user message
 * @returns {string} AI response text
 */
async function getChatResponse(messages, userMessage) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return getFallbackResponse(userMessage);
  }

  try {
    // Build conversation history (last 10 messages to stay within token limits)
    const conversationHistory = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await axios.post(
      OPENAI_BASE,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content: userMessage },
        ],
        max_tokens: 400,
        temperature: 0.7,
        presence_penalty: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    return response.data.choices?.[0]?.message?.content?.trim() || getFallbackResponse(userMessage);
  } catch (err) {
    const status = err.response?.status;
    const errMsg = err.response?.data?.error?.message || err.message;
    console.warn(`[OpenAI] Chat failed (${status}): ${errMsg}`);

    if (status === 429) {
      return "I'm a bit busy right now (rate limit reached). Please try again in a moment! 🙏";
    }
    if (status === 401) {
      return getFallbackResponse(userMessage);
    }

    return "Sorry, I'm having trouble connecting right now. Please try again shortly! 🔄";
  }
}

// ─── Rule-based fallback when OpenAI is unavailable ───────────────────────────
function getFallbackResponse(message) {
  const msg = message.toLowerCase();

  if (msg.includes('goa')) {
    return "🏖️ Goa is perfect for beach lovers! Best time: November–March. Top spots: Calangute Beach, Fort Aguada, Dudhsagar Falls. Budget: ₹3,000–8,000/night for stays. Don't miss the seafood and nightlife at Baga Beach!";
  }
  if (msg.includes('manali') || msg.includes('himachal')) {
    return "⛰️ Manali is stunning! Best time: March–June & Oct–Nov. Must-visit: Rohtang Pass, Solang Valley, Old Manali. Budget stays from ₹1,500/night. Carry warm clothes even in summer!";
  }
  if (msg.includes('kerala') || msg.includes('backwater')) {
    return "🌴 Kerala — God's Own Country! Best time: September–March. Highlights: Alleppey backwaters, Munnar tea gardens, Kovalam beach. Houseboat stays from ₹8,000/night. Try the Sadya meal!";
  }
  if (msg.includes('jaipur') || msg.includes('rajasthan')) {
    return "🏰 Jaipur — the Pink City! Best time: October–March. Must-see: Amber Fort, Hawa Mahal, City Palace. Budget: ₹2,000–6,000/night. Try dal baati churma and shop at Johari Bazaar!";
  }
  if (msg.includes('budget') || msg.includes('cheap') || msg.includes('affordable')) {
    return "💰 Budget travel tips for India:\n• Hostels & guesthouses: ₹500–1,500/night\n• Local trains & buses save 70% vs flights\n• Eat at dhabas for ₹100–200/meal\n• Best budget destinations: Rishikesh, Hampi, Pushkar, Coorg\n• Book 2–3 weeks ahead for best prices!";
  }
  if (msg.includes('flight') || msg.includes('fly')) {
    return "✈️ For flights, use our Flights page to search real-time fares! Popular routes:\n• Mumbai–Goa: ₹3,000–6,000\n• Delhi–Manali: ₹4,000–8,000\n• Bangalore–Kerala: ₹2,500–5,000\nBook 3–4 weeks ahead for best prices. IndiGo and SpiceJet often have the cheapest fares!";
  }
  if (msg.includes('hotel') || msg.includes('stay') || msg.includes('homestay')) {
    return "🏠 Find great stays on our Explore page! We have:\n• Beachside cottages in Goa from ₹3,500/night\n• Mountain farmhouses in Manali from ₹4,500/night\n• Heritage havelis in Jaipur from ₹8,500/night\n• Backwater houseboats in Kerala from ₹9,500/night\nSearch by city to see real-time availability!";
  }
  if (msg.includes('package') || msg.includes('tour')) {
    return "🧳 Check our Tour Packages section! Our agents create curated packages combining stays, transport & activities:\n• Goa Beach Getaway 4D/3N: ₹8,500/person\n• Rajasthan Heritage Tour 7D/6N: ₹18,000/person\n• Kerala Backwaters 5D/4N: ₹12,000/person\nAll packages include accommodation and transport!";
  }
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return "👋 Hello! I'm TravelBot, your AI travel assistant. I can help you:\n• Plan trips to any Indian destination\n• Find hotels, flights & packages\n• Suggest itineraries & travel tips\n• Answer any travel questions\n\nWhere would you like to go? 🗺️";
  }

  return "🌍 I'm here to help you plan your perfect trip! Ask me about:\n• Destinations (Goa, Manali, Kerala, Jaipur...)\n• Hotels & homestays\n• Flights & transport\n• Tour packages & itineraries\n• Budget tips & best times to visit\n\nWhat would you like to know?";
}

module.exports = { getChatResponse };
