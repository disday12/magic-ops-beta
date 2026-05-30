import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const resorts = ['Port Orleans Riverside','Port Orleans French Quarter','Pop Century','Art of Animation','Caribbean Beach','Animal Kingdom Lodge','Contemporary','Polynesian','Grand Floridian','Wilderness Lodge','BoardWalk','Beach Club','Yacht Club','Other'];

const hotelTiers = [
  { resort: 'Pop Century', tier: 'Value', nightly: 240, transportation: 'Skyliner', note: 'Best lower-cost Disney resort with Skyliner access.' },
  { resort: 'Art of Animation', tier: 'Value+', nightly: 310, transportation: 'Skyliner', note: 'Great theming for kids, often pricier than Pop.' },
  { resort: 'Port Orleans Riverside', tier: 'Moderate', nightly: 325, transportation: 'Bus / Disney Springs boat', note: 'Great balance of price, pools, and relaxed resort feel.' },
  { resort: 'Caribbean Beach', tier: 'Moderate+', nightly: 360, transportation: 'Skyliner', note: 'Strong pick if EPCOT/Hollywood Studios matter.' },
  { resort: 'Wilderness Lodge', tier: 'Deluxe-', nightly: 575, transportation: 'Boat to Magic Kingdom', note: 'Deluxe feel, great resort, but eats budget fast.' },
  { resort: 'Contemporary', tier: 'Deluxe', nightly: 725, transportation: 'Walk/monorail to Magic Kingdom', note: 'Best convenience for Magic Kingdom, expensive.' },
  { resort: 'Polynesian', tier: 'Deluxe', nightly: 760, transportation: 'Monorail', note: 'Excellent location and vibe, usually premium cost.' }
];

function nightsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const ms = end - start;
  if (Number.isNaN(ms) || ms <= 0) return 4;
  return Math.max(1, Math.round(ms / 86400000));
}

function buildBudgetScenarios(form, target) {
  const adults = Number(form.adults || 2);
  const kids = Number(form.kidsCount || 3);
  const people = adults + kids;
  const nights = nightsBetween(form.startDate, form.endDate);
  const ticketDays = Number(form.ticketDays || 4);
  const ticketPerPersonDay = Number(form.ticketPerPersonDay || 165);
  const diningPlanPerPersonDay = Number(form.diningPlanPerPersonDay || 98);
  const souvenirBudget = Number(form.souvenirBudget || 400);
  const flightBudget = Number(form.flightBudget || 0);
  const strollerBudget = Number(form.strollerBudget || 0);
  const hasDining = String(form.diningPlan || '').toLowerCase() !== 'none';

  return hotelTiers.map(h => {
    const hotel = h.nightly * nights;
    const tickets = ticketPerPersonDay * ticketDays * people;
    const dining = hasDining ? diningPlanPerPersonDay * nights * people : 0;
    const extras = souvenirBudget + flightBudget + strollerBudget;
    const total = hotel + tickets + dining + extras;
    const remaining = target - total;

    let recommendation = 'Over budget';
    if (remaining >= 1000) recommendation = 'Comfortable';
    else if (remaining >= 0) recommendation = 'Works but tight';
    else if (remaining >= -750) recommendation = 'Close if you trim extras';
    else recommendation = 'Too expensive for target';

    const cuts = [];
    if (remaining < 0 && hasDining) cuts.push('Remove or downgrade dining plan');
    if (remaining < 0 && souvenirBudget > 250) cuts.push('Lower souvenir budget');
    if (remaining < 0 && ticketDays > 3) cuts.push('Reduce one park day');
    if (remaining < 0 && h.tier.includes('Deluxe')) cuts.push('Move to Moderate or Value resort');

    return { ...h, nights, people, hotel, tickets, dining, extras, total, remaining, recommendation, cuts };
  }).sort((a,b) => {
    if (a.remaining >= 0 && b.remaining < 0) return -1;
    if (a.remaining < 0 && b.remaining >= 0) return 1;
    return Math.abs(a.remaining) - Math.abs(b.remaining);
  });
}




const offerWatchRules = [
  {
    id:'fall_room',
    title:'Fall / Halloween Room Discounts',
    expected:'Usually July - September',
    savings:'10% - 30% room savings',
    linkedSavings: 20,
    description:'Historically Disney often releases fall room discounts for October trips.'
  },
  {
    id:'kids_dining',
    title:'Kids Dining Offers',
    expected:'Package promotion periods',
    savings:'Hundreds in dining savings',
    linkedSavings: 650,
    description:'Family dining offers can dramatically reduce dining costs.'
  },
  {
    id:'ticket_offer',
    title:'4-Day Ticket Promotions',
    expected:'Seasonal',
    savings:'5% - 10% ticket savings',
    linkedSavings: 250,
    description:'Ticket promos matter more for larger families.'
  }
];

const resortScenarios = [
  { resort:'Pop Century', tier:'Value', nightly:240 },
  { resort:'Art of Animation', tier:'Value+', nightly:310 },
  { resort:'Port Orleans Riverside', tier:'Moderate', nightly:325 },
  { resort:'Caribbean Beach', tier:'Moderate+', nightly:360 },
  { resort:'Wilderness Lodge', tier:'Deluxe-', nightly:575 },
  { resort:'Contemporary', tier:'Deluxe', nightly:725 },
  { resort:'Polynesian', tier:'Deluxe', nightly:760 }
];

function calculateBudgetScenarios(form, target) {
  const adults = Number(form.adults || 2);
  const kids = Number(form.kidsCount || 3);
  const people = adults + kids;
  const nights = nightsBetween(form.startDate, form.endDate);
  const ticketDays = Number(form.ticketDays || 4);
  const ticketPerPersonDay = Number(form.ticketPerPersonDay || 165);
  const diningPlanPerPersonNight = Number(form.diningPlanPerPersonDay || 98);
  const souvenirBudget = Number(form.souvenirBudget || 400);
  const flightBudget = Number(form.flightBudget || 0);
  const strollerBudget = Number(form.strollerBudget || 0);
  const miscBudget = Number(form.miscBudget || 0);
  const hasDining = form.diningPlan !== 'None';

  return resortScenarios.map(r => {
    const hotel = r.nightly * nights;
    const tickets = people * ticketDays * ticketPerPersonDay;
    const dining = hasDining ? people * nights * diningPlanPerPersonNight : 0;
    const extras = souvenirBudget + flightBudget + strollerBudget + miscBudget;
    const total = hotel + tickets + dining + extras;
    const remaining = target - total;

    let recommendation = 'Over budget';
    if (remaining >= 1000) recommendation = 'Comfortable';
    else if (remaining >= 0) recommendation = 'Works but tight';
    else if (remaining >= -750) recommendation = 'Close if you trim extras';
    else recommendation = 'Too expensive for target';

    const cuts = [];
    if (remaining < 0 && hasDining) cuts.push('Remove or downgrade dining plan');
    if (remaining < 0 && souvenirBudget > 250) cuts.push('Lower souvenir budget');
    if (remaining < 0 && ticketDays > 3) cuts.push('Reduce one park day');
    if (remaining < 0 && r.tier.includes('Deluxe')) cuts.push('Move to Moderate or Value resort');

    return {
      ...r,
      nights,
      people,
      hotel,
      tickets,
      dining,
      extras,
      total,
      remaining,
      recommendation,
      cuts
    };
  }).sort((a,b) => {
    if (a.remaining >= 0 && b.remaining < 0) return -1;
    if (a.remaining < 0 && b.remaining >= 0) return 1;
    return Math.abs(a.remaining) - Math.abs(b.remaining);
  });
}


const parks = ['','Magic Kingdom','EPCOT','Animal Kingdom','Hollywood Studios','Resort / Rest Day'];
function splitList(value) { return value.split(',').map(x => x.trim()).filter(Boolean); }


function destinationName(d) {
  if (!d) return 'Unknown destination';
  return d.name || d.slug || 'Theme park destination';
}

function WeatherSummary({weatherStatus}) {
  if (!weatherStatus) return <p>Click “Check Open-Meteo Weather API” to preview weather data.</p>;
  const entries = Object.entries(weatherStatus);
  return <div className="weatherCardGrid">
    {entries.map(([date, w]) => (
      <div className="magicWeatherCard" key={date}>
        <div className="weatherIcon">{(w.rainProbability || 0) >= 45 ? '🌧️' : (w.high || 0) >= 88 ? '☀️' : '🌤️'}</div>
        <h3>{date}</h3>
        <div className="weatherBig">{w.high ?? 'n/a'}°</div>
        <p>Low {w.low ?? 'n/a'}° · Rain {w.rainProbability ?? 'n/a'}%</p>
        <span className={w.source?.includes('fallback') ? 'tag warningTag' : 'tag goodTag'}>
          {w.source?.includes('fallback') ? 'Seasonal estimate' : 'Live forecast'}
        </span>
      </div>
    ))}
  </div>
}



