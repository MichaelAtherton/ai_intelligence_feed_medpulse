import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Automated discovery runs for ALL users (twice daily)
// This is different from manual triggers which run for the logged-in user only
crons.interval(
  "discovery-pipeline-all-users",
  { hours: 12 },
  internal.discoveryAction.runDiscoveryPipelineForAllUsers
);

// Note: Scraping runs per-user via discovery pipeline
// No need for a separate cron job

export default crons;
