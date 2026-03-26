import { useState, useCallback, useRef, useMemo, type KeyboardEvent, type ClipboardEvent } from "react";
import { Box, TextField, IconButton, Tooltip, Chip, CircularProgress } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { useAudioCapture } from "../../hooks/useAudioCapture";
import { SlashCommandMenu, type SlashItem } from "./SlashCommandMenu";
import { useSlashCommands } from "../../hooks/useSlashCommands";
import type { Attachment } from "../../types/chat";

interface Props {
  onSend: (text: string, attachments?: Attachment[]) => void;
  onStop?: () => void;
  loading?: boolean;
  disabled?: boolean;
  attachments?: Attachment[];
  uploading?: boolean;
  onAddFiles?: (files: FileList | File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onClearAttachments?: () => void;
  projectId?: string | null;
}

export function ChatInput({
  onSend, onStop, loading, disabled,
  attachments = [], uploading, onAddFiles, onRemoveAttachment, onClearAttachments,
  projectId,
}: Props) {
  const [value, setValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<{ handleKeyDown: (e: KeyboardEvent) => boolean }>(null);
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;

  const { items: slashItems } = useSlashCommands(projectId);

  // Extract slash filter: if input starts with "/" extract the text after it
  const slashFilter = useMemo(() => {
    if (!menuOpen) return "";
    const match = value.match(/^\/(\S*)$/);
    return match ? match[1] : "";
  }, [value, menuOpen]);

  const handleTranscript = useCallback((text: string) => {
    if (autoSendRef.current) {
      onSendRef.current(text);
      return;
    }
    setValue((prev) => {
      const spacer = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
      return prev + spacer + text;
    });
  }, []);

  const audio = useAudioCapture(handleTranscript);
  const autoSendRef = useRef(audio.autoSend);
  autoSendRef.current = audio.autoSend;

  const handleSlashSelect = useCallback((item: SlashItem) => {
    // Replace the /filter text with a prompt that invokes the skill/tool
    const prefix = item.type === "skill"
      ? `Use the /${item.name} skill: `
      : item.type === "rule"
        ? `Follow the ${item.name} rule: `
        : `/${item.name} `;
    setValue(prefix);
    setMenuOpen(false);
  }, []);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || loading || disabled) return;
    audio.stop();
    setMenuOpen(false);
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setValue("");
    onClearAttachments?.();
  }, [value, attachments, loading, disabled, onSend, audio, onClearAttachments]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Let the slash menu handle navigation keys when open
      if (menuOpen) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Tab") {
          // Forward to the menu
          menuRef.current?.handleKeyDown(e);
          return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
          // If menu is open and there are filtered results, select the item
          menuRef.current?.handleKeyDown(e);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setMenuOpen(false);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit, menuOpen],
  );

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    // Open menu when input is exactly "/" or "/partial"
    if (newValue.match(/^\/\S*$/)) {
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !onAddFiles) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) onAddFiles(files);
  }, [onAddFiles]);

  const toggleCapture = useCallback(() => {
    if (audio.capturing) audio.stop();
    else audio.start();
  }, [audio]);

  const sourceLabel =
    audio.source === "mic" ? "Mic" : audio.source === "desktop" ? "Desktop" : "Mic + Desktop";
  const placeholder = audio.capturing ? `Listening (${sourceLabel})...` : "Type / for commands, or a message...";
  const canSend = (value.trim() || attachments.length > 0) && !disabled && !uploading;

  return (
    <Box sx={{ pt: 1, pb: 0.5, borderTop: 1, borderColor: "divider", flexShrink: 0, position: "relative" }}>
      <SlashMenuWrapper
        ref={menuRef}
        items={slashItems}
        filter={slashFilter}
        onSelect={handleSlashSelect}
        onClose={() => setMenuOpen(false)}
        visible={menuOpen}
      />
      {attachments.length > 0 && (
        <AttachmentPreview attachments={attachments} onRemove={onRemoveAttachment} />
      )}
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
        {audio.supported && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
            <Tooltip title={audio.capturing ? "Stop capture" : `Start capture (${sourceLabel})`}>
              <IconButton
                onClick={toggleCapture}
                disabled={loading || disabled}
                color={audio.capturing ? "error" : "default"}
                size="small"
                sx={audio.capturing ? {
                  animation: "pulse 1.5s ease-in-out infinite",
                  "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.5 } },
                } : undefined}
              >
                {audio.capturing ? <MicOffIcon /> : audio.source === "mic" ? <MicIcon /> : <HeadphonesIcon />}
              </IconButton>
            </Tooltip>
            {audio.capturing && audio.autoSend && (
              <Chip label="auto" size="small" color="success" sx={{ height: 16, fontSize: 10 }} />
            )}
          </Box>
        )}
        <Tooltip title="Attach file">
          <IconButton
            onClick={() => fileRef.current?.click()}
            disabled={loading || disabled}
            size="small"
          >
            {uploading ? <CircularProgress size={20} /> : <AttachFileIcon />}
          </IconButton>
        </Tooltip>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => { if (e.target.files && onAddFiles) onAddFiles(e.target.files); e.target.value = ""; }}
        />
        <TextField
          multiline
          minRows={1}
          maxRows={6}
          fullWidth
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          disabled={loading || disabled}
          autoFocus
          size="small"
          slotProps={{ input: { sx: { fontSize: 16 } } }}
        />
        {loading ? (
          <IconButton onClick={onStop} color="error" size="small"><StopIcon /></IconButton>
        ) : (
          <IconButton onClick={submit} disabled={!canSend} color="primary" size="small"><SendIcon /></IconButton>
        )}
      </Box>
    </Box>
  );
}

