"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCollegeOptions } from "@/store/slices/collegesSlice";
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
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Search,
  User,
  Mail,
  Phone,
  Lock,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Ticket,
  MessageSquare,
  Trophy,
  ShieldCheck,
  Building,
  Check,
} from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
  "w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-secondary flex items-center justify-between";

export function SignUpForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const colleges = useAppSelector((s) => s.colleges.options);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [selectedCollegeName, setSelectedCollegeName] = useState("");

  useEffect(() => {
    dispatch(fetchCollegeOptions());
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
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

  const password = useWatch({ control, name: "password" });

  const passwordChecks = {
    length: password?.length >= 8,
    uppercase: /[A-Z]/.test(password || ""),
    lowercase: /[a-z]/.test(password || ""),
    number: /\d/.test(password || ""),
  };

  const filteredColleges = colleges.filter((c) =>
    c.name.toLowerCase().includes(collegeSearch.toLowerCase()),
  );

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
            toast.success("Account created successfully!", {
              description: "Please check your inbox to verify your email address.",
            });
            router.replace(
              `/verify-email?email=${encodeURIComponent(data.email)}`,
            );
          } else {
            toast.success("Welcome to StudentSync!", {
              description: "Your student profile is ready. Enjoy your campus experience.",
            });
          }
        } else {
          const errorMsg = (result.payload as string) || "Registration failed";
          toast.error("Registration failed", { description: errorMsg });
          setIsSubmitting(false);
        }
      } catch {
        toast.error("Something went wrong", {
          description: "Please check your network and try again.",
        });
        setIsSubmitting(false);
      }
    },
    [registerUser, router],
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-violet-500/15 to-cyan-400/10 blur-[120px] dark:from-indigo-600/20 dark:via-purple-600/20 dark:to-cyan-500/15" />
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-6xl overflow-hidden rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl xl:grid xl:grid-cols-12"
      >
        {/* LEFT COLUMN: INSPIRING CAMPUS LIFE SHOWCASE */}
        <div className="relative hidden xl:flex xl:col-span-5 flex-col justify-between overflow-hidden border-r border-border/70 bg-gradient-to-br from-primary/10 via-card to-secondary/30 p-10">
          {/* Ambient glow inside container */}
          <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

          {/* Brand header */}
          <div className="relative z-10">
            <Link href="/" className="group inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
              <Image
                src="/studenysync-svg.svg"
                alt="StudentSync Logo"
                width={40}
                height={40}
                className="rounded-xl ring-1 ring-border/80 shadow-xs"
              />
              <div>
                <p className="font-display text-lg font-bold leading-none text-foreground">
                  Student<span className="text-primary font-black">Sync</span>
                </p>
                <p className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground font-semibold mt-0.5">
                  Campus Life OS
                </p>
              </div>
            </Link>

            <div className="mt-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-[11px] font-semibold text-foreground shadow-2xs backdrop-blur-md">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Join 15,000+ Active Students</span>
              </span>

              <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground tracking-tight">
                Turn your college years into an <span className="text-gradient">adventure.</span>
              </h2>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Create your student profile once. Register for hackathons, fests, and workshops with instant digital passes.
              </p>
            </div>
          </div>

          {/* Feature cards */}
          <div className="relative z-10 my-8 space-y-3">
            {[
              {
                icon: Ticket,
                title: "1-Click Event Passes",
                desc: "Instant QR tickets delivered directly to your profile.",
              },
              {
                icon: MessageSquare,
                title: "Event Group Chats",
                desc: "Find hackathon teammates and discuss carpools.",
              },
              {
                icon: Trophy,
                title: "Compete & Build Portfolio",
                desc: "Certificates, prize pools, and proof-of-work badges.",
              },
            ].map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md p-3.5 shadow-2xs transition-all hover:border-primary/40 hover:bg-card"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ItemIcon className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Trust Line */}
          <div className="relative z-10 pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="size-3.5 text-primary" /> 100% Free for Students
            </span>
            <span className="font-semibold text-foreground">50+ Campuses</span>
          </div>
        </div>

        {/* RIGHT COLUMN: SIGN UP FORM */}
        <div className="relative p-6 sm:p-10 xl:col-span-7 xl:p-12 flex flex-col justify-between">
          {/* Top Form Controls: Back Link + Theme Toggle */}
          <div className="flex items-center justify-between pb-6 mb-2 border-b border-border/50">
            <Link
              href="/"
              className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 text-primary" />
              <span>Back to StudentSync</span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle className="size-8.5 rounded-xl" />
            </div>
          </div>

          <div>
            {/* Mobile Brand Header */}
            <div className="mb-6 flex items-center gap-2.5 xl:hidden">
              <Image
                src="/studenysync-svg.svg"
                alt="StudentSync Logo"
                width={36}
                height={36}
                className="rounded-xl ring-1 ring-border/80"
              />
              <div>
                <p className="font-display text-base font-bold leading-none text-foreground">
                  Student<span className="text-primary font-black">Sync</span>
                </p>
                <p className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground font-semibold mt-0.5">
                  Campus Life OS
                </p>
              </div>
            </div>

            {/* Form Title */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
                <Sparkles className="size-3" /> Get Started in 60 Seconds
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Create your student account
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                Join your university community and explore events tailored to your passions.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-semibold text-foreground">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="firstName"
                      placeholder="Jane"
                      className="h-10 pl-10 rounded-xl bg-secondary/40 border-border/70 hover:border-border focus:bg-background text-xs transition-all shadow-none"
                      disabled={isSubmitting}
                      {...register("firstName")}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-[11px] font-medium text-destructive mt-1">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-semibold text-foreground">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      className="h-10 pl-10 rounded-xl bg-secondary/40 border-border/70 hover:border-border focus:bg-background text-xs transition-all shadow-none"
                      disabled={isSubmitting}
                      {...register("lastName")}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-[11px] font-medium text-destructive mt-1">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email Row */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@university.edu"
                    className="h-10 pl-10 rounded-xl bg-secondary/40 border-border/70 hover:border-border focus:bg-background text-xs transition-all shadow-none"
                    disabled={isSubmitting}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] font-medium text-destructive mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Gender and Date of Birth Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-xs font-semibold text-foreground">
                    Gender <span className="text-destructive">*</span>
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
                    <SelectTrigger id="gender" className="h-10 w-full rounded-xl bg-secondary/40 border-border/70 text-xs">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" className="rounded-xl border-border/80">
                      <SelectItem value="male" className="text-xs">Male</SelectItem>
                      <SelectItem value="female" className="text-xs">Female</SelectItem>
                      <SelectItem value="other" className="text-xs">Other / Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say" className="text-xs">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-[11px] font-medium text-destructive mt-1">
                      {errors.gender.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Date of Birth <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        captionLayout="dropdown"
                        max={new Date().toISOString().split("T")[0]}
                        placeholder="Select date of birth"
                        aria-invalid={!!errors.dateOfBirth}
                      />
                    )}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-[11px] font-medium text-destructive mt-1">
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Phone and College Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-foreground">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="h-10 pl-10 rounded-xl bg-secondary/40 border-border/70 hover:border-border focus:bg-background text-xs transition-all shadow-none"
                      disabled={isSubmitting}
                      {...register("phone")}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] font-medium text-destructive mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    College / University <span className="text-muted-foreground text-[10px]">(Optional)</span>
                  </Label>
                  <div className="relative group">
                    <Building className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Search institution..."
                      className="h-10 pl-10 rounded-xl bg-secondary/40 border-border/70 hover:border-border focus:bg-background text-xs transition-all shadow-none"
                      value={selectedCollegeName || collegeSearch}
                      onChange={(e) => {
                        setCollegeSearch(e.target.value);
                        setSelectedCollegeName("");
                        if (!e.target.value) setValue("collegeId", "");
                      }}
                    />
                    {collegeSearch && !selectedCollegeName && (
                      <Search className="absolute right-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    )}
                  </div>
                  {!selectedCollegeName &&
                    collegeSearch &&
                    filteredColleges.length > 0 && (
                      <div className="absolute z-30 mt-1 max-h-48 w-full max-w-sm overflow-y-auto rounded-2xl border border-border/80 bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl">
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
                            <span className="truncate">{college.name}</span>
                            <Check className="size-3.5 text-primary ml-1 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              {/* Passwords Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-10 pl-10 pr-10 rounded-xl bg-secondary/40 border-border/70 hover:border-border focus:bg-background text-xs transition-all shadow-none"
                      disabled={isSubmitting}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] font-medium text-destructive mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-10 pl-10 pr-10 rounded-xl bg-secondary/40 border-border/70 hover:border-border focus:bg-background text-xs transition-all shadow-none"
                      disabled={isSubmitting}
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] font-medium text-destructive mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Requirements Checklist Pills */}
              {password && (
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 mt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Password Security
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={cn("flex items-center gap-1.5", passwordChecks.length ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground")}>
                      <CheckCircle2 className={cn("size-3", passwordChecks.length ? "text-emerald-500" : "opacity-40")} />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={cn("flex items-center gap-1.5", passwordChecks.uppercase ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground")}>
                      <CheckCircle2 className={cn("size-3", passwordChecks.uppercase ? "text-emerald-500" : "opacity-40")} />
                      <span>Uppercase letter (A-Z)</span>
                    </div>
                    <div className={cn("flex items-center gap-1.5", passwordChecks.lowercase ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground")}>
                      <CheckCircle2 className={cn("size-3", passwordChecks.lowercase ? "text-emerald-500" : "opacity-40")} />
                      <span>Lowercase letter (a-z)</span>
                    </div>
                    <div className={cn("flex items-center gap-1.5", passwordChecks.number ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground")}>
                      <CheckCircle2 className={cn("size-3", passwordChecks.number ? "text-emerald-500" : "opacity-40")} />
                      <span>At least one number (0-9)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-3 h-11 w-full justify-center rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating your student profile...
                  </>
                ) : (
                  <>
                    Create Free Student Account
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Bottom Switch to Sign-in */}
          <div className="mt-8 pt-5 border-t border-border/60 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-bold text-primary hover:underline transition-colors"
              >
                Sign in to your account
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