function DisneyWaitDashboard({waitStatus, onRefresh}) {
  if (!waitStatus) {
    return <div className="emptyMagic">
      <div className="bigIcon">🎢</div>
      <h3>Live Disney wait times</h3>
      <p>Click refresh to pull Walt Disney World ride wait data from ThemeParks.wiki.</p>
      <button onClick={onRefresh}>Refresh Wait Times</button>
    </div>
  }
  const connected = waitStatus.status === 'connected';
  if (!connected) {
    return <div className="apiPretty">
      <div className="statusOrb bad">!</div>
      <div>
        <h3>Wait times unavailable</h3>
        <p>{waitStatus.message || waitStatus.fallback || 'The wait-time API is not reachable right now.'}</p>
        <button onClick={onRefresh}>Try Again</button>
      </div>
    </div>
  }
  return <div>
    <div className="waitHeader">
      <div>
        <h2>🎡 Walt Disney World Live Wait Dashboard</h2>
        <p>Source: {waitStatus.source} · Destination: {waitStatus.destination} · Updated: {waitStatus.generatedAt}</p>
      </div>
      <button onClick={onRefresh}>Refresh Wait Times</button>
    </div>
    <div className="parkWaitGrid">
      {(waitStatus.parks || []).map((park, i) => <ParkWaitCard park={park} key={i} />)}
    </div>
  </div>
}


function RideStrategySummary({waitStatus}) {
  if (!waitStatus || waitStatus.status !== 'connected') return null;
  
const hotelTiers = [
  { resort: 'Pop Century', tier: 'Value', nightly: 240, transportation: 'Skyliner', note: 'Best lower-cost Disney resort with Skyliner access.' },
  { resort: 'Art of Animation', tier: 'Value+', nightly: 310, transportation: 'Skyliner', note: 'Great theming for kids, often pricier than Pop.' },
  { resort: 'Port Orleans Riverside', tier: 'Moderate', nightly: 325, transportation: 'Bus / Disney Springs boat', note: 'Great balance of price, pools, and relaxed resort feel.' },
  { resort: 'Caribbean Beach', tier: 'Moderate+', nightly: 360, transportation: 'Skyliner', note: 'Strong pick if EPCOT/Hollywood Studios matter.' },
  { resort: 'Wilderness Lodge', tier: 'Deluxe-', nightly: 575, transportation: 'Boat to Magic Kingdom', note: 'Deluxe feel, great resort, but eats budget fast.' },
  { resort: 'Contemporary', tier: 'Deluxe', nightly: 725, transportation: 'Walk/monorail to Magic Kingdom', note: 'Best convenience for Magic Kingdom, expensive.' },
  { resort: 'Polynesian', tier: 'Deluxe', nightly: 760, transportation: 'Monorail', note: 'Excellent location and vibe, usually premium cost.' }
];

function nightsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const ms = end - start;
  if (Number.isNaN(ms) || ms <= 0) return 4;
  return Math.max(1, Math.round(ms / 86400000));
}

function buildBudgetScenarios(form, target) {
  const adults = Number(form.adults || 2);
  const kids = Number(form.kidsCount || 3);
  const people = adults + kids;
  const nights = nightsBetween(form.startDate, form.endDate);
  const ticketDays = Number(form.ticketDays || 4);
  const ticketPerPersonDay = Number(form.ticketPerPersonDay || 165);
  const diningPlanPerPersonDay = Number(form.diningPlanPerPersonDay || 98);
  const souvenirBudget = Number(form.souvenirBudget || 400);
  const flightBudget = Number(form.flightBudget || 0);
  const strollerBudget = Number(form.strollerBudget || 0);
  const hasDining = String(form.diningPlan || '').toLowerCase() !== 'none';

  return hotelTiers.map(h => {
    const hotel = h.nightly * nights;
    const tickets = ticketPerPersonDay * ticketDays * people;
    const dining = hasDining ? diningPlanPerPersonDay * nights * people : 0;
    const extras = souvenirBudget + flightBudget + strollerBudget;
    const total = hotel + tickets + dining + extras;
    const remaining = target - total;

    let recommendation = 'Over budget';
    if (remaining >= 1000) recommendation = 'Comfortable';
    else if (remaining >= 0) recommendation = 'Works but tight';
    else if (remaining >= -750) recommendation = 'Close if you trim extras';
    else recommendation = 'Too expensive for target';

    const cuts = [];
    if (remaining < 0 && hasDining) cuts.push('Remove or downgrade dining plan');
    if (remaining < 0 && souvenirBudget > 250) cuts.push('Lower souvenir budget');
    if (remaining < 0 && ticketDays > 3) cuts.push('Reduce one park day');
    if (remaining < 0 && h.tier.includes('Deluxe')) cuts.push('Move to Moderate or Value resort');

    return { ...h, nights, people, hotel, tickets, dining, extras, total, remaining, recommendation, cuts };
  }).sort((a,b) => {
    if (a.remaining >= 0 && b.remaining < 0) return -1;
    if (a.remaining < 0 && b.remaining >= 0) return 1;
    return Math.abs(a.remaining) - Math.abs(b.remaining);
  });
}




const offerWatchRules = [
  {
    id:'fall_room',
    title:'Fall / Halloween Room Discounts',
    expected:'Usually July - September',
    savings:'10% - 30% room savings',
    linkedSavings: 20,
    description:'Historically Disney often releases fall room discounts for October trips.'
  },
  {
    id:'kids_dining',
    title:'Kids Dining Offers',
    expected:'Package promotion periods',
    savings:'Hundreds in dining savings',
    linkedSavings: 650,
    description:'Family dining offers can dramatically reduce dining costs.'
  },
  {
    id:'ticket_offer',
    title:'4-Day Ticket Promotions',
    expected:'Seasonal',
    savings:'5% - 10% ticket savings',
    linkedSavings: 250,
    description:'Ticket promos matter more for larger families.'
  }
];

const resortScenarios = [
  { resort:'Pop Century', tier:'Value', nightly:240 },
  { resort:'Art of Animation', tier:'Value+', nightly:310 },
  { resort:'Port Orleans Riverside', tier:'Moderate', nightly:325 },
  { resort:'Caribbean Beach', tier:'Moderate+', nightly:360 },
  { resort:'Wilderness Lodge', tier:'Deluxe-', nightly:575 },
  { resort:'Contemporary', tier:'Deluxe', nightly:725 },
  { resort:'Polynesian', tier:'Deluxe', nightly:760 }
];

function calculateBudgetScenarios(form, target) {
  const adults = Number(form.adults || 2);
  const kids = Number(form.kidsCount || 3);
  const people = adults + kids;
  const nights = nightsBetween(form.startDate, form.endDate);
  const ticketDays = Number(form.ticketDays || 4);
  const ticketPerPersonDay = Number(form.ticketPerPersonDay || 165);
  const diningPlanPerPersonNight = Number(form.diningPlanPerPersonDay || 98);
  const souvenirBudget = Number(form.souvenirBudget || 400);
  const flightBudget = Number(form.flightBudget || 0);
  const strollerBudget = Number(form.strollerBudget || 0);
  const miscBudget = Number(form.miscBudget || 0);
  const hasDining = form.diningPlan !== 'None';

  return resortScenarios.map(r => {
    const hotel = r.nightly * nights;
    const tickets = people * ticketDays * ticketPerPersonDay;
    const dining = hasDining ? people * nights * diningPlanPerPersonNight : 0;
    const extras = souvenirBudget + flightBudget + strollerBudget + miscBudget;
    const total = hotel + tickets + dining + extras;
    const remaining = target - total;

    let recommendation = 'Over budget';
    if (remaining >= 1000) recommendation = 'Comfortable';
    else if (remaining >= 0) recommendation = 'Works but tight';
    else if (remaining >= -750) recommendation = 'Close if you trim extras';
    else recommendation = 'Too expensive for target';

    const cuts = [];
    if (remaining < 0 && hasDining) cuts.push('Remove or downgrade dining plan');
    if (remaining < 0 && souvenirBudget > 250) cuts.push('Lower souvenir budget');
    if (remaining < 0 && ticketDays > 3) cuts.push('Reduce one park day');
    if (remaining < 0 && r.tier.includes('Deluxe')) cuts.push('Move to Moderate or Value resort');

    return {
      ...r,
      nights,
      people,
      hotel,
      tickets,
      dining,
      extras,
      total,
      remaining,
      recommendation,
      cuts
    };
  }).sort((a,b) => {
    if (a.remaining >= 0 && b.remaining < 0) return -1;
    if (a.remaining < 0 && b.remaining >= 0) return 1;
    return Math.abs(a.remaining) - Math.abs(b.remaining);
  });
}


const parks = waitStatus.parks || [];
  const allGoNow = parks.flatMap(p => (p.bestNow || []).slice(0,3).map(r => ({...r, parkName:p.parkName})));
  const best = allGoNow.slice(0,8);
  return <div className="panel rideStrategy">
    <h2>🎯 Live Ride Strategy</h2>
    <p className="softText">Based on current posted waits, these are the easiest wins right now.</p>
    <div className="rideStrategyGrid">
      {best.length ? best.map((r,i)=><div className="strategyRide" key={i}>
        <b>{r.name}</b>
        <span>{r.parkName}</span>
        <em>{r.waitTime} min · {r.recommendation}</em>
      </div>) : <p>No strong low-wait opportunities posted right now.</p>}
    </div>
  </div>
}


