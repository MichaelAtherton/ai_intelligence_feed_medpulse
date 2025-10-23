import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { ArticleCard } from "./ArticleCard";
import { toast } from "sonner";

export function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [userTag, setUserTag] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const [semanticResults, setSemanticResults] = useState<any[] | null>(null);
  const [isLoadingSemanticSearch, setIsLoadingSemanticSearch] = useState(false);

  const sources = useQuery(api.sources.getSourceStats);
  const userTags = useQuery(api.articles.getUserTags);
  const settings = useQuery(api.userSettings.getUserSettings);
  const embeddingStats = useQuery(api.semanticSearch.getEmbeddingStats);
  const toggleBookmark = useMutation(api.articles.toggleBookmark);
  
  const theme = settings?.theme || "light";
  const updateBookmark = useMutation(api.articles.updateBookmark);
  const deleteArticle = useMutation(api.articles.deleteArticle);
  const semanticSearch = useAction(api.semanticSearch.semanticSearch);

  const articles = useQuery(
    api.articles.searchArticles,
    isSearching && (searchTerm.trim() || sourceName || userTag || startDate || endDate)
      ? {
          searchTerm: searchTerm.trim() || "*",
          sourceName: sourceName || undefined,
          userTag: userTag || undefined,
          startDate: startDate ? new Date(startDate).getTime() : undefined,
          endDate: endDate ? new Date(endDate).getTime() : undefined,
        }
      : "skip"
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useSemanticSearch && searchTerm.trim()) {
      setIsLoadingSemanticSearch(true);
      setIsSearching(false);
      try {
        const results = await semanticSearch({ query: searchTerm, limit: 20 });
        setSemanticResults(results);
      } catch (error) {
        toast.error("Semantic search failed. Make sure articles have embeddings generated.");
        setSemanticResults(null);
      } finally {
        setIsLoadingSemanticSearch(false);
      }
    } else if (searchTerm.trim() || sourceName || userTag || startDate || endDate) {
      setSemanticResults(null);
      setIsSearching(true);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSourceName("");
    setUserTag("");
    setStartDate("");
    setEndDate("");
    setIsSearching(false);
    setSemanticResults(null);
    setUseSemanticSearch(false);
  };

  const handleUpdateBookmark = async (articleId: string, notes: string | undefined, tags: string[]) => {
    try {
      await updateBookmark({
        articleId: articleId as any,
        notes,
        userTags: tags,
      });
      toast.success("Notes and tags saved");
    } catch (error) {
      toast.error("Failed to save notes");
    }
  };

  const handleDeleteArticle = async (articleId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await deleteArticle({ articleId: articleId as any });
      toast.success("Article deleted");
      // Refresh semantic search results if they exist
      if (semanticResults) {
        setSemanticResults(semanticResults.filter(a => a._id !== articleId));
      }
    } catch (error) {
      toast.error("Failed to delete article");
    }
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-lg shadow-sm border p-6 ${
        theme === "dark" 
          ? "bg-gray-800 border-gray-700" 
          : "bg-white border-gray-200"
      }`}>
        <h2 className={`text-2xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Search Articles</h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Search term
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search articles..."
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Source
              </label>
              <select
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="">All sources</option>
                {sources?.map((source) => (
                  <option key={source._id} value={source.name}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Your Tag
              </label>
              <select
                value={userTag}
                onChange={(e) => setUserTag(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="">All tags</option>
                {userTags?.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useSemanticSearch}
                onChange={(e) => setUseSemanticSearch(e.target.checked)}
                disabled={!searchTerm.trim()}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Use AI Semantic Search <span className="text-xs text-gray-500">(finds similar meaning)</span>
              </span>
            </label>
            {embeddingStats && (
              <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                {embeddingStats.totalEmbeddings} articles with embeddings
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!searchTerm.trim() && !sourceName && !userTag && !startDate && !endDate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {useSemanticSearch && searchTerm.trim() ? "AI Search" : "Search"}
            </button>
            {(isSearching || semanticResults || isLoadingSemanticSearch) && (
              <button
                type="button"
                onClick={clearSearch}
                className={`px-6 py-2 border rounded-lg transition-colors font-medium ${
                  theme === "dark"
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Semantic Search Results */}
      {(semanticResults || isLoadingSemanticSearch) && (
        <div className="space-y-4">
          {isLoadingSemanticSearch ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                  Searching with AI...
                </p>
              </div>
            </div>
          ) : semanticResults && semanticResults.length === 0 ? (
            <div className="text-center py-20">
              <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                No similar articles found. Try a different search term.
              </p>
            </div>
          ) : semanticResults && (
            <>
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  AI Semantic Search Results
                </h3>
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  {semanticResults.length} articles
                </p>
              </div>
              <div className="space-y-4">
                {semanticResults.map((article) => (
                  <ArticleCard
                    key={article._id}
                    article={article}
                    onToggleBookmark={() => toggleBookmark({ articleId: article._id })}
                    onUpdateBookmark={(notes, tags) => handleUpdateBookmark(article._id, notes, tags)}
                    onDelete={() => handleDeleteArticle(article._id, article.title)}
                    theme={theme}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Regular Search Results */}
      {isSearching && !semanticResults && !isLoadingSemanticSearch && (
        <div className="space-y-4">
          {articles === undefined ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>No articles found matching your search.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Search Results</h3>
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{articles.length} articles</p>
              </div>
              <div className="space-y-4">
                {articles.map((article) => (
                  <ArticleCard
                    key={article._id}
                    article={article}
                    onToggleBookmark={() => toggleBookmark({ articleId: article._id })}
                    onUpdateBookmark={(notes, tags) => handleUpdateBookmark(article._id, notes, tags)}
                    onDelete={() => handleDeleteArticle(article._id, article.title)}
                    theme={theme}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
