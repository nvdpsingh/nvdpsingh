const LEVELS = [
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
];
const LEVEL_SET = new Set(LEVELS);

const THEMES = {
  dark: {
    background: "#07111F",
    rock: "#14243A",
    rockEdge: "#2A4260",
    tunnel: "#091726",
    tunnelEdge: "#35516F",
    text: "#EDF7F5",
    muted: "#8AA0BA",
    mint: "#57E3C3",
    violet: "#A99FFF",
    amber: "#FFB86B",
    shadow: "#040A12",
  },
  light: {
    background: "#EAF5F2",
    rock: "#BFD8D2",
    rockEdge: "#8EB5AC",
    tunnel: "#F7FCFA",
    tunnelEdge: "#739E96",
    text: "#102338",
    muted: "#587085",
    mint: "#0C9E83",
    violet: "#6D5DD3",
    amber: "#D4791C",
    shadow: "#D4E7E2",
  },
};

const LEVEL_STYLE = {
  FIRST_QUARTILE: { scale: 0.72, color: "mint" },
  SECOND_QUARTILE: { scale: 0.84, color: "mint" },
  THIRD_QUARTILE: { scale: 0.94, color: "violet" },
  FOURTH_QUARTILE: { scale: 1.08, color: "amber" },
};

export function normalizeCalendar(calendar) {
  if (!calendar || !Array.isArray(calendar.weeks) || calendar.weeks.length === 0) {
    throw new Error("Contribution calendar must include at least one week");
  }
  const totalContributions = Number(calendar.totalContributions);
  if (!Number.isInteger(totalContributions) || totalContributions < 0) {
    throw new Error("Contribution calendar has an invalid total");
  }

  const cells = [];
  calendar.weeks.forEach((week, weekIndex) => {
    if (!week || !Array.isArray(week.contributionDays)) {
      throw new Error(`Contribution week ${weekIndex} is invalid`);
    }
    for (const day of week.contributionDays) {
      const valid =
        day &&
        typeof day.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
        Number.isInteger(day.weekday) &&
        day.weekday >= 0 && day.weekday <= 6 &&
        Number.isInteger(day.contributionCount) && day.contributionCount >= 0 &&
        LEVEL_SET.has(day.contributionLevel);
      if (!valid) throw new Error(`Invalid contribution day in week ${weekIndex}`);
      cells.push({
        date: day.date,
        contributionCount: day.contributionCount,
        contributionLevel: day.contributionLevel,
        weekIndex,
        weekday: day.weekday,
      });
    }
  });
  return { totalContributions, cells, weekCount: calendar.weeks.length };
}

function aggregateWeeks(normalized) {
  return Array.from({ length: normalized.weekCount }, (_, weekIndex) => {
    const days = normalized.cells.filter((cell) => cell.weekIndex === weekIndex);
    const activeDays = days.filter((cell) => cell.contributionCount > 0);
    const contributionCount = days.reduce((sum, cell) => sum + cell.contributionCount, 0);
    const contributionLevel = activeDays.reduce(
      (highest, cell) => LEVELS.indexOf(cell.contributionLevel) > LEVELS.indexOf(highest)
        ? cell.contributionLevel
        : highest,
      "NONE",
    );
    return { weekIndex, activeDays: activeDays.length, contributionCount, contributionLevel };
  });
}

function crystalMarkup(week, point, theme, progress) {
  const style = LEVEL_STYLE[week.contributionLevel];
  const size = 14 * style.scale;
  const color = theme[style.color];
  const points = `0,${-size} ${size * 0.72},${-size * 0.2} ${size * 0.45},${size} ${-size * 0.45},${size} ${-size * 0.72},${-size * 0.2}`;
  const key = progress.toFixed(3);
  const next = Math.min(0.999, progress + 0.002).toFixed(3);
  return `
    <g class="crystal motion-layer" transform="translate(${point.x.toFixed(1)} ${point.y})" data-level="${week.contributionLevel}" data-scale="${style.scale}" data-color="${color}" data-week="${week.weekIndex}" data-route-progress="${key}">
      <g>
        <polygon points="${points}" fill="${color}" stroke="${theme.text}" stroke-width="1.2" filter="url(#diamond-glow)"/>
        <path d="M0 ${-size + 2}L${size * 0.22} ${size * 0.62}" stroke="${theme.tunnel}" stroke-width="1.3" opacity=".68"/>
        <animateTransform attributeName="transform" type="scale" values="1;1.12;1" dur="1.6s" repeatCount="indefinite"/>
      </g>
      <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;${key};${next};1" dur="20s" repeatCount="indefinite"/>
    </g>
    <g class="crystal-static rest-layer" transform="translate(${point.x.toFixed(1)} ${point.y})" data-level="${week.contributionLevel}" data-scale="${style.scale}" data-color="${color}" data-week="${week.weekIndex}" data-route-progress="${key}">
      <polygon points="${points}" fill="${color}" stroke="${theme.text}" stroke-width="1.2"/>
    </g>`;
}

