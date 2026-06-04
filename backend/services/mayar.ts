export interface MayarPaymentPayload {
  name: string;
  amount: number;
  description: string;
  redirectUrl: string;
  email: string;
  mobile: string;
  customerName: string;
}

export const createMayarPaymentLink = async (mayarKey: string, payload: MayarPaymentPayload) => {
  const response = await fetch("https://api.mayar.id/hl/v1/payment/create", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${mayarKey}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const resJson: any = await response.json();
  if (!response.ok || resJson.statusCode !== 200) {
    throw new Error(resJson.message || "Gagal membuat link pembayaran Mayar");
  }

  return {
    link: resJson.data?.link,
    id: resJson.data?.id || resJson.data?.transactionId || null,
  };
};
