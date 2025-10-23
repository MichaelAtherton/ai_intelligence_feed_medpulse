import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

export function AdminPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunningDiscovery, setIsRunningDiscovery] = useState(false);
  const [isRunningScraping, setIsRunningScraping] = useState(false);
  const [isRunningEmbeddings, setIsRunningEmbeddings] = useState(false);
  
  const triggerDiscovery = useAction(api.manualTriggers.triggerDiscovery);
  const triggerScraping = useAction(api.manualTriggers.triggerScraping);
  const triggerEmbeddings = useAction(api.manualTriggers.triggerEmbeddings);
  const fixArticlesWithoutStatus = useMutation(api.articles.fixArticlesWithoutStatus);
  const apiKeys = useQuery(api.apiKeys.getUserApiKeys);
  const articleStats = useQuery(api.articles.getArticleStats);
  const debugFeed = useQuery(api.articles.debugFeed);
  const settings = useQuery(api.userSettings.getUserSettings);
  
  const hasOpenAIKey = apiKeys?.some(k => k.provider === "openai" && k.isActive);
  const theme = settings?.theme || "light";

  const handleTriggerDiscovery = async () => {
    if (!hasOpenAIKey) {
      toast.error("Please add an OpenAI API key in Settings to run discovery");
      return;
    }
    
    setIsRunningDiscovery(true);
    try {
      await triggerDiscovery();
      toast.success("Discovery pipeline started! Check the status above.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to trigger discovery";
      if (errorMessage.includes("API key")) {
        toast.error("OpenAI API key issue. Please check your Settings.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsRunningDiscovery(false);
    }
  };

  const handleTriggerScraping = async () => {
    setIsRunningScraping(true);
    try {
      const result = await triggerScraping();
      toast.success(`Scraping complete: ${result.success} articles processed`);
    } catch (error) {
      toast.error("Failed to trigger scraping");
    } finally {
      setIsRunningScraping(false);
    }
  };

  const handleTriggerEmbeddings = async () => {
    setIsRunningEmbeddings(true);
    try {
      const result = await triggerEmbeddings();
      toast.success(`Embeddings generated: ${result.success} articles processed`);
    } catch (error) {
      toast.error("Failed to generate embeddings");
    } finally {
      setIsRunningEmbeddings(false);
    }
  };

  const handleFixArticles = async () => {
    try {
      const result = await fixArticlesWithoutStatus();
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to fix articles");
    }
  };

  return (
    <div className={`rounded-lg shadow-sm border p-6 ${
      theme === "dark" 
        ? "bg-gray-800 border-gray-700" 
        : "bg-white border-gray-200"
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Manual Triggers</h3>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''} ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="mt-4">
          <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Use these buttons to manually trigger the discovery and scraping pipelines for testing.
          </p>
          
          {!hasOpenAIKey && (
            <div className={`mb-4 p-3 border rounded-lg ${
              theme === "dark"
                ? "bg-amber-900/20 border-amber-800"
                : "bg-amber-50 border-amber-200"
            }`}>
              <p className={`text-sm ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`}>
                <strong>⚠ OpenAI API Key Required:</strong> Add your OpenAI API key in Settings to enable article discovery.
              </p>
            </div>
          )}
      
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleTriggerDiscovery}
          disabled={isRunningDiscovery || !hasOpenAIKey}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          title={!hasOpenAIKey ? "Add an OpenAI API key in Settings to enable" : ""}
        >
          {isRunningDiscovery ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Running...
            </span>
          ) : (
            "Run Discovery"
          )}
        </button>
        
        <button
          onClick={handleTriggerScraping}
          disabled={isRunningScraping}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isRunningScraping ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Running...
            </span>
          ) : (
            "Run Scraping & Analysis"
          )}
        </button>
        
        <button
          onClick={handleTriggerEmbeddings}
          disabled={isRunningEmbeddings}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isRunningEmbeddings ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Running...
            </span>
          ) : (
            "Generate Embeddings"
          )}
        </button>
      </div>
      
          <div className={`mt-4 p-3 border rounded-lg ${
            theme === "dark"
              ? "bg-yellow-900/20 border-yellow-800"
              : "bg-yellow-50 border-yellow-200"
          }`}>
            <p className={`text-sm ${theme === "dark" ? "text-yellow-400" : "text-yellow-800"}`}>
              <strong>Note:</strong> Discovery runs automatically every 12 hours. Scraping & analysis runs every hour for pending articles.
            </p>
          </div>
          
          {articleStats && (
            <div className={`mt-4 p-4 border rounded-lg ${
              theme === "dark"
                ? "bg-gray-700 border-gray-600"
                : "bg-gray-50 border-gray-200"
            }`}>
              <h4 className={`text-sm font-semibold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Article Database Status</h4>
              <div className="grid grid-cols-6 gap-3 text-center">
                <div>
                  <div className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{articleStats.total}</div>
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Total</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-yellow-600">{articleStats.pending}</div>
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Pending</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-blue-600">{articleStats.analyzing}</div>
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Analyzing</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">{articleStats.completed}</div>
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Completed</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-600">{articleStats.failed}</div>
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Failed</div>
                </div>
                <div>
                  <div className={`text-xl font-bold ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>{articleStats.noStatus}</div>
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>No Status</div>
                </div>
              </div>
              {articleStats.total === 0 && (
                <p className={`text-sm mt-3 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  No articles in database yet. Run discovery to find and analyze articles from your sources.
                </p>
              )}
              {articleStats.noStatus > 0 && (
                <div className={`mt-3 p-3 border rounded-lg ${
                  theme === "dark"
                    ? "bg-amber-900/20 border-amber-800"
                    : "bg-amber-50 border-amber-200"
                }`}>
                  <p className={`text-sm mb-2 ${theme === "dark" ? "text-amber-400" : "text-amber-800"}`}>
                    <strong>⚠ {articleStats.noStatus} articles without status:</strong> These won't be processed.
                  </p>
                  <button
                    onClick={handleFixArticles}
                    className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors text-sm font-medium"
                  >
                    Fix Articles
                  </button>
                </div>
              )}
              <p className={`text-xs mt-3 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                <strong>Note:</strong> "Total" shows articles in the database. Discovery may find articles that are already seen and won't be added again.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
