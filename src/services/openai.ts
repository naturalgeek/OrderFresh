// Extract shopping list items from a recipe URL using GPT with web_search
export async function extractItemsFromUrl(
  url: string,
  apiKey: string,
): Promise<string[]> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      tools: [{ type: 'web_search' }],
      input: `Visit this URL and extract the recipe ingredients as a shopping list: ${url}

Return ONLY a JSON array of strings, each string being one ingredient/item.
Example: ["2 onions", "500g chicken breast", "1 can coconut milk"]
No commentary, no markdown, just the JSON array.`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.output
    ?.filter((o: { type: string }) => o.type === 'message')
    ?.flatMap((o: { content: Array<{ type: string; text?: string }> }) => o.content)
    ?.filter((c: { type: string }) => c.type === 'output_text')
    ?.map((c: { text: string }) => c.text)
    ?.join('') || '';

  return parseJsonArray(text);
}

// Extract shopping list items from an image using GPT vision
export async function extractItemsFromImage(
  imageDataUrl: string,
  apiKey: string,
): Promise<string[]> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Look at this image. It might be a recipe, a shopping list, a meal, or food items.
Extract all ingredients or food items you can identify as a shopping list.
If it's a photo of food, estimate the ingredients needed to make the dish.

Return ONLY a JSON array of strings, each being one ingredient/item.
Example: ["2 onions", "500g chicken breast", "1 can coconut milk"]
No commentary, no markdown, just the JSON array.`,
            },
            {
              type: 'input_image',
              image_url: imageDataUrl,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.output
    ?.filter((o: { type: string }) => o.type === 'message')
    ?.flatMap((o: { content: Array<{ type: string; text?: string }> }) => o.content)
    ?.filter((c: { type: string }) => c.type === 'output_text')
    ?.map((c: { text: string }) => c.text)
    ?.join('') || '';

  return parseJsonArray(text);
}

function parseJsonArray(text: string): string[] {
  // Try to extract JSON array from the response (may be wrapped in markdown code blocks)
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter(Boolean);
    }
  } catch {
    // Fall back to line-by-line parsing
    return cleaned
      .split('\n')
      .map(line => line.replace(/^[-*\d.)\]]+\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}
