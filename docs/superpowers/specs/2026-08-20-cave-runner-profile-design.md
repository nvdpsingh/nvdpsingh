# Interactive GitHub Profile and Cave Runner Design

## Purpose

Turn Navdeep Singh's GitHub profile README into a visual identity board that communicates his interests and working style before a visitor reads any long-form text. The page must remain personal rather than recruitment-oriented, must not mention any employer, and must only present skills supported by the latest resume.

The signature interaction is an original animated contribution game called **Cave Runner**. A small explorer moves through Navdeep's real contribution calendar and collects crystal-shaped contribution cells.

## Experience

The default, expanded page will contain four visual moments in this order:

1. **Animated field-note hero** - Navdeep's name, personal thesis, and a living systems diagram.
2. **Clickable contact controls** - custom visual buttons for portfolio, LinkedIn, and email.
3. **Animated identity board** - three glanceable panels for current curiosities, build loop, and verified working set.
4. **Cave Runner** - a contribution-calendar cave in which an original explorer collects crystals.

Longer explanations will not occupy the default view. They will live in native GitHub `<details>` controls titled "Open the field notes" and "Open the working set." These controls supply genuine interaction without relying on JavaScript, which GitHub sanitizes from Markdown.

## Visual Direction

The profile keeps the existing graph-paper field-notebook language. The palette is:

- **Ink** `#07111F` - primary background
- **Paper** `#EDF7F5` - primary text
- **Signal mint** `#57E3C3` - systems and exploration
- **Memory violet** `#A99FFF` - models and retrieval
- **Crystal amber** `#FFB86B` - building, measurement, and collected items
- **Grid blue** `#24364F` - borders and cave structure

The Cave Runner will use pixel geometry within the same palette rather than imitate a copyrighted game or character. Contribution cells retain the calendar grid structure. Empty days become subdued cave stones; contribution days become crystals whose size and brightness reflect GitHub contribution levels.

Motion is restrained to three orchestrated moments: flowing network edges in the hero, sequential signal movement in the identity board, and the Cave Runner loop. Each SVG will provide a static fallback under `prefers-reduced-motion`.

## Cave Runner Behavior

The generator will turn the most recent GitHub contribution calendar into a 53-column by 7-row cave.

- Each day is normalized into a cell with date, count, weekday, week index, and contribution level.
- Days with contributions render as crystals. The four GitHub contribution levels map to four crystal sizes and brightness levels.
- An original pixel explorer follows a deterministic serpentine route through the calendar.
- Crystals disappear as the explorer reaches their cells, then reset when the loop restarts.
- A compact HUD displays `CAVE RUNNER`, the total number of contribution crystals, and a progress bar.
- The complete loop targets 16-20 seconds so the movement is visible without becoming distracting.
- The SVG contains a descriptive `<title>` and `<desc>`. A reduced-motion layer shows the full cave and a stationary explorer.

The generator produces separate light and dark SVGs so the README can select the correct asset with a `<picture>` element.

## Architecture

### Renderer

`scripts/cave-runner/render.mjs` will be a dependency-free Node module. It accepts normalized contribution data plus a theme and returns an SVG string. Keeping rendering pure makes the visual deterministic and testable without network access.

### Data and command entry point

`scripts/cave-runner/generate.mjs` will:

1. Read `GITHUB_TOKEN` and `GITHUB_USERNAME` when running in Actions.
2. Query GitHub's GraphQL contribution calendar for the named user.
3. Normalize the response into exactly the returned calendar cells.
4. Call the renderer twice for light and dark themes.
5. Write `dist/cave-runner-contribution-graph.svg` and `dist/cave-runner-contribution-graph-dark.svg`.

For local tests and previews, the entry point will accept a fixture path instead of calling GitHub.

### Scheduled workflow

`.github/workflows/cave-runner.yml` will replace the obsolete snake workflow. It will run daily, on manual dispatch, and when Cave Runner source files change on `main`.

The workflow will:

1. Check out the repository.
2. Set up the supported Node runtime.
3. Generate and validate both SVGs.
4. Publish the `dist` directory to the dedicated `output` branch.

The workflow receives only the repository-scoped `GITHUB_TOKEN` and requests `contents: write`. Generated assets never enter `main`.

### README integration

The README will use a theme-aware `<picture>` block referencing the generated files from the `output` branch. A meaningful alt string will describe the game for visitors who cannot see the animation.

The visible profile will contain no employer names, employment timeline, project table, stat-card wall, or unsupported skill claims.

### Public profile metadata

The separate GitHub account bio will change from the outdated employment-oriented copy to:

> AI Systems Engineer 🧠 | Agents, memory, retrieval & evaluation | Building reliable systems from intelligent models

This makes search results and the left profile rail match the visual README without naming an employer.

## Failure Handling

- If GitHub's contribution query fails, generation exits nonzero and the workflow does not publish. The last successful `output` branch remains visible.
- Invalid or incomplete calendar data produces an explicit error instead of a malformed SVG.
- The workflow validates both output files before publishing.
- The README uses descriptive fallback text if an image cannot load.
- External scripts, fonts, and image dependencies are not used inside the generated SVGs.

## Testing and Verification

Automated tests will use Node's built-in test runner and a checked-in contribution fixture.

Tests will verify:

- deterministic output for the fixture;
- correct crystal count and contribution-level mapping;
- required title, description, theme, animation, and reduced-motion markup;
- absence of `<script>` and external resource URLs;
- successful light and dark SVG generation;
- rejection of malformed contribution data.

Final verification will include:

- `node --test` for the renderer and generator;
- XML parsing with `xmllint`;
- raster previews of both themes for visual inspection;
- GitHub's Markdown rendering API;
- a manually triggered workflow run;
- live-profile inspection in desktop and narrow browser widths;
- privacy and resume-supported-skill scans.

## Files in Scope

- `README.md`
- `assets/navdeep-field-notes.svg`
- `assets/navdeep-identity-board.svg`
- three small contact-control SVGs under `assets/`
- `scripts/cave-runner/render.mjs`
- `scripts/cave-runner/generate.mjs`
- `scripts/cave-runner/render.test.mjs`
- `scripts/cave-runner/fixtures/contributions.json`
- `.github/workflows/cave-runner.yml`
- removal of `.github/workflows/snake.yml`
- GitHub public bio metadata

No resume, portfolio site, other repository, employer detail, or private project is in scope.
