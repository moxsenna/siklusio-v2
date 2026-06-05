import { Hono } from "hono";
import { type Env } from "../env";
import {
  getAdminUsers,
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
  getAdminAffiliates,
  createAdminAffiliate,
  updateAdminAffiliate,
  deleteAdminAffiliate,
  getAdminAffiliateConversions,
  payoutAdminAffiliateConversion,
} from "../controllers/admin.controller";
import {
  getAdminCrmSummary,
  getAdminCrmLeads,
  createAdminCrmLead,
  updateAdminCrmLead,
  createAdminCrmNote,
  overrideAdminCrmPaymentStatus,
} from "../controllers/adminCrm.controller";

const router = new Hono<{ Bindings: Env }>();

// API Routes for Admin
router.get("/api/admin/users", getAdminUsers);
router.get("/api/admin/coupons", getAdminCoupons);
router.post("/api/admin/coupons", createAdminCoupon);
router.patch("/api/admin/coupons/:id", updateAdminCoupon);
router.delete("/api/admin/coupons/:id", deleteAdminCoupon);

// Affiliate Admin Endpoints
router.get("/api/admin/affiliates", getAdminAffiliates);
router.post("/api/admin/affiliates", createAdminAffiliate);
router.patch("/api/admin/affiliates/:id", updateAdminAffiliate);
router.delete("/api/admin/affiliates/:id", deleteAdminAffiliate);
router.get("/api/admin/affiliates/conversions", getAdminAffiliateConversions);
router.patch("/api/admin/affiliates/conversions/:id/payout", payoutAdminAffiliateConversion);

// Admin CRM Endpoints
router.get("/api/admin/crm/summary", getAdminCrmSummary);
router.get("/api/admin/crm/leads", getAdminCrmLeads);
router.post("/api/admin/crm/leads", createAdminCrmLead);
router.patch("/api/admin/crm/leads/:id", updateAdminCrmLead);
router.post("/api/admin/crm/leads/:id/notes", createAdminCrmNote);
router.patch("/api/admin/crm/leads/:id/payment-status", overrideAdminCrmPaymentStatus);

export default router;
