/**
 * Demo data for manual testing: 2 organizers, 12 students, 4 colleges, 28 events
 * across every category and lifecycle state, plus registrations, check-ins, reviews,
 * bookmarks, chat, collaborations, event staff and notifications.
 *
 *   npm run seed:demo             replace the demo data (dates are relative to today)
 *   npm run seed:demo -- --clean  remove the demo data only
 *
 * Everything is identified by the reserved `@studentsync.test` address, the college
 * names below, or a `seed:` dedupe key, so existing data is never touched. Accounts
 * are inserted directly (not via signUpEmail) so no real email is queued, and they
 * opt out of non-essential email so testing cannot send to these fake addresses.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

const EMAIL_DOMAIN = "studentsync.test";
const ORGANIZER_PASSWORD = "Organizer@123";
const STUDENT_PASSWORD = "Student@123";
const TIME_ZONE = "Asia/Kolkata";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const IMG = (path: string) => `https://res.cloudinary.com/demo/image/upload/${path}`;
const IMAGES = {
  people: IMG("samples/cloudinary-group.jpg"),
  jazz: IMG("samples/people/jazz.jpg"),
  bicycle: IMG("samples/people/bicycle.jpg"),
  speaker: IMG("samples/people/smiling-man.jpg"),
  bar: IMG("samples/people/kitchen-bar.jpg"),
  city: IMG("samples/landscapes/girl-urban-view.jpg"),
  signs: IMG("samples/landscapes/architecture-signs.jpg"),
  mountains: IMG("samples/landscapes/nature-mountains.jpg"),
  beach: IMG("samples/landscapes/beach-boat.jpg"),
  spices: IMG("samples/food/spices.jpg"),
  dessert: IMG("samples/food/dessert.jpg"),
  watch: IMG("samples/ecommerce/analog-classic.jpg"),
  bag: IMG("samples/ecommerce/accessories-bag.jpg"),
};

type CollegeKey = "northbridge" | "riverside" | "lakeview" | "hillcrest";
const COLLEGES: Record<CollegeKey, { name: string; location: string; isVerified: boolean; lat: number; lng: number }> = {
  northbridge: { name: "Northbridge Institute of Technology", location: "Pune, Maharashtra", isVerified: true, lat: 18.5204, lng: 73.8567 },
  riverside: { name: "Riverside Engineering College", location: "Bengaluru, Karnataka", isVerified: true, lat: 12.9716, lng: 77.5946 },
  lakeview: { name: "Lakeview College of Arts and Science", location: "Mumbai, Maharashtra", isVerified: true, lat: 19.076, lng: 72.8777 },
  // Left unverified so the admin verification flow has something to act on.
  hillcrest: { name: "Hillcrest Polytechnic", location: "Nashik, Maharashtra", isVerified: false, lat: 19.9975, lng: 73.7898 },
};

const ORGANIZERS = [
  { firstName: "Ananya", lastName: "Kulkarni", gender: "female", college: "northbridge", bio: "Student activities coordinator at Northbridge." },
  { firstName: "Rohan", lastName: "Menon", gender: "male", college: "riverside", bio: "Runs the technical and sports clubs at Riverside." },
] as const;

const STUDENTS: { firstName: string; lastName: string; gender: string; college?: CollegeKey }[] = [
  { firstName: "Aarav", lastName: "Patel", gender: "male", college: "northbridge" },
  { firstName: "Diya", lastName: "Nair", gender: "female", college: "northbridge" },
  { firstName: "Kabir", lastName: "Singh", gender: "male", college: "riverside" },
  { firstName: "Meera", lastName: "Iyer", gender: "female", college: "riverside" },
  { firstName: "Vivaan", lastName: "Joshi", gender: "male", college: "lakeview" },
  { firstName: "Sara", lastName: "Khan", gender: "female", college: "lakeview" },
  { firstName: "Arjun", lastName: "Reddy", gender: "male", college: "northbridge" },
  { firstName: "Ishita", lastName: "Das", gender: "female", college: "riverside" },
  { firstName: "Nikhil", lastName: "Rao", gender: "male", college: "hillcrest" },
  { firstName: "Tara", lastName: "Fernandes", gender: "female", college: "lakeview" },
  { firstName: "Yash", lastName: "Verma", gender: "prefer-not-to-say", college: "hillcrest" },
  // Brand-new account: no college, no activity (see the profile block in main()).
  { firstName: "Zoya", lastName: "Sheikh", gender: "female" },
];

type Category = import("../lib/contracts").EventCategory;
interface EventSpec {
  key: string;
  title: string;
  category: Category;
  organizer: 0 | 1;
  venue: string;
  description: string;
  /** Start offset from now, in hours. */
  startsIn: number;
  durationHours?: number;
  /** Registration deadline offset from now, in hours. Defaults to 24h before the start. */
  deadlineIn?: number;
  capacity: number;
  /** Registrations to create. */
  fill: number;
  /** student1, the main test account, is registered. */
  student1?: boolean;
  image?: string;
  noCoordinates?: boolean;
  partners?: CollegeKey[];
  noReviews?: boolean;
}

