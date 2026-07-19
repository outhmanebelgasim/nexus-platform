export function AuthenticationFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="shrink-0 px-4 pb-6 pt-4 text-center text-xs text-muted-foreground sm:pb-8">
      &copy; {currentYear} NEXUS Platform. All rights reserved.
    </footer>
  );
}
