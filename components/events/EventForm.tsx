"use client";

import { fromZonedInput, zonedInput, eventEnd, validTimeZone } from "@/lib/event-time";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createEvent, updateEvent, publishEvent } from "@/store/slices/eventsSlice";
import { fetchCollegeOptions } from "@/store/slices/collegesSlice";
import { uploadService } from "@/services/uploadService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Calendar,
  MapPin,
  Users,
  FileText,
  Tag,
  Building2,
  Clock,
  ImagePlus,
  Loader2,
  X,
  Globe2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DateTimePicker } from "@/components/ui/date-picker";
import { TimeZoneSelect } from "@/components/ui/timezone-select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { EventItem } from "@/store/slices/eventsSlice";

// Leaflet requires browser APIs — SSR must be disabled
const LocationPicker = dynamic(
  () => import("@/components/events/LocationPicker"),
  { ssr: false },
);

const eventFormSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(2000),
    endDate: z.string().min(1, "End time is required"),
    timeZone: z.string().refine(validTimeZone, "Use a valid IANA timezone"),
    date: z.string().min(1, "Event date is required"),
    venue: z.string().min(3, "Venue must be at least 3 characters").max(200),
    registrationDeadline: z
      .string()
      .min(1, "Registration deadline is required"),
    capacity: z.coerce
      .number()
      .int()
      .min(1, "Capacity must be at least 1")
      .max(10000),
    collegeId: z.string().min(1, "College is required"),
    category: z.enum([
      "workshop",
      "seminar",
      "cultural",
      "sports",
      "technical",
      "social",
      "other",
    ]),
    latitude: z.coerce.number().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
    isInterCollege: z.boolean().optional().default(false),
    partnerCollegeIds: z.array(z.string()).optional().default([]),
  })
  .refine((d) => new Date(d.registrationDeadline) < new Date(d.date), {
    message: "Deadline must be before the event date",
    path: ["registrationDeadline"],
  });

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  defaultValues?: Partial<EventItem>;
  isEditing?: boolean;
}

type SubmitIntent = "draft" | "publish" | "save";

