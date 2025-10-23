import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function Settings() {
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);

  const apiKeys = useQuery(api.apiKeys.getUserApiKeys);
  const settings = useQuery(api.userSettings.getUserSettings);
  const saveApiKey = useMutation(api.apiKeys.saveApiKey);
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);
  const updatePreferredProvider = useMutation(api.userSettings.updatePreferredProvider);
  const updateTheme = useMutation(api.userSettings.updateTheme);
  const updateModelConfiguration = useMutation(api.userSettings.updateModelConfiguration);

  const [modelConfig, setModelConfig] = useState({
    discovery: (settings && 'models' in settings && settings.models?.discovery) || "gpt-4o-mini",
    analysis: (settings && 'models' in settings && settings.models?.analysis) || "gpt-4.1-nano",
    dailySummary: (settings && 'models' in settings && settings.models?.dailySummary) || "gpt-4o-mini",
    trendAnalysis: (settings && 'models' in settings && settings.models?.trendAnalysis) || "gpt-4o-mini",
    chat: (settings && 'models' in settings && settings.models?.chat) || "gpt-4o-mini",
  });
  
  // Data management mutations
  const clearAllArticles = useMutation(api.dataManagement.clearAllArticles);
  const clearAllBookmarks = useMutation(api.dataManagement.clearAllBookmarks);
  const clearAllSummaries = useMutation(api.dataManagement.clearAllSummaries);
  const clearAllTrends = useMutation(api.dataManagement.clearAllTrends);
  const clearAllSources = useMutation(api.dataManagement.clearAllSources);
  const resetDiscoveryState = useMutation(api.dataManagement.resetDiscoveryState);
  const getDataStats = useMutation(api.dataManagement.getDataStats);

  const openaiKeyExists = apiKeys?.some(k => k.provider === "openai");
  const anthropicKeyExists = apiKeys?.some(k => k.provider === "anthropic");

  const handleSaveOpenaiKey = async () => {
    if (!openaiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    try {
      await saveApiKey({ provider: "openai", apiKey: openaiKey });
      toast.success("OpenAI API key saved successfully");
      setOpenaiKey("");
      setShowOpenaiKey(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save API key");
    }
  };

  const handleSaveAnthropicKey = async () => {
    if (!anthropicKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    try {
      await saveApiKey({ provider: "anthropic", apiKey: anthropicKey });
      toast.success("Anthropic API key saved successfully");
      setAnthropicKey("");
      setShowAnthropicKey(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save API key");
    }
  };

  const handleDeleteKey = async (provider: "openai" | "anthropic") => {
    if (!confirm(`Are you sure you want to delete your ${provider} API key?`)) {
      return;
    }

    try {
      await deleteApiKey({ provider });
      toast.success("API key deleted");
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  };

  const handleProviderChange = async (provider: "openai" | "anthropic" | "convex") => {
    try {
      await updatePreferredProvider({ provider });
      toast.success(`Preferred provider set to ${provider}`);
    } catch (error) {
      toast.error("Failed to update provider");
    }
  };

  const handleThemeChange = async (theme: "light" | "dark") => {
    try {
      await updateTheme({ theme });
      toast.success(`Theme changed to ${theme} mode`);
    } catch (error) {
      toast.error("Failed to update theme");
    }
  };

  const handleModelChange = async (
    stage: "discovery" | "analysis" | "dailySummary" | "trendAnalysis" | "chat",
    model: string
  ) => {
    const newConfig = { ...modelConfig, [stage]: model };
    setModelConfig(newConfig);
    
    try {
      await updateModelConfiguration(newConfig);
      toast.success(`${stage} model updated to ${model}`);
    } catch (error) {
      toast.error("Failed to update model configuration");
    }
  };

  const handleClearArticles = async () => {
    const stats = await getDataStats();
    
    if (!confirm(
      `⚠️ WARNING: This will permanently delete ALL ${stats.articles} articles and ${stats.bookmarks} bookmarks from the database.\n\n` +
      `This action cannot be undone. Are you absolutely sure?`
    )) {
      return;
    }

    try {
      const result = await clearAllArticles();
      toast.success(`Deleted ${result.articlesDeleted} articles and ${result.embeddingsDeleted} embeddings`);
    } catch (error) {
      toast.error("Failed to clear articles");
    }
  };

  const handleClearBookmarks = async () => {
    const stats = await getDataStats();
    
    if (!confirm(
      `⚠️ WARNING: This will permanently delete all ${stats.bookmarks} of your bookmarks.\n\n` +
      `This action cannot be undone. Are you sure?`
    )) {
      return;
    }

    try {
      const result = await clearAllBookmarks();
      toast.success(`Deleted ${result.bookmarksDeleted} bookmarks`);
    } catch (error) {
      toast.error("Failed to clear bookmarks");
    }
  };

  const handleClearSummaries = async () => {
    const stats = await getDataStats();
    
    if (!confirm(
      `⚠️ WARNING: This will permanently delete all ${stats.summaries} daily summaries.\n\n` +
      `This action cannot be undone. Are you sure?`
    )) {
      return;
    }

    try {
      const result = await clearAllSummaries();
      toast.success(`Deleted ${result.summariesDeleted} summaries`);
    } catch (error) {
      toast.error("Failed to clear summaries");
    }
  };

  const handleClearTrends = async () => {
    const stats = await getDataStats();
    
    if (!confirm(
      `⚠️ WARNING: This will permanently delete all ${stats.trends} trend analyses.\n\n` +
      `This action cannot be undone. Are you sure?`
    )) {
      return;
    }

    try {
      const result = await clearAllTrends();
      toast.success(`Deleted ${result.trendsDeleted} trend analyses`);
    } catch (error) {
      toast.error("Failed to clear trends");
    }
  };

  const handleClearSources = async () => {
    const stats = await getDataStats();
    
    if (!confirm(
      `⚠️ WARNING: This will permanently delete all ${stats.sources} data sources.\n\n` +
      `You will need to re-add sources before discovering new articles. Are you sure?`
    )) {
      return;
    }

    try {
      const result = await clearAllSources();
      toast.success(`Deleted ${result.sourcesDeleted} sources`);
    } catch (error) {
      toast.error("Failed to clear sources");
    }
  };

  const handleResetDiscovery = async () => {
    const stats = await getDataStats();
    
    if (!confirm(
      `⚠️ WARNING: This will reset the discovery state and clear ${stats.discoveryRuns} discovery runs.\n\n` +
      `The next discovery run will re-discover all articles. Are you sure?`
    )) {
      return;
    }

    try {
      const result = await resetDiscoveryState();
      toast.success(`Reset discovery state (cleared ${result.urlsCleared} URLs and ${result.runsCleared} runs)`);
    } catch (error) {
      toast.error("Failed to reset discovery state");
    }
  };

  const theme = settings?.theme || "light";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className={`rounded-lg shadow-sm border p-6 ${
        theme === "dark" 
          ? "bg-gray-800 border-gray-700" 
          : "bg-white border-gray-200"
      }`}>
        <h2 className={`text-2xl font-bold mb-6 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Settings</h2>

        {/* Theme */}
        <div className="mb-8">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Appearance</h3>
          <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Choose your preferred theme for the application.
          </p>
          
          <div className="flex gap-3">
            <label className={`flex-1 flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              theme === "dark" 
                ? "hover:bg-gray-700 border-gray-600" 
                : "hover:bg-gray-50 border-gray-200"
            }`}>
              <input
                type="radio"
                name="theme"
                value="light"
                checked={settings?.theme === "light" || !settings?.theme}
                onChange={() => handleThemeChange("light")}
                className="w-4 h-4 text-blue-600"
              />
              <div className="ml-3">
                <div className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>☀️ Light Mode</div>
                <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Bright and clear</div>
              </div>
            </label>

            <label className={`flex-1 flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              theme === "dark" 
                ? "hover:bg-gray-700 border-gray-600" 
                : "hover:bg-gray-50 border-gray-200"
            }`}>
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={settings?.theme === "dark"}
                onChange={() => handleThemeChange("dark")}
                className="w-4 h-4 text-blue-600"
              />
              <div className="ml-3">
                <div className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>🌙 Dark Mode</div>
                <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Easy on the eyes</div>
              </div>
            </label>
          </div>
        </div>

        {/* Preferred Provider */}
        <div className="mb-8">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Preferred AI Provider</h3>
          <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Choose which AI provider to use for article analysis and embeddings.
          </p>
          
          <div className="space-y-3">
            <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              theme === "dark" 
                ? "hover:bg-gray-700 border-gray-600" 
                : "hover:bg-gray-50 border-gray-200"
            }`}>
              <input
                type="radio"
                name="provider"
                value="convex"
                checked={settings?.preferredProvider === "convex"}
                onChange={() => handleProviderChange("convex")}
                className="w-4 h-4 text-blue-600"
              />
              <div className="ml-3">
                <div className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Convex (Default)</div>
                <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  Use Convex's bundled AI credits (limited free tier)
                </div>
              </div>
            </label>

            <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              theme === "dark" ? "hover:bg-gray-700 border-gray-600" : "hover:bg-gray-50 border-gray-200"
            }`}>
              <input
                type="radio"
                name="provider"
                value="openai"
                checked={settings?.preferredProvider === "openai"}
                onChange={() => handleProviderChange("openai")}
                disabled={!openaiKeyExists}
                className="w-4 h-4 text-blue-600 disabled:opacity-50"
              />
              <div className="ml-3">
                <div className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>OpenAI</div>
                <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  {openaiKeyExists 
                    ? "Use your own OpenAI API key" 
                    : "Add an API key below to enable"}
                </div>
              </div>
            </label>

            <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              theme === "dark" ? "hover:bg-gray-700 border-gray-600" : "hover:bg-gray-50 border-gray-200"
            }`}>
              <input
                type="radio"
                name="provider"
                value="anthropic"
                checked={settings?.preferredProvider === "anthropic"}
                onChange={() => handleProviderChange("anthropic")}
                disabled={!anthropicKeyExists}
                className="w-4 h-4 text-blue-600 disabled:opacity-50"
              />
              <div className="ml-3">
                <div className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Anthropic</div>
                <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  {anthropicKeyExists 
                    ? "Use your own Anthropic API key" 
                    : "Add an API key below to enable"}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* AI Pipeline Models */}
        <div className="mb-8">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            AI Pipeline Models
          </h3>
          <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Choose which model to use for each stage of the discovery pipeline. Different models offer different trade-offs between cost and capability.
          </p>
          
          {!openaiKeyExists && (
            <div className={`p-4 mb-4 rounded-lg ${
              theme === "dark" ? "bg-amber-900/20 border border-amber-800" : "bg-amber-50 border border-amber-200"
            }`}>
              <p className={`text-sm ${theme === "dark" ? "text-amber-300" : "text-amber-800"}`}>
                ⚠️ Configure an OpenAI API key below to use custom models.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <ModelSelector
              label="Discovery"
              description="Finds articles from your sources using function calling"
              value={modelConfig.discovery}
              onChange={(model) => handleModelChange("discovery", model)}
              options={MODEL_OPTIONS}
              disabled={!openaiKeyExists}
              theme={theme}
            />
            
            <ModelSelector
              label="Analysis"
              description="Extracts insights and metadata from article content"
              value={modelConfig.analysis}
              onChange={(model) => handleModelChange("analysis", model)}
              options={MODEL_OPTIONS}
              disabled={!openaiKeyExists}
              theme={theme}
            />
            
            <ModelSelector
              label="Daily Summary"
              description="Generates themed summaries of recent articles"
              value={modelConfig.dailySummary}
              onChange={(model) => handleModelChange("dailySummary", model)}
              options={MODEL_OPTIONS}
              disabled={!openaiKeyExists}
              theme={theme}
            />
            
            <ModelSelector
              label="Trend Analysis"
              description="Identifies patterns and trends across articles"
              value={modelConfig.trendAnalysis}
              onChange={(model) => handleModelChange("trendAnalysis", model)}
              options={MODEL_OPTIONS}
              disabled={!openaiKeyExists}
              theme={theme}
            />
            
            <ModelSelector
              label="Chat"
              description="Powers the conversational interface"
              value={modelConfig.chat}
              onChange={(model) => handleModelChange("chat", model)}
              options={MODEL_OPTIONS}
              disabled={!openaiKeyExists}
              theme={theme}
            />
          </div>
        </div>

        {/* API Keys */}
        <div className="mb-8">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>API Keys</h3>
          <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Add your own API keys to use your preferred AI provider. Keys are encrypted and stored securely.
          </p>

          {/* OpenAI */}
          <div className={`mb-6 p-4 border rounded-lg ${
            theme === "dark" ? "border-gray-600" : "border-gray-200"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>OpenAI API Key</h4>
                {openaiKeyExists ? (
                  <p className="text-sm text-green-600">✓ Key configured</p>
                ) : (
                  <p className="text-sm text-amber-600">⚠ Required for article discovery</p>
                )}
              </div>
              {openaiKeyExists && (
                <button
                  onClick={() => handleDeleteKey("openai")}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>

            {!openaiKeyExists && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showOpenaiKey ? "text" : "password"}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-sm ${
                      theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {showOpenaiKey ? "Hide" : "Show"}
                  </button>
                </div>
                <button
                  onClick={handleSaveOpenaiKey}
                  disabled={!openaiKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save OpenAI Key
                </button>
              </div>
            )}
          </div>

          {/* Anthropic */}
          <div className={`p-4 border rounded-lg ${
            theme === "dark" ? "border-gray-600" : "border-gray-200"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Anthropic API Key</h4>
                {anthropicKeyExists && (
                  <p className="text-sm text-green-600">✓ Key configured</p>
                )}
              </div>
              {anthropicKeyExists && (
                <button
                  onClick={() => handleDeleteKey("anthropic")}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>

            {!anthropicKeyExists && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showAnthropicKey ? "text" : "password"}
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-sm ${
                      theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {showAnthropicKey ? "Hide" : "Show"}
                  </button>
                </div>
                <button
                  onClick={handleSaveAnthropicKey}
                  disabled={!anthropicKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Anthropic Key
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data Management */}
        <div>
          <button
            onClick={() => setShowDataManagement(!showDataManagement)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Data Management</h3>
            <svg
              className={`w-5 h-5 transition-transform ${showDataManagement ? 'rotate-180' : ''} ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDataManagement && (
            <div className="space-y-4">
              <div className={`p-4 border rounded-lg ${
                theme === "dark" 
                  ? "bg-red-900/20 border-red-800" 
                  : "bg-red-50 border-red-200"
              }`}>
                <p className={`text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-red-400" : "text-red-800"
                }`}>
                  ⚠️ Danger Zone
                </p>
                <p className={`text-sm ${
                  theme === "dark" ? "text-red-300" : "text-red-700"
                }`}>
                  These actions permanently delete data and cannot be undone. Use with caution.
                </p>
              </div>

              <div className="space-y-3">
                <div className={`p-4 border rounded-lg ${
                  theme === "dark" ? "border-gray-600" : "border-gray-200"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Clear All Articles</h4>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Permanently delete all articles, embeddings, and discovery runs from the database.
                        This will also clear all bookmarks.
                      </p>
                    </div>
                    <button
                      onClick={handleClearArticles}
                      className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Clear Articles
                    </button>
                  </div>
                </div>

                <div className={`p-4 border rounded-lg ${
                  theme === "dark" ? "border-gray-600" : "border-gray-200"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Clear Bookmarks</h4>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Delete all your saved bookmarks, notes, and custom tags.
                      </p>
                    </div>
                    <button
                      onClick={handleClearBookmarks}
                      className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Clear Bookmarks
                    </button>
                  </div>
                </div>

                <div className={`p-4 border rounded-lg ${
                  theme === "dark" ? "border-gray-600" : "border-gray-200"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Clear Daily Summaries</h4>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Delete all generated daily summaries.
                      </p>
                    </div>
                    <button
                      onClick={handleClearSummaries}
                      className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Clear Summaries
                    </button>
                  </div>
                </div>

                <div className={`p-4 border rounded-lg ${
                  theme === "dark" ? "border-gray-600" : "border-gray-200"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Clear Trend Analyses</h4>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Delete all generated trend analyses.
                      </p>
                    </div>
                    <button
                      onClick={handleClearTrends}
                      className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Clear Trends
                    </button>
                  </div>
                </div>

                <div className={`p-4 border rounded-lg ${
                  theme === "dark" ? "border-gray-600" : "border-gray-200"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Clear All Sources</h4>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Delete all data sources. Re-add sources before discovering articles.
                      </p>
                    </div>
                    <button
                      onClick={handleClearSources}
                      className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Clear Sources
                    </button>
                  </div>
                </div>

                <div className={`p-4 border rounded-lg ${
                  theme === "dark" ? "border-gray-600" : "border-gray-200"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Reset Discovery State</h4>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Clear discovery history and seen URLs. The next discovery run will re-discover all articles.
                      </p>
                    </div>
                    <button
                      onClick={handleResetDiscovery}
                      className="ml-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Reset Discovery
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModelSelector({
  label,
  description,
  value,
  onChange,
  options,
  disabled,
  theme,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (model: string) => void;
  options: Array<{ value: string; label: string; cost: string }>;
  disabled: boolean;
  theme: "light" | "dark";
}) {
  return (
    <div className={`p-4 border rounded-lg ${
      theme === "dark" ? "border-gray-600" : "border-gray-200"
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            {label}
          </h4>
          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            {description}
          </p>
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`mt-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          theme === "dark"
            ? "bg-gray-700 border-gray-600 text-white"
            : "bg-white border-gray-300 text-gray-900"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} - {option.cost}
          </option>
        ))}
      </select>
    </div>
  );
}

const MODEL_OPTIONS = [
  { value: "gpt-5-nano", label: "GPT-5 Nano", cost: "$0.05 in / $0.40 out per 1M" },
  { value: "gpt-4o", label: "GPT-4o", cost: "$2.50 in / $10.00 out per 1M" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", cost: "$10.00 in / $30.00 out per 1M" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", cost: "$0.15 in / $0.60 out per 1M" },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano", cost: "$0.20 in / $0.80 out per 1M" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", cost: "$0.80 in / $3.20 out per 1M" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", cost: "$0.50 in / $1.50 out per 1M" },
];
