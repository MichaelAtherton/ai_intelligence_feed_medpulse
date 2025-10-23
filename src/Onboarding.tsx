import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
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

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const [customSources, setCustomSources] = useState<Array<{ url: string; name: string }>>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");

  const saveOnboarding = useMutation(api.userPreferences.saveOnboarding);
  const settings = useQuery(api.userSettings.getUserSettings);
  const theme = settings?.theme || "light";

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const addCustomTopic = () => {
    if (customTopic.trim() && !customTopics.includes(customTopic.trim())) {
      setCustomTopics([...customTopics, customTopic.trim()]);
      setCustomTopic("");
    }
  };

  const removeCustomTopic = (topic: string) => {
    setCustomTopics(customTopics.filter(t => t !== topic));
  };

  const addCustomSource = () => {
    if (sourceUrl.trim() && sourceName.trim()) {
      setCustomSources([...customSources, { url: sourceUrl.trim(), name: sourceName.trim() }]);
      setSourceUrl("");
      setSourceName("");
    }
  };

  const removeCustomSource = (index: number) => {
    setCustomSources(customSources.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (selectedTopics.length === 0 && customTopics.length === 0) {
      toast.error("Please select at least one topic");
      return;
    }

    try {
      await saveOnboarding({
        selectedTopics,
        customTopics,
        customSources,
      });
      toast.success("Welcome! Your feed is being prepared.");
    } catch (error) {
      toast.error("Failed to save preferences");
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className={`rounded-lg shadow-md p-8 ${
        theme === "dark" ? "bg-gray-800" : "bg-white"
      }`}>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {step === 1 ? "What interests you?" : "Custom Sources (Optional)"}
            </h2>
            <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Step {step} of 2</span>
          </div>
          <div className={`w-full rounded-full h-2 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}>
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(step / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className={`mb-4 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                Select the areas you want to follow:
              </p>
              <div className="grid grid-cols-2 gap-3">
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

            <button
              onClick={() => setStep(2)}
              disabled={selectedTopics.length === 0 && customTopics.length === 0}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className={`mb-4 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                Add sources you already follow (optional):
              </p>
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
                    onClick={addCustomSource}
                    disabled={!sourceUrl.trim() || !sourceName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              {customSources.length > 0 && (
                <div className="mt-4 space-y-2">
                  {customSources.map((source, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <div>
                        <div className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{source.name}</div>
                        <div className={`text-sm truncate max-w-md ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                          {source.url}
                        </div>
                      </div>
                      <button
                        onClick={() => removeCustomSource(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className={`px-6 py-3 border rounded-lg transition-colors font-medium ${
                  theme === "dark"
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
