import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function DiscoveryStatus() {
  const recentRuns = useQuery(api.state.getRecentRuns);
  const settings = useQuery(api.userSettings.getUserSettings);
  const theme = settings?.theme || "light";

  if (!recentRuns || recentRuns.length === 0) {
    return (
      <div className={`rounded-lg shadow-sm border p-6 ${
        theme === "dark" 
          ? "bg-gray-800 border-gray-700" 
          : "bg-white border-gray-200"
      }`}>
        <h3 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Discovery Agent</h3>
        <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
          The discovery agent runs automatically twice daily to find new articles from your sources.
        </p>
        <p className={`text-sm mt-2 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
          No discovery runs yet.
        </p>
      </div>
    );
  }

  const latestRun = recentRuns[0];
  const isRunning = latestRun.status === "running";

  return (
    <div className={`rounded-lg shadow-sm border p-6 ${
      theme === "dark" 
        ? "bg-gray-800 border-gray-700" 
        : "bg-white border-gray-200"
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Discovery Agent</h3>
          <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Automatically finds, scrapes, and analyzes articles twice daily
          </p>
        </div>
        {isRunning && (
          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700 mr-2"></div>
            Running
          </span>
        )}
        {latestRun.status === "cancelled" && (
          <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
            Cancelled
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className={`rounded-lg p-3 ${theme === "dark" ? "bg-gray-700" : "bg-gray-50"}`}>
            <div className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{latestRun.sourcesChecked}</div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Sources</div>
          </div>
          <div className={`rounded-lg p-3 ${theme === "dark" ? "bg-gray-700" : "bg-gray-50"}`}>
            <div className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{latestRun.itemsFound}</div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Found</div>
          </div>
          <div className={`rounded-lg p-3 ${theme === "dark" ? "bg-yellow-900/20" : "bg-yellow-50"}`}>
            <div className={`text-xl font-bold ${theme === "dark" ? "text-yellow-400" : "text-yellow-900"}`}>{latestRun.itemsQueued}</div>
            <div className={`text-xs ${theme === "dark" ? "text-yellow-500" : "text-yellow-600"}`}>New (Queued)</div>
          </div>
          <div className={`rounded-lg p-3 ${theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"}`}>
            <div className={`text-xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-900"}`}>{latestRun.itemsScraped ?? 0}</div>
            <div className={`text-xs ${theme === "dark" ? "text-blue-500" : "text-blue-600"}`}>Scraped</div>
          </div>
          <div className={`rounded-lg p-3 ${theme === "dark" ? "bg-green-900/20" : "bg-green-50"}`}>
            <div className={`text-xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-900"}`}>{latestRun.itemsAnalyzed ?? 0}</div>
            <div className={`text-xs ${theme === "dark" ? "text-green-500" : "text-green-600"}`}>Analyzed</div>
          </div>
        </div>
        
        {latestRun.itemsFound > 0 && latestRun.itemsQueued === 0 && (
          <div className={`p-3 border rounded-lg ${
            theme === "dark"
              ? "bg-blue-900/20 border-blue-800"
              : "bg-blue-50 border-blue-200"
          }`}>
            <p className={`text-sm ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}>
              <strong>ℹ️ Info:</strong> Found {latestRun.itemsFound} articles, but all were already in the database (previously seen).
            </p>
          </div>
        )}

        {latestRun.completedAt && (
          <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            Last run: {new Date(latestRun.completedAt).toLocaleString()}
          </div>
        )}

        {latestRun.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">Error: {latestRun.error}</p>
          </div>
        )}

        {recentRuns.length > 1 && (
          <details className="mt-4">
            <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
              View recent runs ({recentRuns.length - 1} more)
            </summary>
            <div className="mt-3 space-y-2">
              {recentRuns.slice(1).map((run) => (
                <div key={run._id} className={`flex justify-between items-center p-2 rounded text-sm ${
                  theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                }`}>
                  <div>
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      run.status === "completed" ? "bg-green-500" :
                      run.status === "failed" ? "bg-red-500" :
                      run.status === "cancelled" ? "bg-gray-500" :
                      "bg-yellow-500"
                    }`}></span>
                    {new Date(run.startedAt).toLocaleString()}
                  </div>
                  <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                    {run.itemsAnalyzed ?? 0} analyzed
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
