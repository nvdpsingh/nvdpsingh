import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeCalendar, renderCaveRunner } from "./render.mjs";

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const CONTRIBUTION_QUERY = `
  query ContributionCalendar($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              weekday
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

export function extractCalendar(payload) {
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(`GitHub GraphQL error: ${payload.errors.map((error) => error.message).join("; ")}`);
  }
  if (!payload?.data?.user) {
    throw new Error("GitHub user was not found");
  }

  const calendar = payload.data.user.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    throw new Error("GitHub response did not include a contribution calendar");
  }
  return calendar;
}

export async function fetchCalendar(username, token) {
  if (!username) throw new Error("GITHUB_USERNAME is required");
  if (!token) throw new Error("GITHUB_TOKEN is required");

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "nvdpsingh-cave-runner",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ query: CONTRIBUTION_QUERY, variables: { login: username } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub contribution request failed with HTTP ${response.status}`);
  }
  return extractCalendar(await response.json());
}

function validateSvg(svg, expectedTheme) {
  if (!svg.startsWith("<svg") || !svg.includes(`data-theme="${expectedTheme}"`)) {
    throw new Error(`Generated ${expectedTheme} Cave Runner SVG is invalid`);
  }
  if (/<script/i.test(svg) || /(?:href|src)="https?:/i.test(svg)) {
    throw new Error(`Generated ${expectedTheme} Cave Runner SVG contains unsafe resources`);
  }
}

export async function generateFiles(calendar, outputDirectory) {
  const normalized = normalizeCalendar(calendar);
  const target = resolve(outputDirectory);
  await mkdir(target, { recursive: true });

  const outputs = [
    { theme: "light", filename: "cave-runner-contribution-graph.svg" },
    { theme: "dark", filename: "cave-runner-contribution-graph-dark.svg" },
  ];

  const files = [];
  for (const output of outputs) {
    const svg = renderCaveRunner(normalized, output.theme);
    validateSvg(svg, output.theme);
    const path = join(target, output.filename);
    await writeFile(path, svg, "utf8");
    files.push(path);
  }
  return files;
}

function parseArguments(argumentsList) {
  const options = { outDir: "dist" };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    const value = argumentsList[index + 1];
    if (argument === "--fixture" && value) {
      options.fixture = value;
      index += 1;
    } else if (argument === "--out-dir" && value) {
      options.outDir = value;
      index += 1;
    } else if (argument === "--username" && value) {
      options.username = value;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  let calendar;

  if (options.fixture) {
    const payload = JSON.parse(await readFile(resolve(options.fixture), "utf8"));
    calendar = extractCalendar(payload);
  } else {
    calendar = await fetchCalendar(
      options.username ?? process.env.GITHUB_USERNAME,
      process.env.GITHUB_TOKEN,
    );
  }

  const files = await generateFiles(calendar, options.outDir);
  for (const file of files) console.log(file);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
