import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Route = { path: string; params: Record<string, string> };

const RouterContext = createContext<{
  route: Route;
  navigate: (to: string) => void;
} | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.hash.slice(1) || '/');

  useEffect(() => {
    const onHash = () => setPath(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (to: string) => {
    window.location.hash = to;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const params: Record<string, string> = {};
  const match = path.match(/^\/scan\/(.+)$/);
  if (match) params.id = match[1];
  const reportMatch = path.match(/^\/report\/(.+)$/);
  if (reportMatch) params.id = reportMatch[1];

  return (
    <RouterContext.Provider value={{ route: { path, params }, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
