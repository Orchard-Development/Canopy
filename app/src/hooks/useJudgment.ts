import { useState, useEffect, useCallback } from "react";
import { useDashboardChannel } from "./useDashboardChannel";
import { useChannelEvent, useChannelEventBuffer } from "./useChannelEvent";
import { EVENTS } from "../lib/events";
import { api } from "../lib/api";
import type {
  JudgmentStats,
  JudgmentSkillScore,
  JudgmentEntry,
  JudgmentScoredEvent,
} from "../lib/api";

export function useJudgment() {
  const { channel } = useDashboardChannel();

  const [stats, setStats] = useState<JudgmentStats | null>(null);
  const [scores, setScores] = useState<Record<string, JudgmentSkillScore>>({});
  const [negatives, setNegatives] = useState<JudgmentEntry[]>([]);
  const [report, setReport] = useState<{ path: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Real-time events
  const latestScored = useChannelEvent<{ data: JudgmentScoredEvent }>(
    channel,
    EVENTS.judgment.scored,
  );
  const recentNegatives = useChannelEventBuffer<{ data: JudgmentScoredEvent }>(
    channel,
    EVENTS.judgment.negative,
    50,
  );
  const reportEvent = useChannelEvent<{ path: string }>(
    channel,
    EVENTS.judgment.report,
  );

  // Initial data load
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, sc, n, r] = await Promise.all([
        api.judgmentStats(),
        api.judgmentScores(),
        api.judgmentNegatives(50),
        api.judgmentReport(),
      ]);
      setStats(s.data);
      setScores(sc.data);
      setNegatives(n.data);
      setReport(r.data);
    } catch {
      // API may not be available yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refetch when a new negative arrives via channel
  useEffect(() => {
    if (recentNegatives.length > 0) {
      load();
    }
  }, [recentNegatives.length, load]);

  // Refetch when a report is generated
  useEffect(() => {
    if (reportEvent) {
      api.judgmentReport().then((r) => setReport(r.data)).catch(() => {});
    }
  }, [reportEvent]);

  const generateReport = useCallback(async () => {
    const result = await api.judgmentGenerateReport();
    if (result.data?.path) {
      await load();
    }
    return result;
  }, [load]);

  return {
    stats,
    scores,
    negatives,
    report,
    loading,
    latestScored: latestScored?.data ?? null,
    recentNegatives: recentNegatives.map((e) => e.data),
    generateReport,
    refresh: load,
  };
}
