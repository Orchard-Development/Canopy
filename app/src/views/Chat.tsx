import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { usePersistedState } from "../hooks/usePersistedState";
import { Alert, Box, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import HistoryIcon from "@mui/icons-material/History";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SyncIcon from "@mui/icons-material/Sync";
import { PageLayout } from "../components/PageLayout";
import { ChatMessages } from "../components/chat/ChatMessages";
import { ChatInput } from "../components/chat/ChatInput";
import { ModelPicker } from "../components/chat/ModelPicker";
import { ConversationHistory } from "../components/chat/ConversationHistory";
import { DispatchPreview } from "../components/dispatch/DispatchPreview";
import { AgentActivityCard } from "../components/chat/AgentActivityCard";
import { useChat } from "../hooks/useChat";
import { useActiveProject } from "../hooks/useActiveProject";
import { useDispatch } from "../hooks/useDispatch";
import { useChannel } from "../hooks/useChannel";
import { useAgentStream } from "../hooks/useAgentStream";
import { useFileAttach } from "../hooks/useFileAttach";
import type { AiModelOption, DispatchPayload, ProjectRecord } from "../lib/api";
import type { DispatchSettingsState } from "../components/dispatch/DispatchSettings";
import { EVENTS } from "../lib/events";
import type { Attachment } from "../types/chat";

const BASE_FONT_SIZE = 14;
const AGENT_TOOLS = new Set(["dispatch_to_agent", "create_proposal", "build_proposal"]);
const DISMISSED_AGENTS_KEY = "chat.dismissedAgents";

function loadDismissedAgents(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_AGENTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissedAgent(sessionId: string) {
  const set = loadDismissedAgents();
  set.add(sessionId);
  localStorage.setItem(DISMISSED_AGENTS_KEY, JSON.stringify([...set]));
}

export default function Chat() {
  const { project, activate } = useActiveProject();
  const chat = useChat(project?.id);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { channel } = useChannel("dashboard");
  const agentStream = useAgentStream(channel);
  const [model, setModel] = usePersistedState<string>("chat.model", "");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const modelsRef = useRef<AiModelOption[]>([]);
  const subscribedAgentsRef = useRef<Set<string>>(new Set());
  const dismissedAgentsRef = useRef<Set<string>>(loadDismissedAgents());
  const fileAttach = useFileAttach();
  const dragCounterRef = useRef(0);

  // Auto-subscribe to agent sessions when any tool result includes a session_id
  useEffect(() => {
    for (const msg of chat.messages) {
      if (!msg.toolCalls) continue;
      for (const tc of msg.toolCalls) {
        const result = tc.result as Record<string, unknown> | undefined;
        const sessionId = result?.session_id as string | undefined;
        if (
          AGENT_TOOLS.has(tc.name) &&
          tc.status === "complete" &&
          sessionId &&
          !subscribedAgentsRef.current.has(sessionId) &&
          !dismissedAgentsRef.current.has(sessionId)
        ) {
          subscribedAgentsRef.current.add(sessionId);
          agentStream.subscribe(sessionId);
        }
      }
    }
  }, [chat.messages, agentStream.subscribe]);

  // Listen for proposal lifecycle events
  useEffect(() => {
    if (!channel) return;
    const createdRef = channel.on(
      EVENTS.proposals.created,
      (payload: { data?: { slug?: string; title?: string } }) => {
        const d = payload.data || {};
        const label = d.title || d.slug || "New proposal";
        chat.addSystemMessage(`Proposal created: ${label}`);
      },
    );
    const changedRef = channel.on(
      EVENTS.proposals.changed,
      (payload: { data?: { slug?: string; status?: string } }) => {
        const d = payload.data || {};
        if (d.slug && d.status) {
          chat.addSystemMessage(`Proposal "${d.slug}" updated to ${d.status}`);
        }
      },
    );
    return () => {
      channel.off(EVENTS.proposals.created, createdRef);
      channel.off(EVENTS.proposals.changed, changedRef);
    };
  }, [channel, chat.addSystemMessage]);

  // Report back to chat when a dispatched session exits
  const reportedExitsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const session of agentStream.sessions.values()) {
      if (session.state === "exited" && !reportedExitsRef.current.has(session.id)) {
        reportedExitsRef.current.add(session.id);
        const ok = session.exitCode === 0;
        chat.addSystemMessage(
          ok
            ? `Agent ${session.id.slice(0, 8)} finished successfully.`
            : `Agent ${session.id.slice(0, 8)} exited with code ${session.exitCode ?? "unknown"}.`,
        );
      }
    }
  }, [agentStream.sessions, chat.addSystemMessage]);

  const handleCancelAgent = useCallback(
    async (sessionId: string) => {
      dismissedAgentsRef.current.add(sessionId);
      persistDismissedAgent(sessionId);
      await agentStream.killSession(sessionId);
      chat.stop();
      chat.addSystemMessage(
        `Agent ${sessionId.slice(0, 8)} was cancelled by user. Do not re-dispatch or retry.`,
      );
    },
    [agentStream.killSession, chat.stop, chat.addSystemMessage],
  );

  const handleOpenTerminal = useCallback((sessionId: string) => {
    window.dispatchEvent(
      new CustomEvent("ctx:open-terminal", { detail: { sessionId } }),
    );
  }, []);

  /** Override the payload command to match the selected chat model provider. */
  function applyAgentFromModel(payload: DispatchPayload): DispatchPayload {
    const selected = modelsRef.current.find((m) => m.id === model);
    if (!selected) return payload;
    const command = selected.provider === "openai" ? "codex" : "claude";
    if (payload.command === command) return payload;
    const args = command === "claude"
      ? ["--dangerously-skip-permissions", "--model", selected.id]
      : ["--dangerously-bypass-approvals-and-sandbox", "--model", selected.id];
    return { ...payload, command, args };
  }

  const handleSend = useCallback(
    (text: string, attachments?: Attachment[]) =>
      chat.send(text, model || undefined, attachments),
    [chat.send, model],
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) { setDragOver(false); dragCounterRef.current = 0; }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    dragCounterRef.current = 0;
    if (e.dataTransfer.files.length > 0) fileAttach.addFiles(e.dataTransfer.files);
  }, [fileAttach.addFiles]);

  const handleEdit = useCallback(
    (index: number, newText: string) =>
      chat.editMessage(index, newText, model || undefined),
    [chat.editMessage, model],
  );

  // Clear agent cards when switching conversations
  useEffect(() => {
    agentStream.clearAll();
    subscribedAgentsRef.current.clear();
  }, [chat.conversationId, agentStream.clearAll]);

  // Reset chat when the active project changes (user switches projects).
  // Skip resets we triggered ourselves via handleFormSubmit to avoid a
  // double-reset race that would clear the post-creation system message.
  const prevProjectRef = useRef(project?.id);
  const selfActivatedRef = useRef(false);
  useEffect(() => {
    if (prevProjectRef.current !== undefined && prevProjectRef.current !== project?.id) {
      if (selfActivatedRef.current) {
        selfActivatedRef.current = false;
      } else {
        chat.reset();
      }
    }
    prevProjectRef.current = project?.id;
  }, [project?.id, chat.reset]);

  const handleFormSubmit = useCallback(
    (result: { success: boolean; message: string; data?: Record<string, unknown> }) => {
      const projectId = result.data?.id as string | undefined;
      if (result.success && result.data && projectId) {
        const projectData = result.data as unknown as ProjectRecord;
        const name = (result.data.name as string) || "New project";

        // Activate immediately so subsequent chat messages use the new project context
        selfActivatedRef.current = true;
        activate(projectData);
        chat.reset();
        chat.addSystemMessage(`Project "${name}" created.`, {
          label: "Open project",
          onAction: () => navigate(`/projects/${projectId}`),
        });
        return;
      }
      chat.addSystemMessage(result.message);
    },
    [chat.addSystemMessage, chat.reset, activate, navigate],
  );

  const handleDispatchRequest = async (
    summary: string,
    preBuiltPayload: DispatchPayload | null,
    quick: boolean,
  ) => {
    if (quick && preBuiltPayload) {
      const record = await dispatch.dispatch(summary, applyAgentFromModel(preBuiltPayload));
      if (record?.terminalSessionId) {
        agentStream.subscribe(record.terminalSessionId);
      }
      chat.addSystemMessage(
        `Dispatched to an agent -- you can follow progress below or on the Terminal page.`,
      );
      return;
    }

    if (preBuiltPayload) {
      // Full dispatch with pre-built payload -- show preview instantly
      dispatch.setPreview(applyAgentFromModel(preBuiltPayload));
    } else {
      // Fallback: classify now (should be rare)
      const conversation = chat.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      await dispatch.classify(summary, "auto", conversation);
    }
  };

  const handleDispatch = async (
    p: DispatchPayload,
    _settings: DispatchSettingsState,
  ) => {
    const record = await dispatch.dispatch(p.prompt, applyAgentFromModel(p));
    dispatch.clearPreview();
    if (record?.terminalSessionId) {
      agentStream.subscribe(record.terminalSessionId);
    }
    chat.addSystemMessage(
      `Dispatched to an agent -- you can follow progress below or on the Terminal page.`,
    );
  };

  const handleProposal = async (
    p: DispatchPayload,
    settings: DispatchSettingsState,
  ) => {
    await dispatch.createProposal(p.prompt, p, settings.autoCommit);
    dispatch.clearPreview();
    chat.addSystemMessage(
      "Proposal dispatched -- check the Terminal page for the plan. The agent will not execute changes.",
    );
  };

  const error = chat.error || dispatch.error;

  return (
    <PageLayout fill sx={{ pt: 0 }}>
      <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
        <ConversationHistory
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          activeId={chat.conversationId}
          onSelect={(id) => chat.loadConversation(id)}
          onNew={chat.reset}
        />

        <Stack
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            py: 1,
            maxWidth: 800,
            mx: "auto",
            width: "100%",
            position: "relative",
          }}
          onDragEnter={handleDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {dragOver && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
                bgcolor: "rgba(0,0,0,0.6)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 2,
                border: "3px dashed",
                borderColor: "primary.main",
                pointerEvents: "none",
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 64, color: "primary.main", mb: 1 }} />
              <Typography variant="h6" color="primary.main">
                Drop files here
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Images, PDFs, CSVs, and more
              </Typography>
            </Box>
          )}
          {dispatch.payload ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                overflow: "auto",
                py: 2,
              }}
            >
              <DispatchPreview
                payload={dispatch.payload}
                onDispatch={handleDispatch}
                onProposal={handleProposal}
                onCancel={dispatch.clearPreview}
              />
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1,
                  flexShrink: 0,
                }}
              >
                <Tooltip title="History">
                  <IconButton
                    size="small"
                    onClick={() => setHistoryOpen((v) => !v)}
                  >
                    <HistoryIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="New chat">
                  <IconButton size="small" onClick={chat.reset}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
                <Box sx={{ flex: 1 }} />
                <ModelPicker
                  value={model}
                  onChange={setModel}
                  onModelsLoaded={(m) => { modelsRef.current = m; }}
                />
                {chat.sending && !chat.connected && (
                  <Chip
                    icon={<SyncIcon sx={{ fontSize: 14, animation: "spin 1s linear infinite", "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } } }} />}
                    label="Reconnecting..."
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
                {chat.workerState && chat.workerState !== "idle" && (
                  <Chip
                    label={chat.workerState}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                )}
              </Box>
              <ChatMessages
                messages={chat.messages}
                fontSize={BASE_FONT_SIZE}
                onDispatch={handleDispatchRequest}
                onEdit={handleEdit}
                onFormSubmit={handleFormSubmit}
                chatChannel={chat.chatChannel}
              />
              {/* Live agent activity cards */}
              {Array.from(agentStream.sessions.values()).map((session) => (
                <AgentActivityCard
                  key={session.id}
                  session={session}
                  onSendInput={(text) => agentStream.sendInput(session.id, text)}
                  onOpenTerminal={handleOpenTerminal}
                  onCancel={handleCancelAgent}
                />
              ))}
              {error && (
                <Alert
                  severity="error"
                  onClose={() => {
                    chat.clearError();
                    dispatch.clearPreview();
                  }}
                  sx={{ mb: 1 }}
                >
                  {error}
                </Alert>
              )}
              <ChatInput
                onSend={handleSend}
                onStop={chat.stop}
                loading={chat.sending}
                attachments={fileAttach.attachments}
                uploading={fileAttach.uploading}
                onAddFiles={fileAttach.addFiles}
                onRemoveAttachment={fileAttach.removeAttachment}
                onClearAttachments={fileAttach.clearAttachments}
                projectId={project?.id}
              />
            </>
          )}
        </Stack>
      </Stack>
    </PageLayout>
  );
}
