import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { isModuleAuthenticated } from "@food/utils/auth";
import { restaurantAPI } from "@food/api";

/**
 * Role-based Protected Route Component
 * Only allows access if user is authenticated for the specific module
 * Also enforces restaurant onboarding status redirection for the restaurant app.
 */
export default function ProtectedRoute({ children, requiredRole, loginPath = "/user/auth/login" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [checkingRestaurantStatus, setCheckingRestaurantStatus] = useState(requiredRole === "restaurant");

  const isAuthenticated = isModuleAuthenticated(requiredRole);

  useEffect(() => {
    if (requiredRole !== "restaurant" || !isAuthenticated) {
      return;
    }

    let active = true;
    const verifyStatus = async () => {
      try {
        const response = await restaurantAPI.getCurrentRestaurant();
        const restaurant =
          response?.data?.data?.restaurant ||
          response?.data?.restaurant ||
          response?.data?.data ||
          response?.data;

        if (!active) return;

        const status = String(restaurant?.status || "").toLowerCase();
        if (status !== "approved") {
          // Redirect to pending verification screen
          navigate("/food/restaurant/pending-verification", { replace: true });
        }
      } catch (err) {
        console.error("Failed to verify restaurant onboarding status:", err);
      } finally {
        if (active) {
          setCheckingRestaurantStatus(false);
        }
      }
    };

    verifyStatus();

    return () => {
      active = false;
    };
  }, [requiredRole, isAuthenticated, navigate]);

  // If no role required, allow access
  if (!requiredRole) {
    return children;
  }

  // If not authenticated for this module, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  // If verifying restaurant status, display the premium loader
  if (requiredRole === "restaurant" && checkingRestaurantStatus) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="relative">
          <div className="w-10 h-10 border-[3px] border-gray-100/30 rounded-full"></div>
          <div className="absolute top-0 left-0 w-10 h-10 border-[3px] border-restaurant-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return children;
}
