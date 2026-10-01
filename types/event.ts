import { Types } from "mongoose";
import { eventEnd } from "@/lib/event-time";

export type EventStatus = "upcoming" | "closed" | "completed";

export type EventCategory =
  | "workshop"
  | "seminar"
  | "cultural"
  | "sports"
  | "technical"
  | "social"
  | "other";

export interface IEvent {
  _id: Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  timeZone?: string;
  staff?: { userId: Types.ObjectId; role: "editor" | "volunteer" }[];
  venue: string;
  organizerId: Types.ObjectId;
  collegeId: Types.ObjectId;
  registrationDeadline: Date;
  capacity: number;
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

export interface EventResponse {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  timeZone?: string;
  permissions?: string[];
  venue: string;
  organizerId: string;
  collegeId: string;
  registrationDeadline: string;
  capacity: number;
  status: EventStatus;
  category: EventCategory;
  image?: string;
  latitude?: number | null;
  longitude?: number | null;
  averageRating?: number;
  reviewCount?: number;
  isInterCollege?: boolean;
  partnerCollegeIds?: string[];
  registrationCount?: number;
  isRegistered?: boolean;
  createdAt: string;
  updatedAt: string;
}

export function computeEventStatus(event: Pick<IEvent, "date" | "registrationDeadline" | "endDate">): EventStatus {
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
    isRegistered,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}
