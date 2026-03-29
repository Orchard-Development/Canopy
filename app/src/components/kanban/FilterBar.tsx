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
  Collapse,
  Badge,
} from "@mui/material";
import Search from "@mui/icons-material/Search";
import Clear from "@mui/icons-material/Clear";
import FilterListOff from "@mui/icons-material/FilterListOff";
import FilterList from "@mui/icons-material/FilterList";
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
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
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
  const [showChips, setShowChips] = useState(false);

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

  const chipFilterCount =
    filters.types.length + filters.priorities.length + filters.statuses.length;

  const hasActiveFilters =
    chipFilterCount > 0 ||
    filters.labels.length > 0 ||
    filters.search !== "";

  // Auto-expand chips when chip filters are active
  useEffect(() => {
    if (chipFilterCount > 0) setShowChips(true);
  }, [chipFilterCount]);

  return (
    <Box sx={{ flexShrink: 0, mb: 1 }}>
      {/* Top row: search, labels, filter toggle, create */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ py: 1 }}
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

        {/* Filter toggle */}
        <IconButton
          size="small"
          onClick={() => setShowChips(!showChips)}
          color={showChips || chipFilterCount > 0 ? "primary" : "default"}
          aria-label="Toggle filters"
        >
          <Badge
            badgeContent={chipFilterCount}
            color="primary"
            variant={chipFilterCount > 0 ? "standard" : "dot"}
            invisible={chipFilterCount === 0}
          >
            <FilterList fontSize="small" />
          </Badge>
        </IconButton>

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
            variant="outlined"
            startIcon={<Add />}
            onClick={onCreate}
            sx={{ whiteSpace: "nowrap", flexShrink: 0, textTransform: "none" }}
          >
            Create Ticket
          </Button>
        )}
      </Stack>

      {/* Collapsible chip filters */}
      <Collapse in={showChips}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ pb: 1, flexWrap: "wrap", rowGap: 0.75 }}
        >
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
        </Stack>
      </Collapse>
    </Box>
  );
}
