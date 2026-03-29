import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Box, Stack, IconButton, useTheme } from "@mui/material";
import FormatBold from "@mui/icons-material/FormatBold";
import FormatItalic from "@mui/icons-material/FormatItalic";
import FormatStrikethrough from "@mui/icons-material/FormatStrikethrough";
import Code from "@mui/icons-material/Code";
import FormatListBulleted from "@mui/icons-material/FormatListBulleted";
import FormatListNumbered from "@mui/icons-material/FormatListNumbered";
import DataObject from "@mui/icons-material/DataObject";
import Title from "@mui/icons-material/Title";

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function TipTapEditor({ content, onChange, placeholder, readOnly }: TipTapEditorProps) {
  const theme = useTheme();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder ?? "Add a description...",
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  // Sync content when it changes externally (e.g., switching tickets)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Sync editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  if (!editor) return null;

  return (
    <Box>
      {!readOnly && (
        <Stack
          direction="row"
          gap={0.5}
          sx={{
            mb: 0.5,
            flexWrap: "wrap",
            bgcolor: "action.hover",
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            p: 0.5,
          }}
        >
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            color={editor.isActive("bold") ? "primary" : "default"}
            aria-label="Bold"
          >
            <FormatBold fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            color={editor.isActive("italic") ? "primary" : "default"}
            aria-label="Italic"
          >
            <FormatItalic fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            color={editor.isActive("strike") ? "primary" : "default"}
            aria-label="Strikethrough"
          >
            <FormatStrikethrough fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleCode().run()}
            color={editor.isActive("code") ? "primary" : "default"}
            aria-label="Code"
          >
            <Code fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            color={editor.isActive("bulletList") ? "primary" : "default"}
            aria-label="Bullet list"
          >
            <FormatListBulleted fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            color={editor.isActive("orderedList") ? "primary" : "default"}
            aria-label="Numbered list"
          >
            <FormatListNumbered fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            color={editor.isActive("codeBlock") ? "primary" : "default"}
            aria-label="Code block"
          >
            <DataObject fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            color={editor.isActive("heading") ? "primary" : "default"}
            aria-label="Heading"
          >
            <Title fontSize="small" />
          </IconButton>
        </Stack>
      )}
      <Box
        sx={{
          minHeight: 120,
          maxHeight: 400,
          overflowY: "auto",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.borderRadius}px`,
          px: 1.5,
          py: 1.5,
          "&:focus-within": {
            borderColor: theme.palette.primary.main,
          },
          "& .tiptap": {
            outline: "none",
            minHeight: 96,
          },
          "& .tiptap p.is-editor-empty:first-child::before": {
            color: theme.palette.text.disabled,
            content: "attr(data-placeholder)",
            float: "left",
            height: 0,
            pointerEvents: "none",
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
