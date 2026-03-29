import { useState, useEffect, type RefObject } from "react";
import {
  Stack,
  Chip,
  TextField,
  Autocomplete,
  IconButton,
  InputAdornment,
} from "@mui/material";
import Search from "@mui/icons-material/Search";
import Clear from "@mui/icons-material/Clear";
import FilterListOff from "@mui/icons-material/FilterListOff";
import { TypeIcon } from "./TypeIcon";
import { LabelChip } from "./LabelChip";

// -- Types ------------------------------------------------------------------

export interface FilterState {
  types: string[];
  priorities: string[];
  labels: string[];
  search: string;
}

export function getDefaultFilters(): FilterState {
  return { types: [], priorities: [], labels: [], search: "" };
}

// -- Constants ---------------------------------------------------------------

const TICKET_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "improvement", label: "Improvement" },
  { value: "task", label: "Task" },
] as const;

const TICKET_PRIORITIES = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

// -- Props -------------------------------------------------------------------

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  allLabels: string[];
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

// -- Component ---------------------------------------------------------------

export function FilterBar({
  filters,
  onChange,
  allLabels,
  searchInputRef,
}: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sync local search when filters are reset externally
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounce search input (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onChange({ ...filters, search: localSearch });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Toggle helpers -------------------------------------------------------

  const toggleType = (type: string) => {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onChange({ ...filters, types: next });
  };

  const togglePriority = (priority: string) => {
    const next = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];
    onChange({ ...filters, priorities: next });
  };

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.priorities.length > 0 ||
    filters.labels.length > 0 ||
    filters.search !== "";

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ flexWrap: "wrap", px: 3, py: 1, flexShrink: 0 }}
    >
      {/* Type filter chips */}
      {TICKET_TYPES.map((t) => (
        <Chip
          key={t.value}
          icon={<TypeIcon type={t.value} fontSize="small" />}
          label={t.label}
          variant={filters.types.includes(t.value) ? "filled" : "outlined"}
          color={filters.types.includes(t.value) ? "primary" : "default"}
          onClick={() => toggleType(t.value)}
          size="small"
        />
      ))}

      {/* Priority filter chips */}
      {TICKET_PRIORITIES.map((p) => (
        <Chip
          key={p.value}
          label={p.label}
          variant={
            filters.priorities.includes(p.value) ? "filled" : "outlined"
          }
          color={
            filters.priorities.includes(p.value) ? "primary" : "default"
          }
          onClick={() => togglePriority(p.value)}
          size="small"
        />
      ))}

      {/* Label filter autocomplete */}
      <Autocomplete
        multiple
        size="small"
        options={allLabels}
        value={filters.labels}
        onChange={(_e, newValue) =>
          onChange({ ...filters, labels: newValue })
        }
        renderTags={(value, getTagProps) =>
          value.map((label, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return (
              <LabelChip key={key} label={label} {...tagProps} />
            );
          })
        }
        renderInput={(params) => (
          <TextField {...params} placeholder="Labels" />
        )}
        sx={{ width: 200 }}
      />

      {/* Search input with debounce */}
      <TextField
        size="small"
        placeholder="Search tickets..."
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        inputRef={searchInputRef}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: localSearch ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setLocalSearch("");
                    onChange({ ...filters, search: "" });
                  }}
                  edge="end"
                >
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
        sx={{ width: 250 }}
      />

      {/* Clear all filters */}
      {hasActiveFilters && (
        <IconButton
          size="small"
          onClick={() => {
            onChange(getDefaultFilters());
            setLocalSearch("");
          }}
          aria-label="Clear all filters"
        >
          <FilterListOff fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}
