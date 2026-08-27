import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { members } from "./members";
import { plans } from "./plans";
import { memberships } from "./memberships";
import { payments } from "./payments";
import { checkins } from "./checkins";
import { classSchedules } from "./class-schedules";
import { classOccurrences } from "./class-occurrences";
import { classReservations } from "./class-reservations";
import { activities } from "./activities";
import { products } from "./products";
import { walkInSales } from "./walk-in-sales";
import { operationalRequests } from "./operational-requests";
import { leads } from "./leads";
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
  classOccurrences: many(classOccurrences),
  classReservations: many(classReservations),
  activities: many(activities),
  emailSendLog: many(emailSendLog),
  staffMembers: many(staffMembers),
  staffAttendance: many(staffAttendance),
  products: many(products),
  walkInSales: many(walkInSales),
  operationalRequests: many(operationalRequests),
  leads: many(leads),
}));

export const operationalRequestsRelations = relations(operationalRequests, ({ one }) => ({
  tenant: one(tenants, {
    fields: [operationalRequests.tenantId],
    references: [tenants.id],
  }),
  reportedByUser: one(users, {
    fields: [operationalRequests.reportedByUserId],
    references: [users.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  tenant: one(tenants, {
    fields: [leads.tenantId],
    references: [tenants.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  sales: many(walkInSales),
}));

export const walkInSalesRelations = relations(walkInSales, ({ one }) => ({
  tenant: one(tenants, {
    fields: [walkInSales.tenantId],
    references: [tenants.id],
  }),
  product: one(products, {
    fields: [walkInSales.productId],
    references: [products.id],
  }),
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

export const classSchedulesRelations = relations(classSchedules, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [classSchedules.tenantId],
    references: [tenants.id],
  }),
  activity: one(activities, {
    fields: [classSchedules.activityId],
    references: [activities.id],
  }),
  occurrences: many(classOccurrences),
}));

export const classOccurrencesRelations = relations(classOccurrences, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [classOccurrences.tenantId],
    references: [tenants.id],
  }),
  classSchedule: one(classSchedules, {
    fields: [classOccurrences.classScheduleId],
    references: [classSchedules.id],
  }),
  reservations: many(classReservations),
}));

export const classReservationsRelations = relations(classReservations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [classReservations.tenantId],
    references: [tenants.id],
  }),
  classOccurrence: one(classOccurrences, {
    fields: [classReservations.classOccurrenceId],
    references: [classOccurrences.id],
  }),
  member: one(members, {
    fields: [classReservations.memberId],
    references: [members.id],
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
  classReservations: many(classReservations),
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