function ParkWaitCard({park}) {
  const crowd = park.avgWait == null ? 'Unknown' : park.avgWait <= 25 ? 'Light' : park.avgWait <= 45 ? 'Moderate' : 'Heavy';
  return <article className="parkWaitCard">
    <div className="parkWaitTop">
      <div>
        <h3>{park.parkName}</h3>
        <p>{park.operatingCount} operating · {park.attractionCount} tracked</p>
      </div>
      <div className={`crowdBadge c${crowd}`}>{crowd}<span>{park.avgWait == null ? 'n/a' : `${park.avgWait} min avg`}</span></div>
    </div>
    <div className="waitColumns">
      <div>
        <h4>Go Now</h4>
        {(park.bestNow || []).length ? park.bestNow.map((a,i)=><RideRow ride={a} key={i}/>) : <p className="softText">No low waits posted right now.</p>}
      </div>
      <div>
        <h4>Highest Waits</h4>
        {(park.highestWaits || []).length ? park.highestWaits.map((a,i)=><RideRow ride={a} key={i}/>) : <p className="softText">No posted waits.</p>}
      </div>
    </div>
  </article>
}

function RideRow({ride}) {
  return <div className="rideRow">
    <span>{ride.name}</span>
    <b>{ride.waitTime == null ? '—' : `${ride.waitTime}m`}</b>
    <em>{ride.recommendation}</em>
  </div>
}


function extractBudgetFromPrompt(prompt) {
  const m = prompt.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,6})/);
  return m ? Number(m[1].replace(/,/g,'')) : 7000;
}

function buildAITripPlan(prompt, form) {
  const lower = prompt.toLowerCase();
  const budget = extractBudgetFromPrompt(prompt);
  const wantsPool = lower.includes('pool') || lower.includes('rest') || lower.includes('break');
  const wantsCharacters = lower.includes('character') || lower.includes('princess') || lower.includes('mickey');
  const lowStress = lower.includes('overdo') || lower.includes('stress') || lower.includes('meltdown') || lower.includes('tired');
  const kids = Number(form.kidsCount || 3);
  const adults = Number(form.adults || 2);
  const people = adults + kids;
  const ticketDays = Number(form.ticketDays || 4);

  const options = [
    {
      label: 'LOW BUDGET',
      resort: 'Pop Century',
      estimate: Math.round(budget * 0.82),
      dining: 'Quick-service or pay cash',
      style: 'Value-first with smart rest breaks',
      why: ['Best cost control', 'Skyliner helps EPCOT/Hollywood Studios', 'Keeps money available for snacks or one character meal'],
      parkOrder: ['Magic Kingdom', 'Animal Kingdom', 'EPCOT', 'Hollywood Studios'],
      plan: ['Rope drop only the highest-value rides', 'Use quick-service meals', 'Schedule pool/rest after lunch', 'Skip late nights except one special night']
    },
    {
      label: 'MID BUDGET',
      resort: 'Port Orleans Riverside',
      estimate: budget,
      dining: 'Disney Dining Plan if character meals matter',
      style: 'Best balance of cost, comfort, and lower stress',
      why: ['Calmer resort feel', 'Great pool/rest pacing', 'Good fit for kids and stroller breaks', 'Strong value-to-stress balance'],
      parkOrder: ['Magic Kingdom', 'EPCOT', 'Animal Kingdom', 'Hollywood Studios'],
      plan: ['Anchor days with 1–2 character meals', 'Protect midday resort breaks', 'Use weather cards to decide evenings', 'Do not chase every ride']
    },
    {
      label: 'HIGH BUDGET',
      resort: 'Contemporary / Polynesian',
      estimate: Math.round(budget * 1.35),
      dining: 'Character meals + premium convenience',
      style: 'Lowest transportation stress',
      why: ['Best Magic Kingdom convenience', 'Reduces transportation fatigue', 'More table-service AC breaks', 'Premium resort recovery'],
      parkOrder: ['Magic Kingdom', 'Hollywood Studios', 'EPCOT', 'Animal Kingdom'],
      plan: ['Use convenience to reduce fatigue', 'Add Lightning Lane budget', 'Use table-service meals as recovery blocks', 'Keep evenings flexible']
    }
  ];

  if (wantsPool) options.forEach(o => o.plan.push('Add pool/rest block on most park days'));
  if (wantsCharacters) options.forEach(o => o.plan.push('Prioritize character meal over random character lines'));
  if (lowStress) options.forEach(o => o.plan.unshift('Build the trip around avoiding afternoon crashes'));

  return {
    summary: `AI read your request as: ${people} people, ${ticketDays} park days, target budget around $${budget.toLocaleString()}, ${lowStress ? 'low-stress pacing' : 'normal pacing'}.`,
    options,
    recommendation: budget < 6500 ? 'Start with LOW BUDGET, then selectively add one character meal.' :
      budget < 9500 ? 'MID BUDGET is the best fit for most families with young kids.' :
      'HIGH BUDGET can reduce transportation stress, especially for Magic Kingdom-heavy trips.'
  };
}

function applyAIOptionToSetup(option, update, setTab) {
  update('resort', option.resort.includes('/') ? 'Contemporary' : option.resort);
  update('prioritiesText', option.plan.join(', '));
  setTab('setup');
}

function liveStress(plan, waitStatus) {
  if (!plan) return {trip:'No Trip', crowd:'Unknown', weather:'Unknown', meltdown:'Unknown'};
  const day = plan.days?.[0];
  const fatigue = Number(day?.fatigueScore || 5);
  const rain = Number(day?.weather?.rainProbability || 0);
  const heat = Number(day?.weather?.high || 0);
  let crowd = 'Unknown';
  if (waitStatus?.status === 'connected') {
    const waits = (waitStatus.parks || []).flatMap(p => (p.attractions || []).map(a=>a.waitTime).filter(Number.isInteger));
    if (waits.length) {
      const avg = waits.reduce((a,b)=>a+b,0)/waits.length;
      crowd = avg >= 55 ? 'Heavy' : avg >= 30 ? 'Moderate' : 'Light';
    }
  }
  return {
    trip: fatigue >= 8 ? 'High' : fatigue >= 6 ? 'Medium' : 'Low',
    crowd,
    weather: heat >= 88 ? 'Hot' : rain >= 45 ? 'Rain Risk' : 'Low',
    meltdown: fatigue >= 8 ? 'High' : fatigue >= 6 ? 'Medium' : 'Low'
  };
}


function attractionLooksLikeShow(name) {
  const n = String(name || '').toLowerCase();
  return n.includes('show') || n.includes('sing-along') || n.includes('philharmagic') || n.includes('muppet') ||
    n.includes('carousel of progress') || n.includes('country bear') || n.includes('tiki') || n.includes('hall of presidents') ||
    n.includes('festival') || n.includes('beauty and the beast') || n.includes('finding nemo') || n.includes('lion king') ||
    n.includes('turtle talk') || n.includes('impressions') || n.includes('american adventure') || n.includes('journey into imagination');
}

function attractionLooksIndoor(name) {
  const n = String(name || '').toLowerCase();
  return attractionLooksLikeShow(name) || n.includes('pirates') || n.includes('haunted') || n.includes('small world') ||
    n.includes('peoplemover') || n.includes('buzz') || n.includes('spaceship earth') || n.includes('nemo') ||
    n.includes('living with the land') || n.includes('runaway railway') || n.includes('toy story mania') ||
    n.includes('monsters') || n.includes('dinosaur') || n.includes('river journey');
}

function getLiveEscapeOptions(waitStatus, currentPark) {
  if (!waitStatus || waitStatus.status !== 'connected') {
    return {
      rides: [],
      shows: [],
      message: 'Live wait data is not loaded yet. Tap the Waits tab or refresh wait times, then ask again.'
    };
  }

  const parks = waitStatus.parks || [];
  let park = parks.find(p => String(p.parkName || '').toLowerCase().includes(String(currentPark || '').toLowerCase()));
  if (!park && currentPark === 'Magic Kingdom') park = parks.find(p => String(p.parkName || '').toLowerCase().includes('magic'));
  if (!park && currentPark === 'EPCOT') park = parks.find(p => String(p.parkName || '').toLowerCase().includes('epcot'));
  if (!park && currentPark === 'Hollywood Studios') park = parks.find(p => String(p.parkName || '').toLowerCase().includes('hollywood'));
  if (!park && currentPark === 'Animal Kingdom') park = parks.find(p => String(p.parkName || '').toLowerCase().includes('animal'));
  if (!park) park = parks[0];

  const attractions = (park?.attractions || [])
    .filter(a => String(a.status || '').toUpperCase() === 'OPERATING')
    .filter(a => Number.isInteger(a.waitTime))
    .sort((a,b) => a.waitTime - b.waitTime);

  const shows = attractions.filter(a => attractionLooksLikeShow(a.name)).slice(0, 5);
  const rides = attractions.filter(a => !attractionLooksLikeShow(a.name)).slice(0, 8);
  const indoor = attractions.filter(a => attractionLooksIndoor(a.name)).slice(0, 8);

  return {
    parkName: park?.parkName || currentPark || 'current park',
    rides,
    shows,
    indoor,
    message: attractions.length ? 'Live options found.' : 'No live operating waits found for this park.'
  };
}

