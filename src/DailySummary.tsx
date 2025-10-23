import { useState } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface Article {
  _id: string;
  title: string;
  sourceName: string;
  articleUrl: string;
  publishedAt: number;
  summary: string;
  tags: string[];
}

interface Theme {
  title: string;
  description: string;
  articleIds: string[];
  articles: Article[];
  articleSummaries: Array<{
    articleId: string;
    oneLiner: string;
  }>;
}

interface Summary {
  _id: string;
  date: string;
  themes: Theme[];
  totalArticles: number;
  generatedAt: number;
}

export function DailySummary({ onBack }: { onBack: () => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedThemes, setExpandedThemes] = useState<Set<number>>(new Set([0]));
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "2w" | "1m" | "6m" | "1y">("24h");
  
  const settings = useQuery(api.userSettings.getUserSettings);
  const theme = settings?.theme || "light";
  const existingSummary = useQuery(api.dailySummary.getTodaysSummary);
  const generateSummary = useAction(api.dailySummary.generateDailySummary);
  const deleteSummary = useMutation(api.dailySummary.deleteSummary);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateSummary({ timeRange });
      toast.success("Summary generated!");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      
      if (msg.includes("No articles found")) {
        toast.error("No articles found in this time range. Try a longer time period or add more sources.");
      } else if (msg.includes("API key")) {
        toast.error("AI service error. Please check your API key settings.");
      } else {
        toast.error("Unable to generate summary. Please try again later.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSummary) return;
    
    if (!confirm("Are you sure you want to delete this summary?\n\nThis action cannot be undone.")) {
      return;
    }

    try {
      await deleteSummary({ summaryId: existingSummary._id as any });
      toast.success("Summary deleted");
    } catch (error) {
      toast.error("Failed to delete summary");
    }
  };

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case "24h": return "24 Hours";
      case "7d": return "7 Days";
      case "2w": return "2 Weeks";
      case "1m": return "1 Month";
      case "6m": return "6 Months";
      case "1y": return "1 Year";
      default: return "24 Hours";
    }
  };

  const toggleTheme = (index: number) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedThemes(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (existingSummary === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!existingSummary) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 transition-colors ${
              theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Feed
          </button>
        </div>

        <div className={`rounded-lg shadow-sm border p-8 ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <div className="max-w-2xl mx-auto">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-blue-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h2 className={`text-2xl font-bold mb-2 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                Generate Your Summary
              </h2>
              <p className={`mb-6 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}>
                Get a one-page overview of AI healthcare updates, organized into themes with one-liner summaries.
              </p>
            </div>
            
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                {(["24h", "7d", "2w", "1m", "6m", "1y"] as const).map((range) => (
                  <option key={range} value={range}>
                    {getTimeRangeLabel(range)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="text-center">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Summary
                  </>
                )}
              </button>
              {isGenerating && (
                <p className={`text-sm mt-4 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  This may take 10-20 seconds...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = existingSummary as Summary;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className={`flex items-center gap-2 transition-colors ${
            theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Feed
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`text-sm transition-colors disabled:opacity-50 ${
            theme === "dark" ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
          }`}
        >
          Regenerate
        </button>
      </div>

      <div className={`rounded-lg shadow-sm border p-8 relative group ${
        theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <button
          onClick={handleDelete}
          className={`absolute top-4 right-4 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
            theme === "dark" 
              ? "hover:bg-red-900/20 text-red-400 hover:text-red-300" 
              : "hover:bg-red-50 text-red-600 hover:text-red-700"
          }`}
          aria-label="Delete summary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}>Summary</h1>
          <div className={`flex items-center gap-4 text-sm ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}>
            <span>{formatDate(summary.date)}</span>
            <span>•</span>
            <span>{summary.totalArticles} articles</span>
            <span>•</span>
            <span>{summary.themes.length} themes</span>
          </div>
        </div>

        <div className="space-y-6">
          {summary.themes.map((summaryTheme, themeIndex) => (
            <div
              key={themeIndex}
              className={`border rounded-lg overflow-hidden ${
                theme === "dark" ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <button
                onClick={() => toggleTheme(themeIndex)}
                className={`w-full px-6 py-4 transition-colors text-left flex items-center justify-between ${
                  theme === "dark" ? "bg-gray-900 hover:bg-gray-850" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-1 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    {summaryTheme.title}
                  </h3>
                  <p className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>{summaryTheme.description}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    theme === "dark" ? "text-gray-400 bg-gray-800" : "text-gray-500 bg-white"
                  }`}>
                    {summaryTheme.articles.length} articles
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedThemes.has(themeIndex) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedThemes.has(themeIndex) && (
                <div className="px-6 py-4 space-y-4">
                  {summaryTheme.articleSummaries.map((articleSummary, idx) => {
                    const article = summaryTheme.articles.find(
                      (a) => a._id === articleSummary.articleId
                    );
                    if (!article) return null;

                    return (
                      <div
                        key={idx}
                        className={`border-l-4 border-blue-500 pl-4 py-2 transition-colors ${
                          theme === "dark" ? "hover:bg-gray-900" : "hover:bg-gray-50"
                        }`}
                      >
                        <p className={`font-medium mb-2 ${
                          theme === "dark" ? "text-white" : "text-gray-900"
                        }`}>
                          {articleSummary.oneLiner}
                        </p>
                        <div className={`flex items-center gap-3 text-sm ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}>
                          <a
                            href={article.articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`font-medium flex items-center gap-1 ${
                              theme === "dark" ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                            }`}
                          >
                            Read full article
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <span>•</span>
                          <span>{article.sourceName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={`mt-8 pt-6 border-t ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        }`}>
          <p className={`text-sm text-center ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>
            Summary generated {new Date(summary.generatedAt).toLocaleTimeString()} • 
            Covers articles matching your interests
          </p>
        </div>
      </div>
    </div>
  );
}
