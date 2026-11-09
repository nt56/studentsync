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
  AlertTriangle,
  KeyRound,
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
      dispatch(patchUser({ profileImage: filePath }));
      toast.success("Profile photo updated successfully");
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
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";
  const selectedCollegeId = getSelectedCollegeId(user);
  const collegeName = colleges.find(
    (c) => (c.id || c._id) === selectedCollegeId,
  )?.name;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Profile Header Stage */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar with live upload hover */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20 ring-4 ring-background">
              {user?.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display text-3xl font-bold text-white">
                  {initials}
                </span>
              )}
            </div>

            {/* Camera overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-2xl bg-black/50 backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Upload new profile photo"
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

          {/* User Meta Information */}
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {user?.firstName} {user?.lastName}
              </h1>
              <RoleBadge role={user?.role || "student"} />
            </div>

            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 sm:text-sm">
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <School className="h-4 w-4 text-primary" />
                {collegeName || "No college set"}
              </span>
              {user?.email && (
                <>
                  <span className="text-border">•</span>
                  <span>{user.email}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="rounded-2xl border border-border/80 bg-card/85 backdrop-blur-xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-border/70 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Personal Information
            </h2>
            <p className="text-xs text-muted-foreground">
              Update your contact credentials and institutional campus association.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* First Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
              />
            </div>

            {/* Email (Read Only) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                Email Address
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              </Label>
              <Input
                type="email"
                readOnly
                value={user?.email || ""}
                className="h-11 rounded-xl border-border/60 bg-muted/40 text-muted-foreground cursor-not-allowed"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                Phone Number
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gender Identity
              </Label>
              <Select
                value={gender || EMPTY_GENDER_VALUE}
                onValueChange={(value) =>
                  setGender(value === EMPTY_GENDER_VALUE ? "" : value)
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-border/80 bg-background/60 text-foreground focus:ring-primary/20">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <School className="h-3 w-3" />
                College Affiliation
              </Label>
              <Select
                value={collegeId || EMPTY_COLLEGE_VALUE}
                onValueChange={(value) =>
                  setCollegeId(value === EMPTY_COLLEGE_VALUE ? "" : value)
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-border/80 bg-background/60 text-foreground focus:ring-primary/20">
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_COLLEGE_VALUE}>
                    No college selected
                  </SelectItem>
                  {colleges.map((college) => {
                    const collegeValue = college.id ?? college._id;
                    if (!collegeValue) return null;
                    return (
                      <SelectItem key={collegeValue} value={collegeValue}>
                        {college.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Role Display */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Account Authorization
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              </Label>
              <Input
                type="text"
                readOnly
                value={
                  user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : "Student"
                }
                className="h-11 rounded-xl border-border/60 bg-muted/40 text-muted-foreground cursor-not-allowed"
              />
            </div>

            {/* Bio */}
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Campus Bio & Interests
              </Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell other students and organizers about what you study and hackathon interests..."
                className="rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20 resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border/70 bg-muted/20 px-6 py-4">
          <Button
            variant="ghost"
            onClick={handleDiscard}
            className="rounded-xl hover:bg-muted text-muted-foreground"
          >
            Discard Changes
          </Button>
          <Button
            onClick={handleProfileSave}
            disabled={saving}
            className="h-10 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {/* Security & Password Card */}
      <div className="rounded-2xl border border-border/80 bg-card/85 backdrop-blur-xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-border/70 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Security & Credentials
            </h2>
            <p className="text-xs text-muted-foreground">
              Protect your account by setting a strong authentication password.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm New Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Use at least 8 characters with a mix of uppercase letters, numbers, and symbols.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-border/70 bg-muted/20 px-6 py-4">
          <Button
            onClick={handlePasswordChange}
            disabled={
              changingPw || !currentPassword || !newPassword || !confirmPassword
            }
            className="h-10 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
          >
            {changingPw ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </div>
      </div>

      {/* Danger Zone Card */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-display text-sm font-bold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Deactivate Student Account
          </h3>
          <p className="text-xs text-muted-foreground max-w-md">
            Permanently close your StudentSync profile and invalidate all registered event entry passes.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() =>
            toast.info("Account deactivation requires administrator verification.")
          }
        >
          Deactivate Account
        </Button>
      </div>
    </div>
  );
}
