import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

const DEFAULT_TOPICS = [
  "Surgery",
  "Diagnostics",
  "Patient Care",
  "Administration",
  "Research",
  "Drug Discovery",
];

export function Preferences() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const settings = useQuery(api.userSettings.getUserSettings);
  const updatePreferences = useMutation(api.userPreferences.updatePreferences);
  const theme = settings?.theme || "light";
  
  const [selectedTopics, setSelectedTopics] = useState<string[]>(preferences?.selectedTopics || []);
  const [customTopics, setCustomTopics] = useState<string[]>(preferences?.customTopics || []);
  const [customTopic, setCustomTopic] = useState("");
  const [customSources, setCustomSources] = useState<Array<{ url: string; name: string; status: "active" | "muted" | "failed"; failureReason?: string }>>(preferences?.customSources || []);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when preferences load
  useState(() => {
    if (preferences) {
      setSelectedTopics(preferences.selectedTopics);
      setCustomTopics(preferences.customTopics);
      setCustomSources(preferences.customSources);
    }
  });

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
    setHasChanges(true);
  };

  const addCustomTopic = () => {
    if (customTopic.trim() && !customTopics.includes(customTopic.trim())) {
      setCustomTopics([...customTopics, customTopic.trim()]);
      setCustomTopic("");
      setHasChanges(true);
    }
  };

  const removeCustomTopic = (topic: string) => {
    setCustomTopics(customTopics.filter(t => t !== topic));
    setHasChanges(true);
  };

  const addCustomSource = () => {
    if (sourceUrl.trim() && sourceName.trim()) {
      setCustomSources([...customSources, { 
        url: sourceUrl.trim(), 
        name: sourceName.trim(),
        status: "active" as const
      }]);
      setSourceUrl("");
      setSourceName("");
      setHasChanges(true);
    }
  };

  const removeCustomSource = (index: number) => {
    setCustomSources(customSources.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const toggleSourceStatus = (index: number) => {
    const newSources = [...customSources];
    newSources[index].status = newSources[index].status === "active" ? "muted" : "active";
    setCustomSources(newSources);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (selectedTopics.length === 0 && customTopics.length === 0) {
      toast.error("Please select at least one topic");
      return;
    }

    try {
      await updatePreferences({
        selectedTopics,
        customTopics,
        customSources,
      });
      toast.success("Preferences saved successfully");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save preferences");
    }
  };

  if (!preferences) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className={`rounded-lg shadow-sm border p-6 ${
        theme === "dark" 
          ? "bg-gray-800 border-gray-700" 
          : "bg-white border-gray-200"
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Preferences</h2>
          {hasChanges && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Changes
            </button>
          )}
        </div>

        {/* Content Interests */}
        <div className="mb-8">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Content Interests</h3>
          <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Select the areas you want to follow in your feed.
          </p>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            {DEFAULT_TOPICS.map(topic => (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedTopics.includes(topic)
                    ? theme === "dark"
                      ? "border-blue-500 bg-blue-900/30 text-blue-300"
                      : "border-blue-600 bg-blue-50 text-blue-700"
                    : theme === "dark"
                    ? "border-gray-600 hover:border-gray-500 text-gray-300"
                    : "border-gray-200 hover:border-gray-300 text-gray-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{topic}</span>
                  {selectedTopics.includes(topic) && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Add custom topics:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addCustomTopic()}
                placeholder="e.g., Radiology AI, Telemedicine"
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <button
                onClick={addCustomTopic}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            {customTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {customTopics.map(topic => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {topic}
                    <button
                      onClick={() => removeCustomTopic(topic)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Your Sources */}
        <div className="mb-8">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Your Sources</h3>
          <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Manage your custom sources for article discovery.
          </p>

          <div className="space-y-3 mb-4">
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
                onClick={addCustomSource}
                disabled={!sourceUrl.trim() || !sourceName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>

          {customSources.length > 0 && (
            <div className="space-y-2">
              {customSources.map((source, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{source.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        source.status === "active" 
                          ? "bg-green-100 text-green-700" 
                          : source.status === "muted"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {source.status}
                      </span>
                    </div>
                    <div className={`text-sm truncate max-w-md ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      {source.url}
                    </div>
                    {source.failureReason && (
                      <div className="text-xs text-red-600 mt-1">
                        {source.failureReason}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSourceStatus(index)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {source.status === "active" ? "Mute" : "Activate"}
                    </button>
                    <button
                      onClick={() => removeCustomSource(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Display & Notifications (Future) */}
        <div className="mb-8 opacity-50">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Display & Notifications</h3>
          <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Coming soon: Email digest frequency, notification preferences, and theme settings.
          </p>
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save All Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
