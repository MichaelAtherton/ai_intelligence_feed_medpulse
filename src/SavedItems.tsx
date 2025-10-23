import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { ArticleCard } from "./ArticleCard";
import { toast } from "sonner";

export function SavedItems() {
  const articles = useQuery(api.articles.getBookmarked);
  const settings = useQuery(api.userSettings.getUserSettings);
  const theme = settings?.theme || "light";
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        <h3 className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>No saved articles</h3>
        <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
          Bookmark articles from your feed to save them for later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Saved Articles</h2>
        <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{articles.length} saved</p>
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