function answerLiveOps(question, plan, waitStatus) {
  const q = question.toLowerCase();
  const day = plan?.days?.[0];
  const park = day?.park || 'your current park';
  const fatigue = Number(day?.fatigueScore || 5);
  const rain = Number(day?.weather?.rainProbability || 0);
  const heat = Number(day?.weather?.high || 0);
  const escape = getLiveEscapeOptions(waitStatus, park);

  let title = 'Magic Ops Recommendation';
  let action = 'Simplify the plan, protect food/water, and avoid unnecessary walking.';
  const steps = [];
  let priority = 'lowest-friction';

  if (q.includes('leave')) {
    title = 'Should We Leave?';
    if (fatigue >= 8 || heat >= 90) {
      action = `Yes — strongly consider leaving ${park} for a resort reset.`;
      steps.push('Stop ride chasing now.');
      steps.push('Get water/snack before transportation.');
      steps.push('Return only if the evening is truly worth it.');
      priority = 'exit';
    } else {
      action = `Not yet. Take a controlled break inside ${park} first.`;
      steps.push('Find AC or a quiet show.');
      steps.push('Eat or snack before the next ride.');
      steps.push('Re-check in 45 minutes.');
      priority = 'show-or-indoor';
    }
  } else if (q.includes('rain') || q.includes('raining')) {
    title = 'Rain Plan';
    action = 'Switch to covered/indoor operations.';
    steps.push('Put ponchos and stroller cover on before the downpour gets worse.');
    steps.push('Choose indoor shows, shops, or a sit-down meal.');
    steps.push('Avoid long outdoor queues until the storm passes.');
    priority = 'show-or-indoor';
  } else if (q.includes('eat') || q.includes('food') || q.includes('lunch') || q.includes('dinner')) {
    title = 'Where Should We Eat?';
    action = `Use the best quick-service or table-service options already listed for ${park}.`;
    steps.push('If kids are fading, choose AC/table-service over food quality.');
    steps.push('If crowds are high, mobile order before you are hungry.');
    steps.push('If on dining plan, use higher-value meal locations first.');
    priority = 'food';
  } else if (q.includes('meltdown') || q.includes('kid') || q.includes('crying')) {
    title = 'Kid Meltdown Protocol';
    action = 'Stop the plan. Stabilize the child first.';
    steps.push('No more long ride lines for the next 30–45 minutes.');
    steps.push('Snack + water + shade/AC immediately.');
    steps.push('Use stroller or return to resort if recovery does not happen quickly.');
    steps.push('Pick a show or low-wait indoor ride only if it is truly nearby.');
    priority = 'meltdown';
  } else if (q.includes('ride') || q.includes('next')) {
    title = 'What Ride Next?';
    action = 'Choose the lowest-friction win, not the biggest ride.';
    steps.push('Pick a nearby ride or show to avoid backtracking.');
    steps.push('Avoid 60+ minute waits with young kids unless it is a must-do.');
    steps.push('Use the lowest queue list below.');
    priority = 'ride';
  } else if (q.includes('transport') || q.includes('bus') || q.includes('skyliner') || q.includes('boat')) {
    title = 'Transportation Help';
    action = 'Reduce end-of-day transportation stress.';
    steps.push('Leave before fireworks crowd if kids are already fading.');
    steps.push('Snack/bathroom before getting in transit line.');
    steps.push('Consider paid transport if meltdown risk is high.');
    priority = 'exit';
  } else {
    title = 'General LIVE Advice';
    action = 'Make the next 60 minutes easier, not more ambitious.';
    steps.push('Pick one priority only.');
    steps.push('Use AC, snacks, water, and stroller time.');
    steps.push('Do not add walking unless the payoff is high.');
    priority = 'lowest-friction';
  }

  if (rain >= 45) steps.push('Weather note: rain risk is elevated today.');
  if (heat >= 88) steps.push('Heat note: protect the 12:30–2:30 window.');

  let recommendedOptions = [];
  if (priority === 'meltdown' || priority === 'show-or-indoor') {
    recommendedOptions = [...escape.shows, ...escape.indoor].slice(0, 6);
  } else if (priority === 'ride' || priority === 'lowest-friction') {
    recommendedOptions = [...escape.rides].slice(0, 6);
  } else {
    recommendedOptions = [...escape.shows, ...escape.indoor, ...escape.rides].slice(0, 4);
  }

  return { title, action, steps, escape, recommendedOptions, priority };
}

function App() {
  const [tab, setTab] = useState('setup');
  const [form, setForm] = useState({
    tripName: 'October Disney Weather Test Trip',
    resort: 'Port Orleans Riverside',
    startDate: '2026-10-22',
    endDate: '2026-10-26',
    ticketDays: 4,
    parkHopper: false,
    weatherEnabled: true,
    targetFatigue: 6,
    arrivalTime: 'Early morning flight',
    departureTime: 'Late flight',
    family: '2 adults, kids ages 2, 5, 6',
    adults: 2,
    kidsCount: 3,
    diningPlan: 'Disney Dining Plan',
    prioritiesText: 'little kids, characters, pool breaks, Halloween party, snacks, classic rides',
    foodLikesText: 'bbq, steak, chicken, burgers, pastries, character meals',
    foodDislikesText: 'seafood, sushi',
    mustEventsText: 'Mickey Halloween party',
    poolPreference: 'Yes, daily pool or rest breaks',
    exercisePreference: 'Light resort walk or gym if time allows',
    manual1: '', manual2: '', manual3: '', manual4: '', manual5: '', manual6: '',
    hotelPerNight: 325,
    ticketPerPersonDay: 165,
    diningPlanPerPersonDay: 98,
    souvenirBudget: 400,
    flightBudget: 0,
    strollerBudget: 0,
    miscBudget: 0
  });
  const [plan, setPlan] = useState(null);
  const [trips, setTrips] = useState([]);
  const [waitStatus, setWaitStatus] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [budgetTarget, setBudgetTarget] = useState(7000);
  const [budgetScenarios, setBudgetScenarios] = useState([]);
  const [selectedBudgetScenario, setSelectedBudgetScenario] = useState(null);
  const [dealMatches, setDealMatches] = useState([]);
  const [activeWatchOffer, setActiveWatchOffer] = useState(null);
  const [aiTripPrompt, setAiTripPrompt] = useState('We are a family of 5 with kids ages 2, 5, and 6. We want Disney World for 4 park days, some pool time, good character meals, and our budget is around $7,000. We do not want to overdo it.');
  const [aiTripPlan, setAiTripPlan] = useState(null);
  const [liveQuestion, setLiveQuestion] = useState('My kid is melting down and it is raining. What should we do?');
  const [liveAnswer, setLiveAnswer] = useState(null);
  const [liveRoutesByDate, setLiveRoutesByDate] = useState({});
  const [selectedLiveDate, setSelectedLiveDate] = useState('');
    function update(key, value) { setForm(prev => ({ ...prev, [key]: value })); }

  function generateAITripPlan() {
    setAiTripPlan(buildAITripPlan(aiTripPrompt, form));
  }

  function getActiveRouteDate() {
  if (selectedLiveDate) return selectedLiveDate;
  return plan?.days?.[0]?.date || '';
}

function getActiveRoute() {
  const date = getActiveRouteDate();
  return liveRoutesByDate[date] || [];
}

function getActiveRouteDay() {
  const date = getActiveRouteDate();
  return plan?.days?.find(d => d.date === date) || plan?.days?.[0] || null;
}

function addRouteStop(type) {
  const date = getActiveRouteDate();
  if (!date) return alert('Generate or load a trip first so this route can attach to a trip day.');

  const newStop = {
    id: Date.now(),
    type,
    title: '',
    time: '',
    notes: '',
    lightningStart: '',
    lightningEnd: '',
    done: false
  };

  setLiveRoutesByDate(prev => ({
    ...prev,
    [date]: [...(prev[date] || []), newStop]
  }));
}

function updateRouteStop(id, field, value) {
  const date = getActiveRouteDate();

  setLiveRoutesByDate(prev => ({
    ...prev,
    [date]: (prev[date] || []).map(stop =>
      stop.id === id ? { ...stop, [field]: value } : stop
    )
  }));
}

function removeRouteStop(id) {
  const date = getActiveRouteDate();

  setLiveRoutesByDate(prev => ({
    ...prev,
    [date]: (prev[date] || []).filter(stop => stop.id !== id)
  }));
}

function moveRouteStop(id, direction) {
  const date = getActiveRouteDate();

  setLiveRoutesByDate(prev => {
    const route = [...(prev[date] || [])];
    const index = route.findIndex(stop => stop.id === id);
    if (index < 0) return prev;

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= route.length) return prev;

    [route[index], route[nextIndex]] = [route[nextIndex], route[index]];

    return {
      ...prev,
      [date]: route
    };
  });
}

