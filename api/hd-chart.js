export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { birthdate, birthtime, birthplace } = req.body;

  if (!birthdate || !birthtime || !birthplace) {
    return res.status(400).json({ error: 'birthdate, birthtime en birthplace zijn verplicht' });
  }

  // Combineer datum en tijd met tijdzone offset (Europe/Amsterdam = +01:00 / +02:00)
  // We gebruiken een vaste offset op basis van de maand (zomer/wintertijd)
  const month = parseInt(birthdate.split('-')[1]);
  const offset = (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
  const datetime = `${birthdate}T${birthtime}${offset}`;

  // Extraheer stad (neem het eerste deel voor een komma)
  const city = birthplace.split(',')[0].trim();

  const response = await fetch('https://api.humandesignhub.app/v1/simple-bodygraph', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.HD_API_KEY,
    },
    body: JSON.stringify({ datetime, birth_city: city }),
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(response.status).json({ error: err });
  }

  const data = await response.json();
  return res.status(200).json(data);
}
