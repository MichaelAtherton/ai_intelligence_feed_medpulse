import { Id } from "../convex/_generated/dataModel";
import { useState } from "react";

interface Article {
  _id: Id<"articles">;
  title: string;
  sourceName: string;
  articleUrl: string;
  summary: string;
  tags: string[];
  publishedAt: number;
  isBookmarked: boolean;
  bookmarkNotes?: string;
  bookmarkTags?: string[];
  industry?: string;
  department?: string;
  aiTechnology?: string[];
  businessImpact?: string;
  keyInsights?: string[];
}

interface ArticleCardProps {
  article: Article;
  onToggleBookmark: () => void;
  onUpdateBookmark?: (notes: string | undefined, tags: string[]) => void;
  onDelete?: () => void;
  theme?: "light" | "dark";
}

export function ArticleCard({ article, onToggleBookmark, onUpdateBookmark, onDelete, theme = "light" }: ArticleCardProps) {
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState(article.bookmarkNotes ?? "");
  const [tagInput, setTagInput] = useState("");
  const [userTags, setUserTags] = useState<string[]>(article.bookmarkTags ?? []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleSaveNotes = () => {
    if (onUpdateBookmark) {
      onUpdateBookmark(notes.trim() || undefined, userTags);
    }
    setShowNotesModal(false);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !userTags.includes(trimmedTag)) {
      setUserTags([...userTags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setUserTags(userTags.filter(tag => tag !== tagToRemove));
  };

  const handleOpenNotes = () => {
    if (!article.isBookmarked) {
      onToggleBookmark();
    }
    setShowNotesModal(true);
  };

  return (
    <>
      <article className={`rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow ${
        theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-medium ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>{article.sourceName}</span>
              <span className="text-sm text-gray-400">•</span>
              <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{formatDate(article.publishedAt)}</span>
            </div>

            <h3 className={`text-xl font-semibold mb-3 leading-tight ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              {article.title}
            </h3>

            <p className={`mb-4 leading-relaxed ${
              theme === "dark" ? "text-gray-300" : "text-gray-700"
            }`}>{article.summary}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-block px-3 py-1 rounded-full text-sm ${
                    theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {tag}
                </span>
              ))}
              {(article.bookmarkTags ?? []).map((tag) => (
                <span
                  key={tag}
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>

            {article.bookmarkNotes && (
              <div className={`mb-4 p-3 rounded-lg ${
                theme === "dark" 
                  ? "bg-yellow-900/20 border border-yellow-700" 
                  : "bg-yellow-50 border border-yellow-200"
              }`}>
                <p className={`text-sm italic ${
                  theme === "dark" ? "text-yellow-200" : "text-gray-700"
                }`}>{article.bookmarkNotes}</p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex gap-4">
              <a
                href={article.articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center font-medium text-sm ${
                  theme === "dark" ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                }`}
              >
                Read more
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
              <button
                onClick={handleOpenNotes}
                className={`inline-flex items-center font-medium text-sm ${
                  theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                {article.bookmarkNotes ? "Edit notes" : "Add notes"}
              </button>
              </div>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                  aria-label="Delete article"
                >
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <button
              onClick={onToggleBookmark}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            aria-label={article.isBookmarked ? "Remove bookmark" : "Bookmark article"}
          >
            <svg
              className={`w-6 h-6 ${
                article.isBookmarked ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
              }`}
              fill={article.isBookmarked ? "currentColor" : "none"}
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
          </button>
        </div>
      </article>

      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
            theme === "dark" ? "bg-gray-800" : "bg-white"
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-xl font-bold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>Add Notes & Tags</h3>
                <button
                  onClick={() => setShowNotesModal(false)}
                  className={`${
                    theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <h4 className={`text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>{article.title}</h4>
                <p className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>{article.sourceName}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Your Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add your thoughts, key takeaways, or reminders..."
                    rows={4}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Your Tags
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                      placeholder="Add a tag (e.g., Priority, Follow-up)"
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === "dark" 
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {userTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {userTags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                            theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
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

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${
                    theme === "dark" 
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
