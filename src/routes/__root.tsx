import { createRootRoute, HeadContent, Outlet, Scripts, ScrollRestoration } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import "@/styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
