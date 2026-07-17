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
  const { currentEvent: event, isLoading, error } = useAppSelector(
    (s) => s.events,
  );
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const { isLoading: regLoading } = useAppSelector((s) => s.registrations);
  const { initialized: bookmarksInitialized } = useAppSelector((s) => s.bookmarks);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  // Fetch the student's own registrationId so we can show the QR code.
  // Reset on id change and guard against a stale response overwriting a newer
  // event's registration (race when navigating between events).
  useEffect(() => {
    setRegistrationId(null);
    if (!isAuthenticated || !id || user?.role !== "student") return;
    let ignore = false;
    async function loadReg() {
      try {
        const res = await (
          await import("@/services/api")
        ).default.get(`/registrations?eventId=${id}&limit=1`);
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

  if (isLoading) return <EventDetailSkeleton />;

  // Failed to load or no such event — show a recoverable error instead of an
  // infinite skeleton.
  if (!event) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Event not available</h1>
        <p className="text-muted-foreground">
          {error ||
            "This event could not be found. It may have been removed or the link is incorrect."}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={() => id && dispatch(fetchEventById(id))}>
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
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </button>

      {/* Hero Image */}
      <header className="mb-8">
        <div className="relative w-full h-[400px] md:h-[450px] overflow-hidden rounded-xl bg-secondary/30 border border-border group">
          {event.image ? (
            <>
              {/* Blurred Background Layer */}
              <div 
                className="absolute inset-0 bg-cover bg-center blur-3xl opacity-40 scale-110" 
                style={{ backgroundImage: `url(${event.image})` }} 
              />
              {/* Main Contained Image */}
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
            <div className="absolute inset-0 flex items-center justify-center">
              <Calendar className="h-20 w-20 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 p-6 md:p-10 text-white z-20 w-full">
            <div className="flex flex-wrap gap-2 mb-4">
              {event.category && <CategoryBadge category={event.category} />}
              {event.status && <EventStatusBadge status={event.status} />}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 leading-tight tracking-tight max-w-4xl">
              {event.title}
            </h1>
            <p className="text-slate-300 text-sm md:text-base flex items-center gap-2 font-medium">
              <Users className="h-4 w-4 md:h-5 md:w-5" /> Hosted by {organizerName}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Info Quick Grid */}
          <section className="surface-card grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date &amp; Time</p>
                <p className="font-medium text-foreground">
                  {eventDate ? format(eventDate, "MMM dd, yyyy") : "TBA"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {eventDate ? format(eventDate, "hh:mm a") : ""}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 md:border-l md:border-border md:pl-6">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Venue</p>
                <p className="font-medium text-foreground">
                  {event.venue || "TBA"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 md:border-l md:border-border md:pl-6">
              <div
                className={`p-2.5 rounded-lg ${deadlinePassed ? "bg-red-500/10" : "bg-primary/10"}`}
              >
                <Clock
                  className={`h-5 w-5 ${deadlinePassed ? "text-red-500" : "text-primary"}`}
                />
              </div>
              <div>
                <p
                  className={`text-xs ${deadlinePassed ? "text-red-500" : "text-muted-foreground"}`}
                >
                  Deadline
                </p>
                <p className="font-medium text-foreground">
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
          <section>
            <h2 className="text-xl font-bold mb-3 text-foreground">
              About the Event
            </h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
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
              <h2 className="text-xl font-bold mb-3 text-foreground">
                Event Location
              </h2>
              <EventLocationMap
                latitude={event.latitude}
                longitude={event.longitude}
                venue={event.venue}
                title={event.title}
              />
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.venue}
              </p>
            </section>
          )}

          {/* Reviews & Ratings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                Reviews &amp; Ratings
              </h2>
              {(event.reviewCount ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating
                    value={Math.round(event.averageRating ?? 0)}
                    readonly
                    size="sm"
                  />
                  <span className="text-sm font-semibold">
                    {(event.averageRating ?? 0).toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({event.reviewCount} review
                    {event.reviewCount !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
            </div>

            {isAuthenticated &&
              user?.role === "student" &&
              event.isRegistered &&
              event.status === "completed" && (
                <div className="surface-card mb-6 p-5 rounded-xl">
                  <h3 className="text-sm font-semibold mb-3 text-foreground">
                    Write a Review
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

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-4">
          <aside className="sticky top-24 space-y-5">
            {/* Main CTA Card */}
            <div className="surface-card p-5 rounded-xl">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <span className="text-muted-foreground text-xs block">
                    Entry Fee
                  </span>
                  <span className="text-2xl font-bold text-foreground">
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
                <div className="mb-5">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-muted-foreground">
                      Capacity
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {event.registrationCount || 0}/{event.capacity} joined
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(fillPercent, 100)}%` }}
                    />
                  </div>
                  {spotsLeft !== null && spotsLeft > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
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
                  className="w-full"
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
            <div className="surface-card p-5 rounded-xl">
              <h4 className="text-xs text-muted-foreground mb-3">Organizer</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {organizerName.charAt(0)}
                  </span>
                </div>
                <div>
                  <h5 className="font-medium text-foreground">
                    {organizerName}
                  </h5>
                  <p className="text-sm text-muted-foreground">
                    Event Organizer
                  </p>
                </div>
              </div>
            </div>

            {/* Student QR Check-in Card */}
            {isAuthenticated &&
              user?.role === "student" &&
              event.isRegistered &&
              registrationId && (
                <div className="surface-card p-5 rounded-xl">
                  <h4 className="text-xs text-muted-foreground mb-3">
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
