"use client";

import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import type { EventItem } from "@/store/slices/eventsSlice";

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
    },
  });

  const onSubmit = async (values: EventFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        date: new Date(values.date).toISOString(),
        registrationDeadline: new Date(
          values.registrationDeadline,
        ).toISOString(),
        ...(imageUrl ? { image: imageUrl } : {}),
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
      toast.error(typeof err === "string" ? err : "Something went wrong");
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
                  Event Title
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Annual Tech Symposium 2026"
                    className="bg-slate-50 dark:bg-slate-800 border-none"
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
                  Description
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your event in detail..."
                    rows={6}
                    className="bg-slate-50 dark:bg-slate-800 border-none resize-none"
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
              <div className="relative w-full h-56 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
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
                className="w-full h-56 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 transition-colors bg-slate-50 dark:bg-slate-800"
              >
                {uploadingImage ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm">Click to upload event image</span>
                    <span className="text-xs text-slate-400">
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
                    Event Date & Time
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      className="bg-slate-50 dark:bg-slate-800 border-none"
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
                    Registration Deadline
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      className="bg-slate-50 dark:bg-slate-800 border-none"
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
                    Venue
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Main Auditorium, Building A"
                      className="bg-slate-50 dark:bg-slate-800 border-none"
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
                    Capacity
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      className="bg-slate-50 dark:bg-slate-800 border-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    Category
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-none">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                    College
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-none">
                        <SelectValue placeholder="Select a college" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
