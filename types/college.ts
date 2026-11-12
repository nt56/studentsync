import { Types } from "mongoose";
import { collegeStatus } from "@/models/College";
import type { CollegeResponse, CollegeStatus } from "@/lib/contracts";

export type { CollegeResponse };

export interface ICollege {
  _id: Types.ObjectId;
  name: string;
  location?: string;
  isVerified: boolean;
  status?: CollegeStatus;
  submittedBy?: Types.ObjectId;
  decision?: { key: string; status: "verified" | "rejected"; reason: string; at: Date; pending?: boolean };
  createdAt: Date;
  updatedAt: Date;
}

/** `forAdmin` adds the latest decision and the submitter; everyone else gets the public fields. */
export function formatCollegeResponse(college: ICollege, { forAdmin = false } = {}): CollegeResponse {
  return {
    id: college._id.toString(),
    name: college.name,
    location: college.location,
    isVerified: college.isVerified,
    status: collegeStatus(college),
    ...(forAdmin ? {
      decision: college.decision?.status
        ? { status: college.decision.status, reason: college.decision.reason, at: college.decision.at.toISOString() }
        : null,
      submittedBy: college.submittedBy?.toString() ?? null,
    } : {}),
    createdAt: college.createdAt.toISOString(),
    updatedAt: college.updatedAt.toISOString(),
  };
}
