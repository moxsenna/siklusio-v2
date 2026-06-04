import { type Context } from "hono";
import { type Env } from "../env";

export function formatE164Phone(phone: string): string {
  if (!phone) return "";
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  return clean;
}

export async function hashData(val: string): Promise<string> {
  if (!val) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(val.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function sendMetaCapiEvent(
  c: Context<{ Bindings: Env }>,
  eventName: string,
  eventId: string,
  userData: any,
  customData: any,
  testEventCode?: string,
) {
  const env = c.env;
  if (!env.META_PIXEL_ID || !env.META_CAPI_ACCESS_TOKEN) {
    console.warn(
      `--> sendMetaCapiEvent skipped: META_PIXEL_ID or META_CAPI_ACCESS_TOKEN missing for event ${eventName}`,
    );
    return;
  }

  const apiVersion = env.META_GRAPH_API_VERSION || "v18.0";
  const url = `https://graph.facebook.com/${apiVersion}/${env.META_PIXEL_ID}/events?access_token=${env.META_CAPI_ACCESS_TOKEN}`;

  const processedUserData = { ...userData };
  if (processedUserData.em && !Array.isArray(processedUserData.em)) {
    processedUserData.em = [processedUserData.em];
  }
  if (processedUserData.ph && !Array.isArray(processedUserData.ph)) {
    processedUserData.ph = [processedUserData.ph];
  }

  const payload: any = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: "https://siklusio.web.id",
        user_data: processedUserData,
        custom_data: customData,
      },
    ],
  };

  let finalTestCode: string | undefined = undefined;
  let testCodeSource = "none";

  if (testEventCode) {
    finalTestCode = testEventCode;
    testCodeSource = "dynamic";
  } else if (env.META_TEST_EVENT_CODE) {
    finalTestCode = env.META_TEST_EVENT_CODE;
    testCodeSource = "env";
  }

  if (finalTestCode) {
    payload.test_event_code = finalTestCode;
  }

  console.log(
    `--> CAPI Event Sent: ${eventName} | Event ID: ${eventId} | test_event_code_present: ${!!finalTestCode} | test_event_code_source: ${testCodeSource}`,
  );

  const performFetch = () =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          console.error(`--> Meta CAPI Error [${eventName}]: ${res.status} - Redacted Payload`);
        } else {
          console.log(`--> Meta CAPI Success [${eventName}]: ${eventId}`);
        }
      })
      .catch((err) => {
        console.error(`--> Meta CAPI Fetch Error [${eventName}]:`, err.message);
      });

  if (c.executionCtx) {
    c.executionCtx.waitUntil(performFetch());
  } else {
    performFetch();
  }
}
