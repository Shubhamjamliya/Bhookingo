import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI } from "@food/api";
import { AlertCircle, Loader2 } from "lucide-react";

export default function GoogleLoginButton() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError("");

    try {
      const ref = searchParams.get("ref") || "";
      const { credential } = credentialResponse;

      const response = await authAPI.googleLogin({
        credential,
        ref,
        platform: "web"
      });

      const { data } = response;
      if (data && data.data) {
        const { token, refreshToken, user } = data.data;

        localStorage.setItem("user_authenticated", "true");
        localStorage.setItem("user_accessToken", token);
        localStorage.setItem("user_refreshToken", refreshToken);
        localStorage.setItem("user_profile", JSON.stringify(user));

        navigate("/food/user");
      }
    } catch (err) {
      console.error("Google login failed", err);
      const message = err?.response?.data?.message || err?.response?.data?.error || "Google authentication failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    setError("Google authentication failed. Please try again.");
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 pl-1 mb-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative w-full">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 w-full h-12 md:h-14 bg-white dark:bg-[#2a2a2a] border border-border dark:border-gray-700 rounded-full text-text-secondary shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="font-medium text-sm md:text-base">Authenticating...</span>
          </div>
        ) : (
          <div className="relative w-full h-12 md:h-14 rounded-full overflow-hidden">
            {/* Custom Google Button UI */}
            <div className="absolute inset-0 w-full h-full bg-white dark:bg-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#333333] border border-border dark:border-gray-700 rounded-full flex items-center justify-center gap-3 shadow-sm transition-colors cursor-pointer pointer-events-none z-0">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="font-medium text-sm md:text-base text-text-primary dark:text-gray-100">Continue with Google</span>
            </div>

            {/* Transparent Google SDK Trigger */}
            <div className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer overflow-hidden [&>div]:!w-full [&>div]:!h-full [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!scale-150">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                useOneTap
                theme="outline"
                size="large"
                shape="pill"
                text="continue_with"
                containerProps={{
                  className: "w-full h-full cursor-pointer"
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
