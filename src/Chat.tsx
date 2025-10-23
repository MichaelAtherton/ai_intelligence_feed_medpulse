import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

export function Chat() {
  const conversations = useQuery(api.chat.listConversations);
  const settings = useQuery(api.userSettings.getUserSettings);
  const theme = settings?.theme || "light";
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const createConversation = useMutation(api.chat.createConversation);
  const deleteConversation = useMutation(api.chat.deleteConversation);

  const handleNewChat = async () => {
    try {
      const conversationId = await createConversation({});
      setSelectedConversationId(conversationId);
      toast.success("New conversation started");
    } catch (error) {
      toast.error("Failed to create conversation");
    }
  };

  const handleDeleteConversation = async (conversationId: Id<"conversations">) => {
    try {
      await deleteConversation({ conversationId });
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConversationId && conversations && conversations.length > 0) {
      setSelectedConversationId(conversations[0]._id);
    }
  }, [conversations, selectedConversationId]);

  return (
    <div className={`flex h-[calc(100vh-8rem)] rounded-lg shadow-sm border overflow-hidden ${
      theme === "dark" 
        ? "bg-gray-800 border-gray-700" 
        : "bg-white border-gray-200"
    }`}>
      {/* Sidebar */}
      <div className={`${showSidebar ? "w-64" : "w-0"} transition-all duration-300 border-r flex flex-col overflow-hidden ${
        theme === "dark" 
          ? "border-gray-700 bg-gray-900" 
          : "border-gray-200 bg-gray-50"
      }`}>
        {showSidebar && (
          <>
            <div className={`p-4 border-b ${
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={handleNewChat}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {conversations?.map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => setSelectedConversationId(conversation._id)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-colors group ${
                    selectedConversationId === conversation._id
                      ? theme === "dark"
                        ? "bg-blue-900 text-blue-200"
                        : "bg-blue-100 text-blue-900"
                      : theme === "dark"
                      ? "hover:bg-gray-800 text-gray-300"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conversation.title}</p>
                      <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                        {conversation.messageCount} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conversation._id);
                      }}
                      className={`opacity-0 group-hover:opacity-100 ml-2 p-1 rounded transition-opacity ${
                        theme === "dark" ? "hover:bg-red-900/30" : "hover:bg-red-100"
                      }`}
                      title="Delete conversation"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </button>
              ))}

              {conversations?.length === 0 && (
                <div className={`text-center text-sm mt-8 px-4 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  No conversations yet. Start a new chat to ask questions about your articles.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className={`absolute left-0 top-1/2 -translate-y-1/2 border rounded-r-lg p-2 transition-colors z-10 shadow-sm ${
          theme === "dark" 
            ? "bg-gray-800 border-gray-700 hover:bg-gray-700" 
            : "bg-white border-gray-200 hover:bg-gray-50"
        }`}
        style={{ left: showSidebar ? "16rem" : "0" }}
        title={showSidebar ? "Hide sidebar" : "Show sidebar"}
      >
        <svg
          className={`w-4 h-4 transition-transform ${showSidebar ? "" : "rotate-180"} ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversationId ? (
          <ChatMessages conversationId={selectedConversationId} theme={theme} />
        ) : (
          <div className={`flex-1 flex items-center justify-center ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>
            <div className="text-center max-w-md px-4">
              <svg className={`w-16 h-16 mx-auto mb-4 ${
                theme === "dark" ? "text-gray-600" : "text-gray-300"
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg font-medium mb-2">No conversation selected</p>
              <p className="text-sm">Select a conversation from the sidebar or start a new chat to ask questions about your articles.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatMessages({ conversationId, theme }: { conversationId: Id<"conversations">; theme: "light" | "dark" }) {
  const messages = useQuery(api.chat.getMessages, { conversationId });
  const addUserMessage = useMutation(api.chat.addUserMessage);
  const generateResponse = useAction(api.chatAction.generateStreamingResponse);

  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput("");
    setIsGenerating(true);

    try {
      // Add user message
      await addUserMessage({
        conversationId,
        content: userMessage,
      });

      // Generate AI response (streaming)
      await generateResponse({
        conversationId,
        userMessage,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.length === 0 && (
          <div className={`text-center mt-8 ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>
            <div className="max-w-md mx-auto">
              <svg className={`w-12 h-12 mx-auto mb-3 ${
                theme === "dark" ? "text-gray-600" : "text-gray-300"
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-lg font-medium mb-2">Start a conversation</p>
              <p className="text-sm">Ask questions about your articles, trends, or get insights from your feed.</p>
            </div>
          </div>
        )}

        {messages?.map((message) => (
          <div
            key={message._id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : theme === "dark"
                  ? "bg-gray-700 text-gray-100"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-2 ${
                message.role === "user" 
                  ? "text-blue-100" 
                  : theme === "dark" 
                  ? "text-gray-400" 
                  : "text-gray-500"
              }`}>
                {new Date(message.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex justify-start">
            <div className={`rounded-lg px-4 py-3 ${
              theme === "dark" ? "bg-gray-700" : "bg-gray-100"
            }`}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    theme === "dark" ? "bg-gray-500" : "bg-gray-400"
                  }`} style={{ animationDelay: "0ms" }}></div>
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    theme === "dark" ? "bg-gray-500" : "bg-gray-400"
                  }`} style={{ animationDelay: "150ms" }}></div>
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    theme === "dark" ? "bg-gray-500" : "bg-gray-400"
                  }`} style={{ animationDelay: "300ms" }}></div>
                </div>
                <p className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>Thinking...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`border-t p-4 ${
        theme === "dark" 
          ? "border-gray-700 bg-gray-900" 
          : "border-gray-200 bg-gray-50"
      }`}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your articles... (Shift+Enter for new line)"
            disabled={isGenerating}
            rows={1}
            className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[42px] max-h-32 ${
              theme === "dark"
                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400 disabled:bg-gray-700"
                : "bg-white border-gray-300 text-gray-900 disabled:bg-gray-100"
            }`}
            style={{ 
              height: "auto",
              overflowY: input.split("\n").length > 3 ? "auto" : "hidden"
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 128) + "px";
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            title="Send message (Enter)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
        </form>
        <p className={`text-xs mt-2 ${
          theme === "dark" ? "text-gray-400" : "text-gray-500"
        }`}>Press Enter to send, Shift+Enter for new line</p>
      </div>
    </>
  );
}
