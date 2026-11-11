import { Schema, models, model } from "mongoose";
import { EVENT_CATEGORIES } from "@/lib/contracts";

/**
 * A student's named event filter. Filters are fixed once saved (delete and save
 * again to change them); only the name and the alert switch can be edited.
 */
const SavedSearchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // Lower-cased name: one name per student, ignoring case.
    nameKey: { type: String, required: true },
    filters: {
      _id: false,
      search: { type: String, trim: true, maxlength: 100 },
      category: { type: String, enum: [...EVENT_CATEGORIES] },
      collegeId: { type: Schema.Types.ObjectId, ref: "College" },
      isInterCollege: { type: Boolean },
    },
    alerts: { type: Boolean, default: false },
    // Only events published after this instant alert, so turning alerts on
    // never floods the student with older events.
    alertsSince: { type: Date },
    // Alert worker cursor: events published up to here have been matched.
    alertsCheckedAt: { type: Date },
  },
  { timestamps: true },
);

SavedSearchSchema.index({ userId: 1, nameKey: 1 }, { unique: true });
SavedSearchSchema.index({ alerts: 1, alertsCheckedAt: 1 });

const SavedSearch = models.SavedSearch || model("SavedSearch", SavedSearchSchema);
export default SavedSearch;
