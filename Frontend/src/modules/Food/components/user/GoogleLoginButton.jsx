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

        // Store in localStorage matching existing Bhookingo pattern
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

      <div className={`w-full flex justify-center rounded-full overflow-hidden ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 w-full h-12 md:h-14 bg-surface dark:bg-[#2a2a2a] border border-border dark:border-gray-700 rounded-full text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="font-medium">Authenticating...</span>
          </div>
        ) : (
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            useOneTap
            theme="outline"
            size="large"
            shape="pill"
            text="continue_with"
            containerProps={{
              className: "w-full flex justify-center rounded-full overflow-hidden"
            }}
          />
        )}
      </div>
    </div>
  );
}
