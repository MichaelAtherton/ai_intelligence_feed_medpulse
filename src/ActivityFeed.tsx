import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState } from "react";

interface ActivityFeedProps {
  runId: Id<"discoveryRuns">;
  debugMode?: boolean;
  theme?: "light" | "dark";
}

export function ActivityFeed({ runId, debugMode = false, theme = "light" }: ActivityFeedProps) {
  const events = useQuery(api.activityFeed.getActivityFeed, { runId });
  const exportData = useQuery(api.activityFeed.exportActivityFeed, { runId });
  const [autoScroll, setAutoScroll] = useState(true);

  const handleExport = () => {
    if (!exportData) return;
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${runId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!events) {
    return (
      <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  const filteredEvents = debugMode 
    ? events 
    : events.filter(e => e.eventType !== "llm_call");

  return (
    <div className={`rounded-lg border ${
      theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
    }`}>
      {/* Header */}
      <div className={`p-4 border-b flex justify-between items-center ${
        theme === "dark" ? "border-gray-700" : "border-gray-200"
      }`}>
        <div className="flex items-center gap-3">
          <h3 className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Live Activity Feed
          </h3>
          <span className={`text-xs px-2 py-1 rounded ${
            theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-700"
          }`}>
            {filteredEvents.length} events
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span className={theme === "dark" ? "text-gray-300" : "text-gray-600"}>
              Auto-scroll
            </span>
          </label>
          
          <button
            onClick={handleExport}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              theme === "dark"
                ? "bg-blue-900 text-blue-200 hover:bg-blue-800"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="max-h-[600px] overflow-y-auto p-4 space-y-2">
        {filteredEvents.length === 0 ? (
          <div className={`text-center py-8 ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>
            No activity yet. Waiting for events...
          </div>
        ) : (
          filteredEvents.map((event, idx) => (
            <ActivityEvent 
              key={event._id} 
              event={event} 
              debugMode={debugMode}
              theme={theme}
              isLast={idx === filteredEvents.length - 1 && autoScroll}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ActivityEventProps {
  event: any;
  debugMode: boolean;
  theme: "light" | "dark";
  isLast: boolean;
}

function ActivityEvent({ event, debugMode, theme, isLast }: ActivityEventProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-scroll to last element
  if (isLast) {
    setTimeout(() => {
      const element = document.getElementById(`event-${event._id}`);
      element?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  }

  const getEventIcon = () => {
    switch (event.eventType) {
      case "stage_start":
        return "🚀";
      case "stage_progress":
        return "⚙️";
      case "stage_complete":
        return "✅";
      case "article_progress":
        return "📄";
      case "llm_call":
        return "🤖";
      case "error":
        return "❌";
      default:
        return "•";
    }
  };

  const getEventColor = () => {
    switch (event.eventType) {
      case "stage_start":
        return theme === "dark" ? "text-blue-400" : "text-blue-600";
      case "stage_complete":
        return theme === "dark" ? "text-green-400" : "text-green-600";
      case "error":
        return theme === "dark" ? "text-red-400" : "text-red-600";
      case "llm_call":
        return theme === "dark" ? "text-purple-400" : "text-purple-600";
      default:
        return theme === "dark" ? "text-gray-400" : "text-gray-600";
    }
  };

  const timestamp = new Date(event.timestamp).toLocaleTimeString();

  return (
    <div
      id={`event-${event._id}`}
      className={`p-3 rounded border ${
        theme === "dark" 
          ? "bg-gray-900 border-gray-700" 
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{getEventIcon()}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono ${
              theme === "dark" ? "text-gray-500" : "text-gray-400"
            }`}>
              {timestamp}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              theme === "dark" ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-700"
            }`}>
              {event.stage}
            </span>
          </div>
          
          <p className={`text-sm ${getEventColor()}`}>
            {event.message}
          </p>

          {/* Sources Details */}
          {event.metadata?.sources && event.metadata.sources.length > 0 && (
            <details className={`mt-2 p-2 rounded text-xs ${
              theme === "dark" ? "bg-gray-950 text-gray-300" : "bg-gray-100 text-gray-700"
            }`}>
              <summary className="cursor-pointer font-semibold">
                Sources ({event.metadata.sources.length})
              </summary>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                {event.metadata.sources.map((source: any, idx: number) => (
                  <li key={idx}>
                    <strong>{source.name}:</strong> <span className="text-blue-500">{source.url}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          
          {/* Topics Details */}
          {event.metadata?.topics && event.metadata.topics.length > 0 && (
            <div className={`mt-2 p-2 rounded text-xs ${
              theme === "dark" ? "bg-gray-950 text-gray-300" : "bg-gray-100 text-gray-700"
            }`}>
              <strong>Topics ({event.metadata.topics.length}):</strong>
              <div className="mt-1 flex flex-wrap gap-1">
                {event.metadata.topics.map((topic: string, idx: number) => (
                  <span key={idx} className={`px-2 py-0.5 rounded ${
                    theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-700"
                  }`}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Article Progress */}
          {event.metadata?.currentItem && event.metadata?.totalItems && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                  Progress: {event.metadata.currentItem} / {event.metadata.totalItems}
                  {event.metadata.sourceName && ` - ${event.metadata.sourceName}`}
                </span>
                <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                  {Math.round((event.metadata.currentItem / event.metadata.totalItems) * 100)}%
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${
                theme === "dark" ? "bg-gray-700" : "bg-gray-200"
              }`}>
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{
                    width: `${(event.metadata.currentItem / event.metadata.totalItems) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Article Details */}
          {event.metadata?.articleTitle && (
            <div className={`mt-2 text-xs ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}>
              <strong>Article:</strong> {event.metadata.articleTitle}
              {event.metadata.articleUrl && (
                <a
                  href={event.metadata.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-500 hover:underline"
                >
                  View →
                </a>
              )}
              {event.metadata.discoveryData && (
                <div className={`mt-2 p-2 rounded text-xs ${
                  theme === "dark" ? "bg-gray-950 text-gray-300" : "bg-gray-100 text-gray-700"
                }`}>
                  <strong>Discovery Data (passed to scraper):</strong>
                  <div className="mt-1 space-y-1">
                    <div><strong>URL:</strong> <span className="text-blue-500 break-all">{event.metadata.discoveryData.url}</span></div>
                    <div><strong>Source:</strong> {event.metadata.discoveryData.source}</div>
                    <div><strong>Summary:</strong> {event.metadata.discoveryData.summary}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LLM Call Details (Debug Mode) */}
          {debugMode && event.eventType === "llm_call" && event.metadata && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className={`text-xs font-medium ${
                  theme === "dark" ? "text-blue-400" : "text-blue-600"
                } hover:underline`}
              >
                {expanded ? "Hide" : "Show"} LLM Details
              </button>
              
              {expanded && (
                <div className={`mt-2 p-3 rounded text-xs ${
                  theme === "dark" ? "bg-gray-950 text-gray-300" : "bg-white text-gray-800"
                }`}>
                  <div className="space-y-3">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-2">
                      {event.metadata.type && (
                        <div>
                          <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            Type:
                          </strong>{" "}
                          {event.metadata.type}
                        </div>
                      )}
                      
                      {event.metadata.iteration && (
                        <div>
                          <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            Iteration:
                          </strong>{" "}
                          {event.metadata.iteration}
                        </div>
                      )}
                      
                      {event.metadata.llmProvider && (
                        <div>
                          <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            Provider:
                          </strong>{" "}
                          {event.metadata.llmProvider}
                        </div>
                      )}
                      
                      {(event.metadata.llmModel || event.metadata.model) && (
                        <div>
                          <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            Model:
                          </strong>{" "}
                          {event.metadata.llmModel || event.metadata.model}
                        </div>
                      )}
                      
                      {(event.metadata.llmTokensUsed || event.metadata.tokensUsed) && (
                        <div>
                          <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            Tokens Used:
                          </strong>{" "}
                          {event.metadata.llmTokensUsed || event.metadata.tokensUsed}
                        </div>
                      )}
                      
                      {event.metadata.tokensEstimate && (
                        <div>
                          <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            Tokens (est):
                          </strong>{" "}
                          {event.metadata.tokensEstimate}
                        </div>
                      )}
                    </div>

                    {/* Messages (for llm_request) */}
                    {event.metadata.messages && (
                      <div>
                        <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                          Messages:
                        </strong>
                        <div className={`mt-1 p-2 rounded overflow-x-auto max-h-96 overflow-y-auto ${
                          theme === "dark" ? "bg-gray-900" : "bg-gray-100"
                        }`}>
                          {event.metadata.messages.map((msg: any, idx: number) => (
                            <div key={idx} className="mb-3 pb-3 border-b border-gray-700 last:border-0">
                              <div className="font-semibold text-blue-400 mb-1">{msg.role}:</div>
                              <pre className="whitespace-pre-wrap font-mono text-xs">
                                {msg.content}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Prompt (legacy field) */}
                    {event.metadata.llmPrompt && !event.metadata.messages && (
                      <div>
                        <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                          Prompt:
                        </strong>
                        <pre className={`mt-1 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto ${
                          theme === "dark" ? "bg-gray-900" : "bg-gray-100"
                        }`}>
                          {event.metadata.llmPrompt}
                        </pre>
                      </div>
                    )}

                    {/* Tool Calls */}
                    {event.metadata.toolCalls && event.metadata.toolCalls.length > 0 && (
                      <div>
                        <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                          Tool Calls:
                        </strong>
                        <div className={`mt-1 p-2 rounded overflow-x-auto ${
                          theme === "dark" ? "bg-gray-900" : "bg-gray-100"
                        }`}>
                          {event.metadata.toolCalls.map((tc: any, idx: number) => (
                            <div key={idx} className="mb-2">
                              <div className="font-semibold text-green-400">{tc.function}</div>
                              <pre className="whitespace-pre-wrap font-mono text-xs mt-1">
                                {tc.arguments}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Content (for llm_response) */}
                    {event.metadata.content && (
                      <div>
                        <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                          Content:
                        </strong>
                        <pre className={`mt-1 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto ${
                          theme === "dark" ? "bg-gray-900" : "bg-gray-100"
                        }`}>
                          {event.metadata.content}
                        </pre>
                      </div>
                    )}
                    
                    {/* Response (legacy field) */}
                    {event.metadata.llmResponse && !event.metadata.content && (
                      <div>
                        <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                          Response:
                        </strong>
                        <pre className={`mt-1 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto ${
                          theme === "dark" ? "bg-gray-900" : "bg-gray-100"
                        }`}>
                          {event.metadata.llmResponse}
                        </pre>
                      </div>
                    )}

                    {/* Tool Result */}
                    {event.metadata.result && (
                      <div>
                        <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                          Tool Result:
                        </strong>
                        <div className="text-xs mt-1">
                          Length: {event.metadata.resultLength} chars, Tokens: {event.metadata.resultTokens}
                        </div>
                        <pre className={`mt-1 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto ${
                          theme === "dark" ? "bg-gray-900" : "bg-gray-100"
                        }`}>
                          {event.metadata.result}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Details */}
          {event.metadata?.errorMessage && (
            <div className={`mt-2 p-2 rounded text-xs ${
              theme === "dark" ? "bg-red-900/20 text-red-300" : "bg-red-50 text-red-700"
            }`}>
              <strong>Error:</strong> {event.metadata.errorMessage}
            </div>
          )}

          {/* Scraping Content Preview */}
          {(event.metadata?.contentPreview || event.metadata?.extractedContent) && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className={`text-xs font-medium ${
                  theme === "dark" ? "text-blue-400" : "text-blue-600"
                } hover:underline`}
              >
                {expanded ? "Hide" : "Show"} Extracted Content
              </button>
              
              {expanded && (
                <div className={`mt-2 p-3 rounded text-xs ${
                  theme === "dark" ? "bg-gray-950 text-gray-300" : "bg-white text-gray-800"
                }`}>
                  <div className="space-y-2">
                    {event.metadata.contentLength !== undefined && (
                      <div>
                        <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                          Content Length:
                        </strong>{" "}
                        {event.metadata.contentLength} chars
                        {event.metadata.requiredLength && (
                          <span className="text-red-500">
                            {" "}(Required: {event.metadata.requiredLength})
                          </span>
                        )}
                      </div>
                    )}
                    
                    {event.metadata.scraperError && (
                      <div>
                        <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                          Scraper Error:
                        </strong>{" "}
                        <span className="text-red-500">{event.metadata.scraperError}</span>
                      </div>
                    )}
                    
                    <div>
                      <strong className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                        Extracted Content:
                      </strong>
                      <pre className={`mt-1 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto ${
                        theme === "dark" ? "bg-gray-900" : "bg-gray-100"
                      }`}>
                        {event.metadata.extractedContent || event.metadata.contentPreview || "No content extracted"}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
