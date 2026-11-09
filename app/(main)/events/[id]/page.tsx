"use client";

import { EventStaff } from "@/components/events/EventStaff";
import { EventAnnouncements } from "@/components/events/EventAnnouncements";
import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEventById, clearCurrentEvent, publishEvent } from "@/store/slices/eventsSlice";
import { eventService } from "@/services/eventService";
import {
  registerForEvent,
  cancelRegistration,
} from "@/store/slices/registrationsSlice";
import { fetchBookmarks } from "@/store/slices/bookmarksSlice";
import { EventDetailSkeleton } from "@/components/common/Skeletons";
import { EventStatusBadge, CategoryBadge, InterCollegeBadge } from "@/components/common/Badges";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import AddToCalendar from "@/components/events/AddToCalendar";
import { BookmarkButton } from "@/components/events/BookmarkButton";
import { ShareButton } from "@/components/events/ShareButton";
import StarRating from "@/components/events/StarRating";
import ReviewForm from "@/components/events/ReviewForm";
import ReviewList from "@/components/events/ReviewList";
import QRCodeDisplay from "@/components/events/QRCodeDisplay";
import { isPast } from "date-fns";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  Users,
  CheckCircle2,
  Loader2,
  Copy,
  Download,
  Pencil,
  Sparkles,
  Ticket,
  Building,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { motion } from "framer-motion";
import AttendanceList from "@/components/events/AttendanceList";
import { cn } from "@/lib/utils";

