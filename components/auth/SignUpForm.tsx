"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchColleges } from "@/store/slices/collegesSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, Search } from "lucide-react";
import Image from "next/image";

const signUpSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    gender: z.enum(["male", "female", "other", "prefer-not-to-say"], {
      message: "Please select a gender",
    }),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required")
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date",
      })
      .refine(
        (dob) => {
          const age = Math.floor(
            (Date.now() - new Date(dob).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          );
          return age >= 16;
        },
        { message: "You must be at least 16 years old" },
      ),
    phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .refine((value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      }, "Phone number must be between 10 and 15 digits"),
    collegeId: z.string().optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Must include uppercase, lowercase, and a number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpValues = z.infer<typeof signUpSchema>;

const COLLEGE_SEARCH_RESULT_CLASSNAME =
  "w-full rounded-lg px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted";

export function SignUpForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const colleges = useAppSelector((s) => s.colleges.items);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [selectedCollegeName, setSelectedCollegeName] = useState("");

  useEffect(() => {
    dispatch(fetchColleges({ limit: "100" }));
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      gender: undefined,
      dateOfBirth: "",
      phone: "",
      collegeId: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  const passwordChecks = {
    length: password?.length >= 8,
    uppercase: /[A-Z]/.test(password || ""),
    lowercase: /[a-z]/.test(password || ""),
    number: /\d/.test(password || ""),
  };

  const filteredColleges = colleges.filter((c) =>
    c.name.toLowerCase().includes(collegeSearch.toLowerCase()),
  );
  const fieldClassName = "h-11";
  const labelClassName = "mb-2 block text-sm font-medium text-foreground";

  const onSubmit = useCallback(
    async (data: SignUpValues) => {
      setIsSubmitting(true);
      try {
        const result = await registerUser({
          ...data,
          gender: data.gender || "prefer-not-to-say",
          dateOfBirth: data.dateOfBirth || "",
        });
        if (result.meta.requestStatus === "fulfilled") {
          const payload = result.payload as
            | { requiresVerification?: boolean }
            | undefined;
          if (payload?.requiresVerification) {
            // Email verification is required — no session yet. Send them to the
            // notice page to check their inbox instead of the dashboard.
            toast.success("Account created!", {
              description: "Check your email to verify your address.",
            });
            router.replace(
              `/verify-email?email=${encodeURIComponent(data.email)}`,
            );
          } else {
            toast.success("Account created!", {
              description: "Welcome to StudentSync. You are now signed in.",
            });
            // GuestGuard detects isAuthenticated: true and handles the redirect.
          }
        } else {
          const errorMsg = (result.payload as string) || "Registration failed";
          toast.error("Registration failed", { description: errorMsg });
          setIsSubmitting(false);
        }
      } catch {
        toast.error("Something went wrong", {
          description: "Please try again later.",
        });
        setIsSubmitting(false);
      }
    },
    [registerUser, router],
  );

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-7xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm xl:min-h-[calc(100vh-4rem)] xl:grid-cols-[0.88fr_1.12fr]">
        <div className="hidden border-r border-border bg-slate-950 px-10 py-10 text-white xl:flex xl:flex-col xl:justify-center">
          <div className="flex items-center gap-3">
            <Image
              src="/studenysync-svg.svg"
              alt="StudentSync Logo"
              width={48}
              height={48}
              className="rounded-xl ring-1 ring-white/15"
            />
            <div>
              <p className="font-display text-2xl font-bold leading-none text-white">
                Student
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-primary">
                Sync
              </p>
            </div>
          </div>
          <h2 className="mt-8 text-3xl font-bold leading-tight text-white md:text-4xl">
            Join the campus event network.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/70">
            Set up your account once, discover better events, and keep your
            plans in one place.
          </p>
        </div>

        <div className="surface-card-strong px-6 py-8 md:px-10 md:py-10">
          <div className="mb-8 flex items-center gap-3 xl:hidden">
            <Image
              src="/studenysync-svg.svg"
              alt="StudentSync Logo"
              width={44}
              height={44}
              className="rounded-xl ring-1 ring-border/80"
            />
            <div>
              <p className="font-display text-xl font-bold leading-none text-foreground">
                Student
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-primary">
                Sync
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Build your student profile to start registering for events.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className={labelClassName}>
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="John"
                  className={fieldClassName}
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <Label className={labelClassName}>
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Doe"
                  className={fieldClassName}
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className={labelClassName}>
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="john@university.edu"
                className={fieldClassName}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className={labelClassName}>
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={(val) =>
                    setValue(
                      "gender",
                      val as "male" | "female" | "other" | "prefer-not-to-say",
                      { shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger className={fieldClassName}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other / Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.gender.message}
                  </p>
                )}
              </div>
              <div>
                <Label className={labelClassName}>
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  className={fieldClassName}
                  {...register("dateOfBirth")}
                />
                {errors.dateOfBirth && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.dateOfBirth.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className={labelClassName}>
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className={fieldClassName}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>
              <div>
                <Label className={labelClassName}>College / University</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search institution..."
                    className="h-11 pl-11"
                    value={selectedCollegeName || collegeSearch}
                    onChange={(e) => {
                      setCollegeSearch(e.target.value);
                      setSelectedCollegeName("");
                      if (!e.target.value) setValue("collegeId", "");
                    }}
                  />
                </div>
                {!selectedCollegeName &&
                  collegeSearch &&
                  filteredColleges.length > 0 && (
                    <div className="surface-card-strong relative z-10 mt-2 max-h-48 overflow-y-auto rounded-xl p-2">
                      {filteredColleges.map((college) => (
                        <button
                          key={college.id || college._id}
                          type="button"
                          className={COLLEGE_SEARCH_RESULT_CLASSNAME}
                          onClick={() => {
                            setValue("collegeId", college.id || college._id);
                            setSelectedCollegeName(college.name);
                            setCollegeSearch("");
                          }}
                        >
                          {college.name}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className={labelClassName}>
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`h-11 pr-10 ${
                      password &&
                      (!passwordChecks.uppercase ||
                        !passwordChecks.lowercase ||
                        !passwordChecks.number)
                        ? "border-red-400 dark:border-red-500"
                        : "border-input"
                    }`}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {password && (
                  <div className="mt-3 space-y-1">
                    <div
                      className={`flex items-center text-xs ${
                        passwordChecks.length
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {passwordChecks.length ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      <span>At least 8 characters</span>
                    </div>
                    <div
                      className={`flex items-center text-xs ${
                        passwordChecks.uppercase
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {passwordChecks.uppercase ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      <span>At least one uppercase letter</span>
                    </div>
                    <div
                      className={`flex items-center text-xs ${
                        passwordChecks.lowercase
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {passwordChecks.lowercase ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      <span>At least one lowercase letter</span>
                    </div>
                    <div
                      className={`flex items-center text-xs ${
                        passwordChecks.number
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {passwordChecks.number ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      <span>At least one number</span>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <Label className={labelClassName}>
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 h-11 w-full justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-3 text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          <Link href="/sign-in" className="block">
            <Button variant="outline" className="h-11 w-full justify-center">
              Sign In Instead
            </Button>
          </Link>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>&copy; 2026 StudentSync. All rights reserved.</p>
      </footer>
    </div>
  );
}
