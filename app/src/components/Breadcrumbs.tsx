import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { useViewRegistry } from "../hooks/useViewRegistry";
import type { ViewEntry } from "../hooks/useViewRegistry";
import { useActiveProject } from "../hooks/useActiveProject";

interface Crumb {
  label: string;
  path?: string;
}

const DETAIL_LABELS: Record<string, string> = {
  proposals: "Proposals",
  projects: "Projects",
  terminals: "Terminals",
  feed: "Feed",
  approvals: "Approvals",
};

function buildCrumbs(pathname: string, projectName: string | null, views: ViewEntry[]): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [];

  // Match top-level view from registry
  const topSegment = `/${segments[0]}`;
  const view = views.find(
    (v) => v.path === topSegment || v.path === `${topSegment}/*` || v.path.startsWith(topSegment),
  );

  if (view) {
    const isCurrentPage = segments.length === 1;
    crumbs.push({ label: view.label, path: isCurrentPage ? undefined : view.path.replace("/*", "") });
    return crumbs;
  }

  // Detail routes: /projects/:id, /proposals/:slug, /terminals/:id
  const section = segments[0];
  const sectionLabel = DETAIL_LABELS[section];

  if (sectionLabel) {
    crumbs.push({ label: sectionLabel, path: section === "projects" ? "/workspace" : `/${section}` });
  }

  // Entity name (project name or ID)
  if (segments.length >= 2 && section === "projects" && projectName) {
    const hasSubpage = segments.length > 2;
    crumbs.push({
      label: projectName,
      path: hasSubpage ? `/projects/${segments[1]}` : undefined,
    });

    // Sub-page: feed, approvals, etc.
    if (hasSubpage) {
      const subLabel = DETAIL_LABELS[segments[2]] ?? segments[2];
      crumbs.push({ label: subLabel });
    }
  }

  return crumbs;
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const { project } = useActiveProject();
  const { views } = useViewRegistry();
  const crumbs = buildCrumbs(pathname, project?.name ?? null, views);

  if (crumbs.length === 0) return null;

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon sx={{ fontSize: 14, color: "text.disabled" }} />}
      sx={{ "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" } }}
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        if (isLast || !crumb.path) {
          return (
            <Typography
              key={crumb.label}
              variant="body2"
              noWrap
              sx={{ fontWeight: 500, color: "text.primary", fontSize: 13 }}
            >
              {crumb.label}
            </Typography>
          );
        }
        return (
          <Link
            key={crumb.label}
            component={RouterLink}
            to={crumb.path}
            underline="hover"
            noWrap
            sx={{ fontSize: 13, color: "text.secondary" }}
          >
            {crumb.label}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
}