function mapSearch(stop) {
  const activeDay = getActiveRouteDay();
  const query = encodeURIComponent(`${stop.title} ${activeDay?.park || 'Walt Disney World'}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
}
  
  function askLiveOps(q) {
    const question = q || liveQuestion;
    setLiveQuestion(question);
    setLiveAnswer(answerLiveOps(question, plan, waitStatus));
  }




  function runBudgetBuilder() {
    const scenarios = calculateBudgetScenarios(form, Number(budgetTarget || 0));
    setBudgetScenarios(scenarios);
  }

  function findDeals(scenario) {
    setSelectedBudgetScenario(scenario);

    const deals = offerWatchRules.map(d => ({
      ...d,
      savingsValue: d.linkedSavings,
      discountedTotal: Math.max(0, scenario.total - d.linkedSavings)
    }));

    setDealMatches(deals);
  }

  function applyDeal(deal) {
    if (!selectedBudgetScenario) return;

    let savings = Number(deal.savingsValue || 0);
    if (deal.id === 'fall_room' || deal.id === 'holiday_room') {
      savings = Math.round(selectedBudgetScenario.hotel * 0.20);
    }
    if (deal.id === 'kids_dining') {
      savings = Math.round(Number(form.kidsCount || 0) * selectedBudgetScenario.nights * Number(form.diningPlanPerPersonDay || 98) * 0.75);
    }
    if (deal.id === 'ticket_offer') {
      savings = Math.round(selectedBudgetScenario.tickets * 0.08);
    }

    const updated = {
      ...selectedBudgetScenario,
      total: Math.max(0, selectedBudgetScenario.total - savings),
      remaining: selectedBudgetScenario.remaining + savings,
      dealSavings: savings
    };

    setSelectedBudgetScenario(updated);
    setActiveWatchOffer({...deal, savingsValue: savings});
  }




  function runBudgetOptimizer() {
    const scenarios = buildBudgetScenarios(form, Number(budgetTarget || 0));
    setBudgetScenarios(scenarios);
  }

  function applyScenario(s) {
    update('resort', s.resort);
    update('hotelPerNight', s.nightly);
    setTab('setup');
    alert(`${s.resort} applied to Trip Setup. Click Generate Plan when ready.`);
  }



  function payload() {
    return {
      ...form,
      ticketDays: Number(form.ticketDays),
      targetFatigue: Number(form.targetFatigue),
      adults: Number(form.adults),
      kidsCount: Number(form.kidsCount),
      hotelPerNight: Number(form.hotelPerNight),
      ticketPerPersonDay: Number(form.ticketPerPersonDay),
      diningPlanPerPersonDay: Number(form.diningPlanPerPersonDay),
      souvenirBudget: Number(form.souvenirBudget),
      flightBudget: Number(form.flightBudget),
      strollerBudget: Number(form.strollerBudget),
      priorities: splitList(form.prioritiesText),
      foodLikes: splitList(form.foodLikesText),
      foodDislikes: splitList(form.foodDislikesText),
      mustEvents: splitList(form.mustEventsText),
      manualParkOrder: [form.manual1,form.manual2,form.manual3,form.manual4,form.manual5,form.manual6].filter(Boolean)
    };
  }

  async function generate() {
    setLoading(true); setPlan(null); setError('');
    try {
      const res = await fetch(`${API}/api/plan`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload()) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backend error');
      setPlan(data); setTab('plan'); checkWaitApi();
    } catch (e) { 
      setError('Could not reach backend on http://localhost:5000. Make sure backend-1 is running. Details: ' + e.message);
    }
    setLoading(false);
  }

  async function saveTrip() {
    if (!plan) return alert('Generate a plan first.');
    const res = await fetch(`${API}/api/trips`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name: form.tripName, input: payload(), plan}) });
    const data = await res.json();
    await loadTrips();
    alert(`Saved trip #${data.id}`);
  }

  async function loadTrips() {
    try {
      const res = await fetch(`${API}/api/trips`);
      if (!res.ok) throw new Error('Trips endpoint returned ' + res.status);
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (e) {
      console.warn('Saved trips unavailable:', e.message);
      setTrips([]);
    }
  }

  async function loadTrip(id) {
    const res = await fetch(`${API}/api/trips/${id}`);
    const data = await res.json();
    setPlan(data.plan);
    setTab('plan');
  }

  async function exportPdf() {
    if (!plan) return alert('Generate a plan first.');
    const res = await fetch(`${API}/api/export/pdf`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({plan})});
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'disney_ops_weather_plan.pdf'; a.click();
    window.URL.revokeObjectURL(url);
  }

  async function checkWaitApi() {
    const res = await fetch(`${API}/api/wait-times`);
    const data = await res.json();
    setWaitStatus(data);
  }

  async function checkWeatherApi() {
    const res = await fetch(`${API}/api/weather?start=${form.startDate}&end=${form.endDate}`);
    const data = await res.json();
    setWeatherStatus(data);
  }

  useEffect(()=>{ loadTrips(); }, []);

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Disney Ops Planner V12 Magic Strategy</p>
        <h1>Polished Disney Family Dashboard</h1>
        <p>A cleaner dashboard with weather-aware itinerary cards, live wait-time strategy, fatigue reducer, budget, PDF export, and saved trips.</p>
      </header>

      <nav className="tabs">
        {['setup','budget','ai assistant','saved','plan','fatigue','weather','waits','rewrite'].map(t => <button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}
      </nav>

      <button className="bigLiveButton" onClick={()=>setTab('live')}>
        🚨 LIVE PARK MODE
        <span>Day-of-trip help</span>
      </button>

      {error && <div className="error">Error: {error}</div>}

      {tab === 'setup' && (
        <section className="panel">
          <h2>Trip Setup</h2>
          <div className="two">
            <label>Trip Name<input value={form.tripName} onChange={e=>update('tripName',e.target.value)} /></label>
            <label>Resort<select value={form.resort} onChange={e=>update('resort',e.target.value)}>{resorts.map(r=><option key={r}>{r}</option>)}</select></label>
          </div>
          <div className="three">
            <label>Start Date<input type="date" value={form.startDate} onChange={e=>update('startDate',e.target.value)} /></label>
            <label>End Date<input type="date" value={form.endDate} onChange={e=>update('endDate',e.target.value)} /></label>
            <label>Ticket Days<input type="number" min="1" max="14" value={form.ticketDays} onChange={e=>update('ticketDays',e.target.value)} /></label>
          </div>
          <div className="two">
            <label>Arrival Details<input value={form.arrivalTime} onChange={e=>update('arrivalTime',e.target.value)} /></label>
            <label>Departure Details<input value={form.departureTime} onChange={e=>update('departureTime',e.target.value)} /></label>
          </div>
          <div className="three">
            <label>Adults<input type="number" value={form.adults} onChange={e=>update('adults',e.target.value)} /></label>
            <label>Kids Count<input type="number" value={form.kidsCount} onChange={e=>update('kidsCount',e.target.value)} /></label>
            <label>Dining Plan<select value={form.diningPlan} onChange={e=>update('diningPlan',e.target.value)}><option>Disney Dining Plan</option><option>Quick-Service Dining Plan</option><option>None</option></select></label>
          </div>
          <label>Family / Group<input value={form.family} onChange={e=>update('family',e.target.value)} /></label>
          <label>Priorities, comma separated<textarea value={form.prioritiesText} onChange={e=>update('prioritiesText',e.target.value)} /></label>
          <label>Food Likes, comma separated<textarea value={form.foodLikesText} onChange={e=>update('foodLikesText',e.target.value)} /></label>
          <label>Food Dislikes / Avoid, comma separated<textarea value={form.foodDislikesText} onChange={e=>update('foodDislikesText',e.target.value)} /></label>
          <label>Must-See Events<input value={form.mustEventsText} onChange={e=>update('mustEventsText',e.target.value)} /></label>
          <div className="two">
            <label>Pool / Rest Preference<input value={form.poolPreference} onChange={e=>update('poolPreference',e.target.value)} /></label>
            <label>Exercise Preference<input value={form.exercisePreference} onChange={e=>update('exercisePreference',e.target.value)} /></label>
          </div>
          <h3>Optional Manual Park Order</h3>
          <div className="three">
            {[1,2,3,4,5,6].map(n => <label key={n}>Day {n}<select value={form[`manual${n}`]} onChange={e=>update(`manual${n}`,e.target.value)}>{parks.map(p=><option key={p}>{p}</option>)}</select></label>)}
          </div>
          <label className="check"><input type="checkbox" checked={form.parkHopper} onChange={e=>update('parkHopper',e.target.checked)} /> Park Hopper tickets</label>
          <label>Target Fatigue Score
            <input type="number" min="1" max="10" value={form.targetFatigue} onChange={e=>update('targetFatigue',e.target.value)} />
          </label>
          <label className="check"><input type="checkbox" checked={form.weatherEnabled} onChange={e=>update('weatherEnabled',e.target.checked)} /> Use weather-adjusted fatigue scoring</label>
          <button className="primary" onClick={generate}>{loading ? 'Building Fatigue Plan...' : 'Generate Fatigue-Reduced Plan'}</button>
        </section>
      )}

      
{tab === 'budget' && (
<section className="panel">
  <h2>💰 Budget Builder + Live Deal Watch</h2>

  <p className="softText">
    Example: “I have $7,000, 3 kids, flights, stroller costs, and 4 park days. Where can I stay and what can I do?”
  </p>

  <div className="budgetHero">
    <label>Total Budget
      <input
        type="number"
        value={budgetTarget}
        onChange={e=>setBudgetTarget(e.target.value)}
      />
    </label>

    <button className="primary" onClick={runBudgetBuilder}>
      Build Disney Trips
    </button>
  </div>

  <div className="budgetInputs">
    <label>Start Date
      <input type="date" value={form.startDate} onChange={e=>update('startDate', e.target.value)} />
    </label>
    <label>End Date
      <input type="date" value={form.endDate} onChange={e=>update('endDate', e.target.value)} />
    </label>
    <label>Adults
      <input type="number" value={form.adults} onChange={e=>update('adults', e.target.value)} />
    </label>
    <label>Kids
      <input type="number" value={form.kidsCount} onChange={e=>update('kidsCount', e.target.value)} />
    </label>
    <label>Park Days
      <input type="number" value={form.ticketDays} onChange={e=>update('ticketDays', e.target.value)} />
    </label>
    <label>Ticket / Person / Day
      <input type="number" value={form.ticketPerPersonDay} onChange={e=>update('ticketPerPersonDay', e.target.value)} />
    </label>
    <label>Dining Plan
      <select value={form.diningPlan} onChange={e=>update('diningPlan', e.target.value)}>
        <option>Disney Dining Plan</option>
        <option>Quick-Service Dining Plan</option>
        <option>None</option>
      </select>
    </label>
    <label>Dining / Person / Night
      <input type="number" value={form.diningPlanPerPersonDay} onChange={e=>update('diningPlanPerPersonDay', e.target.value)} />
    </label>
    <label>Flights Total
      <input type="number" value={form.flightBudget} onChange={e=>update('flightBudget', e.target.value)} />
    </label>
    <label>Stroller / Rental Fees
      <input type="number" value={form.strollerBudget} onChange={e=>update('strollerBudget', e.target.value)} />
    </label>
    <label>Souvenirs
      <input type="number" value={form.souvenirBudget} onChange={e=>update('souvenirBudget', e.target.value)} />
    </label>
    <label>Other / Buffer
      <input type="number" value={form.miscBudget} onChange={e=>update('miscBudget', e.target.value)} />
    </label>
  </div>

  <div className="liveOfferWatch">
    <div className="dealHeader">
      <div>
        <h2>🏰 Live Offer Watch</h2>
        <p className="softText">
          Historical Disney discount timing and estimated savings.
        </p>
      </div>
    </div>

    <div className="watchGrid">
      {offerWatchRules.map((o,i)=>
        <div className="watchCard" key={i}>
          <h3>{o.title}</h3>
          <p>{o.description}</p>

          <ul>
            <li><b>Expected:</b> {o.expected}</li>
            <li><b>Savings:</b> {o.savings}</li>
          </ul>

          <button onClick={()=>{
            if(selectedBudgetScenario){
              applyDeal({
                savingsValue:o.linkedSavings
              });
            } else {
              alert('Click Find Deals on a budget scenario first.');
            }
          }}>
            Add To Plan Budget
          </button>
        </div>
      )}
    </div>
  </div>

  {budgetScenarios.length > 0 &&
    <div className="scenarioGrid">
      {budgetScenarios.map((s,i)=>
        <div className={`scenarioCard ${s.remaining >= 0 ? 'scenarioGood':'scenarioBad'}`} key={i}>
          <div className="scenarioTop">
            <div>
              <h3>{s.resort}</h3>
              <p>{s.tier} · {s.nights} nights · {s.people} people</p>
            </div>
            <span>{s.recommendation}</span>
          </div>

          <div className="scenarioMoney">
            <b>${Math.round(s.total).toLocaleString()}</b>
            <em>
              {s.remaining >= 0
                ? `$${Math.round(s.remaining).toLocaleString()} left`
                : `$${Math.abs(Math.round(s.remaining)).toLocaleString()} over`}
            </em>
          </div>

          <ul>
            <li>Hotel: ${Math.round(s.hotel).toLocaleString()}</li>
            <li>Tickets: ${Math.round(s.tickets).toLocaleString()}</li>
            <li>Dining: ${Math.round(s.dining).toLocaleString()}</li>
            <li>Extras: ${Math.round(s.extras).toLocaleString()}</li>
          </ul>

          {s.cuts?.length > 0 &&
            <div className="cuts">
              <b>To make it work:</b>
              <ul>{s.cuts.map((c,j)=><li key={j}>{c}</li>)}</ul>
            </div>
          }

          <div className="scenarioButtons">
            <button onClick={()=>findDeals(s)}>
              Find Deals
            </button>

            <button onClick={()=>{
              update('resort', s.resort);
              setTab('setup');
            }}>
              Send To Trip Setup
            </button>
          </div>
        </div>
      )}
    </div>
  }

  {selectedBudgetScenario &&
    <div className="dealFinder">
      <h2>🏷️ Deal Finder</h2>

      <div className="selectedScenario">
        <h3>{selectedBudgetScenario.resort}</h3>

        <div className="dealTotals">
          <div>
            <b>${Math.round(selectedBudgetScenario.total).toLocaleString()}</b>
            <span>Trip Total</span>
          </div>

          <div>
            <b>
              {selectedBudgetScenario.remaining >= 0
                ? `$${Math.round(selectedBudgetScenario.remaining).toLocaleString()} left`
                : `$${Math.abs(Math.round(selectedBudgetScenario.remaining)).toLocaleString()} over`}
            </b>
            <span>Budget Position</span>
          </div>
        </div>

        {activeWatchOffer &&
          <div className="activeOffer">
            <b>Discount Applied: {activeWatchOffer.title || 'Offer'}</b>
            <span>Estimated savings: ${Math.round(activeWatchOffer.savingsValue || selectedBudgetScenario.dealSavings || 0).toLocaleString()}</span>
          </div>
        }
      </div>
    </div>
  }
</section>
)}

{tab === 'saved' && (
        <section className="panel">
          <h2>Saved Trips</h2>
          <button onClick={saveTrip}>Save Current Plan</button>
          <button onClick={loadTrips}>Refresh Saved Trips</button>
          <div className="cards">{trips.map(t => <div className="mini" key={t.id}><b>{t.name}</b><span>{t.created_at}</span><button onClick={()=>loadTrip(t.id)}>Load</button></div>)}</div>
        </section>
      )}


      {tab === 'ai assistant' && (
        <section className="panel aiAssistantPanel">
          <h2>🤖 AI Trip Assistant</h2>
          <p className="softText">Type your whole trip idea in one paragraph. The assistant will return low, mid, and high budget versions.</p>

          <textarea className="bigPrompt" value={aiTripPrompt} onChange={e=>setAiTripPrompt(e.target.value)} />

          <button className="primary" onClick={generateAITripPlan}>Plan My Whole Trip</button>

          {aiTripPlan && <div className="aiResult">
            <h3>{aiTripPlan.summary}</h3>
            <p className="recommendationBox">{aiTripPlan.recommendation}</p>
            <div className="aiOptionGrid">
              {aiTripPlan.options.map((o,i)=><div className="aiOptionCard" key={i}>
                <div className="dealType">{o.label}</div>
                <h3>{o.resort}</h3>
                <p><b>Estimated:</b> ${o.estimate.toLocaleString()}</p>
                <p><b>Dining:</b> {o.dining}</p>
                <p><b>Style:</b> {o.style}</p>
                <h4>Why it works</h4>
                <ul>{o.why.map((x,j)=><li key={j}>{x}</li>)}</ul>
                <h4>Park Order</h4>
                <p>{o.parkOrder.join(' → ')}</p>
                <h4>Strategy</h4>
                <ul>{o.plan.map((x,j)=><li key={j}>{x}</li>)}</ul>
                <button onClick={()=>applyAIOptionToSetup(o, update, setTab)}>Send This To Trip Setup</button>
              </div>)}
            </div>
          </div>}
        </section>
      )}

      {tab === 'live' && (
        <section className="liveMode">
          <div className="liveHero">
            <div>
              <p className="eyebrow">Day-Of-Trip Mode</p>
              <h1>🚨 LIVE PARK MODE</h1>
              <p>Use this in the park when you need fast decisions: leave, eat, rain, rides, transportation, or meltdowns.</p>
            </div>
          </div>

          {!plan && <div className="panel">
            <h2>No trip loaded yet</h2>
            <p>Generate a trip first, then LIVE mode will use your park day, weather, fatigue, dining, and wait-time data.</p>
          </div>}

          {plan && <div>
            <LiveStatusPanel plan={plan} waitStatus={waitStatus} />
            <div className="quickLiveGrid">
              {['Should we leave the park?','It is raining. What do we do?','Where should we eat right now?','My kid is melting down. Find a show or low-wait escape.','What ride should we do next?','Transportation help'].map((q,i)=>
                <button key={i} onClick={()=>askLiveOps(q)}>{q}</button>
              )}
            </div>

            <div className="panel liveRouteBuilder">
  <h2>🧭 LIVE Day Route Builder</h2>

  <div className="liveDateSelector">
    <label>Select Trip Day</label>
    <select
      value={getActiveRouteDate()}
      onChange={e => setSelectedLiveDate(e.target.value)}
    >
      {(plan?.days || []).map((day, i) => (
        <option value={day.date} key={day.date}>
          Day {i + 1} — {day.date} — {day.park}
        </option>
      ))}
    </select>
  </div>

  <p className="softText">
    Build today’s real park route. Add rides, Lightning Lanes, meals, shows, breaks, and transportation.
  </p>

  <div className="routeButtons">
    <button onClick={() => addRouteStop('Ride')}>+ Ride</button>
    <button onClick={() => addRouteStop('Lightning Lane')}>+ Lightning Lane</button>
    <button onClick={() => addRouteStop('Meal')}>+ Meal</button>
    <button onClick={() => addRouteStop('Show')}>+ Show</button>
    <button onClick={() => addRouteStop('Break')}>+ Break</button>
    <button onClick={() => addRouteStop('Transportation')}>+ Transportation</button>
  </div>

  {getActiveRoute().length === 0 && (
    <p className="softText">No stops yet. Add your first ride, meal, or Lightning Lane.</p>
  )}

  <div className="routeList">
    {getActiveRoute().map((stop, index) => (
      <div className={`routeCard ${stop.done ? 'routeDone' : ''}`} key={stop.id}>
        <div className="routeCardHeader">
          <span>{index + 1}. {stop.type}</span>
          <label className="doneCheck">
            <input
              type="checkbox"
              checked={stop.done}
              onChange={e => updateRouteStop(stop.id, 'done', e.target.checked)}
            />
            Done
          </label>
        </div>

        <div className="routeGrid">
          <input
            placeholder="Time, ex: 10:30 AM"
            value={stop.time}
            onChange={e => updateRouteStop(stop.id, 'time', e.target.value)}
          />

          <input
            placeholder="Ride, show, meal, or place"
            value={stop.title}
            onChange={e => updateRouteStop(stop.id, 'title', e.target.value)}
          />
        </div>

        {stop.type === 'Lightning Lane' && (
          <div className="routeGrid">
            <input
              placeholder="LL start, ex: 10:20"
              value={stop.lightningStart}
              onChange={e => updateRouteStop(stop.id, 'lightningStart', e.target.value)}
            />

            <input
              placeholder="LL end, ex: 11:20"
              value={stop.lightningEnd}
              onChange={e => updateRouteStop(stop.id, 'lightningEnd', e.target.value)}
            />
          </div>
        )}

        <textarea
          placeholder="Notes, snack plan, stroller plan, must-do, etc."
          value={stop.notes}
          onChange={e => updateRouteStop(stop.id, 'notes', e.target.value)}
        />

        <div className="routeActions">
          <button onClick={() => moveRouteStop(stop.id, -1)}>↑ Move Up</button>
          <button onClick={() => moveRouteStop(stop.id, 1)}>↓ Move Down</button>
          <button disabled={!stop.title} onClick={() => mapSearch(stop)}>Map</button>
          <button onClick={() => removeRouteStop(stop.id)}>Remove</button>
        </div>
      </div>
    ))}
  </div>
</div>
            
            <div className="panel liveAskBox">
              <h2>✨ Ask Magic Ops</h2>
              <textarea value={liveQuestion} onChange={e=>setLiveQuestion(e.target.value)} />
              <button className="primary" onClick={()=>askLiveOps()}>Ask LIVE Assistant</button>

              {liveAnswer && <div className="liveAnswer">
                <h2>{liveAnswer.title}</h2>
                <h3>{liveAnswer.action}</h3>
                <ul>{liveAnswer.steps.map((s,i)=><li key={i}>{s}</li>)}</ul>

                <div className="escapeFinder">
                  <h2>🎭 Best Escape Options Right Now</h2>
                  <p className="softText">{liveAnswer.escape?.parkName} · {liveAnswer.escape?.message}</p>

                  {liveAnswer.recommendedOptions?.length > 0 ? <div className="escapeGrid">
                    {liveAnswer.recommendedOptions.map((a,i)=><div className="escapeCard" key={i}>
                      <b>{a.name}</b>
                      <span>{a.waitTime} min wait</span>
                      <em>{attractionLooksLikeShow(a.name) ? 'Show / calm option' : attractionLooksIndoor(a.name) ? 'Indoor / lower-stress option' : 'Low queue option'}</em>
                    </div>)}
                  </div> : <p>No live low-queue options available. Use nearest AC, snack, or resort reset.</p>}

                  {liveAnswer.escape?.shows?.length > 0 && <div>
                    <h3>Calm Shows / AC Options</h3>
                    <div className="miniEscapeList">
                      {liveAnswer.escape.shows.map((a,i)=><span key={i}>{a.name} · {a.waitTime}m</span>)}
                    </div>
                  </div>}

                  {liveAnswer.escape?.rides?.length > 0 && <div>
                    <h3>Lowest Wait Rides</h3>
                    <div className="miniEscapeList">
                      {liveAnswer.escape.rides.slice(0,6).map((a,i)=><span key={i}>{a.name} · {a.waitTime}m</span>)}
                    </div>
                  </div>}
                </div>
              </div>}
            </div>
          </div>}
        </section>
      )}

      {tab === 'plan' && (
        <section>
          {!plan ? <div className="panel"><h2>No plan yet</h2><p>Go to Trip Setup and click Generate Plan.</p></div> : <>
            <div className="actions"><button onClick={exportPdf}>Download Weather PDF</button><button onClick={saveTrip}>Save Trip</button></div>
            <PlanSnapshot plan={plan} />
            {plan.days.map((day,i)=><Day day={day} liveRoutesByDate={liveRoutesByDate} key={i}/>)}
            <TripPackingChecklist plan={plan} />
          </>}
        </section>
      )}


      {tab === 'fatigue' && (
        <section>
          <div className="panel">
            <h2>Meltdown Prevention / Fatigue Reducer</h2>
            <p>The app compares each day’s current fatigue score to your target, then recommends the smallest practical changes to lower the score.</p>
            <p><b>Target fatigue:</b> {form.targetFatigue}/10</p>
          </div>
          {!plan ? <div className="panel"><p>Generate a plan first.</p></div> : plan.days.map((day,i)=><FatigueReducer day={day} key={i}/>)}
        </section>
      )}

      {tab === 'weather' && (
        <section>
          <div className="panel magicPanel">
            <h2>🌦️ Auto Weather + Fatigue</h2>
            <p>Weather is automatically pulled when you generate a plan. Far-future trips use seasonal estimates until live forecasts become available.</p>
            {plan ? <TripWeatherSummary plan={plan} /> : <p>Generate a plan first to see weather cards.</p>}
          </div>
          {plan && plan.days.map((day,i)=><WeatherCard day={day} key={i}/>)}
        </section>
      )}

      {tab === 'rewrite' && (
        <section className="panel">
          <h2>Plain-English Itinerary Rewrite</h2>
          <pre>{plan?.rewrite || 'Generate a plan first.'}</pre>
        </section>
      )}

      {tab === 'waits' && (
        <section className="panel magicPanel">
          <RideStrategySummary waitStatus={waitStatus} />
          <DisneyWaitDashboard waitStatus={waitStatus} onRefresh={checkWaitApi} />
        </section>
      )}
    </div>
  );
}


