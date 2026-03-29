import { useState, useEffect, type RefObject } from "react";
import {
  Stack,
  Box,
  Chip,
  TextField,
  Autocomplete,
  IconButton,
  InputAdornment,
  Button,
} from "@mui/material";
import Search from "@mui/icons-material/Search";
import Clear from "@mui/icons-material/Clear";
import FilterListOff from "@mui/icons-material/FilterListOff";
import Add from "@mui/icons-material/Add";
import { TypeIcon } from "./TypeIcon";
import { LabelChip } from "./LabelChip";

// -- Types ------------------------------------------------------------------

export interface FilterState {
  types: string[];
  priorities: string[];
  statuses: string[];
  labels: string[];
  search: string;
}

export function getDefaultFilters(): FilterState {
  return { types: [], priorities: [], statuses: [], labels: [], search: "" };
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

const TICKET_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "closed", label: "Closed" },
] as const;

// -- Props -------------------------------------------------------------------

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  allLabels: string[];
  searchInputRef?: RefObject<HTMLInputElement | null>;
  onCreate?: () => void;
}

// -- Component ---------------------------------------------------------------

export function FilterBar({
  filters,
  onChange,
  allLabels,
  searchInputRef,
  onCreate,
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

  const toggleStatus = (status: string) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: next });
  };

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.priorities.length > 0 ||
    filters.statuses.length > 0 ||
    filters.labels.length > 0 ||
    filters.search !== "";

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ flexWrap: "wrap", py: 1.5, flexShrink: 0, rowGap: 1 }}
    >
      {/* Search input */}
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
        sx={{ width: 220 }}
      />

      {/* Label filter */}
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
        sx={{ width: 180 }}
      />

      <Box sx={{ width: "1px", height: 20, bgcolor: "divider" }} />

      {/* Type chips */}
      <Stack direction="row" spacing={0.5} alignItems="center">
        {TICKET_TYPES.map((t) => (
          <Chip
            key={t.value}
            icon={<TypeIcon type={t.value} fontSize="small" />}
            label={t.label}
            variant={filters.types.includes(t.value) ? "filled" : "outlined"}
            color={filters.types.includes(t.value) ? "primary" : "default"}
            onClick={() => toggleType(t.value)}
            size="small"
            sx={{ px: 0.5 }}
          />
        ))}
      </Stack>

      <Box sx={{ width: "1px", height: 20, bgcolor: "divider" }} />

      {/* Priority chips */}
      <Stack direction="row" spacing={0.5} alignItems="center">
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
      </Stack>

      <Box sx={{ width: "1px", height: 20, bgcolor: "divider" }} />

      {/* Status chips */}
      <Stack direction="row" spacing={0.5} alignItems="center">
        {TICKET_STATUSES.map((s) => (
          <Chip
            key={s.value}
            label={s.label}
            variant={
              filters.statuses.includes(s.value) ? "filled" : "outlined"
            }
            color={
              filters.statuses.includes(s.value) ? "secondary" : "default"
            }
            onClick={() => toggleStatus(s.value)}
            size="small"
          />
        ))}
      </Stack>

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

      {/* Spacer + Create button */}
      <Box sx={{ flex: 1 }} />
      {onCreate && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={onCreate}
          sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
        >
          Create Ticket
        </Button>
      )}
    </Stack>
  );
}
