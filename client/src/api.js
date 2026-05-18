export async function fetchStockData(symbol) {
  const response = await fetch("/api/stock/fetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ symbol })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch stock data");
  }

  return data;
}
