import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Onboarding } from "./Onboarding";
import { Feed } from "./Feed";
import { useState, useRef, useEffect } from "react";
import { SourceManagement } from "./SourceManagement";
import { SavedItems } from "./SavedItems";
import { Search } from "./Search";
import { DiscoveryStatus } from "./DiscoveryStatus";
import { AdminPanel } from "./AdminPanel";
import { Settings } from "./Settings";
import { Preferences } from "./Preferences";
import { DailySummary } from "./DailySummary";
import { TrendAnalysis } from "./TrendAnalysis";
import { EmbeddingTest } from "./EmbeddingTest";
import { Chat } from "./Chat";
import { LiveDiscovery } from "./LiveDiscovery";

export default function App() {
  const [currentView, setCurrentView] = useState<"feed" | "sources" | "saved" | "search" | "settings" | "preferences" | "summary" | "trends" | "embeddings" | "chat" | "live">("feed");
  const settings = useQuery(api.userSettings.getUserSettings);
  const theme = settings?.theme || "light";

  return (
    <div className={`min-h-screen flex flex-col ${theme === "dark" ? "dark bg-gray-900" : "bg-gray-50"}`}>
      <header className={`sticky top-0 z-10 backdrop-blur-sm border-b shadow-sm ${
        theme === "dark" 
          ? "bg-gray-800/80 border-gray-700" 
          : "bg-white/80 border-gray-200"
      }`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h2 className={`text-xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
              MedPulse AI
            </h2>
            <Authenticated>
              <nav className="flex gap-4">
                <button
                  onClick={() => setCurrentView("feed")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === "feed"
                      ? theme === "dark" 
                        ? "bg-blue-900 text-blue-200" 
                        : "bg-blue-100 text-blue-700"
                      : theme === "dark"
                      ? "text-gray-300 hover:text-white hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Feed
                </button>
                <button
                  onClick={() => setCurrentView("chat")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === "chat"
                      ? theme === "dark" 
                        ? "bg-blue-900 text-blue-200" 
                        : "bg-blue-100 text-blue-700"
                      : theme === "dark"
                      ? "text-gray-300 hover:text-white hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setCurrentView("saved")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === "saved"
                      ? theme === "dark" 
                        ? "bg-blue-900 text-blue-200" 
                        : "bg-blue-100 text-blue-700"
                      : theme === "dark"
                      ? "text-gray-300 hover:text-white hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Saved
                </button>
                <button
                  onClick={() => setCurrentView("search")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === "search"
                      ? theme === "dark" 
                        ? "bg-blue-900 text-blue-200" 
                        : "bg-blue-100 text-blue-700"
                      : theme === "dark"
                      ? "text-gray-300 hover:text-white hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => setCurrentView("sources")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === "sources"
                      ? theme === "dark" 
                        ? "bg-blue-900 text-blue-200" 
                        : "bg-blue-100 text-blue-700"
                      : theme === "dark"
                      ? "text-gray-300 hover:text-white hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Sources
                </button>
                <button
                  onClick={() => setCurrentView("live")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === "live"
                      ? theme === "dark" 
                        ? "bg-blue-900 text-blue-200" 
                        : "bg-blue-100 text-blue-700"
                      : theme === "dark"
                      ? "text-gray-300 hover:text-white hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Live
                </button>
              </nav>
            </Authenticated>
          </div>
          <Authenticated>
            <UserMenu 
              onNavigateToSettings={() => setCurrentView("settings")} 
              onNavigateToPreferences={() => setCurrentView("preferences")}
              onNavigateToEmbeddings={() => setCurrentView("embeddings")}
              theme={theme}
            />
          </Authenticated>
        </div>
      </header>
      <main className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          <Content currentView={currentView} setCurrentView={setCurrentView} />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function UserMenu({ 
  onNavigateToSettings, 
  onNavigateToPreferences, 
  onNavigateToEmbeddings,
  theme 
}: { 
  onNavigateToSettings: () => void; 
  onNavigateToPreferences: () => void; 
  onNavigateToEmbeddings: () => void;
  theme: "light" | "dark";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useQuery(api.auth.loggedInUser);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        {getInitials(user?.name)}
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg border py-1 ${
          theme === "dark" 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-200"
        }`}>
          <div className={`px-4 py-3 border-b ${
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          }`}>
            <p className={`text-sm font-medium ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>{user?.name || "User"}</p>
            <p className={`text-sm truncate ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}>{user?.email}</p>
          </div>
          
          <button
            onClick={() => {
              onNavigateToPreferences();
              setIsOpen(false);
            }}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
              theme === "dark" 
                ? "text-gray-300 hover:bg-gray-700" 
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Preferences
          </button>

          <button
            onClick={() => {
              onNavigateToSettings();
              setIsOpen(false);
            }}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
              theme === "dark" 
                ? "text-gray-300 hover:bg-gray-700" 
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>

          <button
            onClick={() => {
              onNavigateToEmbeddings();
              setIsOpen(false);
            }}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
              theme === "dark" 
                ? "text-gray-300 hover:bg-gray-700" 
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Test Embeddings
          </button>

          <div className="border-t border-gray-200 mt-1 pt-1">
            <div className="px-4 py-2">
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Content({ 
  currentView, 
  setCurrentView 
}: { 
  currentView: "feed" | "sources" | "saved" | "search" | "settings" | "preferences" | "summary" | "trends" | "embeddings" | "chat" | "live";
  setCurrentView: (view: "feed" | "sources" | "saved" | "search" | "settings" | "preferences" | "summary" | "trends" | "embeddings" | "chat" | "live") => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const preferences = useQuery(api.userPreferences.getPreferences);
  const settings = useQuery(api.userSettings.getUserSettings);
  const theme = settings?.theme || "light";

  if (loggedInUser === undefined || preferences === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Unauthenticated>
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center mb-8">
            <h1 className={`text-4xl font-bold mb-4 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              Stay Current on AI in Healthcare
            </h1>
            <p className={`text-lg ${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}>
              Your personalized feed of AI developments in healthcare. 15 minutes weekly to stay informed.
            </p>
          </div>
          <div className={`p-8 rounded-lg shadow-lg ${
            theme === "dark" ? "bg-gray-800" : "bg-white"
          }`}>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        {!preferences?.onboardingCompleted ? (
          <Onboarding />
        ) : (
          <>
            {currentView === "feed" && (
              <Feed 
                onNavigateToSummary={() => setCurrentView("summary")}
                onNavigateToTrends={() => setCurrentView("trends")}
              />
            )}
            {currentView === "chat" && <Chat />}
            {currentView === "summary" && <DailySummary onBack={() => setCurrentView("feed")} />}
            {currentView === "trends" && <TrendAnalysis onBack={() => setCurrentView("feed")} />}
            {currentView === "sources" && (
              <div className="space-y-6">
                <DiscoveryStatus />
                <AdminPanel />
                <SourceManagement />
              </div>
            )}
            {currentView === "saved" && <SavedItems />}
            {currentView === "search" && <Search />}
            {currentView === "preferences" && <Preferences />}
            {currentView === "settings" && <Settings />}
            {currentView === "embeddings" && <EmbeddingTest />}
            {currentView === "live" && <LiveDiscovery />}
          </>
        )}
      </Authenticated>
    </>
  );
}