function PlanSnapshot({plan}) {
  if (!plan) return null;
  const days = plan.days || [];
  const brutal = days.filter(d => d.fatigueLabel === 'Brutal').length;
  const moderate = days.filter(d => d.fatigueLabel === 'Moderate').length;
  const easy = days.filter(d => d.fatigueLabel === 'Easy').length;
  const topRisk = [...days].sort((a,b)=>(b.fatigueScore||0)-(a.fatigueScore||0))[0];

  return <div className="snapshot panel">
    <div>
      <p className="eyebrow">Trip Snapshot</p>
      <h2>{plan.inputSummary?.resort} · {plan.inputSummary?.dates}</h2>
      <p className="softText">Quick read before you scroll: this shows the energy load, the highest-risk day, and the best overall planning move.</p>
    </div>
    <div className="snapshotGrid">
      <div><b>{easy}</b><span>Easy days</span></div>
      <div><b>{moderate}</b><span>Moderate days</span></div>
      <div><b>{brutal}</b><span>Brutal days</span></div>
      <div><b>{topRisk?.park || 'n/a'}</b><span>Highest-risk day</span></div>
    </div>
    {topRisk && <div className="snapshotAdvice">
      <h3>Best move</h3>
      <p>{topRisk.fatigueReducer?.recommendedChanges?.[0]?.title || topRisk.meltdownPrediction?.recommendedAction || 'Keep the current plan.'}</p>
    </div>}
  </div>
}

