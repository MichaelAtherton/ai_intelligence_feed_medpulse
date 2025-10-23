import { useState } from "react";
import { useQuery, useAction } from "convex/react";
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

interface InflectionPoint {
  articleId: string;
  reason: string;
}

interface Trend {
  title: string;
  description: string;
  projection: string;
  confidence: "high" | "medium" | "low";
  supportingArticleIds: string[];
  supportingArticles: Article[];
  keyDevelopments: string[];
  inflectionPoints: InflectionPoint[];
}

interface TrendAnalysisData {
  _id: string;
  trends: Trend[];
  analysisStartDate: number;
  analysisEndDate: number;
  totalArticlesAnalyzed: number;
  generatedAt: number;
}

export function TrendAnalysis({ onBack }: { onBack: () => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedTrends, setExpandedTrends] = useState<Set<number>>(new Set([0]));
  
  const settings = useQuery(api.userSettings.getUserSettings);
  const theme = settings?.theme || "light";
  const existingAnalysis = useQuery(api.trendAnalysis.getLatestTrendAnalysis);
  const generateAnalysis = useAction(api.trendAnalysis.generateTrendAnalysis);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateAnalysis();
      toast.success("Trend analysis generated!");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      
      if (msg.includes("minimum 5 required") || msg.includes("Not enough articles")) {
        toast.error("You need at least 5 articles from the past 3 weeks. Try adding more sources or wait for discovery.");
      } else if (msg.includes("No articles found")) {
        toast.error("No articles found. Please add sources and wait for discovery.");
      } else if (msg.includes("API key")) {
        toast.error("AI service error. Please check your API key settings.");
      } else {
        toast.error("Unable to generate analysis. Please try again later.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTrend = (index: number) => {
    const newExpanded = new Set(expandedTrends);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTrends(newExpanded);
  };

  const formatDateRange = (startDate: number, endDate: number) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const getConfidenceBadge = (confidence: string) => {
    if (theme === "dark") {
      const colors = {
        high: "bg-green-900/30 text-green-400",
        medium: "bg-yellow-900/30 text-yellow-400",
        low: "bg-gray-700 text-gray-400",
      };
      return colors[confidence as keyof typeof colors] || colors.low;
    }
    const colors = {
      high: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-gray-100 text-gray-800",
    };
    return colors[confidence as keyof typeof colors] || colors.low;
  };

  if (existingAnalysis === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!existingAnalysis) {
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

        <div className={`rounded-lg shadow-sm border p-8 text-center ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <div className="max-w-2xl mx-auto">
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
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <h2 className={`text-2xl font-bold mb-2 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              Analyze Technology Trends
            </h2>
            <p className={`mb-6 ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}>
              Discover directional patterns in AI technology based on recent developments. This analysis identifies "stepping stones" and projects where capabilities are likely heading—helping you think strategically about the future.
            </p>
            <div className={`border rounded-lg p-4 mb-6 text-left ${
              theme === "dark" ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"
            }`}>
              <h3 className={`font-semibold mb-2 ${
                theme === "dark" ? "text-blue-300" : "text-blue-900"
              }`}>What You'll Get:</h3>
              <ul className={`text-sm space-y-1 ${
                theme === "dark" ? "text-blue-400" : "text-blue-800"
              }`}>
                <li>• 3-5 major directional trends in AI technology</li>
                <li>• Analysis of articles from the past 3 weeks</li>
                <li>• Key developments and inflection points</li>
                <li>• Supporting evidence from your personalized feed</li>
                <li>• Projections of likely future directions</li>
              </ul>
            </div>
            <div className={`border rounded-lg p-4 mb-6 text-left ${
              theme === "dark" ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"
            }`}>
              <h3 className={`font-semibold mb-2 ${
                theme === "dark" ? "text-yellow-300" : "text-yellow-900"
              }`}>Important Note:</h3>
              <p className={`text-sm ${
                theme === "dark" ? "text-yellow-400" : "text-yellow-800"
              }`}>
                This analysis focuses on <strong>technology capability trends</strong> (AI models, tools, platforms). It does not predict medical research outcomes, clinical efficacy, or specific product launches. Projections indicate likely directions based on recent patterns, not guaranteed predictions.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Analyzing Trends...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Generate Trend Analysis
                </>
              )}
            </button>
            {isGenerating && (
              <p className={`text-sm mt-4 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}>
                This may take 20-30 seconds...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const analysis = existingAnalysis as TrendAnalysisData;

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

      <div className={`rounded-lg shadow-sm border p-8 ${
        theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}>AI Technology Trends</h1>
          <div className={`flex items-center gap-4 text-sm ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}>
            <span>{formatDateRange(analysis.analysisStartDate, analysis.analysisEndDate)}</span>
            <span>•</span>
            <span>{analysis.totalArticlesAnalyzed} articles analyzed</span>
            <span>•</span>
            <span>{analysis.trends.length} trends identified</span>
          </div>
        </div>

        <div className={`border rounded-lg p-4 mb-8 ${
          theme === "dark" ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"
        }`}>
          <p className={`text-sm ${
            theme === "dark" ? "text-yellow-400" : "text-yellow-800"
          }`}>
            <strong>Note:</strong> These are directional projections based on recent technology developments, not predictions. Focus is on AI capability trends, not medical outcomes or clinical efficacy.
          </p>
        </div>

        <div className="space-y-6">
          {analysis.trends.map((trend, trendIndex) => (
            <div
              key={trendIndex}
              className={`border rounded-lg overflow-hidden ${
                theme === "dark" ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <button
                onClick={() => toggleTrend(trendIndex)}
                className={`w-full px-6 py-4 transition-colors text-left flex items-center justify-between ${
                  theme === "dark" ? "bg-gray-900 hover:bg-gray-850" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-lg font-semibold ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>
                      {trend.title}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceBadge(trend.confidence)}`}>
                      {trend.confidence} confidence
                    </span>
                  </div>
                  <p className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>{trend.description}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    theme === "dark" ? "text-gray-400 bg-gray-800" : "text-gray-500 bg-gray-100"
                  }`}>
                    {trend.supportingArticles.length} articles
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedTrends.has(trendIndex) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedTrends.has(trendIndex) && (
                <div className="px-6 py-4 space-y-6">
                  {/* Projection */}
                  <div className={`border rounded-lg p-4 ${
                    theme === "dark" ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"
                  }`}>
                    <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                      theme === "dark" ? "text-blue-300" : "text-blue-900"
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Likely Direction
                    </h4>
                    <p className={`text-sm ${
                      theme === "dark" ? "text-blue-400" : "text-blue-800"
                    }`}>{trend.projection}</p>
                  </div>

                  {/* Key Developments */}
                  <div>
                    <h4 className={`font-semibold mb-3 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>Key Developments</h4>
                    <ul className="space-y-2">
                      {trend.keyDevelopments.map((dev, idx) => (
                        <li key={idx} className={`flex items-start gap-2 text-sm ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>
                          <span className={theme === "dark" ? "text-blue-400 mt-1" : "text-blue-600 mt-1"}>•</span>
                          <span>{dev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Inflection Points */}
                  {trend.inflectionPoints.length > 0 && (
                    <div>
                      <h4 className={`font-semibold mb-3 ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}>Potential Inflection Points</h4>
                      <div className="space-y-3">
                        {trend.inflectionPoints.map((ip, idx) => {
                          const article = trend.supportingArticles.find(a => a._id === ip.articleId);
                          if (!article) return null;

                          return (
                            <div key={idx} className={`border rounded-lg p-3 ${
                              theme === "dark" ? "bg-orange-900/20 border-orange-800" : "bg-orange-50 border-orange-200"
                            }`}>
                              <p className={`text-sm font-medium mb-1 ${
                                theme === "dark" ? "text-orange-300" : "text-orange-900"
                              }`}>{article.title}</p>
                              <p className={`text-sm mb-2 ${
                                theme === "dark" ? "text-orange-400" : "text-orange-800"
                              }`}>{ip.reason}</p>
                              <a
                                href={article.articleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-sm font-medium flex items-center gap-1 ${
                                  theme === "dark" ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"
                                }`}
                              >
                                Read article
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Supporting Articles */}
                  <div>
                    <h4 className={`font-semibold mb-3 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>Supporting Evidence</h4>
                    <div className="space-y-2">
                      {trend.supportingArticles.map((article, idx) => (
                        <div
                          key={idx}
                          className={`border-l-4 border-blue-500 pl-4 py-2 transition-colors ${
                            theme === "dark" ? "hover:bg-gray-900" : "hover:bg-gray-50"
                          }`}
                        >
                          <p className={`text-sm font-medium mb-1 ${
                            theme === "dark" ? "text-white" : "text-gray-900"
                          }`}>{article.title}</p>
                          <div className={`flex items-center gap-3 text-xs ${
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
                              Read article
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            <span>•</span>
                            <span>{article.sourceName}</span>
                            <span>•</span>
                            <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
            Analysis generated {new Date(analysis.generatedAt).toLocaleString()} • 
            Based on your personalized feed from the past 3 weeks
          </p>
        </div>
      </div>
    </div>
  );
}
