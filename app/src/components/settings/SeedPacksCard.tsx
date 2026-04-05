import { useNavigate } from "react-router-dom";
import {
  Card, CardActionArea, CardContent, Typography, Stack,
} from "@mui/material";
import GrassIcon from "@mui/icons-material/Grass";
import StoreIcon from "@mui/icons-material/Store";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export function SeedPacksCard() {
  const navigate = useNavigate();

  return (
    <Card variant="outlined">
      <CardActionArea onClick={() => navigate("/seed-packs")}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <GrassIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>Seed Packs</Typography>
            <ArrowForwardIcon fontSize="small" color="action" sx={{ ml: "auto !important" }} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Manage seed packs, browse the Pack Store, and see your installed packs.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <StoreIcon fontSize="small" color="action" />
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
              onClick={(e) => { e.stopPropagation(); navigate("/pack-store"); }}
            >
              Browse Pack Store
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
