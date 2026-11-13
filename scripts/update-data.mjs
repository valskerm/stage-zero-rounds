// Pulls the latest Stage Zero league data from the FPL API and writes data.json.
import { writeFileSync } from "node:fs";

const LEAGUE_ID = 657059;
const API = "https://fantasy.premierleague.com/api";
const headers = { "User-Agent": "Mozilla/5.0 (stage-zero-rounds)" };

async function get(path) {
  const res = await fetch(API + path, { headers });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

const standings = await get(`/leagues-classic/${LEAGUE_ID}/standings/`);
const managers = [];
for (const row of standings.standings.results) {
  const hist = await get(`/entry/${row.entry}/history/`);
  const h = {};
  for (const gw of hist.current) h[gw.event] = gw.total_points;
  managers.push({ id: row.entry, team: row.entry_name, name: row.player_name, h });
}
const lastGw = Math.max(0, ...managers.flatMap(m => Object.keys(m.h).map(Number)));
const data = { updated: new Date().toISOString().slice(0, 10), lastGw, managers };
writeFileSync("data.json", JSON.stringify(data, null, 1) + "\n");
console.log(`Saved ${managers.length} managers, data up to GW${lastGw}`);
