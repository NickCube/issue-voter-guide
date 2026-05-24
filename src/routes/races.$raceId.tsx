import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/races/$raceId")({
  component: RaceLayout,
});

function RaceLayout() {
  return <Outlet />;
}