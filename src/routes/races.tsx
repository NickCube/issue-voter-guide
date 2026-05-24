import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/races")({
  component: RacesLayout,
});

function RacesLayout() {
  return <Outlet />;
}