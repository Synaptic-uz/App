import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import AgentAnalytics from "./pages/AgentAnalytics";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import Campaigns from "./pages/Campaigns";
import Agents from "./pages/Agents";
import ChatDemo from "./pages/ChatDemo";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./Layout";
import ProtectedRoute from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { 
        path: "agent/analytics", 
        element: (
          <ProtectedRoute allowedRoles={['agent']}>
            <AgentAnalytics />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "business/analytics", 
        element: (
          <ProtectedRoute allowedRoles={['business']}>
            <BusinessAnalytics />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "business/campaigns", 
        element: (
          <ProtectedRoute allowedRoles={['business']}>
            <Campaigns />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "agent/manage", 
        element: (
          <ProtectedRoute allowedRoles={['agent']}>
            <Agents />
          </ProtectedRoute>
        ) 
      },
      { path: "demo", element: <ChatDemo /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
