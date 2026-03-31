import { Autocomplete, Chip, TextField } from "@mui/material";

interface LabelAutocompleteProps {
  value: string[];
  onChange: (labels: string[]) => void;
}

export function LabelAutocomplete({ value, onChange }: LabelAutocompleteProps) {
  return (
    <Autocomplete
      multiple
      freeSolo
      size="small"
      options={[] as string[]}
      value={value}
      onChange={(_event, newValue) => onChange(newValue as string[])}
      renderTags={(tagValues, getTagProps) =>
        tagValues.map((label, index) => {
          const { key, ...rest } = getTagProps({ index });
          return (
            <Chip
              key={key}
              label={label}
              size="small"
              variant="outlined"
              sx={{
                height: 22,
                "& .MuiChip-label": { px: 1, fontSize: "0.75rem" },
              }}
              {...rest}
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField {...params} label="Labels" placeholder="Add labels..." fullWidth />
      )}
    />
  );
}
