import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { PageLayout } from "../components/PageLayout";
import { CreateNewTab } from "../components/project/CreateNewTab";
import { ImportExistingTab } from "../components/project/ImportExistingTab";

export default function CreateProject() {
  const [tab, setTab] = useState(0);

  return (
    <PageLayout title="New Project">
      <Box sx={{ maxWidth: 560 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<AddIcon />} iconPosition="start" label="Create New" />
          <Tab icon={<FolderOpenIcon />} iconPosition="start" label="Import Existing" />
        </Tabs>
        {tab === 0 && <CreateNewTab />}
        {tab === 1 && <ImportExistingTab />}
      </Box>
    </PageLayout>
  );
}
