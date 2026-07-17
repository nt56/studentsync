"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createEvent, updateEvent } from "@/store/slices/eventsSlice";
import { fetchColleges } from "@/store/slices/collegesSlice";
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
  const { items: colleges } = useAppSelector((s) => s.colleges);
  const [submitting, setSubmitting] = useState(false);
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
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  useEffect(() => {
    dispatch(fetchColleges({ limit: "100" }));
  }, [dispatch]);

  const form = useForm<EventFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      date: defaultValues?.date
        ? new Date(defaultValues.date).toISOString().slice(0, 16)
        : "",
      venue: defaultValues?.venue || "",
      registrationDeadline: defaultValues?.registrationDeadline
        ? new Date(defaultValues.registrationDeadline)
            .toISOString()
            .slice(0, 16)
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
    setSubmitting(true);
    const isInterCollege = values.isInterCollege ?? false;
    const partnerCollegeIds = isInterCollege
      ? (values.partnerCollegeIds ?? [])
      : [];
    try {
      const payload = {
        ...values,
        date: new Date(values.date).toISOString(),
        registrationDeadline: new Date(
          values.registrationDeadline,
        ).toISOString(),
        ...(imageUrl ? { image: imageUrl } : {}),
        latitude: pickedCoords?.lat ?? null,
        longitude: pickedCoords?.lng ?? null,
        isInterCollege,
        partnerCollegeIds,
      };

      if (isEditing && defaultValues) {
        const eid = defaultValues.id || defaultValues._id;
        await dispatch(updateEvent({ id: eid!, data: payload })).unwrap();
        toast.success("Event updated successfully");
      } else {
        await dispatch(createEvent(payload)).unwrap();
        toast.success("Event created successfully");
      }
      router.push("/dashboard/manage-events");
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : (err as { message?: string })?.message || "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Event Title <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Annual Tech Symposium 2026"
                    className="bg-secondary border-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Description <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your event in detail..."
                    rows={6}
                    className="bg-secondary border-none resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Event Image */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <ImagePlus className="h-4 w-4 text-primary" />
              Event Image
            </label>
            {imageUrl ? (
              <div className="relative w-full h-56 rounded-lg overflow-hidden border border-input">
                <Image
                  src={imageUrl}
                  alt="Event"
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover object-center"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors z-10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full h-56 rounded-lg border-2 border-dashed border-border hover:border-primary dark:hover:border-primary flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors bg-secondary"
              >
                {uploadingImage ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm">Click to upload event image</span>
                    <span className="text-xs text-muted-foreground">
                      JPEG, PNG, WebP, GIF (max 5MB)
                    </span>
                  </>
                )}
              </button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Date & Deadline row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Event Date & Time <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      className="bg-secondary border-none"
                      {...field}
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
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Registration Deadline{" "}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      className="bg-secondary border-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Venue & Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Venue <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Main Auditorium, Building A"
                      className="bg-secondary border-none"
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
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Capacity <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      className="bg-secondary border-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Location Picker */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              Event Location on Map
              <span className="text-muted-foreground font-normal text-xs">
                (optional)
              </span>
            </label>
            <LocationPicker
              latitude={pickedCoords?.lat}
              longitude={pickedCoords?.lng}
              onCoordinates={(lat, lng) => setPickedCoords({ lat, lng })}
            />
            {pickedCoords && (
              <button
                type="button"
                onClick={() => setPickedCoords(null)}
                className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Clear location
              </button>
            )}
          </div>

          {/* Category & College */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    Category <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-secondary border-none">
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
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    College <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-secondary border-none">
                        <SelectValue placeholder="Select a college" />
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

          {/* Inter-College toggle */}
          <FormField
            control={form.control}
            name="isInterCollege"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl border border-input p-4 bg-secondary">
                <div className="space-y-0.5">
                  <FormLabel className="flex items-center gap-2 text-base">
                    <Globe2 className="h-4 w-4 text-teal-500" />
                    Inter-College Event
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Allow students from partner colleges to register
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

          {/* Partner colleges — only when isInterCollege is true */}
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
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-teal-500" />
                      Partner Colleges
                      <span className="text-muted-foreground font-normal text-xs">
                        (optional)
                      </span>
                    </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 rounded-xl border border-input bg-secondary max-h-52 overflow-y-auto">
                      {available.length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-2">
                          No other colleges available
                        </p>
                      )}
                      {available.map((c) => {
                        const cid = c.id || c._id || "";
                        return (
                          <label
                            key={cid}
                            className="flex items-center gap-2 text-sm cursor-pointer select-none"
                          >
                            <Checkbox
                              checked={selected.includes(cid)}
                              onCheckedChange={() => toggle(cid)}
                            />
                            {c.name}
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

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary text-white hover:bg-primary/90 px-8"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update Event"
              ) : (
                "Create Event"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
