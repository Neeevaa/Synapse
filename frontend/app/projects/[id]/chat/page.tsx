"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  MessageSquare,
  Users,
  Send,
  RefreshCw,
  Search,
  Plus,
  Shield,
  Briefcase,
  Code2,
  Crown,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  X,
  UserCheck,
} from "lucide-react";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
  role?: string | null;
  designation?: string | null;
}

interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: UserProfile;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ConversationMember {
  id: string;
  user_id: string;
  user: UserProfile;
  joined_at: string;
  last_read_at?: string | null;
}

interface ConversationItem {
  id: string;
  project_id: string;
  conversation_type: "PROJECT_GROUP" | "DIRECT";
  name?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  last_message?: MessageItem | null;
  unread_count?: number;
}

interface ParticipantItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
  project_role?: string | null;
  company_role?: string | null;
  designation?: string | null;
  is_cto?: boolean;
}

export default function ProjectChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  // Core state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [project, setProject] = useState<{ id: string; name: string } | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputContent, setInputContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Initial Load: User profile, project, conversations, and eligible participants
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, projRes, convRes, partRes] = await Promise.allSettled([
        api.get("/auth/me"),
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/chat/conversations`),
        api.get(`/projects/${projectId}/chat/participants`),
      ]);

      if (userRes.status === "fulfilled" && userRes.value?.data?.data) {
        setCurrentUser(userRes.value.data.data);
      }

      if (projRes.status === "fulfilled" && projRes.value?.data?.data) {
        setProject(projRes.value.data.data);
      }

      let loadedConvs: ConversationItem[] = [];
      if (convRes.status === "fulfilled" && convRes.value?.data?.data) {
        loadedConvs = convRes.value.data.data;
        setConversations(loadedConvs);
      }

      if (partRes.status === "fulfilled" && partRes.value?.data?.data) {
        setParticipants(partRes.value.data.data);
      }

      // Default selection to first conversation if none selected
      if (loadedConvs.length > 0) {
        setSelectedConvId((prev) => prev || loadedConvs[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load project chat.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 2. Load Messages for Selected Conversation
  const fetchMessages = useCallback(
    async (showSpinner = true) => {
      if (!selectedConvId) return;
      if (showSpinner) setLoadingMessages(true);
      setError(null);
      try {
        const res = await api.get(
          `/projects/${projectId}/chat/conversations/${selectedConvId}/messages?limit=100`
        );
        setMessages(res.data.data.messages);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load messages.");
      } finally {
        if (showSpinner) setLoadingMessages(false);
        setRefreshing(false);
      }
    },
    [projectId, selectedConvId]
  );

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(true);
    }
  }, [selectedConvId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setRefreshing(true);
    // Reload conversations list & active conversation messages
    try {
      const [convRes] = await Promise.all([
        api.get(`/projects/${projectId}/chat/conversations`),
        fetchMessages(false),
      ]);
      if (convRes?.data?.data) {
        setConversations(convRes.data.data);
      }
    } catch {
      // handled inside fetchMessages
    } finally {
      setRefreshing(false);
    }
  };

  // 3. Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputContent.trim();
    if (!clean || !selectedConvId || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await api.post(
        `/projects/${projectId}/chat/conversations/${selectedConvId}/messages`,
        { content: clean }
      );
      const savedMsg: MessageItem = res.data.data;

      // Append persisted message to state
      setMessages((prev) => [...prev, savedMsg]);
      setInputContent("");

      // Update conversations list preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? { ...c, last_message: savedMsg, updated_at: savedMsg.created_at }
            : c
        )
      );

      // Refocus input
      textareaRef.current?.focus();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send message. Please retry.");
    } finally {
      setSending(false);
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 4. Start Direct Chat with an Eligible Participant
  const handleStartDirectChat = async (recipientId: string) => {
    setStartingChat(recipientId);
    setError(null);
    try {
      const res = await api.post(`/projects/${projectId}/chat/direct`, {
        recipient_id: recipientId,
      });
      const conv: ConversationItem = res.data.data;

      // Add to list if not already present
      setConversations((prev) => {
        if (!prev.some((c) => c.id === conv.id)) {
          return [conv, ...prev];
        }
        return prev;
      });

      setSelectedConvId(conv.id);
      setNewChatModalOpen(false);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Unable to start conversation with this participant."
      );
    } finally {
      setStartingChat(null);
    }
  };

  // Helpers for conversation rendering
  const activeConversation = conversations.find((c) => c.id === selectedConvId);

  const getDirectChatPartner = (conv: ConversationItem): UserProfile | null => {
    if (!currentUser) return null;
    const otherMember = conv.members.find((m) => m.user_id !== currentUser.id);
    return otherMember ? otherMember.user : null;
  };

  const getConversationTitle = (conv: ConversationItem) => {
    if (conv.conversation_type === "PROJECT_GROUP") {
      return conv.name || `${project?.name || "Project"} Group`;
    }
    const partner = getDirectChatPartner(conv);
    return partner ? `${partner.first_name} ${partner.last_name}` : "Direct Message";
  };

  const getConversationSubtitle = (conv: ConversationItem) => {
    if (conv.conversation_type === "PROJECT_GROUP") {
      return `${conv.members.length} members`;
    }
    const partner = getDirectChatPartner(conv);
    return partner?.designation || partner?.role || "Team Member";
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const title = getConversationTitle(c).toLowerCase();
    const lastContent = c.last_message?.content.toLowerCase() || "";
    return title.includes(query) || lastContent.includes(query);
  });

  const groupConversations = filteredConversations.filter(
    (c) => c.conversation_type === "PROJECT_GROUP"
  );
  const directConversations = filteredConversations.filter(
    (c) => c.conversation_type === "DIRECT"
  );

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return (
        d.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return "";
    }
  };

  const renderRoleBadge = (role?: string | null, isCto?: boolean) => {
    if (isCto || role === "OWNER") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <Crown className="size-3" />
          CTO / Owner
        </span>
      );
    }
    if (role === "PROJECT_MANAGER") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Briefcase className="size-3" />
          Project Manager
        </span>
      );
    }
    if (role === "TEAM_LEAD") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Shield className="size-3" />
          Team Lead
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
        <Code2 className="size-3" />
        Developer
      </span>
    );
  };

  return (
    <ProtectedShell pageTitle={`${project?.name || "Project"} · Messaging`}>
      <div className="h-full flex flex-col overflow-hidden bg-background">
        {/* Top Breadcrumb Context Header */}
        <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>{project?.name || "Project"}</span>
            </Link>
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <MessageSquare className="size-3.5" />
              </div>
              <h1 className="text-sm font-semibold text-foreground">Messaging</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh messages"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
            <button
              onClick={() => setNewChatModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="size-3.5" />
              <span>New Direct Chat</span>
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-destructive/10 border-b border-destructive/20 text-destructive px-6 py-2 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-destructive/20 rounded transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Main 2-Panel Chat Layout */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Conversation Sidebar (Width 320px) */}
          <aside className="w-80 border-r border-border bg-card flex flex-col shrink-0">
            {/* Search Box */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Conversation List Scrollable Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/50">
              {loading ? (
                <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span className="text-xs">Loading conversations...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="size-8 mx-auto opacity-30 mb-2" />
                  <p className="text-xs font-medium">No conversations found</p>
                  <p className="text-[11px] text-muted-foreground/75 mt-1">
                    Start a new direct chat using the button above.
                  </p>
                </div>
              ) : (
                <>
                  {/* Group Chat Section (if present / permitted) */}
                  {groupConversations.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Project Group
                      </div>
                      {groupConversations.map((conv) => {
                        const isSelected = conv.id === selectedConvId;
                        return (
                          <button
                            key={conv.id}
                            onClick={() => setSelectedConvId(conv.id)}
                            className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 border border-primary/20 text-foreground"
                                : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="size-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                              <Users className="size-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold truncate text-foreground">
                                  {getConversationTitle(conv)}
                                </span>
                                {conv.last_message && (
                                  <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                                    {formatTimestamp(conv.last_message.created_at)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {conv.last_message
                                  ? `${conv.last_message.sender.first_name}: ${conv.last_message.content}`
                                  : getConversationSubtitle(conv)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Direct Messages Section */}
                  <div className="p-2">
                    <div className="px-3 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Direct Messages
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {directConversations.length}
                      </span>
                    </div>

                    {directConversations.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-muted-foreground/60 italic">
                        No active direct chats yet.
                      </p>
                    ) : (
                      directConversations.map((conv) => {
                        const isSelected = conv.id === selectedConvId;
                        const partner = getDirectChatPartner(conv);
                        const initials = partner
                          ? `${partner.first_name[0] || ""}${partner.last_name[0] || ""}`.toUpperCase()
                          : "??";

                        return (
                          <button
                            key={conv.id}
                            onClick={() => setSelectedConvId(conv.id)}
                            className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer mb-1 ${
                              isSelected
                                ? "bg-primary/10 border border-primary/20 text-foreground"
                                : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="relative shrink-0">
                              <div className="size-9 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-xs text-foreground">
                                {partner?.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={partner.avatar_url}
                                    alt={partner.first_name}
                                    className="size-full rounded-xl object-cover"
                                  />
                                ) : (
                                  <span>{initials}</span>
                                )}
                              </div>
                              {conv.unread_count && conv.unread_count > 0 ? (
                                <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                                  {conv.unread_count}
                                </span>
                              ) : null}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold truncate text-foreground">
                                  {getConversationTitle(conv)}
                                </span>
                                {conv.last_message && (
                                  <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                                    {formatTimestamp(conv.last_message.created_at)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {conv.last_message
                                  ? conv.last_message.content
                                  : getConversationSubtitle(conv)}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* Conversation Panel */}
          <main className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden">
            {activeConversation ? (
              <>
                {/* Active Conversation Top Bar */}
                <div className="h-14 border-b border-border bg-card/40 px-6 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                      {activeConversation.conversation_type === "PROJECT_GROUP" ? (
                        <Users className="size-4" />
                      ) : (
                        <UserCheck className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-foreground truncate">
                          {getConversationTitle(activeConversation)}
                        </h2>
                        {activeConversation.conversation_type === "DIRECT" && (
                          <div>
                            {renderRoleBadge(
                              getDirectChatPartner(activeConversation)?.role,
                              getDirectChatPartner(activeConversation)?.designation
                                ?.toLowerCase()
                                .includes("cto")
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {getConversationSubtitle(activeConversation)}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>PostgreSQL Sync</span>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {loadingMessages ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <span className="text-xs">Loading conversation history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                      <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                        <MessageSquare className="size-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        No messages yet
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-xs mt-1">
                        Send the first message to start the conversation.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSelf = currentUser && msg.sender_id === currentUser.id;
                      const initials = `${msg.sender.first_name[0] || ""}${
                        msg.sender.last_name[0] || ""
                      }`.toUpperCase();

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-3 max-w-2xl ${
                            isSelf ? "ml-auto flex-row-reverse" : "mr-auto"
                          }`}
                        >
                          {/* Sender Avatar */}
                          <div className="size-8 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-[11px] text-foreground shrink-0 shadow-2xs">
                            {msg.sender.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={msg.sender.avatar_url}
                                alt={msg.sender.first_name}
                                className="size-full rounded-xl object-cover"
                              />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>

                          {/* Message Content Bubble */}
                          <div className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <span className="text-[11px] font-semibold text-foreground">
                                {isSelf ? "You" : `${msg.sender.first_name} ${msg.sender.last_name}`}
                              </span>
                              {!isSelf && (
                                <span className="text-[10px] text-muted-foreground">
                                  {msg.sender.designation || msg.sender.role}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {formatTimestamp(msg.created_at)}
                              </span>
                            </div>

                            <div
                              className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words shadow-xs ${
                                isSelf
                                  ? "bg-primary text-primary-foreground rounded-tr-xs"
                                  : "bg-card border border-border text-foreground rounded-tl-xs"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <div className="p-4 border-t border-border bg-card/50">
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <div className="flex-1 min-h-[42px] relative bg-background border border-border rounded-xl focus-within:ring-1 focus-within:ring-primary shadow-2xs">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a message... (Press Enter to send, Shift+Enter for newline)"
                        className="w-full px-3.5 py-2.5 text-xs bg-transparent focus:outline-none resize-none max-h-32 placeholder:text-muted-foreground text-foreground"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sending || !inputContent.trim()}
                      className="size-[42px] rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs active:scale-95"
                    >
                      {sending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                  <MessageSquare className="size-7" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Select a conversation
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Choose a project group or direct conversation from the sidebar, or start a new
                  chat with an authorized member.
                </p>
              </div>
            )}
          </main>
        </div>

        {/* Modal: Start New Direct Chat with Authorized Participant */}
        {newChatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 text-foreground animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Start Direct Conversation</h3>
                </div>
                <button
                  onClick={() => setNewChatModalOpen(false)}
                  className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mt-2 mb-4">
                Select an authorized team member from this project. Permitted recipients are
                governed strictly by Synapse access controls.
              </p>

              <div className="max-h-80 overflow-y-auto space-y-1.5 divide-y divide-border/40">
                {participants.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    No eligible recipients available for your role in this project.
                  </div>
                ) : (
                  participants.map((p) => {
                    const initials = `${p.first_name[0] || ""}${p.last_name[0] || ""}`.toUpperCase();
                    const isStarting = startingChat === p.id;

                    return (
                      <div
                        key={p.id}
                        className="pt-2 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-xs shrink-0">
                            {p.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.avatar_url}
                                alt={p.first_name}
                                className="size-full rounded-xl object-cover"
                              />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate text-foreground">
                              {p.first_name} {p.last_name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {renderRoleBadge(p.project_role || p.company_role, p.is_cto)}
                              {p.designation && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  · {p.designation}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleStartDirectChat(p.id)}
                          disabled={isStarting}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isStarting ? "Opening..." : "Chat"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
