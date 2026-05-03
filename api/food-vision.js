export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { image, mediaType = 'image/jpeg' } = req.body;
  if (!image) return res.status(400).json({ error: 'Geen afbeelding meegestuurd' });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.VITE_ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: image },
          },
          {
            type: 'text',
            text: `Identificeer alle eetbare producten in deze foto zo nauwkeurig mogelijk.
Geef de voedingswaarden per 100g terug als een JSON array in dit formaat:
[{"name": "productnaam in het Nederlands", "brand": "merknaam of lege string", "kcal": 0, "protein": 0, "carbs": 0, "fat": 0, "grams_estimate": 100}]

"grams_estimate" is je schatting van de hoeveelheid op de foto in grammen.
Geef ALLEEN de JSON array terug, geen uitleg of tekst eromheen.`,
          },
        ],
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '[]';

  try {
    const match = text.match(/\[[\s\S]*\]/);
    const products = match ? JSON.parse(match[0]) : [];
    return res.status(200).json({ products });
  } catch {
    return res.status(200).json({ products: [], raw: text });
  }
}