function TripPackingChecklist({plan}) {
  if (!plan) return null;
  const days = plan.days || [];
  const hasRain = days.some(d => Number(d.weather?.rainProbability || 0) >= 45);
  const hasHeat = days.some(d => Number(d.weather?.high || 0) >= 88);
  const hasParty = days.some(d => String(d.type || '').includes('Party'));
  const list = [
    'Portable phone charger',
    'Refillable water bottles',
    'Stroller fan or cooling towel',
    'Backup snacks for the crash window',
    'Small first-aid / blister kit',
    'Autograph book or character item',
    hasRain ? 'Ponchos and stroller cover' : 'Light ponchos just in case',
    hasHeat ? 'Sunscreen, hats, cooling towels, and midday AC plan' : 'Sunscreen and hats',
    hasParty ? 'Costumes, glow sticks, and late-night stroller blanket' : 'Light jacket or blanket for evening'
  ];
  return <div className="panel">
    <h2>🎒 Smart Packing Checklist</h2>
    <div className="checklistGrid">{list.map((x,i)=><label className="prettyCheck" key={i}><input type="checkbox" /> <span>{x}</span></label>)}</div>
  </div>
}



function LiveStatusPanel({plan, waitStatus}) {
  const s = liveStress(plan, waitStatus);
  return <div className="liveStatusPanel">
    <div><b>Trip Stress</b><span>{s.trip}</span></div>
    <div><b>Crowds</b><span>{s.crowd}</span></div>
    <div><b>Weather</b><span>{s.weather}</span></div>
    <div><b>Meltdown Risk</b><span>{s.meltdown}</span></div>
  </div>
}


function Budget({budget}) {
  if (!budget) return null;
  return <div className="panel"><h2>Estimated Budget</h2><div className="budgetGrid">{Object.entries(budget).map(([k,v])=><div key={k} className={k==='estimatedTotal'?'total':''}><b>{k}</b><span>${Number(v).toLocaleString()}</span></div>)}</div></div>
}


function TripWeatherSummary({plan}) {
  const status = {};
  (plan.days || []).forEach(d => {
    status[d.isoDate || d.date] = d.weather;
  });
  return <WeatherSummary weatherStatus={status} />
}


