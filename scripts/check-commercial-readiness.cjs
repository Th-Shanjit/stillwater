const { URL } = require('node:url');

function plausibleSdkKey(value, prefix) {
  return typeof value === 'string' &&
    value.startsWith(prefix) &&
    value.length > prefix.length + 8 &&
    !/placeholder|replace_with|your_key/i.test(value);
}

function plausiblePublishedUrl(value) {
  try {
    const url = new URL(value);

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !url.hostname.includes('.') ||
      /(^|\.)example\.(com|net|org)$/i.test(url.hostname) ||
      /\.(example|test|invalid|localhost)$/i.test(url.hostname)
    ) {
      return false;
    }

    return true;

  } catch {
    return false;
  }
}

function inspectConfiguration(env) {
  const androidKey = plausibleSdkKey(
    env.EXPO_PUBLIC_RC_ANDROID_KEY,
    'goog_'
  );

  const iosKey = plausibleSdkKey(
    env.EXPO_PUBLIC_RC_IOS_KEY,
    'appl_'
  );

  const legal =
    plausiblePublishedUrl(
      env.EXPO_PUBLIC_PRIVACY_URL
    ) &&
    plausiblePublishedUrl(
      env.EXPO_PUBLIC_TERMS_URL
    );

  const androidOffers =
    env.EXPO_PUBLIC_ANDROID_OFFERS_ENABLED === 'true';

  const iosOffers =
    env.EXPO_PUBLIC_IOS_OFFERS_ENABLED === 'true';

  return [
    {
      label: 'Android RevenueCat key',
      status: androidKey
        ? 'FORMAT_OK'
        : 'NOT_CONFIGURED',
    },
    {
      label: 'iOS RevenueCat key',
      status: iosKey
        ? 'FORMAT_OK'
        : 'NOT_CONFIGURED',
    },
    {
      label: 'Privacy and terms addresses',
      status: legal
        ? 'FORMAT_OK'
        : 'NOT_CONFIGURED',
    },
    {
      label: 'Android offers',
      status: !androidOffers
        ? 'DISABLED'
        : androidKey && legal
          ? 'ENABLED_UNVERIFIED'
          : 'CONFIGURATION_CONFLICT',
    },
    {
      label: 'iOS offers',
      status: !iosOffers
        ? 'DISABLED'
        : iosKey && legal
          ? 'ENABLED_UNVERIFIED'
          : 'CONFIGURATION_CONFLICT',
    },
    {
      label: 'Actual store products and offerings',
      status: 'MANUAL_VERIFICATION_REQUIRED',
    },
    {
      label: 'Native purchases and restoration',
      status: 'MANUAL_VERIFICATION_REQUIRED',
    },
    {
      label: 'Gift purchase and sponsored fulfilment',
      status: 'NOT_IMPLEMENTED',
    },
    {
      label: 'Legal and commercial agreement review',
      status: 'MANUAL_VERIFICATION_REQUIRED',
    },
  ];
}

module.exports = {
  plausibleSdkKey,
  plausiblePublishedUrl,
  inspectConfiguration,
};

if (require.main === module) {
  console.log('STILLWATER COMMERCIAL CONFIGURATION');
  console.log('');

  const results = inspectConfiguration(process.env);

  for (const result of results) {
    console.log(
      result.status + ': ' + result.label
    );
  }

  console.log('');
  console.log(
    'Configuration checks do not verify store products, legal documents or live payments.'
  );

  if (results.some(
    item => item.status === 'CONFIGURATION_CONFLICT'
  )) {
    process.exitCode = 1;
  }
}
