import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { members } from "./members";
import { plans } from "./plans";
import { memberships } from "./memberships";
import { payments } from "./payments";
import { checkins } from "./checkins";
import { classSchedules } from "./class-schedules";
import { activities } from "./activities";
import { emailSendLog } from "./email-send-log";
import { staffMembers } from "./staff-members";
import { staffAttendance } from "./staff-attendance";

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  members: many(members),
  plans: many(plans),
  memberships: many(memberships),
  payments: many(payments),
  checkins: many(checkins),
  classSchedules: many(classSchedules),
  activities: many(activities),
  emailSendLog: many(emailSendLog),
  staffMembers: many(staffMembers),
  staffAttendance: many(staffAttendance),
}));

export const staffMembersRelations = relations(staffMembers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [staffMembers.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [staffMembers.userId],
    references: [users.id],
  }),
  attendance: many(staffAttendance),
}));

export const staffAttendanceRelations = relations(staffAttendance, ({ one }) => ({
  tenant: one(tenants, {
    fields: [staffAttendance.tenantId],
    references: [tenants.id],
  }),
  staffMember: one(staffMembers, {
    fields: [staffAttendance.staffMemberId],
    references: [staffMembers.id],
  }),
}));

export const emailSendLogRelations = relations(emailSendLog, ({ one }) => ({
  tenant: one(tenants, {
    fields: [emailSendLog.tenantId],
    references: [tenants.id],
  }),
  member: one(members, {
    fields: [emailSendLog.memberId],
    references: [members.id],
  }),
  membership: one(memberships, {
    fields: [emailSendLog.membershipId],
    references: [memberships.id],
  }),
  triggeredByUser: one(users, {
    fields: [emailSendLog.triggeredByUserId],
    references: [users.id],
  }),
}));

export const classSchedulesRelations = relations(classSchedules, ({ one }) => ({
  tenant: one(tenants, {
    fields: [classSchedules.tenantId],
    references: [tenants.id],
  }),
  activity: one(activities, {
    fields: [classSchedules.activityId],
    references: [activities.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [activities.tenantId],
    references: [tenants.id],
  }),
  classSchedules: many(classSchedules),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  member: many(members),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [members.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  memberships: many(memberships),
  payments: many(payments),
  checkins: many(checkins),
  emailSendLog: many(emailSendLog),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [plans.tenantId],
    references: [tenants.id],
  }),
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [memberships.tenantId],
    references: [tenants.id],
  }),
  member: one(members, {
    fields: [memberships.memberId],
    references: [members.id],
  }),
  plan: one(plans, {
    fields: [memberships.planId],
    references: [plans.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  member: one(members, {
    fields: [payments.memberId],
    references: [members.id],
  }),
  membership: one(memberships, {
    fields: [payments.membershipId],
    references: [memberships.id],
  }),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
  tenant: one(tenants, {
    fields: [checkins.tenantId],
    references: [tenants.id],
  }),
  member: one(members, {
    fields: [checkins.memberId],
    references: [members.id],
  }),
}));
