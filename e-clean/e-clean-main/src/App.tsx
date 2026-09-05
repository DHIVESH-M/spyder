import { RouterProvider, useRouter } from '@/lib/router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import ScanPage from '@/pages/ScanPage';
import RecoveryPage from '@/pages/RecoveryPage';
import HistoryPage from '@/pages/HistoryPage';
import AboutPage from '@/pages/AboutPage';
import ReportPage from '@/pages/ReportPage';

function Routes() {
  const { route } = useRouter();
  const path = route.path;

  let page;
  if (path === '/' || path === '') page = <HomePage />;
  else if (path === '/scan') page = <ScanPage />;
  else if (path === '/recovery') page = <RecoveryPage />;
  else if (path === '/history') page = <HistoryPage />;
  else if (path === '/about') page = <AboutPage />;
  else if (path.startsWith('/report/')) page = <ReportPage />;
  else page = <HomePage />;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{page}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <Routes />
    </RouterProvider>
  );
}
