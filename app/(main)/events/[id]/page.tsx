"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEventById, clearCurrentEvent } from "@/store/slices/eventsSlice";
import {
  registerForEvent,
  cancelRegistration,
  fetchRegistrations,
} from "@/store/slices/registrationsSlice";
import { fetchBookmarks } from "@/store/slices/bookmarksSlice";
import { EventDetailSkeleton } from "@/components/common/Skeletons";
import { EventStatusBadge, CategoryBadge } from "@/components/common/Badges";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import AddToCalendar from "@/components/events/AddToCalendar";
import { BookmarkButton } from "@/components/events/BookmarkButton";
import { ShareButton } from "@/components/events/ShareButton";
import StarRating from "@/components/events/StarRating";
import ReviewForm from "@/components/events/ReviewForm";
import ReviewList from "@/components/events/ReviewList";
import QRCodeDisplay from "@/components/events/QRCodeDisplay";
import { format, isPast } from "date-fns";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  Users,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

// Leaflet requires browser APIs — SSR must be disabled
const EventLocationMap = dynamic(
  () => import("@/components/events/EventLocationMap"),
  { ssr: false },
);

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentEvent: event, isLoading } = useAppSelector((s) => s.events);
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const { isLoading: regLoading } = useAppSelector((s) => s.registrations);
  const { initialized: bookmarksInitialized } = useAppSelector((s) => s.bookmarks);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  // Fetch the student's own registrationId so we can show the QR code
  useEffect(() => {
    if (!isAuthenticated || !id || user?.role !== "student") return;
    async function loadReg() {
      try {
        const res = await (
          await import("@/services/api")
        ).default.get(`/registrations?eventId=${id}&limit=1`);
        const items = res.data?.items ?? res.data ?? [];
        if (Array.isArray(items) && items.length > 0) {
          setRegistrationId(items[0].id ?? items[0]._id);
        }
      } catch {
        // ignore
      }
    }
    loadReg();
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
      toast.success("Successfully registered for the event!");
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
      dispatch(fetchEventById(id));
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : "Failed to cancel registration",
      );
    }
  };

  if (isLoading || !event) return <EventDetailSkeleton />;

  const eventDate = event.date ? new Date(event.date) : null;
  const deadline = event.registrationDeadline
    ? new Date(event.registrationDeadline)
    : null;
  const deadlinePassed = deadline ? isPast(deadline) : false;
  const fillPercent =
    event.capacity && event.registrationCount != null
      ? Math.round((event.registrationCount / event.capacity) * 100)
      : 0;
  const spotsLeft =
    event.capacity && event.registrationCount != null
      ? event.capacity - event.registrationCount
      : null;

  const organizerName =
    typeof event.organizerId === "object" && event.organizerId
      ? `${(event.organizerId as unknown as { firstName: string; lastName: string }).firstName} ${(event.organizerId as unknown as { firstName: string; lastName: string }).lastName}`
      : "Event Organizer";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </button>

      {/* Hero Image */}
      <header className="mb-10 animate-fade-in">
        <div className="relative w-full h-[400px] overflow-hidden rounded-xl mb-8 shadow-xl bg-gradient-to-br from-primary/20 to-primary/5">
          {event.image ? (
            <Image
              src={event.image}
              alt={event.title}
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover object-center"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Calendar className="h-24 w-24 text-primary/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 text-white">
            <div className="flex gap-2 mb-4">
              {event.category && <CategoryBadge category={event.category} />}
              {event.status && <EventStatusBadge status={event.status} />}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2">
              {event.title}
            </h1>
            <p className="text-slate-200 text-lg flex items-center gap-2">
              <Users className="h-4 w-4" /> Hosted by {organizerName}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-10 animate-fade-in-up">
          {/* Info Quick Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Date & Time
                </p>
                <p className="font-semibold">
                  {eventDate ? format(eventDate, "MMM dd, yyyy") : "TBA"}
                </p>
                <p className="text-sm text-slate-500">
                  {eventDate ? format(eventDate, "hh:mm a") : ""}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 border-l border-slate-100 dark:border-slate-800 md:pl-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Venue
                </p>
                <p className="font-semibold">{event.venue || "TBA"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 border-l border-slate-100 dark:border-slate-800 md:pl-6">
              <div
                className={`p-3 rounded-lg ${deadlinePassed ? "bg-red-500/10" : "bg-primary/10"}`}
              >
                <Clock
                  className={`h-5 w-5 ${deadlinePassed ? "text-red-500" : "text-primary"}`}
                />
              </div>
              <div>
                <p
                  className={`text-xs font-bold uppercase ${deadlinePassed ? "text-red-500" : "text-slate-500"}`}
                >
                  Deadline
                </p>
                <p className="font-semibold">
                  {deadline ? format(deadline, "MMM dd, yyyy") : "TBA"}
                </p>
                {deadlinePassed && (
                  <p className="text-sm text-red-400 font-medium">
                    Registration closed
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="prose prose-slate dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold mb-4">About the Event</h2>
            <div className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {event.description}
            </div>
          </section>

          {/* Chat */}
          {isAuthenticated && (
            <ChatPanel
              eventId={id}
              isRegistered={!!event.isRegistered}
              userMongoId={user?.id}
              userRole={user?.role ?? "student"}
            />
          )}

          {/* Location Map */}
          {event.latitude != null && event.longitude != null && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Event Location</h2>
              <EventLocationMap
                latitude={event.latitude}
                longitude={event.longitude}
                venue={event.venue}
                title={event.title}
              />
              <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.venue}
              </p>
            </section>
          )}

          {/* Reviews & Ratings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Reviews & Ratings</h2>
              {(event as any).reviewCount > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating
                    value={Math.round((event as any).averageRating ?? 0)}
                    readonly
                    size="sm"
                  />
                  <span className="text-sm font-semibold">
                    {((event as any).averageRating ?? 0).toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({(event as any).reviewCount} review
                    {(event as any).reviewCount !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
            </div>

            {isAuthenticated &&
              user?.role === "student" &&
              event.isRegistered &&
              event.status === "completed" && (
                <div className="mb-6 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <h3 className="text-sm font-semibold mb-3">Write a Review</h3>
                  <ReviewForm
                    eventId={id}
                    onSubmitted={() => setReviewRefresh((n) => n + 1)}
                  />
                </div>
              )}

            <ReviewList eventId={id} refresh={reviewRefresh} />
          </section>
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-4 animate-fade-in-up delay-100">
          <aside className="sticky top-24 space-y-6">
            {/* Main CTA Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-slate-500 text-sm block">
                    Entry Fee
                  </span>
                  <span className="text-3xl font-extrabold text-primary">
                    Free
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {event.date && (
                    <AddToCalendar
                      eventId={id}
                      title={event.title}
                      description={event.description}
                      location={event.venue}
                      startDate={event.date}
                    />
                  )}
                  <BookmarkButton eventId={id} />
                  <ShareButton
                    url={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${id}`}
                    title={event.title}
                    description={event.description}
                  />
                </div>
              </div>

              {/* Capacity Indicator */}
              {event.capacity && (
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Registration Capacity
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {event.registrationCount || 0}/{event.capacity} joined
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(fillPercent, 100)}%` }}
                    />
                  </div>
                  {spotsLeft !== null && spotsLeft > 0 && (
                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold text-center">
                      {spotsLeft} spots remaining
                    </p>
                  )}
                </div>
              )}

              {event.isRegistered ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-600 font-semibold py-3">
                    <CheckCircle2 className="h-5 w-5" />
                    You&apos;re Registered
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    onClick={handleCancelRegistration}
                    disabled={regLoading}
                  >
                    {regLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      "Cancel Registration"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20"
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
                      Registering...
                    </>
                  ) : deadlinePassed ? (
                    "Registration Closed"
                  ) : spotsLeft !== null && spotsLeft <= 0 ? (
                    "Event Full"
                  ) : (
                    "Register Now"
                  )}
                </Button>
              )}
            </div>

            {/* Organizer Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                Organizer
              </h4>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">
                    {organizerName.charAt(0)}
                  </span>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white">
                    {organizerName}
                  </h5>
                  <p className="text-sm text-slate-500">Event Organizer</p>
                </div>
              </div>
            </div>

            {/* Student QR Check-in Card */}
            {isAuthenticated &&
              user?.role === "student" &&
              event.isRegistered &&
              registrationId && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                    Your Check-in QR
                  </h4>
                  <QRCodeDisplay registrationId={registrationId} />
                </div>
              )}
          </aside>
        </div>
      </div>
    </div>
  );
}
