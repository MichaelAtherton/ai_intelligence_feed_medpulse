/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as activityFeed from "../activityFeed.js";
import type * as apiKeys from "../apiKeys.js";
import type * as articles from "../articles.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as chatAction from "../chatAction.js";
import type * as crons from "../crons.js";
import type * as dailySummary from "../dailySummary.js";
import type * as dailySummaryAction from "../dailySummaryAction.js";
import type * as dataManagement from "../dataManagement.js";
import type * as discovery_agent from "../discovery/agent.js";
import type * as discovery_analyzer from "../discovery/analyzer.js";
import type * as discovery_scraper from "../discovery/scraper.js";
import type * as discovery_tools from "../discovery/tools.js";
import type * as discoveryAction from "../discoveryAction.js";
import type * as http from "../http.js";
import type * as manualTriggers from "../manualTriggers.js";
import type * as router from "../router.js";
import type * as scrapingAction from "../scrapingAction.js";
import type * as semanticSearch from "../semanticSearch.js";
import type * as sources from "../sources.js";
import type * as state from "../state.js";
import type * as storageAction from "../storageAction.js";
import type * as trendAnalysis from "../trendAnalysis.js";
import type * as trendAnalysisAction from "../trendAnalysisAction.js";
import type * as userPreferences from "../userPreferences.js";
import type * as userSettings from "../userSettings.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activityFeed: typeof activityFeed;
  apiKeys: typeof apiKeys;
  articles: typeof articles;
  auth: typeof auth;
  chat: typeof chat;
  chatAction: typeof chatAction;
  crons: typeof crons;
  dailySummary: typeof dailySummary;
  dailySummaryAction: typeof dailySummaryAction;
  dataManagement: typeof dataManagement;
  "discovery/agent": typeof discovery_agent;
  "discovery/analyzer": typeof discovery_analyzer;
  "discovery/scraper": typeof discovery_scraper;
  "discovery/tools": typeof discovery_tools;
  discoveryAction: typeof discoveryAction;
  http: typeof http;
  manualTriggers: typeof manualTriggers;
  router: typeof router;
  scrapingAction: typeof scrapingAction;
  semanticSearch: typeof semanticSearch;
  sources: typeof sources;
  state: typeof state;
  storageAction: typeof storageAction;
  trendAnalysis: typeof trendAnalysis;
  trendAnalysisAction: typeof trendAnalysisAction;
  userPreferences: typeof userPreferences;
  userSettings: typeof userSettings;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
