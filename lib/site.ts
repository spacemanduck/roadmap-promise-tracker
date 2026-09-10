export const SITE_NAME = "Roadmap Promise Tracker";
export const REPO_URL = "https://github.com/spacemanduck/roadmap-promise-tracker";
/** Requests and corrections go through GitHub issues so every request is public and dated. */
export const REQUEST_URL = `${REPO_URL}/issues/new?labels=game-request&title=${encodeURIComponent("Game request: <game name>")}`;
export const CORRECTION_URL = `${REPO_URL}/issues/new?labels=correction&title=${encodeURIComponent("Correction: <game> / <item>")}`;
