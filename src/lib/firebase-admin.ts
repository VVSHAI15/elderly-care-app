import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

// Initialize Firebase Admin SDK (server-side only)
const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];

export const messaging = getMessaging(app);

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const response = await messaging.send({
      token,
      notification: {
        title,
        body,
      },
      data,
      webpush: {
        fcmOptions: {
          link: process.env.NEXT_PUBLIC_APP_URL,
        },
      },
    });
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error };
  }
}

export async function sendMultiplePushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (tokens.length === 0) return { successCount: 0, failureCount: 0 };

  const message = {
    notification: {
      title,
      body,
    },
    data,
    tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error("Error sending multiple push notifications:", error);
    throw error;
  }
}