function WeatherCard({day}) {
  const w = day.weather || {};
  return <article className="panel weatherCard">
    <h2>{day.date} — {day.park}</h2>
    <div className="weatherGrid">
      <div><b>High</b><span>{w.high ?? 'n/a'}°F</span></div>
      <div><b>Low</b><span>{w.low ?? 'n/a'}°F</span></div>
      <div><b>Rain Risk</b><span>{w.rainProbability ?? 'n/a'}%</span></div>
      <div><b>Weather Fatigue Adjustment</b><span>{day.weatherFatigueAdjustment > 0 ? '+' : ''}{day.weatherFatigueAdjustment}</span></div>
    </div>
    <div className={`meltdown m${day.meltdownPrediction.risk}`}>
      <h3>Meltdown Risk: {day.meltdownPrediction.risk}</h3>
      <p><b>Likely crash window:</b> {day.meltdownPrediction.likelyCrashWindow}</p>
      <p><b>Recommended action:</b> {day.meltdownPrediction.recommendedAction}</p>
    </div>
    {day.fatigueReducer && <div className="reducerInline reducerHero">
      <h3>Fatigue Reducer</h3>
      <p><b>{day.fatigueReducer.status}:</b> {day.fatigueReducer.summary}</p>
      <p><b>Top fix:</b> {day.fatigueReducer.recommendedChanges?.[0]?.title || 'No major change needed'}</p>
    </div>}
    {day.weatherNotes?.length > 0 && <Box title="Weather Notes" items={day.weatherNotes}/>}
  </article>
}


function FatigueReducer({day}) {
  const r = day.fatigueReducer;
  if (!r) return null;
  return <article className="panel reducerCard">
    <div className="dayHeader">
      <p className="date">{day.date}</p>
      <h2>{day.park}</h2>
      <span className={`fatigue f${day.fatigueLabel}`}>Current: {r.currentScore}/10</span>
      <span className="weatherPill">Target: {r.targetScore}/10</span>
      <span className="reducerProjected">Projected: {r.projectedScore}/10</span>
    </div>
    <div className={`meltdown ${r.status === 'Target achievable' ? 'mLow' : r.status === 'Already at or under target' ? 'mLow' : 'mHigh'}`}>
      <h3>{r.status}</h3>
      <p>{r.summary}</p>
    </div>
    <div className="cols">
      <div className="box">
        <h3>Recommended Changes</h3>
        {r.recommendedChanges?.map((x,i)=><div className="change" key={i}>
          <b>{x.title}</b>
          <span className="pill">-{x.reduction} fatigue · {x.category}</span>
          <p>{x.why}</p>
          <small>Tradeoff: {x.tradeoff}</small>
        </div>)}
      </div>
      <div className="box">
        <h3>All Options</h3>
        {r.allOptions?.map((x,i)=><p key={i}><b>{x.title}</b> <span className="pill">-{x.reduction}</span><br/>{x.why}</p>)}
      </div>
      <div className="box">
        <h3>How To Use This</h3>
        <p>If a day is Brutal, apply enough changes to bring it to 6/10 or lower. The goal is not to do less Disney — it is to prevent the day from collapsing after lunch.</p>
        <p>Best reducers for small kids are usually: real nap, AC lunch, stroller, resort dinner, and skipping late fireworks after a long day.</p>
      </div>
    </div>
  </article>
}



function EmbeddedWeatherCard({day}) {
  const w = day.weather || {};
  const high = w.high ?? 'n/a';
  const low = w.low ?? 'n/a';
  const rain = w.rainProbability ?? 'n/a';
  const source = w.source || 'Weather unavailable';
  const hot = Number(w.high || 0) >= 88;
  const rainy = Number(w.rainProbability || 0) >= 45;
  const ideal = !hot && !rainy;
  const icon = rainy ? '🌧️' : hot ? '☀️' : '🌤️';
  const className = rainy ? 'embeddedWeather rainyWeather' : hot ? 'embeddedWeather hotWeather' : 'embeddedWeather idealWeather';

  return <div className={className}>
    <div className="weatherMain">
      <div className="weatherIconBig">{icon}</div>
      <div>
        <h3>Today’s Weather Game Plan</h3>
        <p className="softText">{source.includes('fallback') ? 'Seasonal estimate until live forecast is available' : source}</p>
      </div>
    </div>

    <div className="weatherStatsInline">
      <div><b>{high}°</b><span>High</span></div>
      <div><b>{low}°</b><span>Low</span></div>
      <div><b>{rain}%</b><span>Rain</span></div>
      <div><b>{day.weatherFatigueAdjustment > 0 ? '+' : ''}{day.weatherFatigueAdjustment}</b><span>Fatigue</span></div>
    </div>

    <div className={`meltdown miniMeltdown m${day.meltdownPrediction?.risk || 'Low'}`}>
      <h4>Meltdown Prevention</h4>
      <p><b>Risk:</b> {day.meltdownPrediction?.risk} · <b>Likely crash:</b> {day.meltdownPrediction?.likelyCrashWindow}</p>
      <p>{day.meltdownPrediction?.recommendedAction}</p>
    </div>

    <div className="weatherActions">
      <h4>Best Weather Moves</h4>
      <ul>
        {day.weatherNotes?.length ? day.weatherNotes.map((x,i)=><li key={i}>{x}</li>) : <li>Weather looks manageable. Keep normal snack, water, and shade breaks.</li>}
        {hot && <li>Plan your longest AC break between 12:30 PM and 2:30 PM.</li>}
        {rainy && <li>Keep ponchos and stroller cover accessible, not buried in the bag.</li>}
        {ideal && <li>This is a good day to keep your original park flow without major weather changes.</li>}
      </ul>
    </div>
  </div>
}


function Day({day, liveRoutesByDate = {}}) {
  const w = day.weather || {};
  return <article className="day panel">
    <div className="dayHeader">
      <p className="date">{day.date}</p>
      <h2>{day.park}</h2>
      <p>{day.type} — {day.theme}</p>
      <span className={`fatigue f${day.fatigueLabel}`}>{day.fatigueLabel} Fatigue: {day.fatigueScore}/10</span>
      <span className="weatherPill">High {w.high ?? 'n/a'}°F · Rain {w.rainProbability ?? 'n/a'}%</span>
      {day.departureNote && <p className="warn">{day.departureNote}</p>}
    </div>

    <EmbeddedWeatherCard day={day} />

    {liveRoutesByDate?.[day.date]?.length > 0 && (
      <div className="dayLiveRoute">
        <h3>🧭 Your LIVE Route For This Day</h3>
        {liveRoutesByDate[day.date].map((stop, i) => (
          <div className={`dayRouteLine ${stop.done ? 'done' : ''}`} key={stop.id}>
            <b>{i + 1}. {stop.time || 'Anytime'} — {stop.type}</b>
            <span>{stop.title || 'Untitled stop'}</span>
            {stop.type === 'Lightning Lane' && (
              <em>{stop.lightningStart || 'Start time'} – {stop.lightningEnd || 'End time'}</em>
            )}
            {stop.notes && <p>{stop.notes}</p>}
          </div>
        ))}
      </div>
    )}

    <div className={`meltdown m${day.meltdownPrediction.risk}`}>
      <h3>Meltdown Risk: {day.meltdownPrediction.risk}</h3>
      <p><b>Likely crash window:</b> {day.meltdownPrediction.likelyCrashWindow}</p>
      <p><b>Recommended action:</b> {day.meltdownPrediction.recommendedAction}</p>
    </div>
    {day.fatigueReducer && <div className="reducerInline reducerHero">
      <h3>Fatigue Reducer</h3>
      <p><b>{day.fatigueReducer.status}:</b> {day.fatigueReducer.summary}</p>
      <p><b>Top fix:</b> {day.fatigueReducer.recommendedChanges?.[0]?.title || 'No major change needed'}</p>
    </div>}

    <div className="cols"><Box title="Morning Plan" items={day.morningPlan}/><Box title="Afternoon / Break" items={day.afternoonPlan}/><Box title="Low-Stress Options" items={day.lowStressOptions}/></div>
    <div className="cols"><Food title="Best Quick Service" items={day.bestQuickService}/><Food title="Best Table Service" items={day.bestTableService}/><Snacks items={day.bestSnacks}/></div>
    <div className="cols"><Box title="If You Leave Park" items={day.resortFallbacks}/><Box title="Strategy Notes" items={day.strategy}/><div className="box"><h3>Pack / Prep</h3><ul><li>Water bottle and stroller fan if warm.</li><li>Backup snack before the likely crash window.</li><li>Use this day’s weather card before deciding whether to return to the resort.</li></ul></div></div>
  </article>
}

function Box({title,items}) { return <div className="box"><h3>{title}</h3><ul>{(items||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></div> }
function Food({title,items}) { return <div className="box"><h3>{title}</h3>{(items||[]).map((x,i)=><p key={i}><b>{x.name}</b> <span className="pill">${x.price} · {x.valueLabel}</span><br/>{x.why}</p>)}</div> }
function Snacks({items}) { return <div className="box"><h3>Best Snacks</h3>{(items||[]).map((x,i)=><p key={i}><b>{x.name}</b> <span className="pill">${x.price} · {x.valueLabel}</span></p>)}</div> }

createRoot(document.getElementById('root')).render(<App />);
