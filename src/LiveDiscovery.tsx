import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { ActivityFeed } from "./ActivityFeed";
import { toast } from "sonner";

export function LiveDiscovery() {
  const settings = useQuery(api.userSettings.getUserSettings);
  const theme = settings?.theme || "light";
  const recentRuns = useQuery(api.state.getRecentRuns);
  const triggerDiscovery = useAction(api.manualTriggers.triggerDiscovery);
  const cancelRun = useMutation(api.state.cancelDiscoveryRun);
  const deleteRun = useMutation(api.state.deleteRun);
  const clearAllRuns = useMutation(api.state.clearAllRuns);
  
  const [debugMode, setDebugMode] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleTriggerDiscovery = async () => {
    setIsRunning(true);
    try {
      await triggerDiscovery();
      toast.success("✅ Discovery pipeline started! Running in background - you can navigate away safely.", {
        duration: 5000,
      });
      // Keep button disabled for 2 seconds to allow query to detect the new run
      setTimeout(() => setIsRunning(false), 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to start discovery");
      setIsRunning(false);
    }
  };

  const handleCancelRun = async () => {
    if (!activeRun) return;
    if (!confirm("Are you sure you want to cancel the running pipeline?")) return;
    
    setIsCancelling(true);
    try {
      await cancelRun({ runId: activeRun._id });
      toast.success("Pipeline cancelled");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteRun = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteRun({ runId: runId as any });
      if (selectedRunId === runId) setSelectedRunId(null);
      toast.success("Run deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete run");
    }
  };

  const handleClearAllRuns = async () => {
    if (!confirm("Are you sure you want to delete all runs? This cannot be undone.")) return;
    try {
      const result = await clearAllRuns();
      setSelectedRunId(null);
      toast.success(`Deleted ${result.deleted} runs`);
    } catch (error: any) {
      toast.error(error.message || "Failed to clear runs");
    }
  };

  const activeRun = recentRuns?.find(r => r.status === "running");
  const displayRunId = selectedRunId || activeRun?._id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-6 rounded-lg border ${
        theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              Live Discovery Pipeline
            </h2>
            <p className={`text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}>
              Monitor the discovery pipeline in real-time. Runs in background - safe to navigate away.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="rounded"
              />
              <span className={`text-sm font-medium ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Debug Mode
              </span>
            </label>

            {activeRun ? (
              <button
                onClick={handleCancelRun}
                disabled={isCancelling}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === "dark"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                } ${isCancelling ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isCancelling ? "Cancelling..." : "Cancel Pipeline"}
              </button>
            ) : (
              <button
                onClick={handleTriggerDiscovery}
                disabled={isRunning}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRunning
                    ? "bg-green-500 cursor-not-allowed text-white"
                    : theme === "dark"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isRunning ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Pipeline Starting...
                  </span>
                ) : (
                  "Start Discovery"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Debug Mode Info */}
        {debugMode && (
          <div className={`p-3 rounded border ${
            theme === "dark" 
              ? "bg-purple-900/20 border-purple-700 text-purple-300" 
              : "bg-purple-50 border-purple-200 text-purple-700"
          }`}>
            <div className="flex items-start gap-2">
              <span className="text-lg">🐛</span>
              <div className="text-sm">
                <strong>Debug Mode Active:</strong> Showing all events including raw LLM calls with prompts and responses.
                This provides maximum visibility into the pipeline's operation.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {recentRuns && recentRuns.length > 0 && (
        <div className={`p-6 rounded-lg border ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              Recent Runs
            </h3>
            <button
              onClick={handleClearAllRuns}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                theme === "dark"
                  ? "bg-red-900 text-red-200 hover:bg-red-800"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-2">
            {recentRuns.slice(0, 5).map((run) => (
              <div
                key={run._id}
                onClick={() => setSelectedRunId(run._id)}
                className={`w-full p-3 rounded border text-left transition-colors relative group cursor-pointer ${
                  selectedRunId === run._id
                    ? theme === "dark"
                      ? "bg-blue-900 border-blue-700"
                      : "bg-blue-50 border-blue-300"
                    : theme === "dark"
                    ? "bg-gray-900 border-gray-700 hover:bg-gray-850"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div
                  onClick={(e) => handleDeleteRun(run._id, e)}
                  className={`absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                    theme === "dark" ? "hover:bg-red-900 text-red-400" : "hover:bg-red-100 text-red-600"
                  }`}
                  title="Delete run"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDeleteRun(run._id, e as any);
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        run.status === "running"
                          ? "bg-blue-100 text-blue-700"
                          : run.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : run.status === "cancelled"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {run.status}
                      </span>
                      <span className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        {new Date(run.startedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className={`text-sm ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {run.sourcesChecked} sources • {run.itemsFound} found • {run.itemsQueued} queued
                    </div>
                  </div>
                  
                  {run.status === "running" && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      {displayRunId && (
        <ActivityFeed 
          runId={displayRunId as any} 
          debugMode={debugMode}
          theme={theme}
        />
      )}

      {!displayRunId && (
        <div className={`p-12 rounded-lg border text-center ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <div className="text-6xl mb-4">🔍</div>
          <h3 className={`text-xl font-semibold mb-2 ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}>
            No Active Discovery Run
          </h3>
          <p className={`mb-4 ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}>
            Start a discovery run to see live activity
          </p>
          <button
            onClick={handleTriggerDiscovery}
            disabled={isRunning}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {isRunning ? "Starting..." : "Start Discovery"}
          </button>
        </div>
      )}
    </div>
  );
}
