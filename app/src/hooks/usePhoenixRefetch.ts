import { useState, useEffect, useCallback } from "react";
import type { Channel } from "phoenix";

/**
 * Returns an incrementing generation counter that bumps whenever the
 * specified event arrives on the given channel. Use as a useEffect
 * dependency to trigger data refetches.
 *
 * @param channel - The Phoenix channel to listen on (or null).
 * @param event   - The event name to listen for.
 */
export function usePhoenixRefetch(
  channel: Channel | null,
  event: string,
): { generation: number; bump: () => void } {
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!channel) return;

    const ref = channel.on(event, () => {
      setGeneration((g) => g + 1);
    });

    return () => {
      channel.off(event, ref);
    };
  }, [channel, event]);

  const bump = useCallback(() => setGeneration((g) => g + 1), []);

  return { generation, bump };
}
