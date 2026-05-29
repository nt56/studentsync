const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "StudentSync API",
    description:
      "REST API for the StudentSync platform. Manage colleges, events, registrations, users, authentication, notifications, and real-time event chat. Built with Next.js, MongoDB, Better Auth, Socket.IO, and Upstash Redis.",
    version: "2.0.0",
    contact: {
      name: "StudentSync",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    {
      name: "Auth",
      description: "Authentication & session management (Better Auth)",
    },
    {
      name: "Users",
      description: "User profile & admin user management",
    },
    {
      name: "Colleges",
      description: "College CRUD operations",
    },
    {
      name: "Events",
      description: "Event CRUD operations",
    },
    {
      name: "Registrations",
      description: "Event registration management",
    },
    {
      name: "Upload",
      description: "File upload (Cloudinary)",
    },
    {
      name: "Health",
      description: "Health check endpoints",
    },
    {
      name: "Chat",
      description:
        "Event-scoped real-time chat rooms. Each event has one chat room. Only registered students and organizers/admins can send messages.\n\n**WebSocket events** (Socket.IO path: `/api/socket`):\n\n| Event | Direction | Payload | Notes |\n|---|---|---|---|\n| `join-room` | Client → Server | `{ eventId }` | Subscribe to room `event:{id}` |\n| `leave-room` | Client → Server | `{ eventId }` | Unsubscribe from room |\n| `user-typing` | Client → Server | `{ eventId, user }` | Relayed to others in room |\n| `new-message` | Server → Client | `{ message }` | Broadcast after POST send |\n| `message-deleted` | Server → Client | `{ messageId }` | Broadcast after DELETE |\n| `user-typing` | Server → Client | `{ eventId, user }` | Typing relay |\n\n**Infrastructure:** Socket.IO server in `server.ts` with Upstash Redis adapter (`@socket.io/redis-adapter`) for horizontal scaling.",
    },
    {
      name: "Notifications",
      description:
        "In-app notifications for users. Stored notifications plus virtual time-based event reminders injected at read time for students.",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description:
          "Session cookie set by Better Auth after login. Automatically included by the browser.",
      },
    },
    schemas: {
      // ─── Common ───────────────────────────────────────────
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          errors: {
            type: "object",
            nullable: true,
            additionalProperties: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 100 },
          totalPages: { type: "integer", example: 5 },
          hasMore: { type: "boolean", example: true },
        },
      },

      // ─── User ─────────────────────────────────────────────
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
          firstName: { type: "string", example: "John" },
          lastName: { type: "string", example: "Doe" },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          role: {
            type: "string",
            enum: ["student", "organizer", "admin"],
            example: "student",
          },
          gender: {
            type: "string",
            enum: ["male", "female", "other", "prefer-not-to-say"],
          },
          dateOfBirth: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          phone: { type: "string", nullable: true, example: "9876543210" },
          bio: { type: "string", nullable: true },
          profileImage: { type: "string", nullable: true },
          collegeId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UserWithStats: {
        allOf: [
          { $ref: "#/components/schemas/User" },
          {
            type: "object",
            properties: {
              college: {
                type: "object",
                nullable: true,
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                },
              },
              stats: {
                type: "object",
                properties: {
                  registrationCount: { type: "integer" },
                  organizedEventsCount: { type: "integer" },
                  upcomingEventsCount: { type: "integer" },
                },
              },
            },
          },
        ],
      },
      UpdateUserInput: {
        type: "object",
        properties: {
          firstName: { type: "string", minLength: 2, maxLength: 50 },
          lastName: { type: "string", minLength: 2, maxLength: 50 },
          phone: { type: "string", minLength: 10, maxLength: 15 },
          bio: { type: "string", maxLength: 500 },
          collegeId: { type: "string" },
        },
      },
      UpdateUserRoleInput: {
        type: "object",
        required: ["role"],
        properties: {
          role: {
            type: "string",
            enum: ["student", "organizer", "admin"],
          },
        },
      },

      // ─── College ──────────────────────────────────────────
      College: {
        type: "object",
        properties: {
          id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
          name: { type: "string", example: "MIT" },
          location: { type: "string", example: "Cambridge, MA" },
          isVerified: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateCollegeInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "string",
            minLength: 3,
            maxLength: 200,
            example: "MIT",
          },
          location: {
            type: "string",
            minLength: 2,
            maxLength: 300,
            example: "Cambridge, MA",
          },
        },
      },
      UpdateCollegeInput: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 3, maxLength: 200 },
          location: { type: "string", minLength: 2, maxLength: 300 },
          isVerified: { type: "boolean" },
        },
      },

      // ─── Event ────────────────────────────────────────────
      Event: {
        type: "object",
        properties: {
          id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
          title: { type: "string", example: "Tech Workshop 2025" },
          description: {
            type: "string",
            example: "A hands-on workshop about modern web technologies.",
          },
          date: { type: "string", format: "date-time" },
          venue: { type: "string", example: "Auditorium Hall A" },
          organizerId: { type: "string" },
          collegeId: { type: "string" },
          registrationDeadline: { type: "string", format: "date-time" },
          capacity: { type: "integer", example: 200 },
          status: {
            type: "string",
            enum: ["upcoming", "closed", "completed"],
            example: "upcoming",
          },
          category: {
            type: "string",
            enum: [
              "workshop",
              "seminar",
              "cultural",
              "sports",
              "technical",
              "social",
              "other",
            ],
            example: "workshop",
          },
          image: { type: "string", nullable: true },
          registrationCount: { type: "integer", example: 42 },
          isRegistered: { type: "boolean", example: false },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateEventInput: {
        type: "object",
        required: [
          "title",
          "description",
          "date",
          "venue",
          "registrationDeadline",
          "capacity",
          "collegeId",
        ],
        properties: {
          title: {
            type: "string",
            minLength: 3,
            maxLength: 100,
            example: "Tech Workshop 2025",
          },
          description: {
            type: "string",
            minLength: 10,
            maxLength: 2000,
            example: "A hands-on workshop about modern web technologies.",
          },
          date: {
            type: "string",
            format: "date-time",
            description: "Must be in the future",
            example: "2025-12-15T10:00:00.000Z",
          },
          venue: {
            type: "string",
            minLength: 3,
            maxLength: 200,
            example: "Auditorium Hall A",
          },
          registrationDeadline: {
            type: "string",
            format: "date-time",
            description: "Must be before the event date",
            example: "2025-12-10T23:59:59.000Z",
          },
          capacity: {
            type: "integer",
            minimum: 1,
            maximum: 10000,
            example: 200,
          },
          collegeId: {
            type: "string",
            example: "665f1a2b3c4d5e6f7a8b9c0d",
          },
          category: {
            type: "string",
            enum: [
              "workshop",
              "seminar",
              "cultural",
              "sports",
              "technical",
              "social",
              "other",
            ],
            default: "other",
          },
          image: { type: "string" },
        },
      },
      UpdateEventInput: {
        type: "object",
        description: "At least one field must be provided.",
        properties: {
          title: { type: "string", minLength: 3, maxLength: 100 },
          description: { type: "string", minLength: 10, maxLength: 2000 },
          date: { type: "string", format: "date-time" },
          venue: { type: "string", minLength: 3, maxLength: 200 },
          registrationDeadline: { type: "string", format: "date-time" },
          capacity: { type: "integer", minimum: 1, maximum: 10000 },
          collegeId: { type: "string" },
          category: {
            type: "string",
            enum: [
              "workshop",
              "seminar",
              "cultural",
              "sports",
              "technical",
              "social",
              "other",
            ],
          },
          image: { type: "string" },
          status: {
            type: "string",
            enum: ["upcoming", "closed", "completed"],
          },
        },
      },

      // ─── Registration ────────────────────────────────────
      Registration: {
        type: "object",
        properties: {
          id: { type: "string" },
          eventId: { type: "string" },
          studentId: { type: "string" },
          registeredAt: { type: "string", format: "date-time" },
        },
      },
      RegistrationWithEvent: {
        allOf: [
          { $ref: "#/components/schemas/Registration" },
          {
            type: "object",
            properties: {
              event: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  date: { type: "string", format: "date-time" },
                  venue: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        ],
      },
      RegistrationWithStudent: {
        allOf: [
          { $ref: "#/components/schemas/Registration" },
          {
            type: "object",
            properties: {
              student: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        ],
      },
      CreateRegistrationInput: {
        type: "object",
        required: ["eventId"],
        properties: {
          eventId: {
            type: "string",
            example: "665f1a2b3c4d5e6f7a8b9c0d",
          },
        },
      },

      // ─── Auth ─────────────────────────────────────────────
      SignUpInput: {
        type: "object",
        required: [
          "firstName",
          "lastName",
          "email",
          "password",
          "confirmPassword",
          "gender",
          "dateOfBirth",
        ],
        properties: {
          firstName: {
            type: "string",
            minLength: 2,
            maxLength: 50,
            example: "John",
          },
          lastName: {
            type: "string",
            minLength: 2,
            maxLength: 50,
            example: "Doe",
          },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          password: {
            type: "string",
            minLength: 8,
            maxLength: 100,
            description:
              "Must contain at least one uppercase, one lowercase, and one number",
            example: "SecurePass1",
          },
          confirmPassword: {
            type: "string",
            example: "SecurePass1",
          },
          gender: {
            type: "string",
            enum: ["male", "female", "other", "prefer-not-to-say"],
          },
          dateOfBirth: {
            type: "string",
            format: "date",
            description: "Must be at least 16 years old. ISO 8601 format.",
            example: "2000-05-15",
          },
          phone: { type: "string", minLength: 10, maxLength: 15 },
          collegeId: { type: "string" },
        },
      },
      SignInInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          password: { type: "string", example: "SecurePass1" },
          rememberMe: { type: "boolean", default: false },
        },
      },
      ChangePasswordInput: {
        type: "object",
        required: ["currentPassword", "newPassword", "confirmPassword"],
        properties: {
          currentPassword: { type: "string" },
          newPassword: {
            type: "string",
            minLength: 8,
            maxLength: 100,
            description:
              "Must differ from current. Must have uppercase, lowercase, number.",
          },
          confirmPassword: { type: "string" },
        },
      },
      UpdateProfileInput: {
        type: "object",
        properties: {
          firstName: { type: "string", minLength: 2, maxLength: 50 },
          lastName: { type: "string", minLength: 2, maxLength: 50 },
          phone: { type: "string", minLength: 10, maxLength: 15 },
          bio: { type: "string", maxLength: 500 },
          collegeId: { type: "string" },
          gender: {
            type: "string",
            enum: ["male", "female", "other", "prefer-not-to-say"],
          },
          dateOfBirth: {
            type: "string",
            format: "date-time",
            description: "Must be at least 16 years old",
          },
          profileImage: { type: "string", format: "uri" },
        },
      },

      // ─── Chat / Message ───────────────────────────────────
      MessageSender: {
        type: "object",
        properties: {
          _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
          firstName: { type: "string", example: "John" },
          lastName: { type: "string", example: "Doe" },
          profileImage: { type: "string", nullable: true },
          role: {
            type: "string",
            enum: ["student", "organizer", "admin"],
            example: "student",
          },
        },
      },
      Message: {
        type: "object",
        properties: {
          _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
          eventId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
          senderId: { $ref: "#/components/schemas/MessageSender" },
          content: {
            type: "string",
            maxLength: 1000,
            example: "Looking forward to this event!",
          },
          type: {
            type: "string",
            enum: ["text", "system"],
            default: "text",
          },
          isDeleted: { type: "boolean", default: false },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      SendMessageInput: {
        type: "object",
        required: ["content"],
        properties: {
          content: {
            type: "string",
            minLength: 1,
            maxLength: 1000,
            example: "Can't wait to attend!",
          },
        },
      },

      // ─── Upload ───────────────────────────────────────────
      UploadResponse: {
        type: "object",
        properties: {
          filePath: { type: "string" },
          fileName: { type: "string" },
          publicId: { type: "string" },
        },
      },
    },
  },
  paths: {
    // ═══════════════════════════════════════════════════════
    //  AUTH
    // ═══════════════════════════════════════════════════════
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description:
          "Creates a new user account with Better Auth and a corresponding MongoDB user document. All users register as **student** role.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignUpInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Registration successful",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            user: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                firstName: { type: "string" },
                                lastName: { type: "string" },
                                email: { type: "string" },
                                role: { type: "string" },
                              },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Email already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description:
          "Authenticate with email & password. Returns a session cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignInInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful. Session cookie is set.",
            headers: {
              "Set-Cookie": {
                description: "Session cookie from Better Auth",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            user: { type: "object" },
                            session: { type: "object" },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Invalid email or password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Email not verified",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/auth/sign-out": {
      post: {
        tags: ["Auth"],
        summary: "Sign out",
        description: "Invalidates the current session and clears cookies.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Signed out successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "User logged out successfully",
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/auth/profile": {
      get: {
        tags: ["Auth"],
        summary: "Get auth profile",
        description:
          "Returns the current authenticated user's session info (from Better Auth).",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Profile retrieved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            user: { type: "object" },
                            userId: { type: "string" },
                            role: { type: "string" },
                            email: { type: "string" },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Auth"],
        summary: "Update profile",
        description:
          "Update the authenticated user's profile details. Updates both Better Auth user and MongoDB user document.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfileInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            firstName: { type: "string" },
                            lastName: { type: "string" },
                            email: { type: "string" },
                            phone: { type: "string" },
                            bio: { type: "string" },
                            profileImage: { type: "string", nullable: true },
                            collegeId: { type: "string" },
                            gender: { type: "string" },
                            dateOfBirth: { type: "string" },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "User profile not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Auth"],
        summary: "Change password",
        description:
          "Change the authenticated user's password via Better Auth.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Password changed successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Current password incorrect or unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    //  USERS
    // ═══════════════════════════════════════════════════════
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List all users (Admin)",
        description:
          "Paginated list of users. **Admin only.** Supports filtering by role and collegeId.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              default: 20,
              minimum: 1,
              maximum: 100,
            },
          },
          {
            name: "role",
            in: "query",
            schema: {
              type: "string",
              enum: ["student", "organizer", "admin"],
            },
          },
          {
            name: "collegeId",
            in: "query",
            schema: { type: "string" },
            description: "MongoDB ObjectId of the college",
          },
        ],
        responses: {
          "200": {
            description: "Users retrieved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            items: {
                              type: "array",
                              items: { $ref: "#/components/schemas/User" },
                            },
                            pagination: {
                              $ref: "#/components/schemas/PaginationMeta",
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden (admin only)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Update own profile (MongoDB)",
        description:
          "Update the authenticated user's MongoDB profile. Creates a new user document if one does not exist.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/User" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get current user profile with stats",
        description:
          "Returns the current user's full profile including college info, registration count, organized events count, and upcoming events.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Profile with stats",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          $ref: "#/components/schemas/UserWithStats",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Sync / create user profile",
        description:
          "Creates or syncs the current authenticated user's MongoDB document from their Better Auth session. Useful on first login.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Profile synced",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/User" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get user by ID",
        description:
          "Retrieve a specific user. Accessible by the user themselves or an admin.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the user",
          },
        ],
        responses: {
          "200": {
            description: "User retrieved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/User" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Invalid user ID",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update user role (Admin)",
        description:
          "Change a user's role. **Admin only.** Updates both the MongoDB User and Better Auth user collection.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the user",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserRoleInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "User role updated",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/User" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Invalid user ID or validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden (admin only)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete user (Admin)",
        description:
          "Delete a user by ID. **Admin only.** Cannot delete yourself.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the user",
          },
        ],
        responses: {
          "200": {
            description: "User deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "400": {
            description: "Invalid user ID or self-deletion attempt",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden (admin only)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    //  COLLEGES
    // ═══════════════════════════════════════════════════════
    "/api/colleges": {
      get: {
        tags: ["Colleges"],
        summary: "List colleges",
        description:
          "Paginated list of colleges. Public endpoint. Supports searching by name and filtering by verification status.",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              default: 20,
              minimum: 1,
              maximum: 100,
            },
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by college name (case-insensitive regex)",
          },
          {
            name: "isVerified",
            in: "query",
            schema: { type: "string", enum: ["true", "false"] },
            description: 'Filter by verification status ("true" or "false")',
          },
        ],
        responses: {
          "200": {
            description: "Colleges retrieved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            items: {
                              type: "array",
                              items: {
                                $ref: "#/components/schemas/College",
                              },
                            },
                            pagination: {
                              $ref: "#/components/schemas/PaginationMeta",
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Colleges"],
        summary: "Create a college",
        description:
          "Create a new college. If the requester is an admin, the college is auto-verified. Otherwise, it is submitted for verification.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCollegeInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "College created",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/College" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Validation error or duplicate name",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/colleges/{id}": {
      get: {
        tags: ["Colleges"],
        summary: "Get college by ID",
        description: "Retrieve a single college by its MongoDB ObjectId.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the college",
          },
        ],
        responses: {
          "200": {
            description: "College retrieved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/College" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Invalid college ID",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "College not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Colleges"],
        summary: "Update college (Admin)",
        description:
          "Update a college's details. **Admin only.** Can also toggle verification status.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the college",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateCollegeInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "College updated",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/College" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Invalid ID, validation error, or duplicate name",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden (admin only)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "College not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Colleges"],
        summary: "Delete college (Admin)",
        description: "Delete a college by ID. **Admin only.**",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the college",
          },
        ],
        responses: {
          "200": {
            description: "College deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "400": {
            description: "Invalid college ID",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden (admin only)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "College not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════════════════
    "/api/events": {
      get: {
        tags: ["Events"],
        summary: "List events",
        description:
          "Paginated list of events. Public endpoint. Supports filtering by status, college, organizer, category, and text search. Also returns registration count and whether the authenticated user is registered.",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              default: 10,
              minimum: 1,
              maximum: 50,
            },
          },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["upcoming", "closed", "completed"],
            },
          },
          {
            name: "collegeId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by college ID",
          },
          {
            name: "organizerId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by organizer user ID",
          },
          {
            name: "category",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "workshop",
                "seminar",
                "cultural",
                "sports",
                "technical",
                "social",
                "other",
              ],
            },
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Full-text search on title and description",
          },
          {
            name: "sortBy",
            in: "query",
            schema: {
              type: "string",
              enum: ["date", "createdAt", "title"],
              default: "date",
            },
          },
          {
            name: "sortOrder",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
          },
        ],
        responses: {
          "200": {
            description: "Events retrieved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            items: {
                              type: "array",
                              items: { $ref: "#/components/schemas/Event" },
                            },
                            pagination: {
                              $ref: "#/components/schemas/PaginationMeta",
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Events"],
        summary: "Create event (Organizer/Admin)",
        description:
          "Create a new event. **Organizer or Admin only.** The organizer is automatically set to the authenticated user.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateEventInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Event created",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/Event" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Validation error or deadline not before event date",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden (organizer/admin only)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/events/{id}": {
      get: {
        tags: ["Events"],
        summary: "Get event by ID",
        description:
          "Retrieve a single event with registration count and whether the current user is registered.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the event",
          },
        ],
        responses: {
          "200": {
            description: "Event retrieved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/Event" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Invalid event ID",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Event not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Events"],
        summary: "Update event (Owner/Admin)",
        description:
          "Update an event. Only the event organizer or an admin can update.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the event",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateEventInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Event updated",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/Event" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description:
              "Invalid ID, validation error, or deadline after event date",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden (not the organizer or admin)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Event not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Events"],
        summary: "Delete event (Owner/Admin)",
        description:
          "Delete an event and all its registrations. Only the event organizer or an admin can delete.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the event",
          },
        ],
        responses: {
          "200": {
            description: "Event deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "400": {
            description: "Invalid event ID",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden (not the organizer or admin)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Event not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    //  REGISTRATIONS
    // ═══════════════════════════════════════════════════════
    "/api/registrations": {
      get: {
        tags: ["Registrations"],
        summary: "List registrations",
        description:
          "Get registrations for the authenticated user. If `eventId` is provided and the user is the event organizer/admin, returns all registrations for that event (with student details). Otherwise returns the user's own registrations (with event details).",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "eventId",
            in: "query",
            schema: { type: "string" },
            description:
              "Filter by event ID. When provided by event organizer/admin, returns all registrations for the event.",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              default: 20,
              minimum: 1,
              maximum: 100,
            },
          },
        ],
        responses: {
          "200": {
            description: "Registrations retrieved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            items: {
                              type: "array",
                              items: {
                                oneOf: [
                                  {
                                    $ref: "#/components/schemas/RegistrationWithEvent",
                                  },
                                  {
                                    $ref: "#/components/schemas/RegistrationWithStudent",
                                  },
                                ],
                              },
                            },
                            pagination: {
                              $ref: "#/components/schemas/PaginationMeta",
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Invalid event ID or user profile not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Event not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Registrations"],
        summary: "Register for event (Student)",
        description:
          "Register the authenticated student for an event. **Student role only.** Checks: event is upcoming, deadline not passed, capacity not full, not already registered.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateRegistrationInput",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Registration successful",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          $ref: "#/components/schemas/Registration",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description:
              "Validation error, event not upcoming, deadline passed, capacity full, or already registered",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden (student role only)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Event not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Registrations"],
        summary: "Cancel registration",
        description:
          "Cancel a registration. Students can cancel their own registrations. Organizers/admins can cancel any registration for their events by also providing `studentId`.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "eventId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the event",
          },
          {
            name: "studentId",
            in: "query",
            schema: { type: "string" },
            description:
              "MongoDB ObjectId of the student (organizer/admin use only)",
          },
        ],
        responses: {
          "200": {
            description: "Registration cancelled",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "400": {
            description: "Missing or invalid event/student ID",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Registration or event not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    //  UPLOAD
    // ═══════════════════════════════════════════════════════
    "/api/upload": {
      post: {
        tags: ["Upload"],
        summary: "Upload a file",
        description:
          'Upload an image file to Cloudinary. Requires authentication. Category must be "profiles" or "events".',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "The image file to upload",
                  },
                  category: {
                    type: "string",
                    enum: ["profiles", "events"],
                    default: "profiles",
                    description: "Upload category folder",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "File uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          $ref: "#/components/schemas/UploadResponse",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "No file provided or invalid category",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    //  CHAT
    // ═══════════════════════════════════════════════════════
    "/api/events/{id}/messages": {
      get: {
        tags: ["Chat"],
        summary: "Get message history",
        description:
          "Returns up to 50 messages for the event room, ordered oldest-first. Supports cursor-based pagination via `before` (ISO timestamp). Requires authentication.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the event",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, maximum: 100 },
            description: "Max messages to return",
          },
          {
            name: "before",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description:
              "Cursor — return messages created before this ISO timestamp (infinite scroll / load-more)",
          },
        ],
        responses: {
          "200": {
            description: "Messages retrieved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            messages: {
                              type: "array",
                              items: { $ref: "#/components/schemas/Message" },
                            },
                            hasMore: {
                              type: "boolean",
                              description:
                                "True when more pages exist before the oldest returned message",
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Chat"],
        summary: "Send a message",
        description:
          "Send a text message to the event chat room. **Students** must be registered for the event. **Organizers and Admins** can always send. After saving to MongoDB the server emits a `new-message` Socket.IO event to all connected clients in the room.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the event",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendMessageInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Message sent and broadcasted",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            message: { $ref: "#/components/schemas/Message" },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Empty or too-long content",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Student not registered for this event",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/messages/{id}": {
      delete: {
        tags: ["Chat"],
        summary: "Delete a message (Organizer/Admin)",
        description:
          "Soft-deletes a message (`isDeleted: true`). **Organizers** can only delete messages from events they own. **Admins** can delete any message. After deletion the server emits a `message-deleted` Socket.IO event to the room.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MongoDB ObjectId of the message",
          },
        ],
        responses: {
          "200": {
            description: "Message deleted and broadcast sent",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden — not an organizer/admin, or not their event",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Message not found or already deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    //  NOTIFICATIONS
    // ═══════════════════════════════════════════════════════
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications",
        description:
          "Returns stored notifications sorted newest-first. For students, virtual event-reminder notifications (next 48 h) are injected at read time and do not hit the DB.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 30, maximum: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Notifications retrieved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            items: {
                              type: "array",
                              items: { type: "object" },
                            },
                            unreadCount: { type: "integer" },
                            total: { type: "integer" },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Notifications"],
        summary: "Clear all notifications",
        description: "Hard-deletes all stored notifications for the authenticated user.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "All notifications cleared",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/notifications/{id}": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark one notification as read",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Notification marked as read",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "404": {
            description: "Notification not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Notifications"],
        summary: "Dismiss one notification",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Notification dismissed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
        },
      },
    },

    "/api/notifications/mark-all-read": {
      post: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "All notifications marked as read",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    //  HEALTH
    // ═══════════════════════════════════════════════════════
    "/api/test-db": {
      get: {
        tags: ["Health"],
        summary: "Test DB connection",
        description:
          "Simple health-check that connects to MongoDB and returns success.",
        responses: {
          "200": {
            description: "DB connected",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "DB connected successfully",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default swaggerSpec;
