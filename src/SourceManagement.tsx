import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

export function SourceManagement() {
  const sources = useQuery(api.sources.getSourceStats);
  const preferences = useQuery(api.userPreferences.getPreferences);
  const settings = useQuery(api.userSettings.getUserSettings);
  const addCustomSource = useMutation(api.userPreferences.addCustomSource);
  const updateCustomSources = useMutation(api.userPreferences.updateCustomSources);
  
  const theme = settings?.theme || "light";

  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");

  const handleAddSource = async () => {
    if (!sourceUrl.trim() || !sourceName.trim()) {
      toast.error("Please provide both URL and name");
      return;
    }

    try {
      await addCustomSource({
        url: sourceUrl.trim(),
        name: sourceName.trim(),
      });
      setSourceUrl("");
      setSourceName("");
      toast.success("Source added! It will be scraped in the next update.");
    } catch (error) {
      toast.error("Failed to add source");
    }
  };

  const handleToggleSource = async (sourceUrl: string, currentStatus: string) => {
    if (!preferences?.customSources) return;

    const newStatus = currentStatus === "active" ? "muted" : "active";
    const updatedSources = preferences.customSources.map((s) =>
      s.url === sourceUrl ? { ...s, status: newStatus as "active" | "muted" | "failed" } : s
    );

    try {
      await updateCustomSources({ sources: updatedSources });
      toast.success(newStatus === "active" ? "Source unmuted" : "Source muted");
    } catch (error) {
      toast.error("Failed to update source");
    }
  };

  const handleRemoveSource = async (sourceUrl: string) => {
    if (!preferences?.customSources) return;

    const updatedSources = preferences.customSources.filter((s) => s.url !== sourceUrl);

    try {
      await updateCustomSources({ sources: updatedSources });
      toast.success("Source removed");
    } catch (error) {
      toast.error("Failed to remove source");
    }
  };

  if (sources === undefined || preferences === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-lg shadow-sm border p-6 ${
        theme === "dark" 
          ? "bg-gray-800 border-gray-700" 
          : "bg-white border-gray-200"
      }`}>
        <h2 className={`text-2xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Add Source</h2>

        <div className="space-y-3">
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Source name (e.g., Johns Hopkins AI Blog)"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              theme === "dark"
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          />
          <div className="flex gap-2">
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="URL (web page, RSS feed, or newsletter archive)"
              className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <button
              onClick={handleAddSource}
              disabled={!sourceUrl.trim() || !sourceName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Add Source
            </button>
          </div>
          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            We'll attempt to scrape any URL you provide. If it fails, we'll let you know.
          </p>
        </div>
      </div>

      {sources.length > 0 && (
        <div className={`rounded-lg shadow-sm border p-6 ${
          theme === "dark" 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-200"
        }`}>
          <h2 className={`text-2xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Your Sources</h2>
          <div className="space-y-3">
            {sources.map((source) => {
              const status = "status" in source ? source.status : undefined;
              const failureReason = "failureReason" in source ? source.failureReason : undefined;
              
              return (
                <div
                  key={source._id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{source.name}</div>
                      {status === "muted" && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          Muted
                        </span>
                      )}
                      {status === "failed" && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          Failed
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{source.url}</div>
                    {failureReason && (
                      <div className="text-sm text-red-600 mt-1">
                        {failureReason}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>{source.articleCount} articles</span>
                    <button
                      onClick={() => handleToggleSource(source.url, status || "active")}
                      className={`px-3 py-1 text-sm border rounded-lg transition-colors ${
                        theme === "dark"
                          ? "border-gray-600 hover:bg-gray-600 text-gray-300"
                          : "border-gray-300 hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {status === "muted" ? "Unmute" : "Mute"}
                    </button>
                    <button
                      onClick={() => handleRemoveSource(source.url)}
                      className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
