import { Types } from "mongoose";

export type UserRole = "student" | "organizer" | "admin";
export type Gender = "male" | "female" | "other" | "prefer-not-to-say";

export interface IUser {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  gender?: Gender;
  dateOfBirth?: Date;
  phone?: string;
  bio?: string;
  profileImage?: string;
  collegeId?: Types.ObjectId;
  authUserId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  gender?: Gender;
  dateOfBirth?: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  collegeId?: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeCollegeId(
  collegeId:
    | Types.ObjectId
    | { _id?: Types.ObjectId | string }
    | string
    | undefined,
) {
  if (!collegeId) {
    return undefined;
  }

  if (typeof collegeId === "string") {
    return collegeId;
  }

  if (typeof collegeId === "object" && "_id" in collegeId && collegeId._id) {
    return collegeId._id.toString();
  }

  return collegeId.toString();
}

export function formatUserResponse(user: IUser): UserResponse {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth?.toISOString(),
    phone: user.phone,
    bio: user.bio,
    profileImage: user.profileImage || undefined,
    collegeId: normalizeCollegeId(
      user.collegeId as
        | Types.ObjectId
        | { _id?: Types.ObjectId | string }
        | string
        | undefined,
    ),
    createdAt: user.createdAt?.toISOString() ?? new Date(0).toISOString(),
    updatedAt: user.updatedAt?.toISOString() ?? new Date(0).toISOString(),
  };
}
