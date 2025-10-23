import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function EmbeddingTest() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const stats = useQuery(api.articles.getArticleStats);
  const embeddingStats = useQuery(api.semanticSearch.getEmbeddingStats);
  const settings = useQuery(api.userSettings.getUserSettings);
  const triggerEmbeddings = useAction(api.manualTriggers.triggerEmbeddings);
  const semanticSearch = useAction(api.semanticSearch.semanticSearch);
  
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const theme = settings?.theme || "light";

  const handleGenerateEmbeddings = async () => {
    setIsGenerating(true);
    try {
      const result = await triggerEmbeddings();
      toast.success(`Generated ${result.success} embeddings (${result.failed} failed)`);
    } catch (error) {
      toast.error("Failed to generate embeddings: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    try {
      const results = await semanticSearch({ query: searchQuery, limit: 10 });
      setSearchResults(results);
      toast.success(`Found ${results.length} results`);
    } catch (error) {
      toast.error("Search failed: " + (error as Error).message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-lg shadow-sm border p-6 ${
        theme === "dark" 
          ? "bg-gray-800 border-gray-700" 
          : "bg-white border-gray-200"
      }`}>
        <h2 className={`text-2xl font-bold mb-6 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Embedding Test Interface
        </h2>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`rounded-lg p-4 ${
            theme === "dark" ? "bg-blue-900/30" : "bg-blue-50"
          }`}>
            <div className={`text-sm font-medium ${
              theme === "dark" ? "text-blue-400" : "text-blue-600"
            }`}>Total Articles</div>
            <div className={`text-2xl font-bold ${
              theme === "dark" ? "text-blue-300" : "text-blue-900"
            }`}>
              {stats?.total ?? 0}
            </div>
          </div>
          <div className={`rounded-lg p-4 ${
            theme === "dark" ? "bg-green-900/30" : "bg-green-50"
          }`}>
            <div className={`text-sm font-medium ${
              theme === "dark" ? "text-green-400" : "text-green-600"
            }`}>With Embeddings</div>
            <div className={`text-2xl font-bold ${
              theme === "dark" ? "text-green-300" : "text-green-900"
            }`}>
              {embeddingStats?.totalEmbeddings ?? 0}
            </div>
          </div>
          <div className={`rounded-lg p-4 ${
            theme === "dark" ? "bg-orange-900/30" : "bg-orange-50"
          }`}>
            <div className={`text-sm font-medium ${
              theme === "dark" ? "text-orange-400" : "text-orange-600"
            }`}>Completed Articles</div>
            <div className={`text-2xl font-bold ${
              theme === "dark" ? "text-orange-300" : "text-orange-900"
            }`}>
              {stats?.completed ?? 0}
            </div>
          </div>
        </div>

        {/* Generate Embeddings */}
        <div className={`mb-6 p-4 rounded-lg ${
          theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
        }`}>
          <h3 className={`font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Generate Embeddings
          </h3>
          <p className={`text-sm mb-3 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Generate embeddings for completed articles that don't have them yet.
          </p>
          <button
            onClick={handleGenerateEmbeddings}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </span>
            ) : (
              "Generate Embeddings"
            )}
          </button>
        </div>

        {/* Semantic Search */}
        <div className={`p-4 rounded-lg ${
          theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
        }`}>
          <h3 className={`font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Test Semantic Search
          </h3>
          <p className={`text-sm mb-3 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Search for articles using natural language queries. The search uses embeddings to find semantically similar content.
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g., 'AI for cancer detection' or 'machine learning in radiology'"
              className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Searching...
                </span>
              ) : (
                "Search"
              )}
            </button>
          </div>

          {/* Example Queries */}
          <div className="mb-4">
            <p className={`text-xs mb-2 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
              Try these example queries:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "AI for cancer detection",
                "machine learning in radiology",
                "natural language processing for medical records",
                "computer vision for diagnostics",
                "AI-powered drug discovery"
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setSearchQuery(example)}
                  className={`text-xs px-3 py-1 border rounded-full transition-colors ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results */}
          {searchResults !== null && (
            <div className="mt-4">
              <h4 className={`font-semibold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Search Results ({searchResults.length})
              </h4>
              {searchResults.length === 0 ? (
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  No results found. Try generating embeddings first.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <div
                      key={result._id}
                      className={`p-4 border rounded-lg transition-shadow ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 hover:shadow-lg"
                          : "bg-white border-gray-200 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold ${
                              theme === "dark" ? "text-blue-400" : "text-blue-600"
                            }`}>
                              #{idx + 1}
                            </span>
                            <span className={`text-xs ${
                              theme === "dark" ? "text-gray-500" : "text-gray-500"
                            }`}>
                              Score: {result.score?.toFixed(4) ?? "N/A"}
                            </span>
                          </div>
                          <h5 className={`font-semibold text-sm mb-1 ${
                            theme === "dark" ? "text-white" : "text-gray-900"
                          }`}>
                            {result.title}
                          </h5>
                          <p className={`text-xs mb-2 line-clamp-2 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}>
                            {result.summary}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {result.tags?.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className={`text-xs px-2 py-0.5 rounded ${
                                  theme === "dark"
                                    ? "bg-blue-900/50 text-blue-300"
                                    : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <a
                          href={result.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs ${
                            theme === "dark"
                              ? "text-blue-400 hover:text-blue-300"
                              : "text-blue-600 hover:text-blue-800"
                          }`}
                        >
                          View →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Debug Info */}
      {embeddingStats && (
        <div className={`rounded-lg shadow-sm border p-6 ${
          theme === "dark" 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-200"
        }`}>
          <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Embedding Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Model:</span>
              <span className={`font-mono ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                {embeddingStats.model}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Dimensions:</span>
              <span className={`font-mono ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                {embeddingStats.dimensions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Total Embeddings:</span>
              <span className={`font-mono ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                {embeddingStats.totalEmbeddings}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
