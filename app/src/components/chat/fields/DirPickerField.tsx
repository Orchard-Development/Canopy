import { useState } from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { DirectoryPicker } from "../../DirectoryPicker";
import type { FieldRendererProps } from "../../../types/forms";

function isElectron(): boolean {
  const w = window as unknown as Record<string, unknown>;
  return typeof w.ctx === "object" &&
    typeof (w.ctx as Record<string, unknown>)?.pickDirectory === "function";
}

/** Text field with a folder-browse button. Uses Electron picker or web DirectoryPicker. */
export function DirPickerField({
  field,
  value,
  onChange,
  disabled,
}: FieldRendererProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleBrowse() {
    if (isElectron()) {
      const ctx = (window as unknown as Record<string, unknown>).ctx as { pickDirectory: () => Promise<string | null> };
      const dir = await ctx.pickDirectory();
      if (dir) onChange(dir);
    } else {
      setPickerOpen(true);
    }
  }

  return (
    <>
      <TextField
        size="small"
        label={field.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        helperText={field.helperText}
        required={field.required}
        disabled={disabled}
        fullWidth
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleBrowse} edge="end" disabled={disabled}>
                  <FolderOpenIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <DirectoryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => onChange(p)}
        title="Choose directory"
      />
    </>
  );
}