// Leaflet and html5-qrcode require browser APIs — SSR must be disabled
const EventLocationMap = dynamic(
  () => import("@/components/events/EventLocationMap"),
  { ssr: false },
);
const QRScanner = dynamic(
  () => import("@/components/events/QRScanner"),
  { ssr: false },
);

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentEvent: event, isLoading, error } = useAppSelector(
    (s) => s.events,
  );
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const { isLoading: regLoading } = useAppSelector((s) => s.registrations);
  const { initialized: bookmarksInitialized } = useAppSelector((s) => s.bookmarks);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Fetch the student's own registrationId so we can show the QR code
  useEffect(() => {
    setRegistrationId(null);
    if (!isAuthenticated || !id || user?.role !== "student") return;
    let ignore = false;
    async function loadReg() {
      try {
        const res = await (
          await import("@/services/api")
        ).default.get(`/registrations?eventId=${id}&limit=1&mine=true`);
        if (ignore) return;
        const items = res.data?.items ?? res.data ?? [];
        if (Array.isArray(items) && items.length > 0) {
          setRegistrationId(items[0].id ?? items[0]._id);
        }
      } catch {
        // ignore
      }
    }
    loadReg();
    return () => {
      ignore = true;
    };
  }, [id, isAuthenticated, user?.role]);

  useEffect(() => {
    if (id) dispatch(fetchEventById(id));
    return () => {
      dispatch(clearCurrentEvent());
    };
  }, [dispatch, id]);

  // Initialize bookmarks once so BookmarkButton shows correct state
  useEffect(() => {
    if (isAuthenticated && !bookmarksInitialized) {
      dispatch(fetchBookmarks());
    }
  }, [dispatch, isAuthenticated, bookmarksInitialized]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }
    if (!id) return;
    try {
      await dispatch(registerForEvent(id)).unwrap();
      toast.success("Successfully registered! Your FastPass QR is ready.");
      dispatch(fetchEventById(id));
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to register");
    }
  };

  const handleCancelRegistration = async () => {
    if (!id) return;
    try {
      await dispatch(cancelRegistration({ eventId: id })).unwrap();
      toast.success("Registration cancelled");
      setRegistrationId(null);
      dispatch(fetchEventById(id));
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : "Failed to cancel registration",
      );
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    setPublishing(true);
    try {
      await dispatch(publishEvent(id)).unwrap();
      toast.success("Event published! Students can now discover and register.");
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to publish event");
    } finally {
      setPublishing(false);
    }
  };

  if (isLoading) return <EventDetailSkeleton />;

  if (!event) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <Info className="size-8" />
        </div>
        <h1 className="font-display text-2xl font-bold">Event Not Found</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {error ||
            "This event could not be found. It may have been unpublished, removed, or the link is incorrect."}
        </p>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button className="rounded-xl" onClick={() => id && dispatch(fetchEventById(id))}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const eventDate = event.date ? new Date(event.date) : null;
  const deadline = event.registrationDeadline
    ? new Date(event.registrationDeadline)
    : null;
  const deadlinePassed = deadline ? isPast(deadline) : false;
  const isDraft = event.status === "draft";
  const capacity = event.capacity || 0;
  const count = event.registrationCount ?? 0;
  const spotsLeft = capacity > 0 ? Math.max(0, capacity - count) : null;
  const fillPercent = capacity > 0 ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
  const isNearlyFull = spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 10;

  const organizerObj = typeof event.organizerId === "object" && event.organizerId !== null
    ? (event.organizerId as { firstName?: string; lastName?: string; email?: string })
    : null;
  const organizerName = organizerObj
    ? `${organizerObj.firstName || ""} ${organizerObj.lastName || ""}`.trim() || organizerObj.email || "Campus Organizer"
    : "Campus Organizer";

  const collegeObj = typeof event.collegeId === "object" && event.collegeId !== null
    ? (event.collegeId as { name?: string })
    : null;
  const collegeName = collegeObj?.name || null;
  const canManageStaff =
    !!event.permissions?.includes("edit") ||
    user?.role === "organizer" ||
    user?.role === "admin";

  return (
    <div className="relative min-h-[calc(100vh-140px)] overflow-hidden px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[900px] rounded-full bg-gradient-to-tr from-indigo-500/10 via-violet-500/10 to-cyan-500/10 blur-[120px] dark:from-indigo-600/15 dark:via-purple-600/15 dark:to-cyan-500/10" />
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* TOP BAR / BREADCRUMB NAVIGATION */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              onClick={() => router.back()}
              className="group inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 backdrop-blur-md px-3 py-1.5 font-medium text-foreground hover:bg-secondary transition-all shadow-2xs"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 text-primary" />
              <span>Events</span>
            </button>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <span className="capitalize text-muted-foreground">{event.category}</span>
            <ChevronRight className="size-3 text-muted-foreground/60 hidden sm:inline" />
            <span className="font-semibold text-foreground truncate max-w-xs hidden sm:inline">
              {event.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {event.date && !isDraft && (
              <AddToCalendar
                eventId={id}
                title={event.title}
                description={event.description}
                location={event.venue}
                startDate={event.date}
                endDate={event.endDate}
              />
            )}
            {!isDraft && (
              <BookmarkButton
                eventId={id}
                className="size-9 rounded-xl border border-border/80 bg-card/80 backdrop-blur-md shadow-2xs hover:bg-secondary text-muted-foreground hover:text-primary"
              />
            )}
            {!isDraft && (
              <ShareButton
                url={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${id}`}
                title={event.title}
                description={event.description}
                className="size-9 rounded-xl border border-border/80 bg-card/80 backdrop-blur-md shadow-2xs hover:bg-secondary text-muted-foreground hover:text-primary"
              />
            )}
          </div>
        </div>

        {/* ORGANIZER COMMAND TOOLBAR / DRAFT BANNER */}
        <div className="mb-6 space-y-4">
          {isDraft && (
            <div role="status" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                <p className="text-xs sm:text-sm text-foreground">
                  <span className="font-bold text-amber-600 dark:text-amber-400">Draft Status:</span> This event is unlisted. Students cannot discover or register for it yet.
                </p>
              </div>
              {event.permissions?.includes("edit") && (
                <Button onClick={handlePublish} disabled={publishing} size="sm" className="rounded-xl shrink-0 font-semibold shadow-xs">
                  {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Publish Event Live
                </Button>
              )}
            </div>
          )}

          {(event.permissions?.includes("edit") || event.permissions?.includes("export")) && (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-2xs">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 px-2">
                <ShieldCheck className="size-4 text-primary" /> Organizer Tools:
              </span>
              {event.permissions?.includes("edit") && (
                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8">
                  <Link href={`/dashboard/edit-event/${id}`}>
                    <Pencil className="mr-1.5 size-3.5 text-primary" /> Edit Event
                  </Link>
                </Button>
              )}
              {event.permissions?.includes("edit") && (
                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8">
                  <Link href={`/dashboard/create-event?from=${id}`}>
                    <Copy className="mr-1.5 size-3.5 text-primary" /> Duplicate
                  </Link>
                </Button>
              )}
              {event.permissions?.includes("export") && !isDraft && (
                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8">
                  <a href={eventService.attendeeExportUrl(id)} download>
                    <Download className="mr-1.5 size-3.5 text-primary" /> Export Attendees (CSV)
                  </a>
                </Button>
              )}
            </div>
          )}

          {event.permissions?.includes("announce") && !isDraft && <EventAnnouncements eventId={id} registrationCount={count} />}
          {event.permissions?.includes("staff") && <EventStaff eventId={id} />}
          {event.permissions?.includes("checkIn") && <QRScanner />}
          {event.permissions?.includes("attendees") && <AttendanceList eventId={id} />}
        </div>

        {/* HERO CINEMATIC MEDIA STAGE */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative mb-8 w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lg"
        >
          <div className="relative aspect-[21/9] sm:aspect-[16/7] md:h-[420px] w-full overflow-hidden bg-secondary/50">
            {event.image ? (
              <>
                {/* Ambient Blur Backdrop */}
                <div 
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none" 
                  style={{ backgroundImage: `url(${event.image})` }} 
                />
                <Image
                  src={event.image}
                  alt={event.title}
                  fill
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="object-contain drop-shadow-2xl z-0"
                  priority
                />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-secondary to-accent">
                <Calendar className="size-16 text-primary/30 mb-2" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Campus Event Showcase
                </span>
              </div>
            )}

            {/* Contrast protection gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent z-10 pointer-events-none" />

            {/* Overlaid Title & Tags */}
            <div className="absolute bottom-0 left-0 p-5 sm:p-8 md:p-10 text-white z-20 w-full">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {event.category && <CategoryBadge category={event.category} />}
                {event.status && <EventStatusBadge status={event.status} />}
                {event.isInterCollege && <InterCollegeBadge />}
              </div>

              <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-white max-w-4xl drop-shadow-md">
                {event.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-white/90">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="size-4 text-primary" /> Hosted by {organizerName}
                </span>
                {collegeName && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Building className="size-4 text-primary" /> {collegeName}
                  </span>
                )}
                {event.venue && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="size-4 text-primary" /> {event.venue}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* DETAILS BENTO MATRIX (INFO GRID) */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Date & Time */}
          <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-4 sm:p-5 shadow-xs flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</p>
              <p className="font-display font-bold text-foreground text-sm mt-0.5 truncate">
                {eventDate ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: event.timeZone || "UTC" }).format(eventDate) : "TBA"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {eventDate ? new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone: event.timeZone || "UTC" }).format(eventDate) : ""} ({event.timeZone || "UTC"})
              </p>
            </div>
          </div>

          {/* Card 2: Venue & Campus */}
          <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-4 sm:p-5 shadow-xs flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Location / Venue</p>
              <p className="font-display font-bold text-foreground text-sm mt-0.5 truncate">
                {event.venue || "Campus Venue TBD"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {collegeName || "Main Campus"}
              </p>
            </div>
          </div>

          {/* Card 3: Deadline */}
          <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-4 sm:p-5 shadow-xs flex items-start gap-3.5">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
              deadlinePassed ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-primary/10 text-primary"
            }`}>
              <Clock className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Registration Deadline</p>
              <p className="font-display font-bold text-foreground text-sm mt-0.5 truncate">
                {deadline ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: event.timeZone || "UTC" }).format(deadline) : "Open until event"}
              </p>
              <p className={`text-xs mt-0.5 font-medium ${deadlinePassed ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {deadlinePassed ? "Registration Closed" : "Open for Registration"}
              </p>
            </div>
          </div>

          {/* Card 4: Admission & Capacity */}
          <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-4 sm:p-5 shadow-xs flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Ticket className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Admission & Access</p>
              <p className="font-display font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                Free Student Pass
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {capacity > 0 ? `${count}/${capacity} spots filled` : "Open Capacity"}
              </p>
            </div>
          </div>
        </div>

        {/* TWO COLUMN CONTENT & SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Main Info & Interactive Panels */}
          <div className="lg:col-span-8 space-y-8">
            {/* About Section */}
            <section className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> About This Event
              </h2>
              <div className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                {event.description}
              </div>
            </section>

            {/* Announcements Broadcasts */}
            {id && (canManageStaff || isAuthenticated) && (
              <EventAnnouncements
                eventId={id}
                registrationCount={count}
              />
            )}

            {/* Live Campus Event Chat */}
            {isAuthenticated && id && (
              <ChatPanel
                eventId={id}
                isRegistered={!!event.isRegistered || !!event.permissions?.includes("chat")}
                userMongoId={user?.id}
                userRole={user?.role ?? "student"}
                isOwner={!!event.permissions?.includes("moderate")}
              />
            )}

            {/* Event Staff Management (Organizer / Admin / Editor) */}
            {canManageStaff && id && (
              <EventStaff eventId={id} />
            )}

            {/* Location Map */}
            {event.latitude != null && event.longitude != null && (
              <section className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
                <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="size-5 text-primary" /> Event Location & Venue
                </h2>
                <div className="overflow-hidden rounded-2xl border border-border/80 shadow-xs">
                  <EventLocationMap
                    latitude={event.latitude}
                    longitude={event.longitude}
                    venue={event.venue}
                    title={event.title}
                  />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-3 flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary shrink-0" />
                  {event.venue} {collegeName ? `• ${collegeName}` : ""}
                </p>
              </section>
            )}

            {/* Reviews & Ratings */}
            <section className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-border/60">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Attendee Reviews & Ratings
                </h2>
                {(event.reviewCount ?? 0) > 0 && (
                  <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-1.5 text-xs">
                    <StarRating
                      value={Math.round(event.averageRating ?? 0)}
                      readonly
                      size="sm"
                    />
                    <span className="font-bold text-foreground">
                      {(event.averageRating ?? 0).toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({event.reviewCount} review{event.reviewCount !== 1 ? "s" : ""})
                    </span>
                  </div>
                )}
              </div>

              {isAuthenticated &&
                user?.role === "student" &&
                event.isRegistered &&
                event.status === "completed" && (
                  <div className="mb-8 p-5 rounded-2xl border border-primary/20 bg-primary/5">
                    <h3 className="text-sm font-semibold mb-3 text-foreground">
                      Share Your Experience
                    </h3>
                    <ReviewForm
                      eventId={id}
                      onSubmitted={() => setReviewRefresh((n) => n + 1)}
                    />
                  </div>
                )}

              <ReviewList eventId={id} refresh={reviewRefresh} />
            </section>
          </div>

          {/* RIGHT COLUMN: TICKET & REGISTRATION STATION */}
          <div className="lg:col-span-4">
            <aside className="sticky top-24 space-y-5">
              {/* MAIN TICKET & REGISTRATION PASS */}
              <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-xl backdrop-blur-xl">
                {/* Decorative aurora accent */}
                <div className="absolute top-0 right-0 h-32 w-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                {/* Ticket Header */}
                <div className="flex items-start justify-between pb-4 border-b border-border/60 mb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Student Access Pass
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-display text-3xl font-black text-foreground">
                        FREE
                      </span>
                      <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                        Zero Booking Fee
                      </span>
                    </div>
                  </div>

                  <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xs">
                    <Ticket className="size-5" />
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                {capacity > 0 && (
                  <div className="mb-5">
                    <div className="flex justify-between items-end mb-1.5 text-xs">
                      <span className="text-muted-foreground font-medium">Spots Claimed</span>
                      <span className="font-bold text-foreground">
                        {count} / {capacity}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          spotsLeft === 0
                            ? "bg-destructive"
                            : isNearlyFull
                            ? "bg-amber-500"
                            : "bg-primary",
                        )}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                    {spotsLeft !== null && spotsLeft > 0 && (
                      <p className={cn("text-[11px] mt-1.5 font-medium", isNearlyFull ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground")}>
                        {isNearlyFull ? `🔥 Hurry! Only ${spotsLeft} spots remaining` : `${spotsLeft} spots available`}
                      </p>
                    )}
                  </div>
                )}

                {/* Registration Action Area */}
                {event.isRegistered ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-emerald-700 dark:text-emerald-300 font-bold text-sm shadow-2xs">
                      <CheckCircle2 className="size-5 text-emerald-500" />
                      <span>Pass Confirmed &bull; You&apos;re In!</span>
                    </div>

                    {/* QR Code Embedded in Ticket */}
                    {registrationId && (
                      <div className="p-4 rounded-2xl border border-border/80 bg-secondary/30 text-center">
                        <p className="text-xs font-bold text-foreground mb-3 flex items-center justify-center gap-1.5">
                          <Ticket className="size-3.5 text-primary" /> FastPass Check-in Ticket
                        </p>
                        <QRCodeDisplay registrationId={registrationId} />
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="w-full rounded-xl text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30"
                      onClick={handleCancelRegistration}
                      disabled={regLoading}
                    >
                      {regLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cancelling Pass...
                        </>
                      ) : (
                        "Cancel Registration"
                      )}
                    </Button>
                  </div>
                ) : isDraft ? (
                  <Button className="w-full rounded-xl" disabled>
                    Draft Event (Not Published)
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button
                      size="lg"
                      className="w-full rounded-xl h-12 text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                      onClick={handleRegister}
                      disabled={
                        regLoading ||
                        deadlinePassed ||
                        (spotsLeft !== null && spotsLeft <= 0)
                      }
                    >
                      {regLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Claiming Pass...
                        </>
                      ) : deadlinePassed ? (
                        "Registration Closed"
                      ) : spotsLeft !== null && spotsLeft <= 0 ? (
                        "Event Full (Waitlist Open)"
                      ) : (
                        "Claim Your Free Pass"
                      )}
                    </Button>

                    <div className="space-y-1.5 pt-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span>Instant digital QR FastPass</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span>Access to live event attendee chat</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span>1-click calendar export &amp; reminders</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* HOST & ORGANIZER PROFILE CARD */}
              <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs backdrop-blur-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-3">
                  Hosted by
                </span>
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shadow-2xs">
                    {organizerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-sm text-foreground truncate">
                      {organizerName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {collegeName || "Campus Organizer"}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
