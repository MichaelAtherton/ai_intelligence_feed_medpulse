import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { ArticleCard } from "./ArticleCard";
import { toast } from "sonner";

export function Feed({ 
  onNavigateToSummary,
  onNavigateToTrends 
}: { 
  onNavigateToSummary: () => void;
  onNavigateToTrends: () => void;
}) {
  const articles = useQuery(api.articles.getFeed, { limit: 100 });
  const debugInfo = useQuery(api.articles.debugFeed);
  const settings = useQuery(api.userSettings.getUserSettings);
  const theme = settings?.theme || "light";
  
  console.log("Feed Debug:", debugInfo);
  console.log("Articles:", articles);
  const toggleBookmark = useMutation(api.articles.toggleBookmark);
  const updateBookmark = useMutation(api.articles.updateBookmark);
  const deleteArticle = useMutation(api.articles.deleteArticle);

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
    } catch (error) {
      toast.error("Failed to delete article");
    }
  };

  if (articles === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Loading your personalized feed...</p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-20">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
        <h3 className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>No new articles</h3>
        <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
          Check back soon for new articles matching your interests.
        </p>
        <p className={`text-sm mt-2 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
          Articles are updated twice daily from all configured sources.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Your Feed</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateToSummary}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Summary
          </button>
          <button
            onClick={onNavigateToTrends}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Trend Analysis
          </button>
          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{articles.length} articles</p>
        </div>
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
    </div>
  );
}
