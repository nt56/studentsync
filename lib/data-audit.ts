import mongoose from "mongoose";
import { eventEnd, validTimeZone } from "@/lib/event-time";
import Event from "@/models/Event";
import User from "@/models/User";
import College from "@/models/College";
import Registration from "@/models/Registration";
import Bookmark from "@/models/Bookmark";
import Notification from "@/models/Notification";
import Collaboration from "@/models/Collaboration";
import Review from "@/models/Review";
import Message from "@/models/Message";

const models = { Registration, Bookmark, Notification, Collaboration, Review, Message };
export type AuditIssue = { model: string; id: string; problem: string; repair: "delete-orphan" | "sync-role" | "event-time" | "review-stats" | "manual" };

/** No mutations. Missing review/message authors are intentionally retained. */
export async function auditDatabase(session?: mongoose.ClientSession): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  for (const [name, model] of Object.entries(models)) {
    for await (const row of model.find().cursor()) {
      let missing = false;
      if (row.eventId && !await Event.exists({ _id: row.eventId })) missing = true;
      const users = name === "Registration" ? [row.studentId] : name === "Collaboration" ? [row.requesterId, row.targetOrganizerId] : ["Bookmark", "Notification"].includes(name) ? [row.userId] : [];
      for (const userId of users) if (userId && !await User.exists({ _id: userId })) missing = true;
      if (missing) issues.push({ model: name, id: row._id.toString(), problem: "Missing required event or user", repair: "delete-orphan" });
    }
  }
  for await (const user of User.find().cursor()) {
    const identity = await mongoose.connection.collection("user").findOne({ email: user.email }, { session });
    if (!identity) issues.push({ model: "User", id: user._id.toString(), problem: "Application profile has no login identity; investigate before changing it", repair: "manual" });
    else if (identity.role !== user.role) issues.push({ model: "User", id: user._id.toString(), problem: "Login identity role differs from application role", repair: "sync-role" });
  }
  for await (const event of Event.find().lean().cursor()) {
    if (!await User.exists({ _id: event.organizerId }) || !await College.exists({ _id: event.collegeId })) issues.push({ model: "Event", id: event._id.toString(), problem: "Missing owner or host college; reassign manually", repair: "manual" });
    if ((event.endDate && event.endDate <= event.date) || (event.timeZone && !validTimeZone(event.timeZone))) issues.push({ model: "Event", id: event._id.toString(), problem: "Invalid scheduling fields; correct manually", repair: "manual" });
    else if (!event.endDate || !event.timeZone) issues.push({ model: "Event", id: event._id.toString(), problem: "Missing end/timezone; proposed fallback is two hours and UTC, review before applying", repair: "event-time" });
    const [stats] = await Review.aggregate([{ $match: { eventId: event._id } }, { $group: { _id: null, count: { $sum: 1 }, rating: { $avg: "$rating" } } }]);
    if (event.reviewCount !== (stats?.count || 0) || event.averageRating !== Math.round((stats?.rating || 0) * 10) / 10) issues.push({ model: "Event", id: event._id.toString(), problem: "Cached review totals differ from reviews", repair: "review-stats" });
    const count = await Registration.countDocuments({ eventId: event._id });
    if (count > event.capacity) issues.push({ model: "Event", id: event._id.toString(), problem: `${count} registrations exceed capacity ${event.capacity}; resolve with the organizer`, repair: "manual" });
  }
  return issues;
}

/** Re-check each approved issue inside a transaction. Run with app writes paused;
 * only IDs and repair kinds in the reviewed report can be changed. */
export async function repairIssues(approved: AuditIssue[]) {
  mongoose.set("transactionAsyncLocalStorage", true);
  return mongoose.connection.transaction(async (session) => {
    const current = await auditDatabase(session);
    const key = (issue: AuditIssue) => `${issue.model}:${issue.id}:${issue.repair}`;
    const allow = new Set(approved.map(key));
    let repaired = 0;
    for (const issue of current) {
      if (issue.repair === "manual" || !allow.has(key(issue))) continue;
      if (issue.repair === "delete-orphan") await models[issue.model as keyof typeof models].deleteOne({ _id: issue.id });
      if (issue.repair === "sync-role") {
        const user = await User.findById(issue.id);
        await mongoose.connection.collection("user").updateOne({ email: user!.email }, { $set: { role: user!.role } }, { session });
      }
      if (issue.repair === "event-time") {
        const event = await Event.findById(issue.id);
        await Event.updateOne({ _id: issue.id }, { $set: { endDate: eventEnd(event!), timeZone: event!.timeZone || "UTC" } });
      }
      if (issue.repair === "review-stats") {
        const [stats] = await Review.aggregate([{ $match: { eventId: new mongoose.Types.ObjectId(issue.id) } }, { $group: { _id: null, count: { $sum: 1 }, rating: { $avg: "$rating" } } }]);
        await Event.updateOne({ _id: issue.id }, { $set: { reviewCount: stats?.count || 0, averageRating: Math.round((stats?.rating || 0) * 10) / 10 } });
      }
      repaired++;
    }
    return repaired;
  });
}
