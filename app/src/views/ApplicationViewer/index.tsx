import { useState, useCallback, useEffect } from "react";
import { Box, Button, Stack, Chip } from "@mui/material";
import WidgetsIcon from "@mui/icons-material/Widgets";
import { PageLayout } from "../../components/PageLayout";
import { ViewerRegion } from "./ViewerRegion";
import { AppPicker } from "./AppPicker";

interface ViewerTarget {
  title: string;
  pid?: number;
}

export default function ApplicationViewer() {
  const [attached, setAttached] = useState(false);
  const [target, setTarget] = useState<ViewerTarget | null>(null);
  const [showPicker, setShowPicker] = useState(true);
  const viewer = window.ctx?.viewer;

  useEffect(() => {
    if (!viewer?.onDetached) return;
    viewer.onDetached(() => {
      setAttached(false);
      setTarget(null);
      setShowPicker(true);
    });
  }, [viewer]);

  const handleSelect = useCallback(
    async (t: ViewerTarget) => {
      if (!viewer) return;
      setShowPicker(false);
      // Bounds will be sent via onBoundsChange after attach
      const result = await viewer.attach(t, { x: 0, y: 0, width: 800, height: 600 });
      if (result.ok) {
        setAttached(true);
        setTarget(t);
      } else {
        setShowPicker(true);
      }
    },
    [viewer],
  );

  const handleDetach = useCallback(async () => {
    if (!viewer) return;
    await viewer.detach();
    setAttached(false);
    setTarget(null);
    setShowPicker(true);
  }, [viewer]);

  const handleBoundsChange = useCallback(
    (bounds: { x: number; y: number; width: number; height: number }) => {
      if (!attached || !viewer) return;
      viewer.updateRegion(bounds);
    },
    [attached, viewer],
  );

  const handleMouseEvent = useCallback(
    (event: {
      localX: number;
      localY: number;
      button: "left" | "right" | "middle";
      type: "click" | "double_click";
    }) => {
      viewer?.relayClick(event);
    },
    [viewer],
  );

  const handleScroll = useCallback(
    (event: {
      localX: number;
      localY: number;
      deltaX: number;
      deltaY: number;
    }) => {
      viewer?.relayScroll(event);
    },
    [viewer],
  );

  const actions = (
    <Stack direction="row" spacing={1} alignItems="center">
      {target && <Chip label={target.title} size="small" />}
      {attached ? (
        <Button size="small" variant="outlined" onClick={handleDetach}>
          Detach
        </Button>
      ) : (
        <Button
          size="small"
          variant="outlined"
          onClick={() => setShowPicker((p) => !p)}
        >
          {showPicker ? "Hide Picker" : "Pick App"}
        </Button>
      )}
    </Stack>
  );

  return (
    <PageLayout
      title="Applications"
      icon={<WidgetsIcon />}
      actions={actions}
      fill
    >
      <Box sx={{ display: "flex", flex: 1, gap: 2, minHeight: 0 }}>
        {showPicker && !attached && (
          <Box sx={{ width: 320, flexShrink: 0, overflow: "auto" }}>
            <AppPicker onSelect={handleSelect} />
          </Box>
        )}
        <ViewerRegion
          onBoundsChange={handleBoundsChange}
          onMouseEvent={handleMouseEvent}
          onScroll={handleScroll}
          attached={attached}
        />
      </Box>
    </PageLayout>
  );
}
