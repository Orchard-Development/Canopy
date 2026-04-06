import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Stack, Typography, CircularProgress,
  TextField, Tabs, Tab, InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { api, type DiscoverPack } from "../../lib/api";
import { useEntitlements } from "../../hooks/useEntitlements";
import { StorePackCard } from "./StorePackCard";

const CATEGORY_TABS = ["All", "Discipline", "Workflow", "Tools", "Platform", "Research", "Deploy"];

export function PackStoreTab() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<DiscoverPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryTab, setCategoryTab] = useState("All");
  const { install, remove } = useEntitlements();

  useEffect(() => {
    api.discoverPacks()
      .then(setPacks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    // Hide orchard packs (they belong in the Orchard tab) and already-installed packs
    let result = packs.filter((p) => p.pack_type !== "orchard" && !p.entitled);
    if (categoryTab !== "All") {
      const cat = categoryTab.toLowerCase();
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
  }, [packs, categoryTab, search]);

  const handleInstall = async (packId: string) => {
    await install(packId);
    setPacks((prev) => prev.map((p) =>
      p.id === packId ? { ...p, entitled: true, entitlement_source: "free" } : p,
    ));
  };

  const handleRemove = async (packId: string) => {
    await remove(packId);
    setPacks((prev) => prev.map((p) =>
      p.id === packId ? { ...p, entitled: false, entitlement_source: null } : p,
    ));
  };

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
      <Tabs
        value={categoryTab}
        onChange={(_, v) => setCategoryTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 32, "& .MuiTab-root": { minHeight: 32, py: 0.5 } }}
      >
        {CATEGORY_TABS.map((t) => <Tab key={t} label={t} value={t} />)}
      </Tabs>
      {filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No packs found.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {filtered.map((pack) => (
            <StorePackCard
              key={pack.id}
              pack={pack}
              entitled={pack.entitled}
              onInstall={() => handleInstall(pack.id)}
              onRemove={() => handleRemove(pack.id)}
              onClick={() => navigate(`/seed-packs/${pack.id}`)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
