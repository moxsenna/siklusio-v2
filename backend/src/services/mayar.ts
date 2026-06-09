export type SiklusioMayarFlow = "membership_purchase" | "ai_credit_topup";

export interface MayarPaymentPayload {
  customerName: string;
  email: string;
  mobile: string;
  amount: number;
  productName: string;
  productDescription?: string;
  productId: string;
  redirectUrl: string;
  flow?: SiklusioMayarFlow;
}

export const createMayarPaymentLink = async (mayarKey: string, payload: MayarPaymentPayload) => {
  const customerName =
    payload.customerName?.trim() || payload.email.split("@")[0] || "Pelanggan Siklusio";

  const productName = payload.productName.trim();

  const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const body = {
    name: customerName,
    email: payload.email.toLowerCase(),
    mobile: payload.mobile,
    redirectUrl: payload.redirectUrl,
    description: payload.productDescription || productName,
    expiredAt,
    items: [
      {
        quantity: 1,
        rate: payload.amount,
        description: productName,
      },
    ],
    extraData: {
      noCustomer: payload.email.toLowerCase(),
      idProd: payload.productId,
      productName,
      app: "siklusio",
      ...(payload.flow ? { flow: payload.flow } : {}),
    },
  };

  const response = await fetch("https://api.mayar.id/hl/v1/invoice/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mayarKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const resJson: any = await response.json();

  if (!response.ok || resJson.statusCode !== 200) {
    throw new Error(resJson.message || "Gagal membuat invoice Mayar");
  }

  const transactionId = resJson.data?.transactionId || resJson.data?.transaction_id || null;

  const invoiceId = resJson.data?.id || null;
  const paymentReferenceId = transactionId || invoiceId || null;

  if (!resJson.data?.link) {
    throw new Error("Mayar invoice link tidak ditemukan");
  }

  if (!paymentReferenceId) {
    throw new Error("Mayar transaction id tidak ditemukan");
  }

  return {
    link: resJson.data.link,
    id: paymentReferenceId,
    invoiceId,
    transactionId,
  };
};
