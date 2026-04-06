import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Stack, Typography, CircularProgress, Chip,
  TextField, InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { api, type DiscoverPack } from "../../lib/api";
import { useEntitlements } from "../../hooks/useEntitlements";
import { StoreGridCard } from "./StoreGridCard";

const CATEGORIES = ["All", "Discipline", "Workflow", "Tools", "Platform", "Research", "Deploy"];

export function PackStoreTab() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<DiscoverPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [busyPacks, setBusyPacks] = useState<Set<string>>(new Set());
  const { install, remove } = useEntitlements();

  useEffect(() => {
    api.discoverPacks()
      .then(setPacks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = packs.filter((p) => p.pack_type !== "orchard");
    if (category !== "All") {
      const cat = category.toLowerCase();
      result = result.filter((p) => p.category?.toLowerCase() === cat);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [packs, category, search]);

  const handleInstall = useCallback(async (packId: string) => {
    setBusyPacks((prev) => new Set(prev).add(packId));
    try {
      await install(packId);
      setPacks((prev) => prev.map((p) =>
        p.id === packId ? { ...p, entitled: true, entitlement_source: "store" } : p,
      ));
    } finally {
      setBusyPacks((prev) => { const next = new Set(prev); next.delete(packId); return next; });
    }
  }, [install]);

  const handleRemove = useCallback(async (packId: string) => {
    setBusyPacks((prev) => new Set(prev).add(packId));
    try {
      await remove(packId);
      setPacks((prev) => prev.map((p) =>
        p.id === packId ? { ...p, entitled: false, entitlement_source: null } : p,
      ));
    } finally {
      setBusyPacks((prev) => { const next = new Set(prev); next.delete(packId); return next; });
    }
  }, [remove]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        placeholder="Search packs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
          ),
        }}
        sx={{ maxWidth: 360 }}
      />
      <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }}>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            variant={category === cat ? "filled" : "outlined"}
            color={category === cat ? "primary" : "default"}
            onClick={() => setCategory(cat)}
            clickable
          />
        ))}
      </Stack>
      {filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No packs found.
        </Typography>
      ) : (
        <Box sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 2,
        }}>
          {filtered.map((pack) => (
            <StoreGridCard
              key={pack.id}
              pack={pack}
              entitled={pack.entitled}
              busy={busyPacks.has(pack.id)}
              onInstall={() => handleInstall(pack.id)}
              onRemove={() => handleRemove(pack.id)}
              onClick={() => navigate(`/seed-packs/${pack.id}`)}
            />
          ))}
        </Box>
      )}
    </Stack>
  );
}
