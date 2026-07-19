import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.civicshield.app",
  appName: "Disasters",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://disasters-platform.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#ffffff",
  },
  plugins: {
    FirebaseAuthentication: {
      authDomain: "civicshield-india-sinan.firebaseapp.com",
      skipNativeAuth: true,
      providers: ["google.com"],
    },
  },
};

export default config;
