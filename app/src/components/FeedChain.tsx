import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Collapse,
  Box,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LinkIcon from "@mui/icons-material/Link";
import type { FeedEvent } from "../lib/api";

const VERDICT_COLORS: Record<string, "success" | "info" | "warning" | "default"> = {
  productive: "success",
  exploratory: "info",
  "error-recovery": "warning",
};

function parseDetail(event: FeedEvent): Record<string, unknown> {
  try {
    return JSON.parse(event.detail) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function SessionAnalyzedRenderer({ detail }: { detail: Record<string, unknown> }) {
  const verdict = detail.verdict as string | undefined;
  const summary = detail.summary as string | undefined;
  const insights = detail.insights as string[] | undefined;
  const actions = detail.actions as string[] | undefined;

  return (
    <Box>
      {verdict && (
        <Chip
          label={verdict}
          size="small"
          color={VERDICT_COLORS[verdict] ?? "default"}
          sx={{ mr: 0.5 }}
        />
      )}
      {summary && (
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
          {summary}
        </Typography>
      )}
      {insights && insights.length > 0 && (
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
          Top insight: {insights[0]}
        </Typography>
      )}
      {actions && actions.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
          {actions.map((a, i) => (
            <Chip key={i} label={a} size="small" variant="outlined" icon={<LinkIcon />} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function SkillProposedRenderer({ detail }: { detail: Record<string, unknown> }) {
  const skillName = detail.skillName as string | undefined;
  const sessions = detail.sessionCount as number | undefined;

  return (
    <Box>
      {skillName && (
        <Chip label={skillName} size="small" color="secondary" variant="outlined" sx={{ mr: 0.5 }} />
      )}
      {sessions !== undefined && (
        <Typography variant="caption" color="text.secondary">
          Based on {sessions} session{sessions !== 1 ? "s" : ""}
        </Typography>
      )}
    </Box>
  );
}

function PatternDetectedRenderer({ detail }: { detail: Record<string, unknown> }) {
  const pattern = detail.pattern as string | undefined;
  const frequency = detail.frequency as number | undefined;
  const action = detail.suggestedAction as string | undefined;

  return (
    <Box>
      {pattern && (
        <Typography variant="caption" display="block">{pattern}</Typography>
      )}
      {frequency !== undefined && (
        <Typography variant="caption" color="text.secondary">
          Seen {frequency} time{frequency !== 1 ? "s" : ""}
        </Typography>
      )}
      {action && (
        <Typography variant="caption" display="block" color="primary.main" sx={{ mt: 0.5 }}>
          Suggested: {action}
        </Typography>
      )}
    </Box>
  );
}

function MemoryWrittenRenderer({ detail }: { detail: Record<string, unknown> }) {
  const category = detail.category as string | undefined;
  const content = detail.content as string | undefined;

  return (
    <Box>
      {category && <Chip label={category} size="small" variant="outlined" sx={{ mr: 0.5 }} />}
      {content && (
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
          {typeof content === "string" ? content.slice(0, 150) : ""}
        </Typography>
      )}
    </Box>
  );
}

function ApprovalResolvedRenderer({ detail }: { detail: Record<string, unknown> }) {
  const status = detail.status as string | undefined;

  return (
    <Box>
      {status && (
        <Chip
          label={status}
          size="small"
          color={status === "approved" ? "success" : "error"}
        />
      )}
    </Box>
  );
}

function EventRenderer({ event }: { event: FeedEvent }) {
  const detail = parseDetail(event);

  switch (event.type) {
    case "session_analyzed":
      return <SessionAnalyzedRenderer detail={detail} />;
    case "skill_proposed":
      return <SkillProposedRenderer detail={detail} />;
    case "pattern_detected":
      return <PatternDetectedRenderer detail={detail} />;
    case "memory_written":
      return <MemoryWrittenRenderer detail={detail} />;
    case "approval_resolved":
      return <ApprovalResolvedRenderer detail={detail} />;
    default:
      if (Object.keys(detail).length > 0) {
        return (
          <Box sx={{ fontSize: "0.75rem" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {JSON.stringify(detail, null, 2)}
            </pre>
          </Box>
        );
      }
      return null;
  }
}

interface EventChain {
  id: string;
  narrative: string;
  events: FeedEvent[];
}

export function groupIntoChains(events: FeedEvent[]): EventChain[] {
  const sessionChains = new Map<string, FeedEvent[]>();
  const standalone: FeedEvent[] = [];

  for (const e of events) {
    const detail = parseDetail(e);
    const sessionId = (detail.chatId ?? detail.sessionId ?? detail.sourceSessionId) as string | undefined;

    if (sessionId) {
      if (!sessionChains.has(sessionId)) sessionChains.set(sessionId, []);
      sessionChains.get(sessionId)!.push(e);
    } else {
      standalone.push(e);
    }
  }

  const chains: EventChain[] = [];

  for (const [sessionId, chainEvents] of sessionChains) {
    if (chainEvents.length === 1) {
      standalone.push(chainEvents[0]);
      continue;
    }
    const types = chainEvents.map((e) => e.type.replace(/_/g, " ")).join(" -> ");
    chains.push({
      id: sessionId,
      narrative: `${types} (${chainEvents.length} events)`,
      events: chainEvents,
    });
  }

  for (const e of standalone) {
    chains.push({ id: e.id, narrative: "", events: [e] });
  }

  return chains.sort((a, b) => {
    const aTime = a.events[0]?.created_at ?? "";
    const bTime = b.events[0]?.created_at ?? "";
    return bTime.localeCompare(aTime);
  });
}

const TYPE_COLORS: Record<string, "primary" | "secondary" | "success" | "warning" | "info"> = {
  session_analyzed: "primary",
  skill_proposed: "secondary",
  memory_written: "success",
  approval_resolved: "warning",
  workspace_synced: "info",
};

function EnrichedEventCard({ event }: { event: FeedEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>{event.title}</Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
              <Chip
                label={event.type.replace(/_/g, " ")}
                size="small"
                color={TYPE_COLORS[event.type] ?? "default"}
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                {new Date(event.created_at).toLocaleString()}
              </Typography>
            </Stack>
          </Box>
          <IconButton size="small" onClick={() => setExpanded((p) => !p)}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Stack>
        <EventRenderer event={event} />
        <Collapse in={expanded}>
          <Box sx={{ mt: 1, p: 1, bgcolor: "action.hover", borderRadius: 1, fontSize: "0.75rem" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {JSON.stringify(parseDetail(event), null, 2)}
            </pre>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export function ChainCard({ chain }: { chain: EventChain }) {
  const [expanded, setExpanded] = useState(false);

  if (chain.events.length === 1) {
    return <EnrichedEventCard event={chain.events[0]} />;
  }

  return (
    <Card variant="outlined" sx={{ mb: 1, borderLeft: 3, borderLeftColor: "primary.main" }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LinkIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
            {chain.narrative}
          </Typography>
          <Chip label={`${chain.events.length} events`} size="small" variant="outlined" />
          <IconButton size="small" onClick={() => setExpanded((p) => !p)}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Stack>
        <Collapse in={expanded}>
          <Box sx={{ mt: 1, pl: 2, borderLeft: 2, borderColor: "divider" }}>
            {chain.events.map((e) => (
              <EnrichedEventCard key={e.id} event={e} />
            ))}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