const categories = [
  { value: "workshop", label: "Workshop" },
  { value: "seminar", label: "Seminar" },
  { value: "cultural", label: "Cultural" },
  { value: "sports", label: "Sports" },
  { value: "technical", label: "Technical" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
];

export default function EventForm({
  defaultValues,
  isEditing = false,
}: EventFormProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { options: colleges } = useAppSelector((s) => s.colleges);
  const [submitting, setSubmitting] = useState<SubmitIntent | null>(null);
  const intentRef = useRef<SubmitIntent>("publish");
  const editingDraft = isEditing && defaultValues?.status === "draft";
  const [imageUrl, setImageUrl] = useState<string | null>(
    defaultValues?.image || null,
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pickedCoords, setPickedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(
    defaultValues?.latitude != null && defaultValues?.longitude != null
      ? { lat: defaultValues.latitude, lng: defaultValues.longitude }
      : null,
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadService.uploadFile(file, "events");
      const url = res.data?.filePath || res.filePath;
      if (!url) {
        toast.error("Upload failed: no file path returned");
        return;
      }
      setImageUrl(url);
      toast.success("Image uploaded successfully");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  useEffect(() => {
    dispatch(fetchCollegeOptions());
  }, [dispatch]);

  const form = useForm<EventFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      date: defaultValues?.date
        ? zonedInput(defaultValues.date, defaultValues.timeZone || "UTC")
        : "",
      endDate: defaultValues?.date
        ? zonedInput(
          eventEnd({
            date: defaultValues.date,
            endDate: defaultValues.endDate,
          }),
          defaultValues.timeZone || "UTC",
        )
        : "",
      timeZone:
        defaultValues?.timeZone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      venue: defaultValues?.venue || "",
      registrationDeadline: defaultValues?.registrationDeadline
        ? zonedInput(
          defaultValues.registrationDeadline,
          defaultValues.timeZone || "UTC",
        )
        : "",
      capacity: defaultValues?.capacity || 100,
      collegeId:
        typeof defaultValues?.collegeId === "string"
          ? defaultValues.collegeId
          : typeof defaultValues?.collegeId === "object" &&
            defaultValues?.collegeId
            ? (defaultValues.collegeId as { _id: string })._id
            : "",
      category: defaultValues?.category || "other",
      latitude: defaultValues?.latitude ?? null,
      longitude: defaultValues?.longitude ?? null,
      isInterCollege: defaultValues?.isInterCollege ?? false,
      partnerCollegeIds: defaultValues?.partnerCollegeIds ?? [],
    },
  });

  const onSubmit = async (values: EventFormValues) => {
    const intent = intentRef.current;
    setSubmitting(intent);
    const isInterCollege = values.isInterCollege ?? false;
    const partnerCollegeIds = isInterCollege
      ? (values.partnerCollegeIds ?? [])
      : [];
    try {
      const payload = {
        ...values,
        date: fromZonedInput(values.date, values.timeZone),
        endDate: fromZonedInput(values.endDate, values.timeZone),
        registrationDeadline: fromZonedInput(
          values.registrationDeadline,
          values.timeZone,
        ),
        ...(imageUrl ? { image: imageUrl } : {}),
        latitude: pickedCoords?.lat ?? null,
        longitude: pickedCoords?.lng ?? null,
        isInterCollege,
        partnerCollegeIds,
      };

      if (isEditing && defaultValues) {
        const eid = defaultValues.id || defaultValues._id;
        await dispatch(updateEvent({ id: eid!, data: payload })).unwrap();
        if (editingDraft && intent === "publish") {
          await dispatch(publishEvent(eid!)).unwrap();
          toast.success("Event published");
        } else {
          toast.success(
            editingDraft ? "Draft saved" : "Event updated successfully",
          );
        }
      } else {
        await dispatch(
          createEvent({ ...payload, draft: intent === "draft" }),
        ).unwrap();
        toast.success(
          intent === "draft"
            ? "Draft saved. Only you and your staff can see it."
            : "Event published successfully!",
        );
      }
      router.push("/dashboard/manage-events");
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : (err as { message?: string })?.message || "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(null);
    }
  };

  const submitAs = (intent: SubmitIntent) => () => {
    intentRef.current = intent;
  };

  return (
    <div className="max-w-4xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Section 1: Overview */}
          <div className="rounded-2xl border border-border/80 bg-card/85 p-6 backdrop-blur-xl shadow-xs sm:p-7 space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Event Essentials
                </h3>
                <p className="text-xs text-muted-foreground">
                  Provide primary details and category about your event.
                </p>
              </div>
            </div>

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Event Title <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Annual Campus Hackathon 2026"
                      className="h-11 rounded-xl border-border/80 bg-background/60 font-medium text-foreground focus-visible:ring-primary/20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category & College */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      Category <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus:ring-primary/20">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" side="bottom">
                        {categories.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="collegeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      Host Institution <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus:ring-primary/20">
                          <SelectValue placeholder="Select host college" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" side="bottom">
                        {colleges.map((c) => (
                          <SelectItem
                            key={c.id || c._id}
                            value={c.id || c._id || ""}
                          >
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description & Agenda <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide full event overview, rules, speaker lineup, and participant requirements..."
                      rows={5}
                      className="rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20 resize-y leading-relaxed"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Section 2: Banner Media */}
          <div className="rounded-2xl border border-border/80 bg-card/85 p-6 backdrop-blur-xl shadow-xs sm:p-7 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ImagePlus className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Banner Artwork
                </h3>
                <p className="text-xs text-muted-foreground">
                  Upload an engaging 16:9 banner to attract registrations.
                </p>
              </div>
            </div>

            {imageUrl ? (
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-border/80 shadow-md group">
                <Image
                  src={imageUrl}
                  alt="Event Banner"
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-cover object-center transition-transform duration-300 group-hover:scale-102"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md transition-colors hover:bg-destructive z-10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full h-56 rounded-2xl border-2 border-dashed border-border/80 bg-background/40 hover:border-primary/60 hover:bg-primary/5 flex flex-col items-center justify-center gap-3 text-muted-foreground transition-all duration-200"
              >
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs font-medium">Uploading image...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/80 text-foreground shadow-xs">
                      <ImagePlus className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-semibold text-foreground">
                        Click to upload event banner
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Supports JPEG, PNG, WebP (16:9 recommended, max 5MB)
                      </p>
                    </div>
                  </>
                )}
              </button>
            )}

            <Input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Section 3: Schedule & Timezone */}
          <div className="rounded-2xl border border-border/80 bg-card/85 p-6 backdrop-blur-xl shadow-xs sm:p-7 space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Schedule & Timing
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure event start time, duration, and registration closing window.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="timeZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Event Timezone
                    </FormLabel>
                    <FormControl>
                      <TimeZoneSelect
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">
                      All event dates adapt to this timezone.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Start Date & Time <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        className="rounded-xl border-border/80 bg-background/60"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Event End Time <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick conclusion date & time"
                        className="rounded-xl border-border/80 bg-background/60"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registrationDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Registration Deadline <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        className="rounded-xl border-border/80 bg-background/60"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Section 4: Venue, Capacity & Map */}
          <div className="rounded-2xl border border-border/80 bg-card/85 p-6 backdrop-blur-xl shadow-xs sm:p-7 space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Location & Capacity
                </h3>
                <p className="text-xs text-muted-foreground">
                  Where students should assemble and registration caps.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Venue / Hall Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Einstein Seminar Hall, Block C"
                        className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Maximum Attendees <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10000}
                        className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Interactive Location Picker */}
            <div className="pt-2">
              <Label className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Pin Venue on Campus Map
                <span className="text-muted-foreground font-normal lowercase">
                  (optional)
                </span>
              </Label>
              <div className="overflow-hidden rounded-2xl border border-border/80">
                <LocationPicker
                  latitude={pickedCoords?.lat}
                  longitude={pickedCoords?.lng}
                  onCoordinates={(lat, lng) => setPickedCoords({ lat, lng })}
                />
              </div>
              {pickedCoords && (
                <button
                  type="button"
                  onClick={() => setPickedCoords(null)}
                  className="mt-2 text-xs font-medium text-destructive hover:underline"
                >
                  Clear pinned coordinates
                </button>
              )}
            </div>
          </div>

          {/* Section 5: Inter-College Collaboration */}
          <div className="rounded-2xl border border-border/80 bg-card/85 p-6 backdrop-blur-xl shadow-xs sm:p-7 space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Globe2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Inter-College Partnership
                </h3>
                <p className="text-xs text-muted-foreground">
                  Open registrations to students from affiliated institutions.
                </p>
              </div>
            </div>

            {/* Switch container */}
            <FormField
              control={form.control}
              name="isInterCollege"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/80 bg-secondary/30 p-4 transition-colors">
                  <div className="space-y-0.5">
                    <FormLabel className="font-display text-sm font-bold text-foreground">
                      Enable Multi-Campus Registration
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Allow students from outside your college to register for entry tickets.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Partner Colleges List */}
            {form.watch("isInterCollege") && (
              <FormField
                control={form.control}
                name="partnerCollegeIds"
                render={({ field }) => {
                  const hostCollegeId = form.watch("collegeId");
                  const available = colleges.filter(
                    (c) => (c.id || c._id) !== hostCollegeId,
                  );
                  const selected: string[] = field.value ?? [];
                  const toggle = (id: string) => {
                    const next = selected.includes(id)
                      ? selected.filter((x) => x !== id)
                      : [...selected, id];
                    field.onChange(next);
                  };
                  return (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Select Allowed Partner Institutions
                      </FormLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-xl border border-border/80 bg-background/50 max-h-56 overflow-y-auto">
                        {available.length === 0 && (
                          <p className="text-xs text-muted-foreground col-span-2">
                            No other verified colleges registered on the platform.
                          </p>
                        )}
                        {available.map((c) => {
                          const cid = c.id || c._id || "";
                          const isChecked = selected.includes(cid);
                          return (
                            <label
                              key={cid}
                              className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-colors ${isChecked
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border/60 hover:bg-muted/50 text-foreground"
                                }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggle(cid)}
                              />
                              <span className="truncate">{c.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl border-border/80 hover:bg-muted"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-3">
              {(!isEditing || editingDraft) && (
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!!submitting}
                  onClick={submitAs("draft")}
                  className="rounded-xl border-border/80 hover:bg-muted"
                >
                  {submitting === "draft" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                  )}
                  Save as Draft
                </Button>
              )}

              <Button
                type="submit"
                disabled={!!submitting}
                onClick={submitAs(
                  isEditing && !editingDraft ? "save" : "publish",
                )}
                className="h-11 rounded-xl bg-primary px-8 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                {submitting && submitting !== "draft" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing && !editingDraft
                  ? "Update Event"
                  : editingDraft
                    ? "Publish Live"
                    : "Publish Event"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
