// GitHub Pages serves this repo at /Swim-Coach. Only apply it in CI builds
// (GITHUB_ACTIONS is set by every GitHub Actions runner) so local dev and
// `npm run build` stay at the site root. Keep in sync with next.config.ts.
export const basePath = process.env.GITHUB_ACTIONS ? "/Swim-Coach" : "";