const d = (days: number) => days * 24;

const EVENTS: EventSpec[] = [
  // Workshops
  { key: "react", title: "Hands-on React and Next.js Bootcamp", category: "workshop", organizer: 0, venue: "Computer Lab 3, Northbridge", description: "A full-day practical bootcamp. Build and deploy a small full-stack app with React and Next.js. Bring a laptop with Node.js installed.", startsIn: d(12), durationHours: 8, capacity: 60, fill: 8, student1: true, image: IMAGES.signs },
  { key: "uiux", title: "UI/UX Design Sprint", category: "workshop", organizer: 1, venue: "Design Studio, Riverside", description: "Teams go from problem statement to clickable prototype in one day, with feedback from working designers.", startsIn: -d(20), durationHours: 6, capacity: 40, fill: 9, student1: true, image: IMAGES.bag },
  { key: "git", title: "Git and GitHub for Beginners", category: "workshop", organizer: 0, venue: "Seminar Hall B, Northbridge", description: "Happening now. Learn commits, branches, pull requests and how to recover from common mistakes.", startsIn: -1, durationHours: 4, deadlineIn: -d(1), capacity: 50, fill: 8, student1: true, image: IMAGES.city },
  { key: "photo", title: "Photography Basics Walk", category: "workshop", organizer: 1, venue: "Main Gate, Riverside", description: "A small guided photo walk covering exposure, composition and editing. Seats are limited so everyone gets mentor time.", startsIn: d(9), durationHours: 3, capacity: 6, fill: 6, image: IMAGES.beach },

  // Seminars
  { key: "datasci", title: "Careers in Data Science", category: "seminar", organizer: 1, venue: "Auditorium, Riverside", description: "Industry speakers on what data roles involve day to day, which skills matter, and how to build a portfolio.", startsIn: 30, durationHours: 2, deadlineIn: 20, capacity: 120, fill: 7, student1: true, image: IMAGES.speaker },
  { key: "ip", title: "Intellectual Property for Student Founders", category: "seminar", organizer: 0, venue: "Conference Room 2, Northbridge", description: "Patents, trademarks and copyright explained for students building their own products.", startsIn: -d(35), durationHours: 2, capacity: 80, fill: 7, image: IMAGES.watch },
  { key: "abroad", title: "Higher Studies Abroad Guidance", category: "seminar", organizer: 1, venue: "Seminar Hall A, Riverside", description: "Registration closes soon. Admissions, scholarships and visas, with alumni answering questions.", startsIn: d(6), durationHours: 2, deadlineIn: 20, capacity: 100, fill: 4, image: IMAGES.mountains },
  { key: "wellbeing", title: "Managing Exam Stress", category: "seminar", organizer: 0, venue: "Student Wellness Centre, Northbridge", description: "Registration has closed for this session. Practical techniques from the campus counselling team.", startsIn: d(4), durationHours: 2, deadlineIn: -d(1), capacity: 45, fill: 6, student1: true, image: IMAGES.beach },

  // Cultural
  { key: "rang", title: "Rang 2026 Annual Cultural Fest", category: "cultural", organizer: 0, venue: "Open Air Theatre, Northbridge", description: "Three days of dance, drama, music and food stalls. Colleges across the region compete for the overall trophy.", startsIn: d(18), durationHours: 60, capacity: 500, fill: 10, student1: true, image: IMAGES.people, partners: ["lakeview"] },
  { key: "classical", title: "Classical Music Evening", category: "cultural", organizer: 1, venue: "Riverside Amphitheatre", description: "An evening of Hindustani and Carnatic performances by students and guest artists.", startsIn: -d(14), durationHours: 3, capacity: 150, fill: 8, image: IMAGES.jazz },
  { key: "streetplay", title: "Street Play Competition", category: "cultural", organizer: 1, venue: "Central Lawn, Riverside", description: "Teams perform 10-minute street plays on social themes, judged by theatre practitioners.", startsIn: d(15), durationHours: 5, capacity: 200, fill: 5, image: IMAGES.city, partners: ["lakeview"] },
  { key: "openmic", title: "Open Mic Night", category: "cultural", organizer: 0, venue: "Campus Cafe, Northbridge", description: "Poetry, stand-up and acoustic sets. This one is fully booked.", startsIn: d(7), durationHours: 3, capacity: 8, fill: 8, image: IMAGES.bar },

  // Sports
  { key: "cricket", title: "Inter-College Cricket Tournament", category: "sports", organizer: 1, venue: "Riverside Sports Ground", description: "A three-day T20 knockout between college teams. Spectators welcome.", startsIn: d(21), durationHours: 56, capacity: 300, fill: 9, image: IMAGES.mountains, partners: ["northbridge"] },
  { key: "run", title: "5K Campus Run", category: "sports", organizer: 0, venue: "Sports Complex, Northbridge", description: "A timed 5K around campus. All fitness levels welcome, with medals for the top finishers.", startsIn: -d(10), durationHours: 3, capacity: 200, fill: 10, student1: true, image: IMAGES.bicycle },
  { key: "tt", title: "Table Tennis Championship", category: "sports", organizer: 0, venue: "Indoor Hall, Northbridge", description: "Singles knockout. Bring your own bat if you have one; a few are available to borrow.", startsIn: 40, durationHours: 6, deadlineIn: 30, capacity: 32, fill: 5, student1: true, image: IMAGES.signs },
  { key: "badminton", title: "Badminton Doubles League", category: "sports", organizer: 1, venue: "Badminton Courts, Riverside", description: "League-format doubles played across a full weekend of matches.", startsIn: -d(50), durationHours: 8, capacity: 48, fill: 6, image: IMAGES.watch, noReviews: true },

  // Technical
  { key: "hackathon", title: "24-Hour Hackathon: Build for Campus", category: "technical", organizer: 0, venue: "Innovation Hub, Northbridge", description: "Teams of up to four build something useful for campus life in 24 hours. Meals, mentors and prizes included.", startsIn: d(25), durationHours: 24, capacity: 150, fill: 11, student1: true, image: IMAGES.people, partners: ["riverside"] },
  { key: "cloud", title: "Intro to Cloud and Docker", category: "technical", organizer: 1, venue: "Computer Lab 1, Riverside", description: "Containerise an app, push it to a registry and deploy it. Basic command line knowledge is assumed.", startsIn: d(11), durationHours: 4, capacity: 40, fill: 6, image: IMAGES.signs },
  { key: "cp", title: "Competitive Programming Contest", category: "technical", organizer: 0, venue: "Computer Lab 2, Northbridge", description: "Three hours, six problems, individual ranking. Any mainstream language is allowed.", startsIn: -d(7), durationHours: 3, capacity: 70, fill: 9, student1: true, image: IMAGES.city },
  { key: "robotics", title: "Robotics Expo", category: "technical", organizer: 1, venue: "Mechanical Block, Riverside", description: "Student-built robots on display, with live line-follower and sumo matches. One seat left.", startsIn: d(16), durationHours: 6, capacity: 11, fill: 10, image: IMAGES.watch },

  // Social
  { key: "blood", title: "Blood Donation Drive", category: "social", organizer: 0, venue: "Health Centre, Northbridge", description: "Run with the city blood bank. Donors must be 18 or older and in good health.", startsIn: d(5), durationHours: 6, capacity: 100, fill: 7, image: IMAGES.dessert },
  { key: "freshers", title: "Freshers Welcome Meetup", category: "social", organizer: 1, venue: "Student Centre, Riverside", description: "Meet your seniors, join clubs and find your way around campus.", startsIn: -d(60), durationHours: 3, capacity: 200, fill: 10, image: IMAGES.people },
  { key: "cleanup", title: "Campus Clean-Up Day", category: "social", organizer: 1, venue: "Starts at the Library Steps, Riverside", description: "Volunteers tidy the campus and lake path. Gloves and bags provided. Deliberately has no image or map pin.", startsIn: d(8), durationHours: 3, capacity: 60, fill: 3, noCoordinates: true },
  { key: "alumni", title: "Alumni Networking Evening", category: "social", organizer: 0, venue: "Convention Hall, Northbridge", description: "Meet alumni from product, research and public service roles. Nobody has registered yet.", startsIn: d(60), durationHours: 3, capacity: 90, fill: 0, image: IMAGES.bar },

  // Other
  { key: "books", title: "Campus Book Exchange", category: "other", organizer: 0, venue: "Library Foyer, Northbridge", description: "Bring old textbooks and swap them for the ones you need next semester. Deliberately has no image.", startsIn: d(13), durationHours: 5, capacity: 80, fill: 4 },
  { key: "pitch", title: "Startup Pitch Night", category: "other", organizer: 1, venue: "Incubation Centre, Riverside", description: "Five-minute pitches to a panel of founders and investors, with seed grants for the best ideas.", startsIn: d(17), durationHours: 3, capacity: 75, fill: 6, image: IMAGES.speaker },
  { key: "careerfair", title: "Career Fair 2026", category: "other", organizer: 0, venue: "Sports Complex, Northbridge", description: "Over thirty employers on campus for internships and graduate roles. Bring printed resumes.", startsIn: -d(3), durationHours: 7, capacity: 400, fill: 10, student1: true, image: IMAGES.spices },
  { key: "boardgames", title: "Board Games Night", category: "other", organizer: 1, venue: "Student Lounge, Riverside", description: "Casual evening of strategy and party games, with snacks provided. Bring a friend.", startsIn: d(3), durationHours: 3, capacity: 30, fill: 5, noCoordinates: true, image: IMAGES.dessert },
];

