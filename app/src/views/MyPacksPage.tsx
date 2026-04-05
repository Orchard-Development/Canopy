import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Stack, Typography, Chip, CircularProgress, Divider,
} from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import { PageLayout } from "../components/PageLayout";
import { api, type DiscoverPack } from "../lib/api";
import { useEntitlements } from "../hooks/useEntitlements";
import { StorePackCard } from "../components/seedpacks/StorePackCard";

export default function MyPacksPage() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<DiscoverPack[]>([]);
  const [loading, setLoading] = useState(true);
  const { entitlements, entitled, remove, refresh } = useEntitlements();

  useEffect(() => {
    api.discoverPacks()
      .then(setPacks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const myPacks = useMemo(() => {
    const entitledIds = new Set(entitlements.map((e) => e.pack_id));
    return packs.filter((p) => entitledIds.has(p.id));
  }, [packs, entitlements]);

  const corePacks = useMemo(() => myPacks.filter((p) => p.auto_apply), [myPacks]);
  const optionalPacks = useMemo(() => myPacks.filter((p) => !p.auto_apply), [myPacks]);

  const handleRemove = async (packId: string) => {
    await remove(packId);
    setPacks((prev) => prev.map((p) =>
      p.id === packId ? { ...p, entitled: false, entitlement_source: null } : p,
    ));
  };

  if (loading) {
    return (
      <PageLayout title="My Packs" icon={<InventoryIcon />}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="My Packs"
      icon={<InventoryIcon />}
      badge={<Chip label={`${myPacks.length} owned`} size="small" />}
    >
      <Stack spacing={2}>
        {corePacks.length > 0 && (
          <>
            <Typography variant="overline" color="text.secondary">Core Packs</Typography>
            <Stack spacing={1}>
              {corePacks.map((pack) => (
                <StorePackCard
                  key={pack.id}
                  pack={pack}
                  entitled
                  onInstall={() => {}}
                  onRemove={() => {}}
                  onClick={() => navigate(`/seed-packs/${pack.id}`)}
                />
              ))}
            </Stack>
          </>
        )}

        {corePacks.length > 0 && optionalPacks.length > 0 && <Divider />}

        {optionalPacks.length > 0 && (
          <>
            <Typography variant="overline" color="text.secondary">Optional Packs</Typography>
            <Stack spacing={1}>
              {optionalPacks.map((pack) => (
                <StorePackCard
                  key={pack.id}
                  pack={pack}
                  entitled
                  onInstall={() => {}}
                  onRemove={() => handleRemove(pack.id)}
                  onClick={() => navigate(`/seed-packs/${pack.id}`)}
                />
              ))}
            </Stack>
          </>
        )}

        {myPacks.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            You have no installed packs. Visit the Pack Store to browse available packs.
          </Typography>
        )}
      </Stack>
    </PageLayout>
  );
}
