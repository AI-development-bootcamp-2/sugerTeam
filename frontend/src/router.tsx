import { createBrowserRouter } from 'react-router-dom';
import TimeReportPage from './pages/time-report/TimeReportPage';

const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: <TimeReportPage />,
  },
  {
    path: '/',
    element: <TimeReportPage />,
  },
]);

export default router;
