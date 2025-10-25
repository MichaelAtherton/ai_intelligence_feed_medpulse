import { cronJobs } from "convex/server";
// import { internal } from "./_generated/api";  // Uncomment when re-enabling cron

const crons = cronJobs();

// DISABLED: Automated discovery runs for ALL users (twice daily)
// Re-enable this once you're ready for automated discovery
// This is different from manual triggers which run for the logged-in user only
// crons.interval(
//   "discovery-pipeline-all-users",
//   { hours: 12 },
//   internal.discoveryAction.runDiscoveryPipelineForAllUsers
// );

// Note: Scraping runs per-user via discovery pipeline
// No need for a separate cron job

export default crons;
