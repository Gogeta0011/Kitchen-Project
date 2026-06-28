import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/discover")({
  beforeLoad: async () => {
    throw redirect({ to: "/community" });
  },
  component: () => null,
});
