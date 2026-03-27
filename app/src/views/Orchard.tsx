import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useActiveProject } from "../hooks/useActiveProject";
import { ProjectProvider } from "../hooks/useProject";

const ProjectDetail = lazy(() => import("./ProjectDetail"));

function Loading() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

export default function Orchard() {
  const { project, loading } = useActiveProject();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !project) {
      navigate("/projects/new", { replace: true });
    }
  }, [loading, project, navigate]);

  if (loading || !project) return <Loading />;

  return (
    <ProjectProvider projectId={project.id}>
      <Box sx={{ pt: 2 }}>
        <Suspense fallback={<Loading />}>
          <ProjectDetail embedded />
        </Suspense>
      </Box>
    </ProjectProvider>
  );
}
