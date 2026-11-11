import { Types } from "mongoose";
import { eventEnd } from "@/lib/event-time";
import type { EventResponse as ContractEventResponse, EventCategory as ContractEventCategory } from "@/lib/contracts";

export type EventStatus = "draft" | "upcoming" | "closed" | "completed";

export type EventCategory = ContractEventCategory;

export interface IEvent {
  _id: Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  timeZone?: string;
  staff?: { userId: Types.ObjectId; role: "editor" | "volunteer" }[];
  draft?: boolean;
  publishedAt?: Date;
  venue: string;
  organizerId: Types.ObjectId;
  collegeId: Types.ObjectId;
  registrationDeadline: Date;
  capacity: number;
  registeredCount?: number;
  heldCount?: number;
  status: EventStatus;
  category: EventCategory;
  image?: string;
  latitude?: number | null;
  longitude?: number | null;
  averageRating?: number;
  reviewCount?: number;
  isInterCollege?: boolean;
  partnerCollegeIds?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

/** Derived from the shared contract in lib/contracts so web, tests and mobile agree. */
export type EventResponse = ContractEventResponse;

export function computeEventStatus(event: Pick<IEvent, "date" | "registrationDeadline" | "endDate"> & { draft?: boolean }): EventStatus {
  if (event.draft) return "draft";
  const now = new Date();
  if (now >= eventEnd(event)) return "completed";
  if (now >= new Date(event.date)) return "closed";
  if (now > new Date(event.registrationDeadline)) return "closed";
  return "upcoming";
}

export function formatEventResponse(
  event: IEvent,
  registrationCount?: number,
  isRegistered?: boolean,
): EventResponse {
  return {
    id: event._id.toString(),
    title: event.title,
    description: event.description,
    date: event.date.toISOString(),
    endDate: eventEnd(event).toISOString(),
    timeZone: event.timeZone || "UTC",
    venue: event.venue,
    organizerId: event.organizerId.toString(),
    collegeId: event.collegeId.toString(),
    registrationDeadline: event.registrationDeadline.toISOString(),
    capacity: event.capacity,
    status: computeEventStatus(event),
    category: event.category,
    image: event.image || undefined,
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    averageRating: event.averageRating ?? 0,
    reviewCount: event.reviewCount ?? 0,
    isInterCollege: event.isInterCollege ?? false,
    partnerCollegeIds: (event.partnerCollegeIds ?? []).map((id) =>
      id.toString(),
    ),
    registrationCount,
    seatsHeld: event.heldCount ?? 0,
    isRegistered,
    publishedAt: event.draft ? null : (event.publishedAt ?? event.createdAt).toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}
