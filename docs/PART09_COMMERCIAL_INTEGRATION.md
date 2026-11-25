# Parts 09D, 09E and 09F

## Sponsored access

Distinguish:

- Local Grace Scholarship.
- Official store promotional offers.
- Partner-funded access.
- Purchased gifts.

These are separate commercial and technical mechanisms.

The current implementation supports controlled entry
to official store offer redemption.

Redemption does not independently grant Plus access.
RevenueCat remains responsible for determining
whether the relevant store entitlement is active.

Promotional offers may renew into paid subscriptions.
Users must be able to review the store terms.

## Activation

Store offers default to disabled.

Enable separately by platform only after:

1. Actual store products exist.
2. Offers have been configured in the store.
3. Eligibility and renewal terms are understood.
4. Legal documents are published.
5. Native redemption has been tested.
6. RevenueCat confirms the resulting entitlement.

Never implement arbitrary local access codes
as substitutes for verified purchased access.

## Gift membership

Buying access for another person remains deferred
until an appropriate purchasing and fulfilment
mechanism has been selected and verified.

Do not advertise gift purchase as available.

## Church partnerships

Basic hosting and invitations remain free.

Explore paid custom content, licensing, branded
materials and optional facilitation services.

Proposed annual partnership range:
USD 49-299, subject to validation.

No individual participant recovery records,
attendance reports or behaviour scores are sold
or provided to church partners.

No pastor referral commissions are introduced.

## Creator partnerships

Start with manually curated programmes.

Potential commercial arrangements:

- Fixed content licensing fee.
- Agreed revenue share.
- Commissioned original programmes.
- Co-branded general-audience experiences.

All agreements require defined rights, payment
terms, refund treatment, termination provisions,
content updates and editorial responsibility.

Royalty calculations must eventually be reconciled
against actual settlement records.

No automatic creator payments are implemented.

## Planning calculator

scripts/partner-economics.cjs accepts an aggregate
financial scenario containing no recipient details.

Monetary amounts are integer minor currency units.
Rates use basis points: 1500 means 15 percent.

The estimate assumes full-unit refunds and a
distribution fee assessed on retained sales.

Creator share is calculated after that assumed fee.

Contribution deducts entered fixed costs and the
creator share. It excludes any taxes or costs not
included in the scenario.

This is not an accounting or payment system.

## Commercial audit

The readiness script checks configuration format
without printing SDK keys or accessing user data.

A valid-looking URL is not proof of legal publication.
A configured SDK key is not proof of a live product.
Enabled offers are not proof of successful redemption.

Actual store configuration, pricing, eligibility,
renewal, expiry, refunds, restoration and native
device behaviour require manual verification.

## Outstanding launch work

- Store and RevenueCat product configuration.
- Real localised pricing.
- Privacy policy and terms publication.
- Google Play and Apple platform review.
- Native purchase and restoration tests.
- Lifetime product verification.
- Promotional offer redemption tests.
- Refund and subscription expiry verification.
- Account and data deletion requirements.
- Grace Scholarship sustainability review.
- Partner-funded fulfilment and gift purchasing.
- Commercial agreements and royalty reconciliation.

No external payment processing is introduced.

No paid hosted services are activated.

No additional personal data is collected.
