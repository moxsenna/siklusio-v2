import { Hono } from "hono";
import { type Env } from "../env";
import {
  checkoutTopup,
  checkoutRegister,
  validateAffiliate,
  getAffiliateMe,
  registerAffiliate,
  getAffiliateConversions,
  updateAffiliateBank,
} from "../controllers/checkout.controller";

const router = new Hono<{ Bindings: Env }>();

router.post("/api/checkout/topup", checkoutTopup);
router.post("/api/checkout/register", checkoutRegister);
router.get("/api/affiliate/validate", validateAffiliate);
router.get("/api/affiliate/me", getAffiliateMe);
router.post("/api/affiliate/register", registerAffiliate);
router.get("/api/affiliate/me/conversions", getAffiliateConversions);
router.patch("/api/affiliate/me/bank", updateAffiliateBank);

export default router;
