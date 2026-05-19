"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser, patchUser } from "@/store/slices/authSlice";
import { fetchColleges } from "@/store/slices/collegesSlice";
import { authService } from "@/services/authService";
import { uploadService } from "@/services/uploadService";
import { ProfileSkeleton } from "@/components/common/Skeletons";
import { RoleBadge } from "@/components/common/Badges";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  Calendar,
  School,
  Shield,
  Info,
  Lock,
  Camera,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const EMPTY_GENDER_VALUE = "__no_gender__";
const EMPTY_COLLEGE_VALUE = "__no_college__";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((s) => s.auth);
  const { items: colleges } = useAppSelector((s) => s.colleges);

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [saving, setSaving] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    dispatch(fetchColleges({}));
  }, [dispatch]);

  // Populate form from user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
      setBio(user.bio || "");
      setCollegeId(user.collegeId || user.college?.id || "");
      setGender(user.gender || "");
      setDateOfBirth(
        user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split("T")[0]
          : "",
      );
    }
  }, [user]);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await authService.updateProfile({
        firstName,
        lastName,
        phone: phone || undefined,
        bio: bio || undefined,
        collegeId: collegeId || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth
          ? new Date(dateOfBirth).toISOString()
          : undefined,
      });
      dispatch(fetchCurrentUser());
      toast.success("Profile updated successfully");
    } catch (error) {
      const err = error as {
        response?: {
          data?: { message?: string; errors?: Record<string, string[]> };
        };
        message?: string;
      };
      const data = err.response?.data;
      if (data?.errors) {
        const msgs = Object.values(data.errors).flat();
        toast.error("Profile update failed", {
          description: msgs[0] || "Please check your inputs",
        });
      } else {
        toast.error(data?.message || err.message || "Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const uploadResult = await uploadService.uploadFile(file, "profiles");
      const filePath =
        uploadResult.data?.filePath ||
        (uploadResult as { filePath?: string }).filePath;

      if (!filePath) {
        toast.error("Upload failed: no file path returned");
        return;
      }

      await authService.updateProfile({ profileImage: filePath });
      // Immediately reflect in UI without triggering isLoading skeleton
      dispatch(patchUser({ profileImage: filePath }));
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setChangingPw(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const err = error as {
        response?: {
          data?: { message?: string; errors?: Record<string, string[]> };
        };
        message?: string;
      };
      const data = err.response?.data;
      if (data?.errors) {
        const msgs = Object.values(data.errors).flat();
        toast.error("Password change failed", {
          description: msgs[0] || "Please check your inputs",
        });
      } else {
        toast.error(
          data?.message ||
            err.message ||
            "Failed to change password. Check your current password.",
        );
      }
    } finally {
      setChangingPw(false);
    }
  };

  const handleDiscard = () => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
      setBio(user.bio || "");
      setCollegeId(user.collegeId || user.college?.id || "");
      setGender(user.gender || "");
      setDateOfBirth(
        user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split("T")[0]
          : "",
      );
    }
  };

  if (isLoading) return <ProfileSkeleton />;

  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();
  const collegeName = colleges.find(
    (c) => (c.id || c._id) === (user?.collegeId || user?.college?.id),
  )?.name;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
        {/* Gradient banner */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />

        <div className="relative flex flex-col md:flex-row md:items-end gap-6 p-6 pt-12">
          {/* Avatar with upload */}
          <div className="relative group">
            <div className="w-28 h-28 rounded-xl border-4 border-white dark:border-slate-900 shadow-lg overflow-hidden bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              {user?.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt="Profile"
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {initials}
                </span>
              )}
            </div>
            {/* Camera overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* Info */}
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {user?.firstName} {user?.lastName}
              </h1>
              <RoleBadge role={user?.role || "student"} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-sm">
              <School className="h-4 w-4" />
              {collegeName || "No college set"}{" "}
              {user?.email && `• ${user.email}`}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Information
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Update your personal details and academic affiliation.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Email (Read Only) */}
            <div className="space-y-2 group relative">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email Address
                <Lock className="h-3 w-3 text-slate-400" />
              </label>
              <input
                type="email"
                readOnly
                value={user?.email || ""}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-2.5 px-3 text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Gender
              </label>
              <Select
                value={gender || EMPTY_GENDER_VALUE}
                onValueChange={(value) =>
                  setGender(value === EMPTY_GENDER_VALUE ? "" : value)
                }
              >
                <SelectTrigger className="h-11 w-full rounded-lg border-slate-300 bg-white px-3 shadow-none dark:border-slate-700 dark:bg-slate-900">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_GENDER_VALUE}>
                    Not specified
                  </SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">
                    Prefer not to say
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={
                  new Date(Date.now() - 16 * 365.25 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* College Affiliation */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <School className="h-3.5 w-3.5" />
                College Affiliation
              </label>
              <Select
                value={collegeId || EMPTY_COLLEGE_VALUE}
                onValueChange={(value) =>
                  setCollegeId(value === EMPTY_COLLEGE_VALUE ? "" : value)
                }
              >
                <SelectTrigger className="h-11 w-full rounded-lg border-slate-300 bg-white px-3 shadow-none dark:border-slate-700 dark:bg-slate-900">
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_COLLEGE_VALUE}>
                    No college selected
                  </SelectItem>
                  {colleges.map((college) => {
                    const collegeValue = college.id ?? college._id;

                    if (!collegeValue) {
                      return null;
                    }

                    return (
                      <SelectItem key={collegeValue} value={collegeValue}>
                        {college.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Role (display only) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Account Role
                <Lock className="h-3 w-3 text-slate-400" />
              </label>
              <input
                type="text"
                readOnly
                value={
                  user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : "Student"
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-2.5 px-3 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* Bio */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Biography
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Tell us about your interests, what you're studying..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
              />
              <p className="text-[11px] text-slate-400">
                A brief bio helps you connect at events.
              </p>
            </div>
          </div>
        </div>

        {/* Save / Discard */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3 rounded-b-xl border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleDiscard}
            className="px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleProfileSave}
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 shadow-sm shadow-primary/20 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Security & Password Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security &amp; Password
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Secure your account by updating your credentials.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Current Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Hint */}
          <div className="mt-6 flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Use at least 8 characters, including one uppercase letter and one
              special character for a strong password.
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 flex justify-end rounded-b-xl border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handlePasswordChange}
            disabled={
              changingPw || !currentPassword || !newPassword || !confirmPassword
            }
            className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {changingPw ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-red-700 dark:text-red-400">
            Deactivate Account
          </h3>
          <p className="text-sm text-red-600/70 dark:text-red-400/60">
            This action is permanent and cannot be undone. All your event
            history will be removed.
          </p>
        </div>
        <button
          className="px-5 py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors whitespace-nowrap"
          onClick={() =>
            toast.info("Account deactivation is not available yet.")
          }
        >
          Deactivate
        </button>
      </div>
    </div>
  );
}