/** Events where student1 must stay free to submit a review through the app. */
const STUDENT1_UNREVIEWED = new Set(["cp", "careerfair"]);

const REVIEW_COMMENTS = [
  "Really well organised, and I learned a lot.",
  "Good content, but it started a little late.",
  "One of the best events on campus this year.",
  "Friendly organizers and a great atmosphere.",
  "Enjoyed it. A longer session would have been even better.",
  "",
  "The venue was a bit crowded, but the event itself was good.",
];
const REVIEW_RATINGS = [5, 4, 5, 3, 4, 5, 2];

const CHATS: Record<string, string[]> = {
  uiux: ["Do we need to bring our own sketchbooks?", "Yes please, and a laptop if you have one.", "Which team has the extra seat?", "Thanks everyone, that was great fun!"],
  git: ["Which room is this in?", "Seminar Hall B, second floor. We have just started.", "Is it okay if I join ten minutes late?", "No problem, slides will be shared afterwards."],
  datasci: ["Will the session be recorded?", "Yes, the recording goes out to everyone registered.", "Can we ask questions at the end?", "There is a 20 minute Q&A after the talks."],
  rang: ["When do the dance team entries close?", "Next Friday. Details are on the fest noticeboard.", "Are food stalls open all three days?", "Yes, from noon each day.", "Is there parking for visiting colleges?"],
  run: ["Where do we collect our bibs?", "At the Sports Complex desk from 6 am.", "That was tough but so much fun!", "Great run everyone, results are posted."],
  hackathon: ["Is it fine to form a team across colleges?", "Absolutely, mixed teams are encouraged.", "Will there be power strips at each table?", "Yes, and a mentor per ten teams.", "Anyone looking for a designer on their team?", "Count me in, I can do frontend too."],
  cp: ["Is C++20 supported?", "Yes, along with Java 21 and Python 3.12.", "Problem five was brutal.", "Editorials will be up tomorrow."],
  tt: ["Do we need sports shoes?", "Yes, non-marking soles only please."],
};

