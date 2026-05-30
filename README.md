# Disney Ops Planner V25 Live Escape Finder

Adds:
- LIVE assistant now recommends live low-wait escape options
- Pulls current wait-time data from loaded ThemeParks.wiki response
- Shows best low-wait rides
- Shows calm show / indoor options
- Meltdown + rain questions prioritize shows, indoor rides, AC, and low queues
- Keeps AI Assistant, LIVE Mode, budget/deals, weather, fatigue, saved trips, PDF

Run:

docker compose down --remove-orphans
docker compose build --no-cache
docker compose up

Open:
http://localhost:5173
