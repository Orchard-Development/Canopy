import type { SessionMessage } from "../hooks/useSessionMessages";
import type { ChatMessage, Attachment } from "../types/chat";

/** Convert session transcript messages to the ChatMessage format used by ChatMessages. */
export function sessionMessagesToChat(msgs: SessionMessage[]): ChatMessage[] {
  return msgs.map((m, i) => {
    const attachments: Attachment[] | undefined = m.images?.length
      ? m.images.map((url, j) => ({
          id: `img-${i}-${j}`,
          name: `image-${j + 1}.png`,
          mimeType: "image/png",
          url,
          size: 0,
        }))
      : undefined;

    return {
      id: `session-${i}`,
      role: (m.role === "user" ? "user" : "assistant") as ChatMessage["role"],
      content: m.text,
      timestamp: m.ts || new Date().toISOString(),
      attachments,
    };
  });
}