async function main() {
  const clean = process.argv.includes("--clean");
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run with NODE_ENV=production");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

  const mongoose = (await import("mongoose")).default;
  const { hashPassword } = await import("better-auth/crypto");
  const { connectDB } = await import("../lib/db");
  const { releaseSeat } = await import("../lib/seats");
  const { refreshReviewStats } = await import("../lib/review-stats");
  const { computeEventStatus } = await import("../types/event");
  const { default: User } = await import("../models/User");
  const { default: College } = await import("../models/College");
  const { default: Event } = await import("../models/Event");
  const { default: Registration } = await import("../models/Registration");
  const { default: Review } = await import("../models/Review");
  const { default: Bookmark } = await import("../models/Bookmark");
  const { default: Message } = await import("../models/Message");
  const { default: Collaboration } = await import("../models/Collaboration");
  const { default: Notification } = await import("../models/Notification");
  const { default: Outbox } = await import("../models/Outbox");

  await connectDB();
  const db = mongoose.connection;
  const oid = () => new mongoose.Types.ObjectId();
  const domainMatch = new RegExp(`@${EMAIL_DOMAIN.replace(".", "\\.")}$`);

  async function removeDemoData() {
    const users = await User.find({ email: domainMatch }).select("_id").lean<{ _id: unknown }[]>();
    const userIds = users.map((user) => user._id);
    const events = await Event.find({ organizerId: { $in: userIds } }).select("_id").lean<{ _id: unknown }[]>();
    const eventIds = events.map((event) => event._id);

    // Activity a demo account added to real events while testing: keep those events consistent.
    const foreignRegistrations = await Registration.find({ studentId: { $in: userIds }, eventId: { $nin: eventIds } }).select("eventId").lean<{ eventId: never }[]>();
    const foreignReviews = await Review.find({ studentId: { $in: userIds }, eventId: { $nin: eventIds } }).select("eventId").lean<{ eventId: never }[]>();

    await Promise.all([
      Registration.deleteMany({ $or: [{ eventId: { $in: eventIds } }, { studentId: { $in: userIds } }] }),
      Review.deleteMany({ $or: [{ eventId: { $in: eventIds } }, { studentId: { $in: userIds } }] }),
      Bookmark.deleteMany({ $or: [{ eventId: { $in: eventIds } }, { userId: { $in: userIds } }] }),
      Message.deleteMany({ $or: [{ eventId: { $in: eventIds } }, { senderId: { $in: userIds } }] }),
      Collaboration.deleteMany({ $or: [{ eventId: { $in: eventIds } }, { requesterId: { $in: userIds } }, { targetOrganizerId: { $in: userIds } }] }),
      Notification.deleteMany({ $or: [{ eventId: { $in: eventIds } }, { userId: { $in: userIds } }, { dedupeKey: /^seed:/ }] }),
      Outbox.deleteMany({ "to.email": domainMatch }),
      Event.updateMany({ "staff.userId": { $in: userIds } }, { $pull: { staff: { userId: { $in: userIds } } } }),
    ]);
    for (const row of foreignRegistrations) await releaseSeat(row.eventId);
    for (const eventId of new Set(foreignReviews.map((row) => String(row.eventId)))) await refreshReviewStats(eventId);
    await Event.deleteMany({ _id: { $in: eventIds } });

    const identities = await db.collection("user").find({ email: domainMatch }).project({ _id: 1 }).toArray();
    const identityIds = identities.map((identity) => identity._id);
    const anyForm = [...identityIds, ...identityIds.map(String)];
    await db.collection("session").deleteMany({ userId: { $in: anyForm } });
    await db.collection("account").deleteMany({ userId: { $in: anyForm } });
    await db.collection("user").deleteMany({ _id: { $in: identityIds } });
    await User.deleteMany({ _id: { $in: userIds } });

    // Keep a demo college if anything real started using it during testing.
    for (const college of Object.values(COLLEGES)) {
      const row = await College.findOne({ name: college.name }).select("_id").lean<{ _id: unknown } | null>();
      if (!row) continue;
      const [usedByUser, usedByEvent] = await Promise.all([
        User.exists({ collegeId: row._id }),
        Event.exists({ $or: [{ collegeId: row._id }, { partnerCollegeIds: row._id }] }),
      ]);
      if (usedByUser || usedByEvent) console.warn(`Keeping college still in use: ${college.name}`);
      else await College.deleteOne({ _id: row._id });
    }
    return { users: userIds.length, events: eventIds.length };
  }

  try {
    const removed = await removeDemoData();
    console.log(`Removed previous demo data: ${removed.users} users, ${removed.events} events`);
    if (clean) return;

    const now = Date.now();
    const ago = (ms: number) => new Date(now - ms);

    // Colleges
    const collegeIds = {} as Record<CollegeKey, InstanceType<typeof mongoose.Types.ObjectId>>;
    for (const [key, college] of Object.entries(COLLEGES) as [CollegeKey, (typeof COLLEGES)[CollegeKey]][]) {
      const row = await College.findOneAndUpdate(
        { name: college.name },
        { $setOnInsert: { name: college.name, location: college.location, isVerified: college.isVerified } },
        { upsert: true, returnDocument: "after" },
      );
      collegeIds[key] = row._id;
    }

    // Accounts: the Better Auth identity, its credential account, and the app profile.
    async function createAccount(profile: Record<string, unknown> & { firstName: string; lastName: string; email: string; role: string }, password: string, joinedAt: Date) {
      const identityId = oid();
      await db.collection("user").insertOne({
        _id: identityId, name: `${profile.firstName} ${profile.lastName}`, email: profile.email,
        emailVerified: true, image: null, role: profile.role, createdAt: joinedAt, updatedAt: joinedAt,
      });
      await db.collection("account").insertOne({
        accountId: identityId.toString(), providerId: "credential", userId: identityId,
        password: await hashPassword(password), createdAt: joinedAt, updatedAt: joinedAt,
      });
      const [user] = await User.insertMany([{
        ...profile,
        authUserId: identityId.toString(),
        notificationPreferences: { reminders: true, email: false },
        createdAt: joinedAt, updatedAt: joinedAt,
      }]);
      return user;
    }

    const organizers = [];
    for (const [index, organizer] of ORGANIZERS.entries()) {
      organizers.push(await createAccount({
        firstName: organizer.firstName, lastName: organizer.lastName, gender: organizer.gender, bio: organizer.bio,
        email: `organizer${index + 1}@${EMAIL_DOMAIN}`, role: "organizer", collegeId: collegeIds[organizer.college],
        phone: `+9198200000${index + 1}0`, dateOfBirth: new Date(Date.UTC(1999 - index, 3, 12)),
      }, ORGANIZER_PASSWORD, ago(d(120) * HOUR)));
    }

    const students = [];
    for (const [index, student] of STUDENTS.entries()) {
      const isFresh = !student.college;
      students.push(await createAccount({
        firstName: student.firstName, lastName: student.lastName, gender: student.gender,
        email: `student${index + 1}@${EMAIL_DOMAIN}`, role: "student",
        ...(isFresh ? {} : {
          collegeId: collegeIds[student.college!],
          phone: `+91987650${String(1000 + index)}`,
          dateOfBirth: new Date(Date.UTC(2003 + (index % 4), index % 12, 5 + index)),
          bio: `Student at ${COLLEGES[student.college!].name}.`,
        }),
        // Spread sign-ups out so the admin growth charts have a shape.
      }, STUDENT_PASSWORD, isFresh ? ago(2 * HOUR) : ago((90 - index * 7) * DAY)));
    }
    const [student1, ...otherStudents] = students;
    const pool = otherStudents.slice(0, 10); // student12 stays activity-free

    // Events and their registrations
    const events: Record<string, { _id: InstanceType<typeof mongoose.Types.ObjectId>; title: string; spec: EventSpec; date: Date; endDate: Date; registered: typeof students }> = {};
    const totals = { registrations: 0, checkedIn: 0, reviews: 0, messages: 0 };

    for (const [index, spec] of EVENTS.entries()) {
      const date = new Date(now + spec.startsIn * HOUR);
      const endDate = new Date(date.getTime() + (spec.durationHours ?? 2) * HOUR);
      const registrationDeadline = new Date(spec.deadlineIn !== undefined ? now + spec.deadlineIn * HOUR : date.getTime() - DAY);
      const organizer = organizers[spec.organizer];
      const hostKey = ORGANIZERS[spec.organizer].college;
      const host = COLLEGES[hostKey];
      const createdAt = new Date(Math.min(date.getTime() - d(21) * HOUR, now - DAY));

      const registered = [
        ...(spec.student1 ? [student1] : []),
        ...Array.from({ length: pool.length }, (_, offset) => pool[(index + offset) % pool.length]),
      ].slice(0, spec.fill);

      const [event] = await Event.insertMany([{
        title: spec.title, description: spec.description, category: spec.category, venue: spec.venue,
        date, endDate, timeZone: TIME_ZONE, registrationDeadline, capacity: spec.capacity,
        status: computeEventStatus({ date, endDate, registrationDeadline }),
        organizerId: organizer._id, collegeId: collegeIds[hostKey], image: spec.image ?? null,
        latitude: spec.noCoordinates ? null : host.lat + (index % 5) * 0.002,
        longitude: spec.noCoordinates ? null : host.lng + (index % 3) * 0.002,
        isInterCollege: Boolean(spec.partners?.length),
        partnerCollegeIds: (spec.partners ?? []).map((key) => collegeIds[key]),
        registeredCount: registered.length, seatsTouchedAt: new Date(now - 2 * HOUR),
        createdAt, updatedAt: createdAt,
      }]);
      events[spec.key] = { _id: event._id, title: spec.title, spec, date, endDate, registered };

      const isCompleted = endDate.getTime() <= now;
      const isLive = date.getTime() <= now && !isCompleted;
      const registrationWindow = Math.max(Math.min(date.getTime(), now) - createdAt.getTime(), HOUR);
      await Registration.insertMany(registered.map((student, position) => {
        // About three quarters of attendees turn up; a live event is half checked in.
        const attended = isCompleted ? position % 4 !== 3 : isLive && position % 2 === 1;
        return {
          eventId: event._id, studentId: student._id,
          registeredAt: new Date(createdAt.getTime() + registrationWindow * ((position + 1) / (registered.length + 2))),
          checkedIn: attended,
          checkedInAt: attended ? new Date(date.getTime() + (position + 1) * 90_000) : null,
        };
      }));
      totals.registrations += registered.length;
      totals.checkedIn += registered.filter((_, position) => (isCompleted ? position % 4 !== 3 : isLive && position % 2 === 1)).length;

      if (isCompleted && !spec.noReviews) {
        const reviewers = registered
          .filter((_, position) => position % 4 !== 3)
          .filter((student) => !(student === student1 && STUDENT1_UNREVIEWED.has(spec.key)))
          .slice(0, 6);
        await Review.insertMany(reviewers.map((student, position) => {
          const reviewedAt = new Date(endDate.getTime() + (position + 1) * 5 * HOUR);
          return {
            eventId: event._id, studentId: student._id,
            rating: REVIEW_RATINGS[(index + position) % REVIEW_RATINGS.length],
            comment: REVIEW_COMMENTS[(index + position) % REVIEW_COMMENTS.length],
            createdAt: new Date(Math.min(reviewedAt.getTime(), now)), updatedAt: new Date(Math.min(reviewedAt.getTime(), now)),
          };
        }));
        totals.reviews += reviewers.length;
        await refreshReviewStats(event._id);
      }

      const lines = CHATS[spec.key];
      if (lines) {
        const chatStart = Math.min(date.getTime() - HOUR * 6, now - 3 * HOUR);
        const welcome = { eventId: event._id, senderId: organizer._id, type: "system", content: `Welcome to the chat for ${spec.title}.`, createdAt: new Date(chatStart), updatedAt: new Date(chatStart) };
        const talk = lines.map((content, line) => {
          // Attendees ask, the organizer answers, so odd lines come from the organizer.
          const sender = line % 2 === 1 ? organizer : registered[(line / 2) % registered.length | 0];
          const at = new Date(chatStart + (line + 1) * 11 * 60_000);
          return { eventId: event._id, senderId: sender._id, type: "text", content, createdAt: at, updatedAt: at };
        });
        await Message.insertMany([welcome, ...talk]);
        totals.messages += talk.length + 1;
      }
    }

    // A moderated message, hidden from the chat like one removed through the app.
    await Message.insertMany([{
      eventId: events.hackathon._id, senderId: events.hackathon.registered[2]._id, type: "text",
      content: "This message was removed by a moderator.", isDeleted: true,
      createdAt: ago(4 * HOUR), updatedAt: ago(4 * HOUR),
    }]);

    // Bookmarks
    const bookmarkKeys: [typeof students[number], string[]][] = [
      [student1, ["rang", "abroad", "openmic", "robotics", "alumni", "uiux"]],
      [students[1], ["hackathon", "blood"]],
      [students[2], ["cricket", "pitch", "photo"]],
      [students[4], ["streetplay"]],
    ];
    await Bookmark.insertMany(bookmarkKeys.flatMap(([user, keys]) => keys.map((key, position) => {
      const at = ago((position + 1) * 9 * HOUR);
      return { userId: user._id, eventId: events[key]._id, createdAt: at, updatedAt: at };
    })));

    // Collaborations: accepted ones get the same result as the PATCH route
    // (partner college already on the spec, plus editor access for the partner).
    const [organizer1, organizer2] = organizers;
    const collaborations = [
      { key: "hackathon", from: organizer1, to: organizer2, status: "accepted" },
      { key: "cricket", from: organizer2, to: organizer1, status: "accepted" },
      { key: "rang", from: organizer1, to: organizer2, status: "pending" },
      { key: "streetplay", from: organizer2, to: organizer1, status: "pending" },
      { key: "cloud", from: organizer2, to: organizer1, status: "rejected" },
    ];
    await Collaboration.insertMany(collaborations.map(({ key, from, to, status }) => ({
      eventId: events[key]._id, requesterId: from._id, targetOrganizerId: to._id, status,
      respondedAt: status === "pending" ? null : ago(3 * DAY),
      createdAt: ago(6 * DAY), updatedAt: ago(3 * DAY),
    })));

    // Event staff
    const staff: [string, typeof students[number], "editor" | "volunteer"][] = [
      ["hackathon", organizer2, "editor"],
      ["cricket", organizer1, "editor"],
      ["git", students[2], "volunteer"],
      ["tt", students[1], "volunteer"],
      ["pitch", students[3], "editor"],
    ];
    for (const [key, user, role] of staff) {
      await Event.updateOne({ _id: events[key]._id }, { $push: { staff: { userId: user._id, role } } });
    }

    // Notifications: one of every type. Reminders for events inside 48 hours are
    // created by the app itself, so they are not seeded here.
    const admins = await User.find({ role: "admin" }).select("_id").lean<{ _id: unknown }[]>();
    let serial = 0;
    const note = (userId: unknown, type: string, title: string, message: string, options: { event?: string; link?: string; read?: boolean; hoursAgo: number }) => {
      const at = ago(options.hoursAgo * HOUR);
      const eventId = options.event ? events[options.event]._id : undefined;
      return {
        dedupeKey: `seed:${++serial}`, userId, type, title, message, eventId,
        link: options.link ?? (eventId ? `/events/${eventId}` : undefined),
        isRead: options.read ?? false, createdAt: at, updatedAt: at,
      };
    };
    const manageLink = "/dashboard/manage-events";
    await Notification.insertMany([
      note(student1._id, "registration_confirmed", "Registration Confirmed!", `You're registered for "${events.hackathon.title}".`, { event: "hackathon", hoursAgo: 5 }),
      note(student1._id, "registration_confirmed", "Registration Confirmed!", `You're registered for "${events.rang.title}".`, { event: "rang", hoursAgo: 50, read: true }),
      note(student1._id, "deadline_approaching", "Registration closing soon", `Registration for "${events.abroad.title}" closes in less than a day.`, { event: "abroad", hoursAgo: 3 }),
      note(student1._id, "event_updated", "Event updated", `The venue for "${events.wellbeing.title}" has been updated.`, { event: "wellbeing", hoursAgo: 28 }),
      note(student1._id, "event_cancelled", "Event cancelled", `"Inter-Hostel Quiz" has been cancelled by the organizer.`, { hoursAgo: 72, read: true }),
      note(students[1]._id, "event_updated", "Event staff updated", `You are now a volunteer for ${events.tt.title}.`, { event: "tt", hoursAgo: 20 }),
      note(students[2]._id, "event_updated", "Event staff updated", `You are now a volunteer for ${events.git.title}.`, { event: "git", hoursAgo: 26 }),
      note(students[3]._id, "event_updated", "Event staff updated", `You are now an editor for ${events.pitch.title}.`, { event: "pitch", hoursAgo: 30 }),
      ...organizers.map((organizer, index) => note(organizer._id, "role_changed", "Your role has changed", "An admin made you an organizer.", { link: "/dashboard", hoursAgo: 24 * 100 + index, read: true })),
      note(organizer1._id, "new_registration", "New Registration", `A student just registered for "${events.hackathon.title}".`, { event: "hackathon", link: manageLink, hoursAgo: 2 }),
      note(organizer1._id, "new_registration", "New Registration", `A student just registered for "${events.rang.title}".`, { event: "rang", link: manageLink, hoursAgo: 9 }),
      note(organizer1._id, "registration_cancelled", "Registration Cancelled", `A student cancelled their registration for "${events.blood.title}".`, { event: "blood", link: manageLink, hoursAgo: 14 }),
      note(organizer2._id, "new_registration", "New Registration", `A student just registered for "${events.robotics.title}".`, { event: "robotics", link: manageLink, hoursAgo: 1 }),
      note(organizer2._id, "registration_cancelled", "Registration Cancelled", `A student cancelled their registration for "${events.cleanup.title}".`, { event: "cleanup", link: manageLink, hoursAgo: 19 }),
      ...admins.flatMap((admin) => [
        note(admin._id, "new_user", "New user joined", `${STUDENTS[11].firstName} ${STUDENTS[11].lastName} created a student account.`, { link: "/dashboard/users", hoursAgo: 2 }),
        note(admin._id, "new_event", "New event published", `"${events.alumni.title}" was published.`, { event: "alumni", hoursAgo: 11 }),
      ]),
    ]);

    console.log(`Created 4 colleges, ${organizers.length} organizers, ${students.length} students, ${EVENTS.length} events`);
    console.log(`Created ${totals.registrations} registrations (${totals.checkedIn} checked in), ${totals.reviews} reviews, ${totals.messages} messages`);
    console.log(`Organizers: organizer1@${EMAIL_DOMAIN}, organizer2@${EMAIL_DOMAIN} / ${ORGANIZER_PASSWORD}`);
    console.log(`Students: student1@${EMAIL_DOMAIN} ... student12@${EMAIL_DOMAIN} / ${STUDENT_PASSWORD}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().then(() => process.exit(process.exitCode ?? 0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