// Wrapper to expose keyboard handler via ref to ChatInput
import { forwardRef, useImperativeHandle } from "react";

const SlashMenuWrapper = forwardRef<
  { handleKeyDown: (e: KeyboardEvent) => boolean },
  {
    items: SlashItem[];
    filter: string;
    onSelect: (item: SlashItem) => void;
    onClose: () => void;
    visible: boolean;
  }
>(function SlashMenuWrapper(props, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!props.filter) return props.items;
    const lower = props.filter.toLowerCase();
    return props.items.filter(
      (i) =>
        i.name.toLowerCase().includes(lower) ||
        i.description.toLowerCase().includes(lower) ||
        (i.category?.toLowerCase().includes(lower) ?? false),
    );
  }, [props.items, props.filter]);

  // Reset selection on filter change
  const prevFilter = useRef(props.filter);
  if (prevFilter.current !== props.filter) {
    prevFilter.current = props.filter;
    if (selectedIndex >= filtered.length) setSelectedIndex(0);
  }

  useImperativeHandle(ref, () => ({
    handleKeyDown(e: KeyboardEvent) {
      if (!props.visible || filtered.length === 0) return false;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        props.onSelect(filtered[selectedIndex]);
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        props.onClose();
        return true;
      }
      return false;
    },
  }), [props.visible, filtered, selectedIndex, props.onSelect, props.onClose]);

  if (!props.visible || filtered.length === 0) return null;

  return (
    <SlashCommandMenu
      items={filtered}
      filter={props.filter}
      onSelect={props.onSelect}
      onClose={props.onClose}
      visible={props.visible}
      selectedIndex={selectedIndex}
      onHover={setSelectedIndex}
    />
  );
});

function AttachmentPreview({ attachments, onRemove }: { attachments: Attachment[]; onRemove?: (id: string) => void }) {
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", pb: 1, px: 0.5 }}>
      {attachments.map((a) => (
        <Box
          key={a.id}
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.5,
            bgcolor: "action.hover",
            borderRadius: 1,
            maxWidth: 180,
          }}
        >
          {a.mimeType.startsWith("image/") ? (
            <Box component="img" src={a.url} sx={{ width: 32, height: 32, objectFit: "cover", borderRadius: 0.5 }} />
          ) : (
            <InsertDriveFileIcon sx={{ fontSize: 20, color: "text.secondary" }} />
          )}
          <Box sx={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.name}
          </Box>
          {onRemove && (
            <IconButton size="small" onClick={() => onRemove(a.id)} sx={{ ml: "auto", p: 0.25 }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      ))}
    </Box>
  );
}
