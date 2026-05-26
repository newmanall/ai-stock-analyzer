/**
 * Sector / industry plate performance service using East Money APIs.
 */

const EAST_MONEY_SECTOR_URL = "https://push2.eastmoney.com/api/qt/clist/get";

export async function fetchSectorPerformance(limit = 10) {
  const url = `${EAST_MONEY_SECTOR_URL}?pn=1&pz=${limit}&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f2,f3,f4,f12,f14,f104,f105`;

  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.warn(`Sector API network error: ${err.message}`);
    return [];
  }

  if (!response.ok) {
    console.warn(`Sector API returned status ${response.status}`);
    return [];
  }

  let raw;
  try {
    raw = await response.json();
  } catch (err) {
    console.warn(`Sector API JSON parse error: ${err.message}`);
    return [];
  }

  const data = raw?.data?.diff;

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    code: item.f12,
    name: item.f14,
    changePercent: Number(((item.f3 ?? 0)).toFixed(2)),
    upCount: item.f104 ?? 0,
    downCount: item.f105 ?? 0,
  }));
}
