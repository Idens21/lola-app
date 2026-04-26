export default async function handler(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'No query' });
  
  const response = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments,brands`
  );
  const data = await response.json();
  res.status(200).json(data);
}
