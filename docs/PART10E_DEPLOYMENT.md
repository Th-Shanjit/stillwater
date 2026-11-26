# Phase 10E deployment

## Android-first launch

Package identifier:

com.stillwater.recovery

Preserve the package identifier and existing upload
credentials. Do not create a new signing identity
for an existing Play application.

## Public website

Generate draft pages with:

node scripts/build-public-site.cjs

Required local environment variables:

- STILLWATER_PUBLIC_OPERATOR
- STILLWATER_SUPPORT_EMAIL
- STILLWATER_POLICY_DATE

Review the actual policies, support arrangements,
retention practices, legal requirements and SDK disclosures.

After genuine review:

STILLWATER_LEGAL_REVIEWED=true

node scripts/build-public-site.cjs --release

Deploy only dist/stillwater-public.

The website generator does not deploy anything.

## Release environment

Configure the EAS production environment with
actual public HTTPS addresses for privacy, terms,
support and sharing.

Keep connected Circles unconfigured.

Keep new purchases and store offers disabled
until relevant store testing is completed.

Only a public RevenueCat SDK key belongs in an
EXPO_PUBLIC environment variable.

Never include service account credentials,
private API keys or signing keys.

## Store requirements

Verify the final Android target SDK, permissions,
signing certificate and version code.

Google Play requires target API 36 or higher
for new mobile application submissions as of
August 31, 2026.

Complete the store listing, app access information,
content rating, target audience, data safety,
health apps declaration and other applicable forms.

Do not claim professional clinical approval,
medical effectiveness or database encryption.

## Billing plan

Proposed Google Play products:

- stillwater_plus subscription
  - monthly base plan
  - annual base plan
- stillwater_plus_lifetime non-consumable product

Import the actual products into RevenueCat.

Attach them to the existing plus entitlement.

Configure monthly, annual and lifetime packages
in the current offering.

Test prices, purchase confirmation, cancellation,
restoration, expiry and refunds before public sales.

## Remaining blockers

- Actual public developer identity and support contact.
- Qualified legal and content review.
- Published legal website.
- SDK and hosting data-practice verification.
- Actual store and RevenueCat configuration.
- Physical device QA.
- Appropriate Google Play testing and approval.
- Production asset review.

No public launch is authorised by source checks alone.
