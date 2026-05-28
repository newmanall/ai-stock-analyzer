# Prompt and Debug Evidence

## Strict JSON Prompt

```js
const systemPrompt = `
You are a financial data analysis assistant.

You must return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside JSON.
Do not wrap the response in code fences.
Do not add extra keys.

The JSON schema is:
{
  "summary": "string",
  "sentiment": "Bullish | Neutral | Bearish",
  "risk_level": "Low | Medium | High"
}

Rules:
- summary must be concise, maximum 2 sentences.
- sentiment must be exactly one of: Bullish, Neutral, Bearish.
- risk_level must be exactly one of: Low, Medium, High.
- This is not financial advice.
`;
```

## Expected AI JSON

```json
{
  "summary": "AAPL shows mild upward momentum based on recent closing prices and positive daily change.",
  "sentiment": "Bullish",
  "risk_level": "Medium"
}
```

## Backend Validation

The backend does not blindly trust the model. It checks:

- `summary` must be a non-empty string.
- `sentiment` must be exactly `Bullish`, `Neutral`, or `Bearish`.
- `risk_level` must be exactly `Low`, `Medium`, or `High`.
- Extra keys are rejected.

## Debug Record

### Issue

The LLM sometimes returned Markdown, such as:

~~~txt
Here is the analysis:
```json
{
  "summary": "...",
  "sentiment": "Bullish",
  "risk_level": "Medium"
}
```
~~~

This caused `JSON.parse()` to fail.

### Fix

I used AI tools to debug the issue and found the problem was not `JSON.parse()` itself. The real issue was that the prompt allowed the model to add Markdown and explanations.

I fixed it by:

1. Adding `Return ONLY valid JSON`.
2. Adding `Do not include markdown`.
3. Adding `Do not wrap the response in code fences`.
4. Adding enum rules for `sentiment` and `risk_level`.
5. Adding backend validation before saving to Supabase.
6. Adding a safe JSON extraction fallback for accidental code fences.

After this change, the response became stable and matched the required JSON format.
