# VerifyID Web SDK
![License](https://img.shields.io/github/license/omnisolinfotech/verifyid-sdk-web)

KYC, Document, Liveness & Deepfake Verification SDK

---

## 1. Introduction

The **VerifyID Web SDK** makes it easy to add secure, compliant KYC (Know Your Customer), government document upload, and liveness/selfie verification to your website with a single integration.

- Supports ID Cards, Passports, Driver’s Licenses  
- Face Match & Passive Liveness Detection  
- Seamless API integration – no backend code required!

---

## 2. Installation

1. **Download the SDK files** (or get them from your VerifyID account manager):

   - `verifyid-sdk.zip` *(Full code)*
   - `verifyid-sdk.js` *(JavaScript logic)*
   - `verifyid-sdk.css` *(Styling)*
   - `config.js` *(API key/configuration)*
   - Copy required `face-api.js` models and images folders as instructed

2. **Include them in your HTML:**

   ```html
   <!-- In your <head> -->
   <link rel="stylesheet" href="assets/css/verifyid-sdk.css">

   <!-- Before </body> -->
   <script src="face-api/face-api.min.js"></script>
   <script src="assets/js/config.js"></script>
   <script src="assets/js/verifyid-sdk.js"></script>
   ```

---

## 3. Setup & Configuration

1. **Place the KYC Wizard in your HTML:**

   ```html
   <form id="kyc-wizard-form">
     <div id="kyc-wizard">
       <!-- SDK will handle steps dynamically -->
     </div>
   </form>
   ```

2. **Configure your API Key & endpoint in `config.js`:**

   ```js
   window.SDK_CONFIG = {
     endpoint: "https://api.verifyid.io/kyc/full_verification",
     api_key: "YOUR_API_KEY_HERE",
     // threshold: 0.6 (optional, default 0.6)
   };
   ```

3. **Ensure the required Face API models** are available under `sdk/face-api/models/` as provided in your SDK package.

---

## 4. Usage

1. **User launches the KYC wizard** and follows the prompts:
    - Selects document type
    - Uploads document images (front/back or passport)
    - Takes a selfie via the webcam, guided by the UI

2. **On submission:**
    - All images are converted to base64 and sent securely to the API endpoint
    - The API key is passed via the `x-api-key` header
    - SweetAlert modal will show **“Processing...”** and then display success/error once a response is received.

   ```js
   // Example submission (handled by SDK)
   fetch(window.SDK_CONFIG.endpoint, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-api-key': window.SDK_CONFIG.api_key
     },
     body: JSON.stringify({
       front_image: "...base64...",
       back_image: "...base64...",
       selfie_image: "...base64...",
       threshold: 0.6
     })
   })
   .then(res => res.json())
   .then(data => {
     // Display results
   });
   ```

---

## 5. API Response

The API returns a JSON object indicating the verification result.

**Sample response:**

```json
{
  "success": true,
  "face_match_score": 0.9842,
  "liveness_passed": true,
  "document_data": {
    "full_name": "John Doe",
    "document_number": "1234567890"
    // ...other extracted fields
  },
  "message": "Verification complete"
}
```

**Display the results to your user or process as needed.**

---

## 6. Support

- **Documentation & Updates:** [https://verifyid.io](https://verifyid.io)
- **Email:** support@verifyid.io
- **Integration Help:** Please contact your VerifyID technical account manager

---

© 2025 VerifyID.io – Secure Identity & KYC Automation

---