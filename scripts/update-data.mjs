// Pulls the latest Stage Zero league data from the FPL API and writes data.json.
// Reads every page of the standings plus any "new entries" (managers who joined
// since the last gameweek was processed), so newly added players are included.
import { writeFileSync } from "node:fs";

const LEAGUE_ID = 657059;
const API = "https://fantasy.premierleague.com/api";
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "Accept": "application/json",
};

async function get(path, tries = 4) {
  for (let i = 1; ; i++) {
    const res = await fetch(API + path, { headers });
    if (res.ok) return res.json();
    if (i >= tries) throw new Error(`${path} -> HTTP ${res.status}`);
    console.log(`${path} -> HTTP ${res.status}, retrying`);
    await new Promise(r => setTimeout(r, 5000 * i));
  }
}

// Collect every manager in the league
const entries = new Map();
for (let page = 1; ; page++) {
  const s = await get(`/leagues-classic/${LEAGUE_ID}/standings/?page_standings=${page}&page_new_entries=${page}`);
  for (const r of s.standings.results) entries.set(r.entry, { team: r.entry_name, name: r.player_name });
  for (const r of s.new_entries?.results ?? []) {
    if (!entries.has(r.entry)) entries.set(r.entry, { team: r.entry_name, name: `${r.player_first_name} ${r.player_last_name}` });
  }
  if (!s.standings.has_next && !s.new_entries?.has_next) break;
}
if (entries.size === 0) throw new Error("No managers returned. Not overwriting data.json.");

const managers = [];
for (const [id, info] of entries) {
  const hist = await get(`/entry/${id}/history/`);
  const h = {};
  for (const gw of hist.current) h[gw.event] = gw.total_points;
  managers.push({ id, ...info, h });
}
const lastGw = Math.max(0, ...managers.flatMap(m => Object.keys(m.h).map(Number)));
const data = { updated: new Date().toISOString().slice(0, 10), lastGw, managers };
writeFileSync("data.json", JSON.stringify(data, null, 1) + "\n");
console.log(`Saved ${managers.length} managers, data up to GW${lastGw}:`);
for (const m of managers) console.log(` - ${m.name} (${m.team})`);
