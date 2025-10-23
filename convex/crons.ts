import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "discovery-pipeline",
  { hours: 12 },
  internal.discoveryAction.runDiscoveryPipeline
);

// Note: Scraping runs per-user via discovery pipeline
// No need for a separate cron job

export default crons;
