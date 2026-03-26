import { useState, useCallback } from "react";
import { api } from "../lib/api";
import type { Attachment } from "../types/chat";

export function useFileAttach() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    try {
      const result = await api.uploadFiles(fileArray);
      const newAttachments: Attachment[] = result.files.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        mimeType: f.mimeType,
        url: f.url,
        size: f.size,
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (err) {
      console.error("File upload failed:", err);
    } finally {
      setUploading(false);
    }
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => setAttachments([]), []);

  return { attachments, uploading, addFiles, removeAttachment, clearAttachments };
}
