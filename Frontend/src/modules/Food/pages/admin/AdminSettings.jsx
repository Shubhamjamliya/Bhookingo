import { useState, useEffect } from "react";
import { adminAPI } from "@food/api";
import { Button } from "@food/components/ui/button";
import { Input } from "@food/components/ui/input";
import { Label } from "@food/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@food/components/ui/card";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Save, Loader2, Shield, User, Mail, Truck, Phone, AlertCircle, UserCheck, RefreshCw } from "lucide-react";
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function AdminSettings() {
  const [adminInfo, setAdminInfo] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Recovery settings state
  const [recoveryInfo, setRecoveryInfo] = useState({
    recoveryEmail: "",
    recoveryMobile: "",
    recoveryEmailVerified: false,
    recoveryMobileVerified: false,
    recoverySettingsUpdatedAt: null,
    updatedBy: null
  });
  const [newRecoveryEmail, setNewRecoveryEmail] = useState("");
  const [newRecoveryMobile, setNewRecoveryMobile] = useState("");
  
  // Verification state
  const [verificationType, setVerificationType] = useState(null); // 'email' | 'mobile'
  const [verificationValue, setVerificationValue] = useState("");
  const [verificationOtp, setVerificationOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Single API: getAdminProfile (GET /auth/me) for current account display
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await adminAPI.getAdminProfile();
        const admin = res?.data?.data?.admin ?? res?.data?.admin;
        if (!cancelled && admin) {
          setAdminInfo({ name: admin.name, email: admin.email, role: admin.role });
          
          if (admin.role === 'ADMIN') {
            try {
              const recRes = await adminAPI.getRecoverySettings();
              if (recRes?.data?.success && recRes.data.data) {
                const data = recRes.data.data;
                setRecoveryInfo(data);
                setNewRecoveryEmail(data.recoveryEmail || "");
                setNewRecoveryMobile(data.recoveryMobile || "");
              }
            } catch (_) {}
          }
          return;
        }
      } catch (_) {}
      if (!cancelled) {
        try {
          const adminUserStr = localStorage.getItem("admin_user");
          if (adminUserStr) {
            const local = JSON.parse(adminUserStr);
            setAdminInfo({
              name: local.name || "Admin User",
              email: local.email || "",
              role: local.role || "admin",
            });
          }
        } catch (_) {}
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);


  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters long";
    }

    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    try {
      setSaving(true);
      await adminAPI.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      // Clear form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toast.success("Password changed successfully");
    } catch (error) {
      debugError("Error changing password:", error);
      const errorMessage =
        error?.response?.data?.message || "Failed to change password";
      
      // Set specific error for current password
      if (errorMessage.includes("current password") || errorMessage.includes("incorrect")) {
        setErrors({ currentPassword: errorMessage });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRequestVerify = async (type, value) => {
    const cleanValue = String(value || '').trim();
    if (!cleanValue) {
      toast.error(`Please enter a valid recovery ${type}`);
      return;
    }

    if (!window.confirm(`Are you sure you want to verify and set ${cleanValue} as your new recovery ${type}?`)) {
      return;
    }

    try {
      setIsVerifying(true);
      const res = await adminAPI.requestRecoveryVerify(type, cleanValue);
      if (res?.data?.success) {
        setVerificationType(type);
        setVerificationValue(cleanValue);
        setOtpSent(true);
        setVerificationOtp("");
        toast.success(res.data.message || `Verification code sent successfully to ${cleanValue}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send verification code");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmVerify = async (e) => {
    e.preventDefault();
    if (!verificationOtp) {
      toast.error("Please enter the verification code");
      return;
    }

    try {
      setIsVerifying(true);
      const res = await adminAPI.confirmRecoveryVerify(verificationType, verificationValue, verificationOtp);
      if (res?.data?.success) {
        toast.success(`Recovery ${verificationType} verified and updated successfully!`);
        setOtpSent(false);
        setVerificationType(null);
        setVerificationValue("");
        setVerificationOtp("");
        
        // Reload settings
        const recRes = await adminAPI.getRecoverySettings();
        if (recRes?.data?.success && recRes.data.data) {
          const data = recRes.data.data;
          setRecoveryInfo(data);
          setNewRecoveryEmail(data.recoveryEmail || "");
          setNewRecoveryMobile(data.recoveryMobile || "");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired verification code");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-600 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Current account (real data) */}
      {adminInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-neutral-700" />
              <CardTitle>Current account</CardTitle>
            </div>
            <CardDescription>
              Logged in with the following account. Use the form below to change password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-neutral-500" />
              <span className="text-neutral-600">Name:</span>
              <span className="font-medium text-neutral-900">{adminInfo.name || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-neutral-500" />
              <span className="text-neutral-600">Email:</span>
              <span className="font-medium text-neutral-900">{adminInfo.email || "—"}</span>
            </div>
            {adminInfo.role && (
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-neutral-500" />
                <span className="text-neutral-600">Role:</span>
                <span className="font-medium capitalize text-neutral-900">{adminInfo.role}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-neutral-700" />
            <CardTitle>Change Password</CardTitle>
          </div>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    handlePasswordChange("currentPassword", e.target.value)
                  }
                  placeholder="Enter your current password"
                  className={`h-11 pr-12 ${
                    errors.currentPassword ? "border-red-500" : ""
                  }`}
                  disabled={saving}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 transition-colors"
                  disabled={saving}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-red-600">{errors.currentPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    handlePasswordChange("newPassword", e.target.value)
                  }
                  placeholder="Enter your new password"
                  className={`h-11 pr-12 ${
                    errors.newPassword ? "border-red-500" : ""
                  }`}
                  disabled={saving}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 transition-colors"
                  disabled={saving}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-600">{errors.newPassword}</p>
              )}
              <p className="text-xs text-neutral-500">
                Password must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    handlePasswordChange("confirmPassword", e.target.value)
                  }
                  placeholder="Confirm your new password"
                  className={`h-11 pr-12 ${
                    errors.confirmPassword ? "border-red-500" : ""
                  }`}
                  disabled={saving}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 transition-colors"
                  disabled={saving}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-neutral-200">
              <Button
                type="submit"
                disabled={saving}
                className="bg-black text-white hover:bg-neutral-900 h-11 px-8"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Admin Recovery Settings Card (Super-Admin Only) */}
      {adminInfo && adminInfo.role === 'ADMIN' && (
        <Card className="border border-slate-150 shadow-sm rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-neutral-700" />
              <CardTitle>Admin Recovery Settings</CardTitle>
            </div>
            <CardDescription>
              Configure backup contact channels used to securely verify recovery OTPs when resetting passwords. Only primary Super Admin can access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Recovery Email Input */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-850 relative">
                <Label htmlFor="recoveryEmail" className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-gray-300">
                  <Mail className="w-4 h-4 text-slate-500" />
                  Recovery Email Address
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="recoveryEmail"
                    type="email"
                    value={newRecoveryEmail}
                    onChange={(e) => setNewRecoveryEmail(e.target.value)}
                    placeholder="recovery@bhookingo.com"
                    className="bg-white dark:bg-[#1a1a1a] rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={() => handleRequestVerify('email', newRecoveryEmail)}
                    disabled={isVerifying || newRecoveryEmail.trim().toLowerCase() === (recoveryInfo.recoveryEmail || '').trim().toLowerCase()}
                    className="bg-black hover:bg-neutral-800 text-white rounded-xl px-4"
                  >
                    Verify
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  {recoveryInfo.recoveryEmailVerified ? (
                    <span className="flex items-center gap-1 text-green-600 font-bold">
                      <UserCheck className="w-3.5 h-3.5" />
                      Verified: {recoveryInfo.recoveryEmail}
                    </span>
                  ) : recoveryInfo.recoveryEmail ? (
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Unverified: {recoveryInfo.recoveryEmail}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">No recovery email configured</span>
                  )}
                </div>
              </div>

              {/* Recovery Mobile Input */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-850 relative">
                <Label htmlFor="recoveryMobile" className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-gray-300">
                  <Phone className="w-4 h-4 text-slate-500" />
                  Recovery Mobile Number
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="recoveryMobile"
                    type="text"
                    value={newRecoveryMobile}
                    onChange={(e) => setNewRecoveryMobile(e.target.value)}
                    placeholder="+919999999999"
                    className="bg-white dark:bg-[#1a1a1a] rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={() => handleRequestVerify('mobile', newRecoveryMobile)}
                    disabled={isVerifying || newRecoveryMobile.trim() === (recoveryInfo.recoveryMobile || '').trim()}
                    className="bg-black hover:bg-neutral-800 text-white rounded-xl px-4"
                  >
                    Verify
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  {recoveryInfo.recoveryMobileVerified ? (
                    <span className="flex items-center gap-1 text-green-600 font-bold">
                      <UserCheck className="w-3.5 h-3.5" />
                      Verified: {recoveryInfo.recoveryMobile}
                    </span>
                  ) : recoveryInfo.recoveryMobile ? (
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Unverified: {recoveryInfo.recoveryMobile}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">No recovery mobile configured</span>
                  )}
                </div>
              </div>

            </div>

            {/* OTP Verification Prompt */}
            {otpSent && (
              <form onSubmit={handleConfirmVerify} className="p-5 border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-500">
                  <Lock className="w-5 h-5" />
                  <span className="font-bold text-sm">Enter Verification OTP</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-gray-400">
                  We've sent a 6-digit code to <strong>{verificationValue}</strong>. Please enter the code below to verify and activate this recovery channel.
                </p>
                <div className="flex gap-2 max-w-sm">
                  <Input
                    type="text"
                    required
                    placeholder="Enter 6-digit OTP"
                    value={verificationOtp}
                    onChange={(e) => setVerificationOtp(e.target.value)}
                    className="rounded-xl bg-white dark:bg-[#1a1a1a] h-11"
                  />
                  <Button
                    type="submit"
                    disabled={isVerifying}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-5 rounded-xl h-11"
                  >
                    {isVerifying ? "Verifying..." : "Confirm OTP"}
                  </Button>
                </div>
              </form>
            )}

            {/* Audit tracker details */}
            {(recoveryInfo.recoverySettingsUpdatedAt || recoveryInfo.updatedBy) && (
              <div className="pt-4 border-t border-slate-100 dark:border-gray-850 flex flex-wrap gap-4 text-xs text-slate-500">
                {recoveryInfo.updatedBy && (
                  <span>Updated By: <strong className="text-slate-700 dark:text-gray-300">{recoveryInfo.updatedBy.name} ({recoveryInfo.updatedBy.email})</strong></span>
                )}
                {recoveryInfo.recoverySettingsUpdatedAt && (
                  <span>Last Updated: <strong className="text-slate-700 dark:text-gray-300">{new Date(recoveryInfo.recoverySettingsUpdatedAt).toLocaleString('en-IN')}</strong></span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