function explorerMarkup(theme) {
  return `<g aria-label="pixel cave explorer">
    <rect x="-9" y="-14" width="18" height="6" rx="1" fill="${theme.amber}"/>
    <rect x="-7" y="-8" width="14" height="10" rx="2" fill="${theme.text}"/>
    <rect x="-10" y="2" width="20" height="12" rx="3" fill="${theme.mint}"/>
    <rect x="-8" y="14" width="6" height="8" rx="1" fill="${theme.text}"/>
    <rect x="2" y="14" width="6" height="8" rx="1" fill="${theme.text}"/>
    <circle cx="3" cy="-4" r="2" fill="${theme.shadow}"/>
    <path d="M10 7L18 -2M14 1L19 6" stroke="${theme.amber}" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

function rockTexture(theme) {
  const rocks = [];
  for (let index = 0; index < 38; index += 1) {
    const x = 45 + index * 31;
    const topY = 99 + (index % 4) * 7;
    const bottomY = 334 - ((index * 3) % 4) * 7;
    const radius = 7 + (index % 3) * 2;
    rocks.push(`<circle cx="${x}" cy="${topY}" r="${radius}" fill="${theme.rockEdge}" opacity=".46"/>`);
    rocks.push(`<circle cx="${x + 13}" cy="${bottomY}" r="${radius + 1}" fill="${theme.rockEdge}" opacity=".4"/>`);
  }
  return rocks.join("");
}

export function renderCaveRunner(normalized, themeName = "dark") {
  const theme = THEMES[themeName];
  if (!theme) throw new Error(`Unknown Cave Runner theme: ${themeName}`);
  if (!normalized || !Array.isArray(normalized.cells) || !Number.isInteger(normalized.weekCount)) {
    throw new Error("Normalized contribution data is invalid");
  }

  const width = 1200;
  const height = 430;
  const weeks = aggregateWeeks(normalized);
  const activeWeeks = weeks.filter((week) => week.contributionCount > 0);
  const activeDays = normalized.cells.filter((cell) => cell.contributionCount > 0).length;
  const step = 1050 / Math.max(1, normalized.weekCount - 1);
  const offsets = [-2, -1, 0, 1, 2, 1, 0, -1, -2, 0, 2, 1];
  const points = weeks.map((week) => ({
    x: 74 + week.weekIndex * step,
    y: 222 + offsets[week.weekIndex % offsets.length] * 28,
  }));
  const routePath = points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x.toFixed(1)} ${point.y}`;
    return `${path}H${point.x.toFixed(1)}V${point.y}`;
  }, "");
  const routeDistances = points.reduce((distances, point, index) => {
    if (index === 0) return [0];
    const previous = points[index - 1];
    return [...distances, distances.at(-1) + Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)];
  }, []);
  const totalRouteDistance = routeDistances.at(-1) || 1;
  const start = points[0];
  const finish = points.at(-1);

  const crystals = activeWeeks.map((week) => {
    const point = points[week.weekIndex];
    const distanceProgress = routeDistances[week.weekIndex] / totalRouteDistance;
    const progress = Math.max(0.015, Math.min(0.995, distanceProgress));
    return crystalMarkup(week, point, theme, progress);
  }).join("");

  const torches = points.filter((_, index) => index > 2 && index < points.length - 2 && index % 9 === 0)
    .map((point, index) => `<g transform="translate(${point.x.toFixed(1)} ${point.y - 42})">
      <path d="M0 0V13" stroke="${theme.amber}" stroke-width="3"/>
      <path class="flame" d="M0 1C-7 -5 -4 -14 1 -18C7 -11 8 -4 0 1Z" fill="${index % 2 ? theme.violet : theme.amber}" filter="url(#torch-glow)"/>
    </g>`).join("");

  const stalactites = points.filter((_, index) => index % 6 === 2)
    .map((point, index) => {
      const top = point.y - 47;
      const length = 15 + (index % 3) * 8;
      return `<path d="M${(point.x - 10).toFixed(1)} ${top}H${(point.x + 10).toFixed(1)}L${point.x.toFixed(1)} ${top + length}Z" fill="${theme.rockEdge}" opacity=".84"/>`;
    }).join("");

  const boulders = points.filter((_, index) => index > 3 && index < points.length - 4 && index % 11 === 5)
    .map((point) => `<g transform="translate(${point.x.toFixed(1)} ${point.y + 31})">
      <circle r="13" fill="${theme.rockEdge}" stroke="${theme.tunnelEdge}" stroke-width="2"/>
      <path d="M-7 -2L-1 -8L7 -3L5 7L-5 8Z" stroke="${theme.rock}" stroke-width="2" fill="none"/>
    </g>`).join("");

  return `<svg width="1200" height="430" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="cave-title cave-desc" data-theme="${themeName}" data-game-style="diamond-cave" data-crystal-count="${activeWeeks.length}" data-active-days="${activeDays}" data-total-contributions="${normalized.totalContributions}">
  <title id="cave-title">Navdeep's Cave Runner</title>
  <desc id="cave-desc">An animated cave explorer follows a contribution trail and collects ${activeWeeks.length} weekly crystals representing ${activeDays} active GitHub days.</desc>
  <defs>
    <filter id="diamond-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="torch-glow" x="-160%" y="-160%" width="420%" height="420%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <pattern id="rock-pattern" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M0 13L13 0L26 13L13 26Z" stroke="${theme.rockEdge}" stroke-width="1" opacity=".16"/></pattern>
    <style>
      .rest-layer { display: none; }
      .flame { transform-box: fill-box; transform-origin: bottom; animation: flame 1.3s ease-in-out infinite; }
      .cave-route { stroke-dasharray: 7 11; animation: route 9s linear infinite; }
      .exit-light { animation: exit 2.2s ease-in-out infinite; }
      @keyframes flame { 0%, 100% { transform: scale(.8) rotate(-3deg); opacity: .65; } 50% { transform: scale(1.13) rotate(3deg); opacity: 1; } }
      @keyframes route { to { stroke-dashoffset: -180; } }
      @keyframes exit { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) {
        .motion-layer { display: none; }
        .rest-layer { display: block; }
        .flame, .cave-route, .exit-light { animation: none; }
      }
    </style>
  </defs>

  <rect x="3" y="3" width="1194" height="424" rx="24" fill="${theme.background}" stroke="${theme.rockEdge}" stroke-width="6"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
    <text x="42" y="43" fill="${theme.muted}" font-size="12" letter-spacing="2">LEVEL 01</text>
    <text x="42" y="68" fill="${theme.text}" font-size="20" font-weight="700" letter-spacing="3">CONTRIBUTION CAVERNS</text>
    <circle class="exit-light" cx="326" cy="61" r="5" fill="${theme.mint}"/>
    <text x="824" y="43" fill="${theme.muted}" font-size="12" letter-spacing="1.5">DIAMONDS</text>
    <text x="904" y="44" fill="${theme.amber}" font-size="18" font-weight="700">${activeWeeks.length}</text>
    <text x="960" y="43" fill="${theme.muted}" font-size="12" letter-spacing="1.5">ACTIVE DAYS</text>
    <text x="1062" y="44" fill="${theme.mint}" font-size="18" font-weight="700">${activeDays}</text>
    <text x="1111" y="43" fill="${theme.muted}" font-size="12">XP</text>
    <text x="1135" y="44" fill="${theme.violet}" font-size="18" font-weight="700">${normalized.totalContributions}</text>
  </g>
  <path d="M25 82H1175" stroke="${theme.rockEdge}" stroke-width="2"/>

  <rect class="cave-wall" x="25" y="88" width="1150" height="282" rx="14" fill="${theme.rock}"/>
  <rect x="25" y="88" width="1150" height="282" rx="14" fill="url(#rock-pattern)"/>
  ${rockTexture(theme)}
  <path d="${routePath}" stroke="${theme.tunnelEdge}" stroke-width="92" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${routePath}" stroke="${theme.tunnel}" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"/>
  <path class="cave-route" d="${routePath}" stroke="${theme.muted}" stroke-width="2" stroke-linecap="round" opacity=".38"/>
  ${stalactites}
  ${boulders}
  ${torches}
  ${crystals}

  <g class="exit-gate" transform="translate(${finish.x.toFixed(1)} ${finish.y})">
    <path d="M-15 25V-18Q0-34 15-18V25" fill="${theme.shadow}" stroke="${theme.violet}" stroke-width="4"/>
    <path class="exit-light" d="M0-21V16M-8-8H8" stroke="${theme.mint}" stroke-width="3" stroke-linecap="round" filter="url(#torch-glow)"/>
  </g>

  <g class="motion-layer" transform="translate(${start.x} ${start.y})">
    ${explorerMarkup(theme)}
    <animateMotion path="${routePath}" dur="20s" repeatCount="indefinite" additive="sum"/>
  </g>
  <g class="rest-layer" transform="translate(${start.x} ${start.y})">${explorerMarkup(theme)}</g>

  <g transform="translate(42 401)" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
    <text x="0" y="0" fill="${theme.muted}" font-size="12" letter-spacing="1.5">DIG</text>
    <rect x="42" y="-9" width="1090" height="7" rx="3.5" fill="${theme.rock}"/>
    <rect class="motion-layer" x="42" y="-9" width="0" height="7" rx="3.5" fill="${theme.amber}"><animate attributeName="width" values="0;1090" dur="20s" repeatCount="indefinite"/></rect>
    <rect class="rest-layer" x="42" y="-9" width="1090" height="7" rx="3.5" fill="${theme.amber}"/>
  </g>
</svg>`;
}
