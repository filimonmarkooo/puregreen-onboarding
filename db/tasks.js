const TASKS = [
  // ── SQUARE ──────────────────────────────────────────────
  {
    id: 'sq-01', platform: 'Square', order: 1,
    title: 'Create a Square Account',
    description: 'Go to squareup.com and create your business account using your store email address.',
    requiresUpload: true, uploadLabel: 'Screenshot of Square account creation confirmation',
    videoUrl: null
  },
  {
    id: 'sq-02', platform: 'Square', order: 2,
    title: 'Complete Phone Number Verification',
    description: 'Verify your phone number in Square to activate your account security.',
    requiresUpload: true, uploadLabel: 'Screenshot showing verified phone number in Square settings',
    videoUrl: null
  },
  {
    id: 'sq-03', platform: 'Square', order: 3,
    title: 'Upload Square Login Credentials',
    description: 'Store your Square email and password securely here for corporate records.',
    requiresUpload: false, uploadLabel: null,
    credentialsFields: ['squareEmail', 'squarePassword'],
    videoUrl: null
  },
  {
    id: 'sq-04', platform: 'Square', order: 4,
    title: 'Set Up Business Location',
    description: 'Configure your store hours, address, phone number, and location details in Square Dashboard → Locations.',
    requiresUpload: true, uploadLabel: 'Screenshot of completed business location settings',
    videoUrl: null
  },
  {
    id: 'sq-05', platform: 'Square', order: 5,
    title: 'Set Up Branding',
    description: 'Upload your Pure Green logo and configure brand colors in Square Dashboard → Account & Settings → Branding.',
    requiresUpload: true, uploadLabel: 'Screenshot of branding section with logo uploaded',
    videoUrl: null
  },
  {
    id: 'sq-06', platform: 'Square', order: 6,
    title: 'Upload Tax Forms',
    description: 'Upload all required tax documents (W-9, EIN verification, etc.) in Square Dashboard → Account & Settings → Tax Forms.',
    requiresUpload: true, uploadLabel: 'Upload tax form document(s)',
    videoUrl: null
  },
  {
    id: 'sq-07', platform: 'Square', order: 7,
    title: 'Update Banking Information',
    description: 'Link your business bank account for payouts in Square Dashboard → Account & Settings → Bank Accounts.',
    requiresUpload: true, uploadLabel: 'Screenshot showing bank account linked (blur sensitive numbers)',
    videoUrl: null
  },
  {
    id: 'sq-08', platform: 'Square', order: 8,
    title: 'Add Correct Tax Rates',
    description: 'Configure applicable sales tax rates for your store location in Square Dashboard → Items → Taxes.',
    requiresUpload: true, uploadLabel: 'Screenshot of configured tax rates',
    videoUrl: null
  },
  {
    id: 'sq-09', platform: 'Square', order: 9,
    title: 'Set Up Team Permissions',
    description: 'Configure role-based permissions for staff in Square Dashboard → Team → Permissions.',
    requiresUpload: true, uploadLabel: 'Screenshot of permissions configuration',
    videoUrl: null
  },
  {
    id: 'sq-10', platform: 'Square', order: 10,
    title: 'Add Team Members',
    description: 'Add yourself and at least one Pure Green corporate team member as team members in Square Dashboard → Team.',
    requiresUpload: true, uploadLabel: 'Screenshot showing team members added',
    videoUrl: null
  },

  // ── UBER EATS ────────────────────────────────────────────
  {
    id: 'ue-01', platform: 'Uber Eats', order: 1,
    title: 'Submit Business Documents to Uber Eats',
    description: 'Submit all required business documents (business license, food permit, insurance) through the Uber Eats restaurant portal.',
    requiresUpload: true, uploadLabel: 'Screenshot or confirmation of document submission',
    videoUrl: null
  },
  {
    id: 'ue-02', platform: 'Uber Eats', order: 2,
    title: 'Set Up Delivery Platform Profile',
    description: 'Complete your restaurant profile on Uber Eats — store name, hours, address, description, and photos.',
    requiresUpload: true, uploadLabel: 'Screenshot of completed Uber Eats profile',
    videoUrl: null
  },
  {
    id: 'ue-03', platform: 'Uber Eats', order: 3,
    title: 'Upload Uber Eats Login Credentials',
    description: 'Store your Uber Eats restaurant portal email and password for corporate records.',
    requiresUpload: false,
    credentialsFields: ['uberEatsEmail', 'uberEatsPassword'],
    videoUrl: null
  },

  // ── DOORDASH ─────────────────────────────────────────────
  {
    id: 'dd-01', platform: 'DoorDash', order: 1,
    title: 'Submit Business Documents to DoorDash',
    description: 'Submit all required business documents through the DoorDash Merchant Portal during onboarding.',
    requiresUpload: true, uploadLabel: 'Screenshot or confirmation of document submission',
    videoUrl: null
  },
  {
    id: 'dd-02', platform: 'DoorDash', order: 2,
    title: 'Set Up Delivery Platform Profile',
    description: 'Complete your restaurant profile on DoorDash — store name, hours, address, description, and photos.',
    requiresUpload: true, uploadLabel: 'Screenshot of completed DoorDash profile',
    videoUrl: null
  },
  {
    id: 'dd-03', platform: 'DoorDash', order: 3,
    title: 'Upload DoorDash Login Credentials',
    description: 'Store your DoorDash Merchant Portal email and password for corporate records.',
    requiresUpload: false,
    credentialsFields: ['doorDashEmail', 'doorDashPassword'],
    videoUrl: null
  },

  // ── GRUBHUB ──────────────────────────────────────────────
  {
    id: 'gh-01', platform: 'Grubhub', order: 1,
    title: 'Submit Business Documents to Grubhub',
    description: 'Submit all required business documents through the Grubhub for Restaurants portal.',
    requiresUpload: true, uploadLabel: 'Screenshot or confirmation of document submission',
    videoUrl: null
  },
  {
    id: 'gh-02', platform: 'Grubhub', order: 2,
    title: 'Set Up Delivery Platform Profile',
    description: 'Complete your restaurant profile on Grubhub — store name, hours, address, description, and photos.',
    requiresUpload: true, uploadLabel: 'Screenshot of completed Grubhub profile',
    videoUrl: null
  },
  {
    id: 'gh-03', platform: 'Grubhub', order: 3,
    title: 'Upload Grubhub Login Credentials',
    description: 'Store your Grubhub for Restaurants email and password for corporate records.',
    requiresUpload: false,
    credentialsFields: ['grubhubEmail', 'grubhubPassword'],
    videoUrl: null
  },

  // ── STREAM ───────────────────────────────────────────────
  {
    id: 'st-01', platform: 'Stream', order: 1,
    title: 'Add Banking Information',
    description: 'Link your business bank account in the Stream dashboard for payouts.',
    requiresUpload: true, uploadLabel: 'Screenshot of bank account linked in Stream',
    videoUrl: null
  },
  {
    id: 'st-02', platform: 'Stream', order: 2,
    title: 'Set Store Hours',
    description: 'Configure your store operating hours in Stream settings.',
    requiresUpload: true, uploadLabel: 'Screenshot of store hours configured in Stream',
    videoUrl: null
  },
  {
    id: 'st-03', platform: 'Stream', order: 3,
    title: 'Delete Extra Menu Items',
    description: 'Remove any default or placeholder menu items from your Stream menu so only approved Pure Green items remain.',
    requiresUpload: true, uploadLabel: 'Screenshot of cleaned-up menu in Stream',
    videoUrl: null
  },
  {
    id: 'st-04', platform: 'Stream', order: 4,
    title: 'Connect Third-Party Delivery',
    description: 'Connect Uber Eats, DoorDash, and Grubhub to Stream for unified order management.',
    requiresUpload: true, uploadLabel: 'Screenshot showing all three platforms connected in Stream',
    videoUrl: null
  },
  {
    id: 'st-05', platform: 'Stream', order: 5,
    title: 'Set Prep Time',
    description: 'Configure the order preparation time in Stream for accurate delivery estimates.',
    requiresUpload: true, uploadLabel: 'Screenshot of prep time settings in Stream',
    videoUrl: null
  },
  {
    id: 'st-06', platform: 'Stream', order: 6,
    title: 'Adjust Delivery Pricing to 25%',
    description: 'Set the delivery pricing adjustment to 25% markup in Stream delivery settings.',
    requiresUpload: true, uploadLabel: 'Screenshot of delivery pricing set to 25%',
    videoUrl: null
  },
  {
    id: 'st-07', platform: 'Stream', order: 7,
    title: 'Publish Menus to Delivery Platforms',
    description: 'Publish your finalized menu from Stream to all connected delivery platforms (Uber Eats, DoorDash, Grubhub).',
    requiresUpload: true, uploadLabel: 'Screenshot confirming menus published to all platforms',
    videoUrl: null
  },
  {
    id: 'st-08', platform: 'Stream', order: 8,
    title: 'Test Uber Eats Order',
    description: 'Place a test order through Uber Eats to confirm the full order flow is working end-to-end.',
    requiresUpload: true, uploadLabel: 'Screenshot of successful Uber Eats test order',
    videoUrl: null
  },
  {
    id: 'st-09', platform: 'Stream', order: 9,
    title: 'Test DoorDash Order',
    description: 'Place a test order through DoorDash to confirm the full order flow is working end-to-end.',
    requiresUpload: true, uploadLabel: 'Screenshot of successful DoorDash test order',
    videoUrl: null
  },
  {
    id: 'st-10', platform: 'Stream', order: 10,
    title: 'Test Grubhub Order',
    description: 'Place a test order through Grubhub to confirm the full order flow is working end-to-end.',
    requiresUpload: true, uploadLabel: 'Screenshot of successful Grubhub test order',
    videoUrl: null
  }
];

const PLATFORMS = ['Square', 'Uber Eats', 'DoorDash', 'Grubhub', 'Stream'];

module.exports = { TASKS, PLATFORMS };
