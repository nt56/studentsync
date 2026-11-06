"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser, patchUser } from "@/store/slices/authSlice";
import { fetchCollegeOptions } from "@/store/slices/collegesSlice";
import { authService } from "@/services/authService";
import { uploadService } from "@/services/uploadService";
import { ProfileSkeleton } from "@/components/common/Skeletons";
import { RoleBadge } from "@/components/common/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
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

const getSelectedCollegeId = (
  user:
    | { collegeId?: string; college?: { id: string; name: string } | null }
    | null
    | undefined,
) => {
  if (user?.college?.id) {
    return user.college.id;
  }

  if (user?.collegeId && user.collegeId !== "[object Object]") {
    return user.collegeId;
  }

  return "";
};

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((s) => s.auth);
  const { options: colleges } = useAppSelector((s) => s.colleges);

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
    dispatch(fetchCollegeOptions());
  }, [dispatch]);

  // Populate form from user data
  useEffect(() => {
    if (user) {
      const selectedCollegeId = getSelectedCollegeId(user);

      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
      setBio(user.bio || "");
      setCollegeId(selectedCollegeId);
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
      const selectedCollegeId = getSelectedCollegeId(user);

      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
      setBio(user.bio || "");
      setCollegeId(selectedCollegeId);
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
  const selectedCollegeId = getSelectedCollegeId(user);
  const collegeName = colleges.find(
    (c) => (c.id || c._id) === selectedCollegeId,
  )?.name;

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="surface-card rounded-xl overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end gap-6 p-6">
          {/* Avatar with upload */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
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
            <Input
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
              <h1 className="text-2xl font-bold text-foreground">
                {user?.firstName} {user?.lastName}
              </h1>
              <RoleBadge role={user?.role || "student"} />
            </div>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <School className="h-4 w-4" />
              {collegeName || "No college set"}{" "}
              {user?.email && `• ${user.email}`}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="surface-card rounded-xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Information
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Update your personal details and academic affiliation.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="space-y-2">
              <Label className="font-semibold">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label className="font-semibold">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            {/* Email (Read Only) */}
            <div className="space-y-2 group relative">
              <Label className="font-semibold gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email Address
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                type="email"
                readOnly
                value={user?.email || ""}
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-[11px] text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="font-semibold gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Phone Number
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="font-semibold">
                Gender
              </Label>
              <Select
                value={gender || EMPTY_GENDER_VALUE}
                onValueChange={(value) =>
                  setGender(value === EMPTY_GENDER_VALUE ? "" : value)
                }
              >
                <SelectTrigger className="h-11 w-full rounded-lg border-input bg-card px-3 shadow-none">
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
              <Label className="font-semibold gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Date of Birth
              </Label>
              <DatePicker
                value={dateOfBirth}
                onChange={setDateOfBirth}
                captionLayout="dropdown"
                max={
                  new Date(Date.now() - 16 * 365.25 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                }
                placeholder="Select date of birth"
              />
            </div>

            {/* College Affiliation */}
            <div className="space-y-2">
              <Label className="font-semibold gap-1.5">
                <School className="h-3.5 w-3.5" />
                College Affiliation
              </Label>
              <Select
                value={collegeId || EMPTY_COLLEGE_VALUE}
                onValueChange={(value) =>
                  setCollegeId(value === EMPTY_COLLEGE_VALUE ? "" : value)
                }
              >
                <SelectTrigger className="h-11 w-full rounded-lg border-input bg-card px-3 shadow-none">
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
              <Label className="font-semibold gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Account Role
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                type="text"
                readOnly
                value={
                  user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : "Student"
                }
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>

            {/* Bio */}
            <div className="md:col-span-2 space-y-2">
              <Label className="font-semibold">
                Biography
              </Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Tell us about your interests, what you're studying..."
                className="resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                A brief bio helps you connect at events.
              </p>
            </div>
          </div>
        </div>

        {/* Save / Discard */}
        <div className="p-6 bg-muted/30 flex justify-end gap-3 rounded-b-xl border-t border-border">
          <Button variant="ghost" onClick={handleDiscard}>
            Discard
          </Button>
          <Button onClick={handleProfileSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {/* Security & Password Card */}
      <div className="surface-card rounded-xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security &amp; Password
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Secure your account by updating your credentials.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="font-semibold">
                Current Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">
                New Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">
                Confirm New Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Hint */}
          <div className="mt-6 flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use at least 8 characters, including one uppercase letter and one
              special character for a strong password.
            </p>
          </div>
        </div>

        <div className="p-6 bg-muted/30 flex justify-end rounded-b-xl border-t border-border">
          <Button
            onClick={handlePasswordChange}
            disabled={
              changingPw || !currentPassword || !newPassword || !confirmPassword
            }
          >
            {changingPw ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
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
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-100 hover:text-red-600 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40"
          onClick={() =>
            toast.info("Account deactivation is not available yet.")
          }
        >
          Deactivate
        </Button>
      </div>
    </div>
  );
}
