/**
 * AI Service — OpenAI Integration (Optional Phase)
 * Property description generation and travel recommendations
 */

const OpenAI = require('openai');

let openaiClient;

function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Generate an SEO-optimized property description
 * @param {object} propertyDetails - { title, type, location, amenities, bedrooms, maxGuests }
 * @returns {Promise<string>}
 */
async function generatePropertyDescription(propertyDetails) {
  const client = getOpenAIClient();
  if (!client) {
    return 'AI description generation not available. Please add your property description manually.';
  }

  const prompt = `Write a compelling, SEO-optimized homestay description for a travel booking platform.

Property Details:
- Title: ${propertyDetails.title}
- Type: ${propertyDetails.type}
- Location: ${propertyDetails.location}
- Bedrooms: ${propertyDetails.bedrooms}
- Max Guests: ${propertyDetails.maxGuests}
- Amenities: ${propertyDetails.amenities?.join(', ') || 'Standard amenities'}

Requirements:
- 150-200 words
- Highlight unique features
- Mention local attractions
- Warm, inviting tone
- Include keywords for search visibility`;

  const response = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

/**
 * Get AI-powered travel recommendations for a destination
 * @param {string} destination
 * @param {number} nights
 * @param {number} guests
 * @returns {Promise<object>}
 */
async function getTravelRecommendations(destination, nights, guests) {
  const client = getOpenAIClient();
  if (!client) {
    return { tips: [], activities: [], restaurants: [] };
  }

  const prompt = `Provide travel recommendations for ${destination}, India for ${guests} guest(s) staying ${nights} nights.

Return a JSON object with:
{
  "tips": ["tip1", "tip2", "tip3"],
  "activities": [{"name": "", "description": "", "estimatedCost": ""}],
  "restaurants": [{"name": "", "cuisine": "", "priceRange": ""}],
  "bestTimeToVisit": "",
  "localTransport": ""
}`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch {
    return { tips: [], activities: [], restaurants: [] };
  }
}

module.exports = { generatePropertyDescription, getTravelRecommendations };
